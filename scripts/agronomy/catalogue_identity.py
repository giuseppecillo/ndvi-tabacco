"""Pinned, evidence-based name review. No network, database or fuzzy matching."""
import hashlib
import html
import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

EVIDENCE_PATH = Path(__file__).with_name("catalogue-identities.json")
STATUSES = {"DOCUMENTATO", "PARZIALMENTE_VERIFICATO", "NON_VERIFICATO"}


def load_evidence(source, rows, path=EVIDENCE_PATH):
    """Fail closed if the source or curation changed without a matching review."""
    evidence = json.loads(path.read_text(encoding="utf-8"))
    if evidence["schema"] != 1:
        raise ValueError("Schema della revisione identità non supportato")
    if hashlib.sha256(source).hexdigest() != evidence["source_sha256"]:
        raise ValueError("CSV diverso dalla versione sottoposta a revisione dei nomi")
    if len(rows) != evidence["expected_profiles"]:
        raise ValueError("Numero di profili diverso dalla revisione identità")
    keys = {(row["Coltura"], row["Varietà"]) for row in rows}
    if len(keys) != len(rows):
        raise ValueError("Identità originali duplicate")
    sources = evidence["sources"]
    for source_info in sources.values():
        if urlparse(source_info["url"]).scheme != "https":
            raise ValueError("Fonte identità senza URL HTTPS")
        if not all(source_info.get(field) for field in ("title", "scope", "access")):
            raise ValueError("Fonte identità priva di metadati")

    def check_sources(ids):
        if not ids or any(source_id not in sources for source_id in ids):
            raise ValueError("Riferimento a fonte identità mancante")

    if set(evidence["consulted_by_crop"]) != {crop for crop, _ in keys}:
        raise ValueError("Copertura delle colture incompleta")
    for ids in evidence["consulted_by_crop"].values():
        check_sources(ids)
    claimed = set()
    for claim in evidence["claims"]:
        check_sources(claim["sources"])
        if claim.get("status", "DOCUMENTATO") not in STATUSES:
            raise ValueError("Esito identità non supportato")
        if not claim["names"] or not claim["evidence"].strip() or not claim["kind"]:
            raise ValueError("Attestazione identità incompleta")
        for name in claim["names"]:
            key = (claim["crop"], name)
            if key not in keys or key in claimed:
                raise ValueError(f"Attestazione estranea o duplicata: {key}")
            claimed.add(key)
    for relation in evidence["relations"]:
        check_sources(relation["sources"])
        members = [tuple(member) for member in relation["members"]]
        if len(set(members)) < 2 or not set(members) <= keys or not relation["reason"]:
            raise ValueError("Relazione fra identità non valida")
    return evidence


def apply_identity_review(reviewed, audit, evidence):
    claims = {
        (claim["crop"], name): claim
        for claim in evidence["claims"] for name in claim["names"]
    }
    sources = evidence["sources"]
    relations = evidence["relations"]
    for row, check in zip(reviewed, audit, strict=True):
        key = (row["Coltura"], row["Varietà"])
        consulted = evidence["consulted_by_crop"][key[0]]
        claim = claims.get(key)
        status = claim.get("status", "DOCUMENTATO") if claim else "NON_VERIFICATO"
        relevant = [
            {"id": f"R{index:02}", **relation}
            for index, relation in enumerate(relations, 1)
            if list(key) in relation["members"]
        ]
        finding = claim["evidence"] if claim else (
            "Evidenza insufficiente per identificare univocamente questo nome "
            "nelle fonti consultate per la coltura. Confronto documentale non "
            "esaustivo: NON significa nome inesistente o varietà non registrata. "
            "Richiedere scheda del costitutore, registro/accessione o documento "
            "del materiale vegetale prima di attribuire un'identità."
        )
        ids = claim["sources"] if claim else []
        row.update({
            "Tipo di identità": claim["kind"] if claim else "NON_DETERMINATO",
            "Esito verifica nome": status,
            "Denominazione documentata o candidata": (
                claim.get("denomination", row["Varietà"]) if claim else ""
            ),
            "Fonti identità": " | ".join(sources[source_id]["url"] for source_id in ids),
            "Riscontro identità": finding,
            "Fonti consultate per coltura": " | ".join(
                sources[source_id]["url"] for source_id in consulted
            ),
            "Relazioni identità": " | ".join(
                f'{relation["id"]}: {relation["type"]}' for relation in relevant
            ),
            "Data revisione nomi": evidence["reviewed_on"],
        })
        # Do not let the inherited "productive crop" default certify an unknown
        # role, or turn a species/trade type/geographical label into a cultivar.
        if row["Stato"] != "SOLO_ANAGRAFICA":
            row["Ruolo"] = (
                "Profilo produttivo fornito, ruolo non verificato"
                if status != "DOCUMENTATO"
                else {
                    "SPECIE": "Specie, non singola cultivar",
                    "INDICAZIONE_GEOGRAFICA": "Indicazione geografica, non cultivar",
                    "TIPOLOGIA_COMMERCIALE": "Tipologia commerciale",
                }.get(row["Tipo di identità"], "Profilo produttivo non validato")
            )
        check["identita"] = {
            "esito": status, "tipo": row["Tipo di identità"],
            "denominazione_documentata_o_candidata":
                row["Denominazione documentata o candidata"],
            "riscontro": finding, "fonti_attestazione": ids,
            "fonti_consultate": consulted,
            "relazioni": [relation["id"] for relation in relevant],
        }
    return {
        "data_revisione": evidence["reviewed_on"],
        "esiti": dict(Counter(row["Esito verifica nome"] for row in reviewed)),
        "tipi": dict(Counter(row["Tipo di identità"] for row in reviewed)),
        "per_coltura": {
            crop: dict(Counter(row["Esito verifica nome"] for row in reviewed
                               if row["Coltura"] == crop))
            for crop in evidence["consulted_by_crop"]
        },
        "fonti": sources,
        "relazioni": [
            {"id": f"R{index:02}", **relation}
            for index, relation in enumerate(relations, 1)
        ],
        "profili_accorpati": 0,
        "nomi_originali_modificati": 0,
    }


