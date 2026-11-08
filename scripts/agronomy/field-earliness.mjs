/**
 * Offline only. No database, network, environment access or fitting on holdouts.
 * Caller supplies an explicitly authorized, de-identified reference experiment.
 */
import {calculateCrop, getCropReference} from "../../lib/crop-calculations/src/index.ts";
import {calcolaPomodoro, POMODORO_DB} from "../../lib/tomato-calculations/src/index.ts";
import {riferimentoNdviTabacco, calcolaDoseNTabacco} from "../../lib/tobacco-calculations/src/index.ts";
import {ndviOttimaleGrano, calcolaDoseNGrano, faseGranoDaBbch, GRANO_DURO_DB} from "../../lib/grain-calculations/src/index.ts";

const text = v => typeof v === "string" && v.trim().length > 0;
const norm = v => v.trim().normalize("NFC").toLocaleLowerCase("it-IT").replace(/\s+/g, " ");
const nonnegative = v => Number.isFinite(v) && v >= 0;
const ndvi = v => Number.isFinite(v) && v >= 0 && v <= 1;
const date = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
  && v.slice(0, 4) !== "0000" && Number.isFinite(Date.parse(v))
  && new Date(v).toISOString().slice(0, 10) === v;
const fail = code => { throw new Error(code); };
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

export function blockedFieldReport(reason = "INDEPENDENT_ADEQUATE_N_FIELD_CAMPAIGNS_NOT_SUPPLIED") {
  return {
    status: "BLOCKED", reason, samples: 0, comparison: null, doseImpact: null,
    decision: "DO_NOT_ACTIVATE", applicationChanged: false, supabaseWrites: false,
    customerDataRead: false,
  };
}

// Candidate changes ONLY the NDVI reference, not the current nitrogen plan.
// No generic phase targets, unknown varieties or unsupported BBCH fallbacks.
export function currentFieldModel(row) {
  const input = row.modelInput;
  if (!input || !nonnegative(input.applied)) fail("INVALID_MODEL_INPUT");
  if (row.crop === "tabacco") {
    if (!nonnegative(input.totalN) || !nonnegative(input.phaseN)
      || !text(input.planEvidence) || !["standard", "avanzata", "extra"].includes(input.seedlingAge))
      fail("INVALID_TOBACCO_PLAN");
    const reference = riferimentoNdviTabacco(row.day, input.seedlingAge).ottimale;
    return {reference, totalN: input.totalN, quota: input.phaseN, applied: input.applied,
      dose: (media, ottimale, applied = input.applied, quota = input.phaseN) =>
        calcolaDoseNTabacco({media, ottimale, fabbisognoN: quota,
          azotoTotale: input.totalN, azotoGiaDistribuito: applied}).dose};
  }
  if (row.crop === "grano duro") {
    if (!Object.hasOwn(GRANO_DURO_DB, row.variety) || !nonnegative(input.totalN)
      || !text(input.planEvidence)) fail("INVALID_GRAIN_PLAN");
    const fase = faseGranoDaBbch(row.bbch, row.variety);
    // Non-N phases need an explicit independently confirmed zero-N declaration.
    if ((!fase && input.zeroNPhase !== true) || (fase && fase.label !== row.phase)
      || (fase && input.zeroNPhase === true)) fail("UNCONFIRMED_GRAIN_PHASE");
    const reference = ndviOttimaleGrano(row.day);
    const doseResult = (media, ndviOttimale, applied = input.applied, zero = false) =>
      calcolaDoseNGrano({media, ndviOttimale, azotoGiaDistribuito: applied,
        fabbisognoN: input.totalN, fase: zero ? null : fase, valoriValidi: true});
    return {reference, totalN: input.totalN, applied: input.applied,
      quota: doseResult(0, reference).quotaBase,
      dose: (media, ref, applied, quota) => doseResult(media, ref, applied, quota === 0).quotaProposta};
  }
  if (!Number.isFinite(input.yield) || input.yield <= 0) fail("INVALID_YIELD");
  let result;
  if (row.crop === "pomodoro") {
    const profile = Object.hasOwn(POMODORO_DB, input.profileId) ? POMODORO_DB[input.profileId] : null;
    if (!profile || profile.nome !== row.variety || profile.precocita !== row.earliness)
      fail("UNKNOWN_TOMATO_PROFILE");
    result = calcolaPomodoro({varieta: input.profileId, fase: row.phase, confermata: true,
      resa: input.yield, azotoGiaDistribuito: input.applied, letture: row.readings});
  } else {
    const resolved = getCropReference(row.crop, row.variety);
    const phase = resolved?.reference.phases.find(p => p.id === row.phase);
    if (!phase || phase.bbch !== row.bbch || resolved.selected.earliness !== row.earliness)
      fail("UNKNOWN_CATALOGUE_PHASE");
    result = calculateCrop({crop: row.crop, variety: row.variety, phase: row.phase,
      confirmed: true, yield: input.yield, applied: input.applied, readings: row.readings});
  }
  if (!result.pronta) fail("CURRENT_MODEL_NOT_READY");
  const {ottimale: reference, azotoTotale: totalN, quota} = result;
  return {reference, totalN, quota, applied: input.applied,
    // Same formula/rounding as the existing catalogue or tomato model.
    dose: (media, ref, applied = input.applied, phaseN = quota) => {
      const raw = phaseN * Math.max(0, ref - media) / ref;
      const rounding = row.crop === "pomodoro" ? raw : raw + Number.EPSILON * Math.abs(raw) * 4;
      return Math.max(0, Math.min(Math.max(0, totalN - applied), phaseN, Math.round(rounding * 10) / 10));
    }};
}

