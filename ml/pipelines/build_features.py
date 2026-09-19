"""
VYAVSAYMITRA — Production Leakage-Free Feature Engineering Pipeline
Prepares strictly chronological and stratified feature splits from data/validated/.
Fits scalers and encoders ONLY on training data.
Persists preprocessors, feature arrays, target vectors, and metadata into data/features/.
"""

import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VALIDATED_DIR = os.path.join(BASE_DIR, 'data', 'validated')
FEATURES_DIR = os.path.join(BASE_DIR, 'data', 'features')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

def build_crop_yield_features():
    print("\n[FEATURE PIPELINE] 1/3 Building Crop Yield Features (Chronological Split)...")
    df = pd.read_csv(os.path.join(VALIDATED_DIR, 'validated_crop_yield.csv'))
    
    # Sort chronologically by crop_year
    df = df.sort_values(by=['crop_year', 'state', 'product']).reset_index(drop=True)
    
    cat_features = ['product', 'season', 'state']
    num_features = ['area', 'annual_rainfall', 'fertilizer', 'pesticide']
    target = 'yield'
    
    # Temporal Split:
    # Train: 1997 - 2015 (~78.2%)
    # Validation: 2016 - 2017 (~10.7%)
    # Test: 2018 - 2020 (~11.0%)
    train_mask = df['crop_year'] <= 2015
    val_mask = df['crop_year'].isin([2016, 2017])
    test_mask = df['crop_year'] >= 2018
    
    train_df = df[train_mask]
    val_df = df[val_mask]
    test_df = df[test_mask]
    
    X_train = train_df[cat_features + num_features]
    y_train = train_df[target]
    
    X_val = val_df[cat_features + num_features]
    y_val = val_df[target]
    
    X_test = test_df[cat_features + num_features]
    y_test = test_df[target]
    
    # Preprocessor fitted ONLY on training data!
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_features),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_features)
        ]
    )
    
    X_train_trans = preprocessor.fit_transform(X_train)
    X_val_trans = preprocessor.transform(X_val)
    X_test_trans = preprocessor.transform(X_test)
    
    joblib.dump(preprocessor, os.path.join(FEATURES_DIR, 'crop_yield_preprocessor.joblib'))
    joblib.dump({
        'X_train': X_train_trans, 'y_train': y_train.values,
        'X_val': X_val_trans, 'y_val': y_val.values,
        'X_test': X_test_trans, 'y_test': y_test.values,
        'raw_cat_features': cat_features,
        'raw_num_features': num_features,
        'target': target,
        'split_type': 'chronological_by_crop_year',
        'train_years': '1997-2015',
        'val_years': '2016-2017',
        'test_years': '2018-2020',
        'n_train': len(X_train), 'n_val': len(X_val), 'n_test': len(X_test),
        'n_features_trans': X_train_trans.shape[1]
    }, os.path.join(FEATURES_DIR, 'crop_yield_features.joblib'))
    
    print(f"      Rows: Train={len(X_train)} (1997-2015), Val={len(X_val)} (2016-2017), Test={len(X_test)} (2018-2020)")
    print(f"      Total Transformed Features: {X_train_trans.shape[1]}")

def build_crop_suitability_features():
    print("\n[FEATURE PIPELINE] 2/3 Building Crop Suitability Features (Stratified Split)...")
    df = pd.read_csv(os.path.join(VALIDATED_DIR, 'validated_crop_recommendation.csv'))
    
    feature_cols = ['n', 'p', 'k', 'temperature', 'humidity', 'ph', 'rainfall']
    target_col = 'product'
    
    X = df[feature_cols]
    y = df[target_col]
    
    # 70% Train, 15% Val, 15% Test with stratification
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=0.17647, random_state=42, stratify=y_train_val
    )
    
    # Scaler fitted ONLY on training data!
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)
    
    joblib.dump(scaler, os.path.join(FEATURES_DIR, 'crop_suitability_scaler.joblib'))
    joblib.dump({
        'X_train': X_train_scaled, 'y_train': y_train.values,
        'X_val': X_val_scaled, 'y_val': y_val.values,
        'X_test': X_test_scaled, 'y_test': y_test.values,
        'feature_cols': feature_cols,
        'target_classes': sorted(list(df[target_col].unique())),
        'split_type': 'stratified_by_crop',
        'n_train': len(X_train), 'n_val': len(X_val), 'n_test': len(X_test)
    }, os.path.join(FEATURES_DIR, 'crop_suitability_features.joblib'))
    
    print(f"      Rows: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")
    print(f"      Classes: {len(df[target_col].unique())} (Stratified 70/15/15)")

