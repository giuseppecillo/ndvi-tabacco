"""Synthetic comparisons only: these fixtures are not agronomic recommendations."""
import copy
import unittest

from catalogue_averages import context_for, estimate, validate_observations


class CohortAverageTests(unittest.TestCase):
    def setUp(self):
        self.sources = {"s": {"url": "https://example.org/synthetic-trial"}}
        self.context = {
            "crop": "Synthetic crop", "destination": "Synthetic destination",
            "earliness": "Early", "cycle": "Synthetic spring",
            "production_system": "Synthetic open field",
        }
        self.target = {
            "name": "Target", "crop": self.context["crop"],
            "destination": self.context["destination"],
            "comparison_context": dict(self.context),
        }
        self.observations = [self.observation("A", "10.0"), self.observation("B", "20.0")]

    def observation(self, variety, value, parameter="Resa media (t/ha)"):
        return {
            "id": variety, "variety": variety, "canonical_variety": variety,
            "parameter": parameter, "value": value, "unit": "t/ha",
            "origin": "SPECIFIC_MEASURED", "decimal_places": 1,
            "sources": ["s"], "source_sample_size": 3,
            "locator": "Synthetic table", "method": "Synthetic measurement",
            "context": dict(self.context),
        }

    def run_estimate(self, observations=None, target=None, parameter="Resa media (t/ha)"):
        return estimate(target or self.target, parameter,
                        self.observations if observations is None else observations, self.sources)

    def test_equal_weight_average_with_full_provenance(self):
        value, meta = self.run_estimate()
        self.assertEqual(value, "15,0")
        self.assertEqual(meta["stato"], "MEDIA_PER_ANALOGIA")
        self.assertEqual(meta["numerosita_varieta"], 2)
        self.assertEqual(meta["intervallo_valori_origine"], ["10.0", "20.0"])
        self.assertEqual([r["canonical_variety"] for r in meta["riferimenti"]], ["A", "B"])
        self.assertEqual(meta["fonti"], ["https://example.org/synthetic-trial"])
        self.assertFalse(meta["validazione_varietale_da_analogia"])

    def test_specific_value_wins_over_average(self):
        observations = self.observations + [self.observation("Target", "12.0")]
        value, meta = self.run_estimate(observations)
        self.assertEqual(value, "12,0")
        self.assertEqual(meta["stato"], "SPECIFICO_DOCUMENTATO")
        self.assertEqual(meta["numerosita_varieta"], 1)

    def test_one_reference_is_transferred_not_multivariety_mean(self):
        value, meta = self.run_estimate(self.observations[:1])
        self.assertEqual(value, "10,0")
        self.assertEqual(meta["stato"], "VALORE_TRASFERITO")
        self.assertEqual(meta["numerosita_varieta"], 1)
        self.assertEqual(meta["riferimenti"][0]["source_sample_size"], 3)

    def test_cultivars_not_weighted_by_sample_size(self):
        observations = copy.deepcopy(self.observations)
        observations[0]["source_sample_size"] = 1000
        self.assertEqual(self.run_estimate(observations)[0], "15,0")

    def test_different_earliness_crop_destination_cycle_system_never_mix(self):
        for field in self.context:
            observations = copy.deepcopy(self.observations)
            for obs in observations:
                obs["context"][field] = "Incompatible"
            with self.subTest(field=field):
                self.assertIsNone(self.run_estimate(observations))

    def test_unknown_target_earliness_cannot_form_unknown_cohort(self):
        for bad in ("", "UNKNOWN", "N/D", "?"):
            target = copy.deepcopy(self.target)
            target["comparison_context"]["earliness"] = bad
            with self.subTest(bad=bad):
                self.assertIsNone(self.run_estimate(target=target))

    def test_unknown_source_earliness_is_rejected(self):
        observations = copy.deepcopy(self.observations)
        observations[0]["context"]["earliness"] = ""
        with self.assertRaisesRegex(ValueError, "precocità"):
            self.run_estimate(observations)

    def test_synonyms_lots_and_repeat_observations_not_independent(self):
        observations = copy.deepcopy(self.observations)
        observations[1].update({"variety": "Alias of A", "canonical_variety": " a "})
        with self.assertRaisesRegex(ValueError, "duplicati"):
            self.run_estimate(observations)

    def test_recursive_or_unvalidated_origin_rejected(self):
        for bad in ("MEDIA_PER_ANALOGIA", "VALORE_TRASFERITO", "FORNITO_NON_VALIDATO"):
            observations = copy.deepcopy(self.observations)
            observations[0]["origin"] = bad
            with self.subTest(origin=bad), self.assertRaisesRegex(ValueError, "non ammessi"):
                self.run_estimate(observations)

    def test_units_finiteness_source_and_precision_checked(self):
        for field, value in (
            ("unit", "kg/plot"), ("value", "NaN"), ("value", "Infinity"),
            ("value", True), ("value", "-2"), ("value", "0"),
            ("decimal_places", 3), ("value", "10.01"), ("sources", ["absent"]),
            ("source_sample_size", 0),
        ):
            observations = copy.deepcopy(self.observations)
            observations[0][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                self.run_estimate(observations)

    def test_mean_uses_coarsest_source_precision_not_false_precision(self):
        observations = copy.deepcopy(self.observations)
        observations[0].update({"value": "11", "decimal_places": 0})
        self.assertEqual(self.run_estimate(observations)[0], "16")

    def test_empty_sources_never_produce_zero(self):
        self.assertIsNone(self.run_estimate([]))

    def test_ndvi_requires_matching_phase_sensor_geometry_and_mask(self):
        context = {
            **self.context, "phase": "Synthetic development", "bbch": "12-14",
            "sensor": "Synthetic sensor", "bands": "Synthetic red/NIR",
            "measurement_geometry": "Synthetic nadir",
            "soil_canopy_mask": "Synthetic canopy only",
        }
        target = copy.deepcopy(self.target)
        target["phase_contexts"] = {"F1": context}
        observations = []
        for name, value in (("A", ".4"), ("B", ".6")):
            obs = self.observation(name, value, "NDVI F1")
            obs.update({"unit": "adimensionale", "context": dict(context)})
            observations.append(obs)
        self.assertEqual(self.run_estimate(observations, target, "NDVI F1")[0], "0,5")
        for field in ("phase", "bbch", "sensor", "bands", "measurement_geometry", "soil_canopy_mask"):
            changed = copy.deepcopy(target)
            changed["phase_contexts"]["F1"][field] = "Incompatible"
            with self.subTest(field=field):
                self.assertIsNone(self.run_estimate(observations, changed, "NDVI F1"))

    def test_n_requirements_removals_and_fertilizer_doses_never_mix(self):
        target = copy.deepcopy(self.target)
        target["comparison_context"]["nitrogen_quantity"] = "FERTILIZER_DOSE"
        observations = []
        for name, value in (("A", "100"), ("B", "120")):
            obs = self.observation(name, value, "Azoto Totale (kg/ha)")
            obs.update({"unit": "kg N/ha", "context": {
                **self.context, "nitrogen_quantity": "PLANT_REQUIREMENT"}})
            observations.append(obs)
        self.assertIsNone(self.run_estimate(observations, target, "Azoto Totale (kg/ha)"))
        for obs in observations:
            obs["context"]["nitrogen_quantity"] = "FERTILIZER_DOSE"
        self.assertEqual(self.run_estimate(observations, target, "Azoto Totale (kg/ha)")[0], "110,0")

    def test_non_numeric_earliness_and_bbch_codes_are_not_averaged(self):
        for parameter in ("Precocità", "BBCH F1", "Destinazione"):
            with self.subTest(parameter=parameter), self.assertRaises(ValueError):
                self.run_estimate(parameter=parameter)


if __name__ == "__main__":
    unittest.main()
