"""
VYAVSAYMITRA — End-to-End Data & ML Pipeline Test Suite
Validates dataset integrity, feature engineering pipelines, model training artifacts,
and inference prediction modules against quality assurance benchmarks.
"""

import os
import json
import unittest
import joblib
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_RAW = os.path.join(BASE_DIR, 'data', 'raw')
DATA_PROCESSED = os.path.join(BASE_DIR, 'data', 'processed')
DATA_VALIDATED = os.path.join(BASE_DIR, 'data', 'validated')
DATA_FEATURES = os.path.join(BASE_DIR, 'data', 'features')
DATA_METADATA = os.path.join(BASE_DIR, 'data', 'metadata')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

class TestDataPipeline(unittest.TestCase):
    
    def test_01_metadata_files_exist(self):
        """Verify registry, dictionary, and cleaning audit logs exist and are valid JSON."""
        registry_path = os.path.join(DATA_METADATA, 'dataset_registry.json')
        dict_path = os.path.join(DATA_METADATA, 'data_dictionary.json')
        audit_path = os.path.join(DATA_METADATA, 'cleaning_audit_log.json')
        model_reg_path = os.path.join(MODELS_DIR, 'registry.json')
        
        for path in [registry_path, dict_path, audit_path, model_reg_path]:
            self.assertTrue(os.path.exists(path), f"Missing metadata file: {path}")
            with open(path, 'r') as f:
                data = json.load(f)
                self.assertIsNotNone(data)
                
    def test_02_validated_datasets_exist_and_non_empty(self):
        """Verify validated canonical datasets exist and meet row count floors."""
        validated_files = {
            'validated_mandi_prices.csv': 50000,
            'validated_crop_yield.csv': 15000,
            'validated_crop_recommendation.csv': 2000,
            'validated_cost_of_cultivation.csv': 10,
            'validated_government_schemes.json': 4,
            'validated_nabard_benchmarks.json': 3
        }
        
        for fname, min_rows in validated_files.items():
            fpath = os.path.join(DATA_VALIDATED, fname)
            self.assertTrue(os.path.exists(fpath), f"Missing validated file: {fname}")
            if fname.endswith('.csv'):
                df = pd.read_csv(fpath)
                self.assertGreaterEqual(len(df), min_rows, f"{fname} row count {len(df)} < {min_rows}")
            elif fname.endswith('.json'):
                with open(fpath, 'r') as f:
                    data = json.load(f)
                    self.assertGreaterEqual(len(data), min_rows, f"{fname} length < {min_rows}")

    def test_03_features_and_preprocessors_exist(self):
        """Verify persisted feature matrices and scikit-learn preprocessors."""
        preprocessors = [
            'crop_yield_preprocessor.joblib',
            'crop_suitability_scaler.joblib',
            'mandi_price_preprocessor.joblib'
        ]
        for prep in preprocessors:
            fpath = os.path.join(DATA_FEATURES, prep)
            self.assertTrue(os.path.exists(fpath), f"Missing preprocessor: {prep}")
            obj = joblib.load(fpath)
            self.assertIsNotNone(obj)

    def test_04_trained_models_exist_and_loadable(self):
        """Verify trained models exist and can be loaded with joblib."""
        models = [
            'crop_yield_rf_model.joblib',
            'crop_suitability_rfc_model.joblib',
            'mandi_price_gbr_model.joblib'
        ]
        for m in models:
            mpath = os.path.join(MODELS_DIR, m)
            self.assertTrue(os.path.exists(mpath), f"Missing model: {m}")
            model = joblib.load(mpath)
            self.assertTrue(hasattr(model, 'predict'), f"Model {m} lacks predict method")

    def test_05_model_evaluation_metrics_pass_thresholds(self):
        """Verify model evaluation report records passing performance against benchmarks."""
        eval_report_path = os.path.join(DATA_METADATA, 'model_evaluation_report.json')
        self.assertTrue(os.path.exists(eval_report_path), "Missing model evaluation report")
        with open(eval_report_path, 'r') as f:
            report = json.load(f)
            
        models_eval = report.get('models', {})
        # Crop Yield: R2 >= 0.85
        self.assertGreaterEqual(models_eval['crop_yield_predictor']['r2_score'], 0.85)
        # Crop Suitability: Accuracy >= 0.95
        self.assertGreaterEqual(models_eval['crop_suitability_classifier']['accuracy'], 0.95)
        # Mandi Price: R2 >= 0.60
        self.assertGreaterEqual(models_eval['mandi_price_predictor']['r2_score'], 0.60)

    def test_06_python_inference_execution(self):
        """Verify direct Python inference calls on sample inputs."""
        from ml.inference.predict import predict_crop_yield, predict_crop_suitability, predict_mandi_price
        
        # 1. Crop Yield
        yield_res = predict_crop_yield({
            "product": "Wheat",
            "season": "Rabi",
            "state": "Gujarat",
            "area": 2.5,
            "annual_rainfall": 800.0,
            "fertilizer": 300.0,
            "pesticide": 10.0
        })
        self.assertIn("predicted_yield_per_ha", yield_res)
        self.assertGreater(yield_res["predicted_yield_per_ha"], 0)
        self.assertEqual(yield_res["source_type"], "ml_model")
        
        # 2. Crop Suitability
        suit_res = predict_crop_suitability({
            "n": 90, "p": 42, "k": 43,
            "temperature": 20.8, "humidity": 82.0, "ph": 6.5, "rainfall": 202.9
        })
        self.assertIn("recommended_crop", suit_res)
        self.assertEqual(suit_res["source_type"], "ml_model")
        
        # 3. Mandi Price Production Call: Enforces stale_data governance guard
        price_res = predict_mandi_price({
            "product": "Wheat(Husked)",
            "state": "Maharashtra",
            "month": "April",
            "year": 2026,
            "arrival_quantity": 300.0
        })
        self.assertEqual(price_res["status"], "stale_data")
        self.assertEqual(price_res["model_status"], "stale_data")

        # Mandi Price Research Call: With allow_stale_research_inference=True
        price_res_research = predict_mandi_price({
            "product": "Wheat(Husked)",
            "state": "Maharashtra",
            "month": "April",
            "year": 2026,
            "arrival_quantity": 300.0,
            "allow_stale_research_inference": True
        })
        self.assertIn("predicted_modal_price_inr_per_qtl", price_res_research)
        self.assertGreater(price_res_research["predicted_modal_price_inr_per_qtl"], 1000)
        self.assertEqual(price_res_research["source_type"], "ml_model")

if __name__ == '__main__':
    unittest.main()
