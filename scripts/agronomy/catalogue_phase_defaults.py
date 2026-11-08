"""General crop reference profiles for the separate selected-table export."""
from collections import defaultdict
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

DIRECT = {"FORNITO_NON_VALIDATO", "SPECIFICO_DOCUMENTATO", "DESCRIZIONE_DA_FONTE"}
PHASE_KEYS = [k for p in range(1, 5) for k in (f"Fase F{p}", f"BBCH F{p}")]
SENSOR_KEYS = ("sensor", "bands", "measurement_geometry", "soil_canopy_mask")


def num(value):
    try:
        result = Decimal(str(value).replace(",", "."))
    except InvalidOperation:
        return None
    return result if result.is_finite() and result >= 0 else None


def fill_phase_defaults(row, entries, donors):
    """Transfer one coherent reference scheme, not arithmetic means of BBCH codes.

    The caller supplies a frozen, role/alias-filtered snapshot. Prefer the same
    earliness class and production destination. Unknown sensor context is kept
    unknown in the technical audit, never promoted to field-calibrated NDVI.
    """
    if all(row[k] for k in [*PHASE_KEYS, "Precocità",
                           *[f"N F{p} (kg/ha)" for p in range(1, 5)],
                           *[f"NDVI F{p}" for p in range(1, 5)]]):
        return []
    groups = defaultdict(list)
    requested = row.get("Varietà riferimento fenologico")
    for donor, provenance in donors:
        if requested and donor["Varietà"] != requested:
            continue
        if donor["Coltura"] != row["Coltura"] or donor["Destinazione"] != row["Destinazione"]:
            continue
        if row["Precocità"] and row["Precocità"] != donor["Precocità"]:
            continue
        if not all(donor[k] and provenance[k]["stato"] in DIRECT for k in PHASE_KEYS):
            continue
        if any(row[k] and row[k] != donor[k] for k in PHASE_KEYS):
            continue
        scheme = (donor["Precocità"], *(donor[k] for k in PHASE_KEYS))
        groups[scheme].append((donor, provenance))
    if not groups:
        return []
    # If equally common but different schemes remain, do not invent a class.
    largest = max(len(group) for group in groups.values())
    schemes = [key for key, group in groups.items() if len(group) == largest]
    if len(schemes) != 1:
        return []
    references = groups[schemes[0]]
    changes = []

    def assign(parameter, value, method, used):
        row[parameter] = value
        entries[parameter] = {
            "stato": "RIFERIMENTO_GENERALE_COLTURA",
            "metodo": method,
            "numerosita_profili": len(used),
            "riferimenti": [
                {"coltura": d["Coltura"], "varieta": d["Varietà"],
                 "valore": d[parameter], "provenienza": meta[parameter]}
                for d, meta in used
            ],
            "validazione_agronomica": False,
        }
        changes.append({"coltura": row["Coltura"], "varieta": row["Varietà"],
                        "parametro": parameter, "valore": value, **entries[parameter]})

    for parameter in PHASE_KEYS:
        if not row[parameter]:
            assign(parameter, references[0][0][parameter],
                   "Profilo generale coerente della stessa coltura, destinazione e classe disponibile; codici BBCH non mediati",
                   references)
    if not row["Precocità"]:
        classes = {d["Precocità"] for d, _ in references if d["Precocità"]}
        if len(classes) == 1:
            assign("Precocità", classes.pop(), "Classe comune ai profili di riferimento", references)

    nkeys = [f"N F{p} (kg/ha)" for p in range(1, 5)]
    missing = [k for k in nkeys if not row[k]]
    quota_refs = [
        (d, meta) for d, meta in references
        if all(meta[k]["stato"] in DIRECT and num(d[k]) is not None for k in nkeys)
        and sum(num(d[k]) for k in nkeys) > 0
    ]
    quantities = {
        meta[k].get("contesto", {}).get("nitrogen_quantity")
        for _, meta in quota_refs for k in nkeys
    }
    desired_quantity = entries["Azoto Totale (kg/ha)"].get("contesto", {}).get("nitrogen_quantity")
    if len(quantities) > 1 or (desired_quantity and quantities != {desired_quantity}):
        quota_refs = []
    total = num(row["Azoto Totale (kg/ha)"])
    existing = [num(row[k]) for k in nkeys if row[k]]
    if missing and quota_refs and total is not None and all(v is not None for v in existing):
        remaining = total - sum(existing)
        if remaining < 0:
            raise ValueError("Quote N presenti superiori al totale")
        weights = {
            k: sum(num(d[k]) / sum(num(d[key]) for key in nkeys) for d, _ in quota_refs)
            / len(quota_refs)
            for k in missing
        }
        denominator = sum(weights.values())
        if denominator > 0:
            allocated = Decimal(0)
            for k in missing[:-1]:
                value = (remaining * weights[k] / denominator).quantize(
                    Decimal(".1"), rounding=ROUND_HALF_UP)
                # Bound only floating allocation rounding; never reduce existing N.
                value = min(value, remaining - allocated)
                allocated += value
                assign(k, format(value, "f").replace(".", ","),
                       "Media delle proporzioni N dei profili coerenti, rapportata al totale disponibile; arrotondamento compensato nell'ultima fase",
                       quota_refs)
            assign(missing[-1], format(remaining - allocated, "f").replace(".", ","),
                   "Quota residua del totale dopo la ripartizione delle fasi mancanti",
                   quota_refs)

    # Prefer a complete, named reference curve over unrelated phase-wise values.
    # Merely attesting a cultivar's name never certifies its agronomic numbers.
    curve_candidates = []
    for donor, provenance in references:
        ndvi_keys = [f"NDVI F{p}" for p in range(1, 5)]
        known = (requested or donor.get("Esito verifica nome") == "DOCUMENTATO"
                 or all(provenance[k]["stato"] == "SPECIFICO_DOCUMENTATO" for k in ndvi_keys))
        if not known or not all(
                provenance[k]["stato"] in DIRECT and num(donor[k]) is not None
                and num(donor[k]) <= 1 for k in ndvi_keys):
            continue
        if any(row[k] and num(row[k]) != num(donor[k]) for k in ndvi_keys):
            continue
        if any(entries[k].get("contesto", {}).get(s) and
               entries[k]["contesto"][s] != provenance[k].get("contesto", {}).get(s)
               for k in ndvi_keys for s in SENSOR_KEYS):
            continue
        curve_candidates.append((donor, provenance))
    sensor_signatures = {
        tuple(meta[f"NDVI F{p}"].get("contesto", {}).get(s)
              for p in range(1, 5) for s in SENSOR_KEYS)
        for _, meta in curve_candidates
    }
    if curve_candidates and len(sensor_signatures) == 1:
        standard = sorted(curve_candidates, key=lambda item: (
            -sum(item[1][f"NDVI F{p}"]["stato"] == "SPECIFICO_DOCUMENTATO"
                 for p in range(1, 5)), item[0]["Varietà"].casefold()))[0]
        for p in range(1, 5):
            parameter = f"NDVI F{p}"
            if not row[parameter]:
                assign(parameter, standard[0][parameter],
                       f"Curva completa del profilo di riferimento {standard[0]['Varietà']}, associata alle sue fasi e BBCH; non calibrazione della varietà destinataria",
                       [standard])

    for p in range(1, 5):
        parameter = f"NDVI F{p}"
        if row[parameter]:
            continue
        sensor_groups = defaultdict(list)
        desired = entries[parameter].get("contesto", {})
        for donor, provenance in references:
            value = num(donor[parameter])
            context = provenance[parameter].get("contesto", {})
            signature = tuple(context.get(k) for k in SENSOR_KEYS)
            if any(desired.get(k) and desired[k] != context.get(k) for k in SENSOR_KEYS):
                continue
            if provenance[parameter]["stato"] in DIRECT and value is not None and value <= 1:
                sensor_groups[signature].append((donor, provenance))
        if len(sensor_groups) != 1:
            continue
        ndvi_refs = next(iter(sensor_groups.values()))
        places = min(2, min(max(0, -num(d[parameter]).as_tuple().exponent) for d, _ in ndvi_refs))
        value = (sum(num(d[parameter]) for d, _ in ndvi_refs) / len(ndvi_refs)).quantize(
            Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP)
        assign(parameter, format(value, "f").replace(".", ","),
               "Media NDVI della stessa fase e schema BBCH; contesto sensore uguale quando documentato, altrimenti riferimento della sola tabella",
               ndvi_refs)
    return changes