function validateRow(row) {
  if (!row || ["id", "crop", "variety", "earliness", "site", "campaign", "phase", "bbch", "sensor",
    "sensorProtocol", "sourceEvidence"].some(k => !text(row[k]))
    || !/^\d{2}(?:[-–]\d{2})?$/.test(row.bbch)
    || !date(row.date) || !date(row.establishedOn) || !nonnegative(row.day)
    || row.day !== (Date.parse(row.date) - Date.parse(row.establishedOn)) / 86400000
    || row.phaseConfirmed !== true || row.origin !== "independent-reference-experiment"
    || !["calibration", "evaluation"].includes(row.split)
    || !Array.isArray(row.readings) || row.readings.length !== 5 || !row.readings.every(ndvi))
    fail("INVALID_INDEPENDENT_FIELD_SAMPLE");
  // An ordinary deficient observation is never promoted to an optimal target.
  if (row.nitrogen?.status !== "adequate" || row.nitrogen.verified !== true
    || !text(row.nitrogen.method) || !text(row.nitrogen.evidence)
    || !date(row.nitrogen.verifiedOn) || row.nitrogen.verifiedOn !== row.date)
    fail("ADEQUATE_N_NOT_VERIFIED");
  return currentFieldModel(row);
}

const curveKey = r => JSON.stringify([r.crop, r.earliness, r.phase, r.bbch, r.sensor, r.sensorProtocol].map(norm));

function frozenCurves(candidate, calibration) {
  if (!candidate || !text(candidate.id) || !text(candidate.method)
    || !text(candidate.freezeEvidence) || candidate.evaluationUsed !== false
    || !Array.isArray(candidate.trainedOn) || !Array.isArray(candidate.curves) || !candidate.curves.length)
    fail("INVALID_FROZEN_CANDIDATE");
  const expected = new Set(calibration.map(r => r.id));
  if (candidate.trainedOn.length !== expected.size
    || new Set(candidate.trainedOn).size !== expected.size
    || candidate.trainedOn.some(id => !expected.has(id))) fail("CANDIDATE_TRAINING_MANIFEST_MISMATCH");
  const curves = new Map();
  for (const c of candidate.curves) {
    if (["crop", "earliness", "phase", "bbch", "sensor", "sensorProtocol"].some(k => !text(c[k]))
      || !Array.isArray(c.points) || c.points.length < 2
      || c.points.some((p, i) => !nonnegative(p.day) || !ndvi(p.ndvi) || p.ndvi === 0
        || (i > 0 && p.day <= c.points[i - 1].day))) fail("INVALID_CANDIDATE_CURVE");
    const key = curveKey(c);
    if (curves.has(key)) fail("DUPLICATE_CANDIDATE_CURVE");
    if (!calibration.some(row => curveKey(row) === key)) fail("CURVE_WITHOUT_CALIBRATION_CONTEXT");
    curves.set(key, c.points);
  }
  return row => {
    const points = curves.get(curveKey(row));
    if (!points || row.day < points[0].day || row.day > points.at(-1).day)
      fail("CANDIDATE_NOT_COVERING_EVALUATION_SAMPLE");
    const right = points.findIndex(p => p.day >= row.day);
    if (right === 0) return points[0].ndvi;
    const a = points[right - 1], b = points[right];
    return a.ndvi + (b.ndvi - a.ndvi) * (row.day - a.day) / (b.day - a.day);
  };
}

function summary(rows) {
  const mae = key => mean(rows.map(r => Math.abs(r[key] - r.target)));
  const rmse = key => Math.sqrt(mean(rows.map(r => (r[key] - r.target) ** 2)));
  return {samples: rows.length, baselineMae: mae("baseline"), candidateMae: mae("candidate"),
    baselineRmse: rmse("baseline"), candidateRmse: rmse("candidate"),
    maeReduction: mae("baseline") - mae("candidate")};
}

function doseImpact(rows) {
  return {unit: "kg N/ha", samples: rows.length,
    baselineMean: mean(rows.map(r => r.baselineDose)), candidateMean: mean(rows.map(r => r.candidateDose)),
    meanChange: mean(rows.map(r => r.candidateDose - r.baselineDose)),
    meanAbsoluteChange: mean(rows.map(r => Math.abs(r.candidateDose - r.baselineDose))),
    maxAbsoluteChange: Math.max(...rows.map(r => Math.abs(r.candidateDose - r.baselineDose))),
    increased: rows.filter(r => r.candidateDose > r.baselineDose).length,
    decreased: rows.filter(r => r.candidateDose < r.baselineDose).length,
    interpretation: "Dose changes are not proof of agronomic improvement; no independent optimal dose supplied."};
}