def render_identity_report(rows, summary):
    esc = html.escape
    totals = "".join(
        f"<li>{esc(status)}: {count}</li>"
        for status, count in summary["esiti"].items()
    )
    body = []
    for row in rows:
        body.append("<tr>" + "".join(
            f"<td>{esc(str(row[column]))}</td>"
            for column in (
                "Coltura", "Varietà", "Tipo di identità", "Esito verifica nome",
                "Denominazione documentata o candidata", "Riscontro identità",
                "Relazioni identità",
            )
        ) + "<td>" + "<br>".join(
            f'<a href="{esc(url, quote=True)}">{esc(url)}</a>'
            for url in row["Fonti identità"].split(" | ") if url
        ) + "</td><td>" + "<br>".join(
            f'<a href="{esc(url, quote=True)}">Fonte consultata {index}</a>'
            for index, url in enumerate(
                row["Fonti consultate per coltura"].split(" | "), 1
            )
        ) + "</td></tr>")
    links = "".join(
        f'<li id="fonte-{esc(source_id)}"><a href="{esc(info["url"], quote=True)}">'
        f'{esc(info["title"])}</a> — {esc(info["access"])}. '
        f'{esc(info["scope"])}</li>'
        for source_id, info in summary["fonti"].items()
    )
    relations = "".join(
        f'<li><strong>{esc(relation["id"])}: {esc(relation["type"])}</strong> — '
        + esc(" / ".join(f"{crop}: {name}" for crop, name in relation["members"]))
        + f'. {esc(relation["reason"])} Fonti: '
        + ", ".join(
            f'<a href="#fonte-{esc(source_id)}">{esc(source_id)}</a>'
            for source_id in relation["sources"]
        ) + "</li>"
        for relation in summary["relazioni"]
    )
    return f"""<!doctype html><html lang="it"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verifica delle identità del catalogo colture</title>
<style>body{{font:16px/1.5 system-ui;margin:24px;color:#183e2a}}
table{{border-collapse:collapse;width:100%;font-size:14px}}td,th{{padding:8px;border:1px solid #ddd;vertical-align:top}}
a{{overflow-wrap:anywhere;color:#175634}}.scroll{{overflow-x:auto}}li{{margin:8px 0}}
@media print{{body{{margin:0}}table{{font-size:9px}}}}</style>
<h1>Verifica dei nomi: {len(rows)} profili</h1>
<p>Data: {esc(summary["data_revisione"])}. Revisione offline riproducibile;
nessun collegamento a database, nessuna modifica a osservazioni o Production.</p>
<ul>{totals}</ul>
<h2>Come leggere gli esiti</h2>
<p>DOCUMENTATO significa che la fonte attesta il nome o la categoria indicata:
non certifica l'attuale iscrizione in Italia, il clone del materiale, la destinazione
commerciale né i valori N/NDVI. PARZIALMENTE_VERIFICATO segnala un'identità incompleta
o da disambiguare. NON_VERIFICATO indica evidenza insufficiente, mai inesistenza.</p>
<p>Tutti i 493 nomi sono stati confrontati con le fonti disponibili per la rispettiva
coltura. Questo è un confronto documentale con copertura limitata, non una ricerca
esaustiva in ogni registro mondiale né una ricerca web individuale per ciascun nome.
L'accesso parziale o solo tramite estratti indicizzati è dichiarato nelle fonti.
Per i nomi senza attestazione è conservato l'elenco delle fonti consultate, non una
falsa fonte di conferma.</p>
<p>Righe originali conservate, zero fusioni o rinomine. Le denominazioni candidate
sono proposte di verifica, non sostituzioni. Le relazioni non autorizzano trasferimenti
di rese, dosi o osservazioni. I cinque kiwi maschili/portinnesto restano SOLO_ANAGRAFICA
con parametri produttivi non disponibili. Ogni calcolo automatico resta disabilitato.</p>
<h2>Relazioni fra nomi da non risolvere automaticamente</h2><ul>{relations}</ul>
<h2>Esito per ogni profilo</h2><div class="scroll"><table>
<thead><tr><th>Coltura</th><th>Nome originale</th><th>Tipo</th><th>Esito nome</th>
<th>Denominazione documentata o candidata</th><th>Riscontro e limiti</th>
<th>Relazioni</th><th>Fonti dell'attestazione</th><th>Fonti consultate</th></tr></thead>
<tbody>{"".join(body)}</tbody></table></div>
<h2>Fonti e limiti della consultazione</h2><ul>{links}</ul></html>"""
