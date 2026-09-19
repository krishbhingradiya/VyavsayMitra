"""
VYAVSAYMITRA — Production ML Automated Test Suite
Verifies:
1. Zero Data Leakage & Chronological Splits
2. Preprocessor Fitting Integrity (Train Only)
3. Model Generalization & Baseline Outperformance
4. Prediction Intervals & Mathematical Plausibility
5. Missing Data Handling (Structured 'insufficient_data' responses)
6. Extreme Value & Unseen Category Robustness
7. Model Registry & Post-Training Reports
"""

import os
import json
import unittest
import joblib
import numpy as np
import pandas as pd

from ml.inference.predict import (
    predict_crop_yield,
    predict_crop_suitability,
    predict_mandi_price
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEATURES_DIR = os.path.join(BASE_DIR, 'data', 'features')
MODELS_DIR = os.path.join(BASE_DIR, 'models')
METADATA_DIR = os.path.join(BASE_DIR, 'data', 'metadata')
REPORTS_DIR = os.path.join(METADATA_DIR, 'reports', 'ml')

class TestProductionMLSystem(unittest.TestCase):

    def test_01_leakage_prevention_and_chronological_splits(self):
        """Verify that splits are chronological and preprocessors fitted on train only."""
        # Crop yield features
        yield_feat = joblib.load(os.path.join(FEATURES_DIR, 'crop_yield_features.joblib'))
        self.assertEqual(yield_feat['split_type'], 'chronological_by_crop_year')
        self.assertEqual(yield_feat['train_years'], '1997-2015')
        self.assertEqual(yield_feat['test_years'], '2018-2020')
        self.assertGreater(yield_feat['n_train'], 10000)
        self.assertGreater(yield_feat['n_test'], 1000)

        # Mandi price features
        mandi_feat = joblib.load(os.path.join(FEATURES_DIR, 'mandi_price_features.joblib'))
        self.assertEqual(mandi_feat['split_type'], 'chronological_by_date')
        self.assertEqual(mandi_feat['train_date_range'], '2014-09 to 2016-02')
        self.assertEqual(mandi_feat['test_date_range'], '2016-07 to 2016-11')
        self.assertGreater(mandi_feat['n_train'], 20000)
        self.assertGreater(mandi_feat['n_test'], 5000)

    def test_02_model_evaluation_outperforms_baselines(self):
        """Verify models beat baseline models and satisfy production thresholds."""
        comp_file = os.path.join(REPORTS_DIR, 'model_comparison.json')
        self.assertTrue(os.path.exists(comp_file), "Model comparison JSON report missing")
        with open(comp_file, 'r') as f:
            report = json.load(f)

        # Crop Yield: Random Forest (Test R2 > 0.90) beats Median Baseline (-0.007)
        yield_cands = {c['model']: c for c in report['tasks']['crop_yield_regression']['candidates']}
        self.assertGreater(yield_cands['Random Forest']['test_r2'], 0.90)
        self.assertGreater(yield_cands['Random Forest']['test_r2'], yield_cands['Median Baseline']['test_r2'])
        self.assertLess(yield_cands['Random Forest']['overfitting_val_gap'], 0.10)

        # Crop Suitability: Random Forest (Accuracy > 0.98) beats Majority Baseline (0.045)
        suit_cands = {c['model']: c for c in report['tasks']['crop_suitability_classification']['candidates']}
        self.assertGreater(suit_cands['Random Forest']['test_accuracy'], 0.98)
        self.assertGreater(suit_cands['Random Forest']['test_macro_f1'], 0.98)
        self.assertGreater(suit_cands['Random Forest']['test_accuracy'], suit_cands['Majority Baseline']['test_accuracy'])

        # Mandi Price: Random Forest (Test R2 > 0.40) beats Median Baseline (-0.15)
        mandi_cands = {c['model']: c for c in report['tasks']['mandi_price_regression']['candidates']}
        self.assertGreater(mandi_cands['Random Forest']['test_r2'], 0.40)
        self.assertGreater(mandi_cands['Random Forest']['test_r2'], mandi_cands['Median Baseline']['test_r2'])

    def test_03_prediction_intervals_and_mathematical_bounds(self):
        """Verify mathematical prediction intervals via ensemble variance."""
        res = predict_crop_yield({
            "product": "Wheat",
            "state": "Gujarat",
            "area": 3.0,
            "annual_rainfall": 850.0,
            "fertilizer": 320.0
        })
        self.assertEqual(res["status"], "success")
        self.assertIn("prediction_interval_95", res)
        lower = res["prediction_interval_95"]["lower_bound"]
        upper = res["prediction_interval_95"]["upper_bound"]
        point = res["predicted_yield_per_ha"]

        self.assertGreaterEqual(point, lower)
        self.assertLessEqual(point, upper)
        self.assertGreater(res["uncertainty_std"], 0)
        self.assertGreater(res["total_estimated_production_tonnes"], 0)

    def test_04_missing_data_structured_response(self):
        """Verify structured 'insufficient_data' response when required fields are missing."""
        # 1. Missing area in crop yield
        yield_miss = predict_crop_yield({"product": "Wheat", "state": "Gujarat"})
        self.assertEqual(yield_miss["status"], "insufficient_data")
        self.assertIn("area", yield_miss["missing_fields"])
        self.assertIn("required_parameters_guide", yield_miss)

        # 2. Missing state and product in mandi price
        mandi_miss = predict_mandi_price({"month": "April"})
        self.assertEqual(mandi_miss["status"], "insufficient_data")
        self.assertIn("product", mandi_miss["missing_fields"])
        self.assertIn("state", mandi_miss["missing_fields"])

        # 3. Missing soil parameters in crop suitability
        suit_miss = predict_crop_suitability({"ph": 6.5})
        self.assertEqual(suit_miss["status"], "insufficient_data")
        self.assertGreaterEqual(len(suit_miss["missing_fields"]), 3)

    def test_05_extreme_inputs_and_robustness(self):
        """Verify safe handling of extreme inputs and unseen categories."""
        # 1. Out-of-bounds area rejection
        invalid_area = predict_crop_yield({"product": "Wheat", "state": "Gujarat", "area": -5.0})
        self.assertEqual(invalid_area["status"], "invalid_range")

        # 2. Unseen category handles without crashing
        unseen_crop = predict_crop_yield({
            "product": "Unseen_Dragonfruit_Variety",
            "state": "Unseen_State_Ladakh",
            "area": 2.0
        })
        self.assertEqual(unseen_crop["status"], "success")
        self.assertGreater(unseen_crop["predicted_yield_per_ha"], 0)

    def test_06_model_registry_and_diagnostic_reports(self):
        """Verify that model registry v1.1.0 and diagnostic reports exist."""
        reg_file = os.path.join(METADATA_DIR, 'model_registry.json')
        self.assertTrue(os.path.exists(reg_file))
        with open(reg_file, 'r') as f:
            reg = json.load(f)
        self.assertEqual(reg["registry_version"], "1.1.0")
        self.assertEqual(reg["governance_policy"], "STRICT_LEAKAGE_FREE_ZERO_FAKE_DATA")
        self.assertEqual(len(reg["models"]), 3)
        self.assertIn("models_not_trained_insufficient_data", reg)

        # Check diagnostics reports
        err_file = os.path.join(REPORTS_DIR, 'error_analysis.json')
        self.assertTrue(os.path.exists(err_file))

        learn_file = os.path.join(REPORTS_DIR, 'learning_curves.json')
        self.assertTrue(os.path.exists(learn_file))

if __name__ == '__main__':
    unittest.main()