function checkDose(model, ref, observed, applied, quota) {
  const dose = model.dose(observed, ref, applied, quota);
  return {
    residual: !Number.isFinite(dose) || dose < 0 || dose > Math.max(0, model.totalN - applied) + 1e-9,
    phaseQuota: dose > quota + 1e-9,
    aboveReference: observed >= ref && dose !== 0,
    zeroNPhase: quota === 0 && dose !== 0,
    exhaustedPlan: applied >= model.totalN && dose !== 0,
  };
}

export function evaluateFieldCampaigns(dataset, candidate, {
  authorizedReferenceData = false,
  // Offline dependency injection for controlled negative tests only. The CLI
  // never supplies this callback; all intake/current-model validation still runs.
  modelForSafetyTest,
} = {}) {
  if (!authorizedReferenceData) fail("EXPLICIT_REFERENCE_DATA_AUTHORIZATION_REQUIRED");
  if (!dataset || dataset.schemaVersion !== 1 || !text(dataset.sourceEvidence)
    || dataset.customerData !== false || dataset.independentFieldData !== true || dataset.synthetic !== false
    || !Array.isArray(dataset.rows)) fail("INVALID_REFERENCE_DATA_MANIFEST");
  if (!dataset.rows.length) return blockedFieldReport();
  const ids = new Set();
  const models = new Map();
  for (const row of dataset.rows) {
    const model = validateRow(row);
    const id = norm(row.id);
    if (ids.has(id)) fail("DUPLICATE_SAMPLE_ID");
    ids.add(id);
    models.set(row.id, modelForSafetyTest ? modelForSafetyTest(row, model) : model);
  }
  const calibration = dataset.rows.filter(r => r.split === "calibration");
  const evaluation = dataset.rows.filter(r => r.split === "evaluation");
  if (!calibration.length || !evaluation.length) fail("BOTH_PARTITIONS_REQUIRED");
  // Separately disjoint identities, NOT merely disjoint cultivar/site/year tuples.
  for (const key of ["variety", "site", "campaign"]) {
    const training = new Set(calibration.map(r => norm(r[key])));
    if (evaluation.some(r => training.has(norm(r[key])))) fail(`PARTITION_LEAKAGE_${key.toUpperCase()}`);
  }
  const predict = frozenCurves(candidate, calibration);
  const counters = () => ({checks: 0, violations: {residual: 0, phaseQuota: 0, aboveReference: 0, zeroNPhase: 0, exhaustedPlan: 0}});
  const safety = {baseline: counters(), candidate: counters(), evidence: "mechanical boundary probes, not field measurements"};
  const pairs = evaluation.map(row => {
    const model = models.get(row.id), ref = predict(row), observed = mean(row.readings);
    for (const [name, reference] of [["baseline", model.reference], ["candidate", ref]]) {
      // Mechanical boundary probes, NEVER reported as field measurements.
      const probes = [
        [observed, model.applied, model.quota],
        [reference, model.applied, model.quota],
        [Math.min(1, reference + .05), model.applied, model.quota],
        [0, model.applied, 0],
        [0, model.totalN, model.quota],
        [0, model.totalN + 10, model.quota],
        [0, Math.max(0, model.totalN - .04), model.quota],
        [0, Math.max(0, model.totalN - .06), model.quota],
        [0, Math.max(0, model.totalN - .4), model.quota],
        [0, Math.max(0, model.totalN - .6), model.quota],
      ];
      for (const probe of probes) {
        const checks = checkDose(model, reference, ...probe);
        safety[name].checks++;
        for (const key of Object.keys(checks)) if (checks[key]) safety[name].violations[key]++;
      }
    }
    return {id: row.id, crop: row.crop, sensor: row.sensor, campaign: row.campaign,
      target: observed, baseline: model.reference, candidate: ref,
      baselineDose: model.dose(observed, model.reference), candidateDose: model.dose(observed, ref)};
  });
  const groupSummaries = key => [...new Set(pairs.map(r => r[key]))].sort().map(value => {
    const subset = pairs.filter(r => r[key] === value);
    return {[key]: value, ...summary(subset), doseImpact: doseImpact(subset)};
  });
  return {
    status: [safety.baseline, safety.candidate].some(s => Object.values(s.violations).some(Boolean))
      ? "SAFETY_FAILED" : "OFFLINE_COMPARISON_ONLY",
    candidateId: candidate.id, calibrationSamples: calibration.length, evaluationSamples: evaluation.length,
    split: "cultivar, site and campaign each entirely disjoint; frozen candidate; no holdout fitting",
    comparison: summary(pairs), doseImpact: doseImpact(pairs), safety,
    byCrop: groupSummaries("crop"), bySensor: groupSummaries("sensor"), byCampaign: groupSummaries("campaign"),
    weighting: "per measurement; repeated readings/campaigns are not independent replicates",
    decision: "DO_NOT_ACTIVATE", applicationChanged: false, supabaseWrites: false, customerDataRead: false,
  };
}