def build_mandi_price_features():
    print("\n[FEATURE PIPELINE] 3/3 Building Mandi Market Price Features (Strict Chronological Split)...")
    df = pd.read_csv(os.path.join(VALIDATED_DIR, 'validated_mandi_prices.csv'))
    
    # Filter top 25 high-volume commodities for robust statistical modeling
    top_commodities = df['product'].value_counts().head(25).index
    df_sub = df[df['product'].isin(top_commodities)].copy()
    
    # Sort chronologically by date
    df_sub = df_sub.sort_values(by=['date', 'state', 'product']).reset_index(drop=True)
    
    cat_features = ['product', 'state', 'month']
    num_features = ['year', 'arrival_quantity']
    target = 'market_price'
    
    # Chronological Split:
    # Train: Dates before 2016-03 (~62.3% of timeline)
    # Validation: 2016-03 to 2016-06 (~17.0% of timeline)
    # Test: Dates after 2016-06 (~20.7% of timeline)
    train_mask = df_sub['date'] < '2016-03'
    val_mask = (df_sub['date'] >= '2016-03') & (df_sub['date'] <= '2016-06')
    test_mask = df_sub['date'] > '2016-06'
    
    train_df = df_sub[train_mask]
    val_df = df_sub[val_mask]
    test_df = df_sub[test_mask]
    
    X_train = train_df[cat_features + num_features]
    y_train = train_df[target]
    
    X_val = val_df[cat_features + num_features]
    y_val = val_df[target]
    
    X_test = test_df[cat_features + num_features]
    y_test = test_df[target]
    
    # Preprocessor fitted ONLY on training data!
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_features),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_features)
        ]
    )
    
    X_train_trans = preprocessor.fit_transform(X_train)
    X_val_trans = preprocessor.transform(X_val)
    X_test_trans = preprocessor.transform(X_test)
    
    joblib.dump(preprocessor, os.path.join(FEATURES_DIR, 'mandi_price_preprocessor.joblib'))
    joblib.dump({
        'X_train': X_train_trans, 'y_train': y_train.values,
        'X_val': X_val_trans, 'y_val': y_val.values,
        'X_test': X_test_trans, 'y_test': y_test.values,
        'raw_cat_features': cat_features,
        'raw_num_features': num_features,
        'target': target,
        'top_commodities': list(top_commodities),
        'split_type': 'chronological_by_date',
        'train_date_range': f"{train_df['date'].min()} to {train_df['date'].max()}",
        'val_date_range': f"{val_df['date'].min()} to {val_df['date'].max()}",
        'test_date_range': f"{test_df['date'].min()} to {test_df['date'].max()}",
        'n_train': len(X_train), 'n_val': len(X_val), 'n_test': len(X_test),
        'n_features_trans': X_train_trans.shape[1]
    }, os.path.join(FEATURES_DIR, 'mandi_price_features.joblib'))
    
    print(f"      Rows: Train={len(X_train)} (< 2016-03), Val={len(X_val)} (2016-03 to 2016-06), Test={len(X_test)} (> 2016-06)")
    print(f"      Total Transformed Features: {X_train_trans.shape[1]}")

def main():
    os.makedirs(FEATURES_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    print("=" * 65)
    print("VYAVSAYMITRA: PRODUCTION LEAKAGE-FREE FEATURE EXTRACTION PIPELINE")
    print("=" * 65)
    
    build_crop_yield_features()
    build_crop_suitability_features()
    build_mandi_price_features()
    
    print("\n[SUCCESS] All leakage-free feature matrices persisted to data/features/")
    print("=" * 65)

if __name__ == '__main__':
    main()
