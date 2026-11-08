"""Source-backed, non-recursive averages within agronomically comparable cohorts."""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

COHORT_FIELDS = ("crop", "destination", "earliness", "cycle", "production_system")
PHASE_FIELDS = ("phase", "bbch")
SENSOR_FIELDS = ("sensor", "bands", "measurement_geometry", "soil_canopy_mask")
UNITS = {
    "Piante/ha": "piante/ha",
    "Resa media (t/ha)": "t/ha",
    "Azoto Totale (kg/ha)": "kg N/ha",
    **{f"N F{p} (kg/ha)": "kg N/ha" for p in range(1, 5)},
    **{f"NDVI F{p}": "adimensionale" for p in range(1, 5)},
}
N_QUANTITIES = {"FERTILIZER_DOSE", "PLANT_REQUIREMENT", "CROP_REMOVAL"}


def number(value):
    if isinstance(value, bool):
        raise ValueError("Valore booleano non numerico")
    try:
        result = Decimal(str(value))
    except InvalidOperation as exc:
        raise ValueError("Numero non valido") from exc
    if not result.is_finite() or result < 0:
        raise ValueError("Numero negativo o non finito")
    return result


def context_for(target, parameter):
    """Unknown earliness never forms a cohort of 'unknown' varieties."""
    context = dict(target.get("comparison_context", {}))
    if parameter.startswith(("N F", "NDVI F")):
        context.update(target.get("phase_contexts", {}).get(parameter.split()[1], {}))
    fields = list(COHORT_FIELDS)
    if parameter.startswith(("N F", "NDVI F")):
        fields.extend(PHASE_FIELDS)
    if parameter.startswith("NDVI"):
        fields.extend(SENSOR_FIELDS)
    if parameter.startswith(("Azoto", "N F")):
        fields.append("nitrogen_quantity")
    if not all(isinstance(context.get(k), str) and context[k].strip() for k in fields):
        return None
    if any(context[k].strip().upper() in {"UNKNOWN", "NON_VERIFICATO", "N/D", "?"}
           for k in fields):
        return None
    if "nitrogen_quantity" in fields and context["nitrogen_quantity"] not in N_QUANTITIES:
        raise ValueError("Grandezza N non identificata")
    if context["crop"] != target["crop"] or context["destination"] != target["destination"]:
        raise ValueError("Contesto estraneo alla coltura o destinazione del profilo")
    return {k: context[k].strip() for k in fields}


def validate_observations(observations, sources):
    identities = set()
    for obs in observations:
        if obs.get("origin") not in {"SPECIFIC_MEASURED", "SPECIFIC_TECHNICAL"}:
            raise ValueError("Stime ricorsive o riferimenti non validati non ammessi")
        if not all(isinstance(obs.get(k), str) and obs[k].strip()
                   for k in ("id", "variety", "canonical_variety", "parameter", "locator", "method")):
            raise ValueError("Osservazione priva di identità o riscontro")
        if obs["id"] in identities:
            raise ValueError("ID di osservazione duplicato")
        identities.add(obs["id"])
        parameter = obs["parameter"]
        if parameter not in UNITS or obs.get("unit") != UNITS[parameter]:
            raise ValueError("Parametro o unità incompatibile")
        value = number(obs["value"])
        if parameter in {"Piante/ha", "Resa media (t/ha)", "Azoto Totale (kg/ha)"} and value <= 0:
            raise ValueError("Riferimento totale non positivo")
        if parameter.startswith("NDVI") and value > 1:
            raise ValueError("NDVI fuori intervallo")
        if type(obs.get("decimal_places")) is not int or not 0 <= obs["decimal_places"] <= 2:
            raise ValueError("Precisione non dichiarata o eccessiva")
        quantum = Decimal(1).scaleb(-obs["decimal_places"])
        if value.quantize(quantum) != value:
            raise ValueError("Precisione dichiarata inferiore a quella del valore")
        if not obs.get("sources") or any(s not in sources for s in obs["sources"]):
            raise ValueError("Fonte dell'osservazione mancante")
        if type(obs.get("source_sample_size")) is not int or obs["source_sample_size"] < 1:
            raise ValueError("Numerosità della fonte mancante")
        context = obs.get("context", {})
        if not isinstance(context, dict):
            raise ValueError("Contesto dell'osservazione non valido")
        target = {"crop": context.get("crop"), "destination": context.get("destination"),
                  "comparison_context": context,
                  "phase_contexts": {parameter.split()[1]: context}
                  if parameter.startswith(("N F", "NDVI F")) else {}}
        if context_for(target, parameter) is None:
            raise ValueError("Contesto o precocità dell'osservazione incompleto")


def estimate(target, parameter, observations, sources):
    """Select a specific value first; otherwise equal-weight independent cultivars.

    Source-level trial means are allowed, but count as ONE cultivar, not as
    multiple varieties. Duplicate lots, synonyms and repeated cultivar readings
    must be consolidated in reviewed source data, never counted twice here.
    """
    if parameter not in UNITS:
        raise ValueError("Solo parametri numerici previsti, non categorie o codici BBCH")
    validate_observations(observations, sources)
    required = context_for(target, parameter)
    if required is None:
        return None
    candidates = [
        obs for obs in observations
        if obs["parameter"] == parameter
        and all(obs["context"].get(k) == v for k, v in required.items())
    ]
    own_id = target.get("canonical_variety", target["name"]).strip().casefold()
    own = [o for o in candidates if o["canonical_variety"].strip().casefold() == own_id]
    # Incompatible evidence can never override a matching specific observation.
    chosen = own or candidates
    if not chosen:
        return None
    canonical = [o["canonical_variety"].strip().casefold() for o in chosen]
    if len(set(canonical)) != len(canonical):
        raise ValueError("Sinonimi, lotti o osservazioni della stessa varietà duplicati")
    chosen = sorted(chosen, key=lambda o: o["canonical_variety"].casefold())
    values = [number(o["value"]) for o in chosen]
    places = min(o["decimal_places"] for o in chosen)
    quantum = Decimal(1).scaleb(-places)
    value = (sum(values) / len(values)).quantize(quantum, rounding=ROUND_HALF_UP)
    if parameter in {"Piante/ha", "Resa media (t/ha)", "Azoto Totale (kg/ha)"} and value <= 0:
        raise ValueError("La precisione produrrebbe un totale nullo")
    status = ("SPECIFICO_DOCUMENTATO" if own else
              "MEDIA_PER_ANALOGIA" if len(chosen) > 1 else "VALORE_TRASFERITO")
    return format(value, "f").replace(".", ","), {
        "stato": status, "unita": UNITS[parameter],
        "metodo": (chosen[0]["method"] if own else
                   "Media aritmetica non ponderata, una osservazione per cultivar"
                   if len(chosen) > 1 else "Valore trasferito da una sola cultivar"),
        "numerosita_varieta": len(chosen),
        "intervallo_valori_origine": [str(min(values)), str(max(values))],
        "contesto": required,
        "fonti": sorted({sources[s]["url"] for o in chosen for s in o["sources"]}),
        "riferimenti": [
            {k: o[k] for k in ("id", "variety", "canonical_variety", "value",
                               "unit", "sources", "locator", "method", "source_sample_size")}
            for o in chosen
        ],
        "precisione_decimali": places,
        "validazione_varietale_da_analogia": False,
    }
