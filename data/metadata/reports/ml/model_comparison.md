# VYAVSAYMITRA — Production ML Model Comparison & Hardening Report

*Generated on: 2026-09-19T09:46:24.852761+00:00*

## 1. Crop Yield Regression (Chronological Split: Train 1997-2015, Val 2016-2017, Test 2018-2020)

| Model | CV R² (Mean±Std) | Val R² | Test R² | Test MAE | Train-Val Gap | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Median Baseline | -0.0083±0.0014 | -0.0078 | -0.0073 | 75.9813 | -0.0004 | Evaluated Baseline |
| Linear Regression | 0.8699±0.0286 | 0.9259 | 0.8840 | 55.2964 | -0.0551 | Evaluated Baseline |
| Ridge Regression | 0.8646±0.0242 | 0.9211 | 0.8763 | 57.2807 | -0.0548 | Evaluated Baseline |
| Random Forest | 0.9615±0.0157 | 0.9829 | 0.9644 | 12.3106 | 0.0039 | **SELECTED (Production)** |
| Gradient Boosting | 0.9606±0.0164 | 0.9716 | 0.9517 | 14.8835 | 0.0278 | Evaluated Baseline |
| XGBoost | 0.9572±0.0184 | 0.9737 | 0.9392 | 17.9659 | 0.0235 | Evaluated Baseline |
| LightGBM | 0.9362±0.0196 | 0.9763 | 0.9242 | 20.2817 | -0.0052 | Evaluated Baseline |

## 2. Crop Suitability Multi-Class Classification (Stratified 70/15/15 Split)

| Model | CV Macro F1 (Mean±Std) | Val F1 | Test Acc | Test Macro F1 | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Majority Baseline | 0.0040±0.0000 | 0.0040 | 0.0455 | 0.0040 | Evaluated Baseline |
| Logistic Regression | 0.9633±0.0117 | 0.9762 | 0.9758 | 0.9755 | Evaluated Baseline |
| Random Forest | 0.9908±0.0048 | 0.9970 | 0.9939 | 0.9939 | **SELECTED (Production)** |
| Gradient Boosting | 0.9760±0.0119 | 0.9939 | 0.9879 | 0.9880 | Evaluated Baseline |
| XGBoost | 0.9851±0.0060 | 0.9878 | 0.9909 | 0.9909 | Evaluated Baseline |

## 3. Mandi Market Price Regression (Strict Chronological TimeSeriesSplit)

| Model | CV R² (Mean±Std) | Val R² | Test R² | Test MAE (INR) | Test MAPE (%) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Median Baseline | -0.1344±0.0673 | -0.2489 | -0.1510 | ₹1769.53 | 75.97% | Evaluated Baseline |
| Linear Regression | 0.7343±0.1615 | 0.8138 | 0.4299 | ₹1406.98 | 81.85% | Evaluated Baseline |
| Ridge Regression | 0.7301±0.1609 | 0.8123 | 0.4330 | ₹1404.37 | 82.14% | Evaluated Baseline |
| Random Forest | 0.6963±0.1332 | 0.8434 | 0.4843 | ₹1110.77 | 46.98% | **SELECTED (Production)** |
| Gradient Boosting | 0.7027±0.1408 | 0.8106 | 0.4814 | ₹1097.37 | 47.68% | Evaluated Baseline |
| XGBoost | 0.7008±0.1429 | 0.8246 | 0.4638 | ₹1116.66 | 47.88% | Evaluated Baseline |
| LightGBM | 0.7023±0.1439 | 0.8272 | 0.4695 | ₹1116.31 | 49.81% | Evaluated Baseline |

## 4. Models Excluded from Tabular ML Due to Lack of Row-Level Data

- **Micro-Dairy Farm Profit Regressor (dairy)**: Authoritative bank loan appraisal relies on official NABARD techno-economic model parameters (lactation cycles, feed conversion, cattle valuation) rather than tabular regression on synthetic data. Fabricating synthetic dairy farm rows would violate Phase 24 NO FAKE DATA policy.
  - *Production Alternative:* Deterministic NABARD Engineering Engine (NABARD-MBP-2024-V1) with live Mandi feed and milk price inputs.

- **Poultry Broiler Batch Mortality ML Regressor (poultry)**: Standard poultry broiler batches operate under standardized commercial FCR curves (1.65) and established veterinary mortality ranges (3-4%) certified by NABARD/CPDO. Training a black-box model without 10,000+ real batch telemetry sensors is technically unsound.
  - *Production Alternative:* Deterministic NABARD Broiler Financial Engine with live Mandi poultry live-weight prices.

