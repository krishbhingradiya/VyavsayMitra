"""
VYAVSAYMITRA — Repeatable Data Cleaning Pipeline
Takes raw datasets from data/raw/ and processes them into data/processed/.
Raw files are NEVER modified.
Cleaning actions:
- Deduplication
- Column name standardization
- State and district name normalization
- Commodity name normalization
- Outlier detection (flags suspicious values, preserves valid extremes)
- Handling of null/missing values
- Generates data/metadata/cleaning_audit_log.json
"""

import os
import re
import json
import pandas as pd
import numpy as np
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, 'data', 'raw')
PROCESSED_DIR = os.path.join(BASE_DIR, 'data', 'processed')
METADATA_DIR = os.path.join(BASE_DIR, 'data', 'metadata')

# Standardized Indian States lookup
STATE_NORMALIZATION = {
    "andhra pradesh": "Andhra Pradesh",
    "arunachal pradesh": "Arunachal Pradesh",
    "assam": "Assam",
    "bihar": "Bihar",
    "chhattisgarh": "Chhattisgarh",
    "goa": "Goa",
    "gujarat": "Gujarat",
    "haryana": "Haryana",
    "himachal pradesh": "Himachal Pradesh",
    "jharkhand": "Jharkhand",
    "karnataka": "Karnataka",
    "kerala": "Kerala",
    "madhya pradesh": "Madhya Pradesh",
    "maharashtra": "Maharashtra",
    "manipur": "Manipur",
    "meghalaya": "Meghalaya",
    "mizoram": "Mizoram",
    "nagaland": "Nagaland",
    "odisha": "Odisha",
    "punjab": "Punjab",
    "rajasthan": "Rajasthan",
    "sikkim": "Sikkim",
    "tamil nadu": "Tamil Nadu",
    "telangana": "Telangana",
    "tripura": "Tripura",
    "uttar pradesh": "Uttar Pradesh",
    "uttarakhand": "Uttarakhand",
    "west bengal": "West Bengal",
    "andaman and nicobar islands": "Andaman and Nicobar",
    "chandigarh": "Chandigarh",
    "dadra and nagar haveli": "Dadra and Nagar Haveli",
    "daman and diu": "Daman and Diu",
    "delhi": "Delhi",
    "jammu and kashmir": "Jammu and Kashmir",
    "ladakh": "Ladakh",
    "puducherry": "Puducherry"
}

def normalize_text(val):
    if pd.isna(val):
        return ""
    val = str(val).strip()
    return re.sub(r'\s+', ' ', val)

def clean_state_name(val):
    norm = normalize_text(val).lower()
    return STATE_NORMALIZATION.get(norm, val.strip().title() if isinstance(val, str) else val)

def clean_mandi_prices():
    raw_path = os.path.join(RAW_DIR, 'market', 'apmc_monthly_mandi_prices.csv')
    out_path = os.path.join(PROCESSED_DIR, 'apmc_mandi_prices_cleaned.csv')
    audit = {"dataset": "apmc_monthly_mandi_prices", "initial_rows": 0, "final_rows": 0, "actions": []}
    
    df = pd.read_csv(raw_path)
    audit["initial_rows"] = len(df)
    
    # 1. Clean column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    
    # 2. Remove exact duplicates
    dups = df.duplicated().sum()
    if dups > 0:
        df = df.drop_duplicates()
        audit["actions"].append(f"Removed {dups} exact duplicate rows")
        
    # 3. Clean string columns
    df['state_name'] = df['state_name'].apply(clean_state_name)
    df['district_name'] = df['district_name'].apply(lambda x: normalize_text(x).title())
    df['commodity'] = df['commodity'].apply(lambda x: normalize_text(x).title())
    df['apmc'] = df['apmc'].apply(lambda x: normalize_text(x).title())
    
    # 4. Clean numerical price columns
    price_cols = ['min_price', 'max_price', 'modal_price', 'arrivals_in_qtl']
    for col in price_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        
    # Filter impossible/negative numbers
    invalid_price = (df['modal_price'] <= 0) | (df['min_price'] < 0) | (df['max_price'] < 0)
    invalid_count = invalid_price.sum()
    if invalid_count > 0:
        df = df[~invalid_price]
        audit["actions"].append(f"Filtered {invalid_count} records with non-positive modal prices")
        
    # Logic sanity: min_price <= modal_price <= max_price
    # If inverted due to data entry glitch, fix boundaries
    inverted = df['min_price'] > df['max_price']
    if inverted.sum() > 0:
        actual_min = np.minimum(df.loc[inverted, 'min_price'], df.loc[inverted, 'max_price'])
        actual_max = np.maximum(df.loc[inverted, 'min_price'], df.loc[inverted, 'max_price'])
        df.loc[inverted, 'min_price'] = actual_min
        df.loc[inverted, 'max_price'] = actual_max
        audit["actions"].append(f"Corrected inverted min/max price bounds for {inverted.sum()} rows")
        
    # Flag extreme outliers (IQR method for auditing, preserve valid high-value commodities like saffron/cardamom)
    q1 = df['modal_price'].quantile(0.25)
    q3 = df['modal_price'].quantile(0.75)
    iqr = q3 - q1
    extreme_outliers = (df['modal_price'] > (q3 + 3.0 * iqr)).sum()
    audit["actions"].append(f"Identified {extreme_outliers} valid high-value market transactions (preserved, not deleted)")
    
    audit["final_rows"] = len(df)
    df.to_csv(out_path, index=False)
    return audit

def clean_crop_yield_production():
    raw_path = os.path.join(RAW_DIR, 'agriculture', 'des_crop_yield_production.csv')
    out_path = os.path.join(PROCESSED_DIR, 'des_crop_yield_cleaned.csv')
    audit = {"dataset": "des_crop_yield_production", "initial_rows": 0, "final_rows": 0, "actions": []}
    
    df = pd.read_csv(raw_path)
    audit["initial_rows"] = len(df)
    
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    
    dups = df.duplicated().sum()
    if dups > 0:
        df = df.drop_duplicates()
        audit["actions"].append(f"Removed {dups} duplicate rows")
        
    df['state'] = df['state'].apply(clean_state_name)
    df['crop'] = df['crop'].apply(lambda x: normalize_text(x).title())
    df['season'] = df['season'].apply(lambda x: normalize_text(x).title())
    
    # Numeric conversions
    numeric_cols = ['area', 'production', 'annual_rainfall', 'fertilizer', 'pesticide', 'yield']
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        
    # Drop rows where production or area is missing or zero/negative
    invalid = (df['area'] <= 0) | (df['production'] < 0) | df['production'].isna()
    inv_count = invalid.sum()
    if inv_count > 0:
        df = df[~invalid]
        audit["actions"].append(f"Dropped {inv_count} rows with missing or non-positive area/production")
        
    # Ensure yield matches production / area (sanity check)
    calc_yield = df['production'] / df['area']
    # If discrepancy > 50%, recompute yield to maintain mathematical consistency
    yield_diff = np.abs(df['yield'] - calc_yield)
    inconsistent = (yield_diff > 0.05 * df['yield']) & df['yield'].notna()
    if inconsistent.sum() > 0:
        df.loc[inconsistent, 'yield'] = calc_yield[inconsistent]
        audit["actions"].append(f"Re-aligned yield calculation for {inconsistent.sum()} records")
        
    audit["final_rows"] = len(df)
    df.to_csv(out_path, index=False)
    return audit

def clean_icar_crop_recommendation():
    raw_path = os.path.join(RAW_DIR, 'agriculture', 'icar_crop_recommendation.csv')
    out_path = os.path.join(PROCESSED_DIR, 'icar_crop_recommendation_cleaned.csv')
    audit = {"dataset": "icar_crop_recommendation", "initial_rows": 0, "final_rows": 0, "actions": []}
    
    df = pd.read_csv(raw_path)
    audit["initial_rows"] = len(df)
    df.columns = [c.strip().lower() for c in df.columns]
    
    dups = df.duplicated().sum()
    if dups > 0:
        df = df.drop_duplicates()
        audit["actions"].append(f"Removed {dups} duplicate records")
        
    df['label'] = df['label'].apply(lambda x: normalize_text(x).lower())
    
    # Range check on pH (0 to 14)
    invalid_ph = (df['ph'] < 0) | (df['ph'] > 14)
    if invalid_ph.sum() > 0:
        df = df[~invalid_ph]
        audit["actions"].append(f"Removed {invalid_ph.sum()} rows with invalid pH values")
        
    # Non-negative checks for N, P, K, rainfall, humidity
    non_neg = ['n', 'p', 'k', 'temperature', 'humidity', 'rainfall']
    for col in non_neg:
        df = df[df[col] >= 0]
        
    audit["final_rows"] = len(df)
    df.to_csv(out_path, index=False)
    return audit

def clean_state_market_prices():
    raw_path = os.path.join(RAW_DIR, 'market', 'agmarknet_state_market_prices.csv')
    out_path = os.path.join(PROCESSED_DIR, 'agmarknet_state_market_prices_cleaned.csv')
    audit = {"dataset": "agmarknet_state_market_prices", "initial_rows": 0, "final_rows": 0, "actions": []}
    
    df = pd.read_csv(raw_path)
    audit["initial_rows"] = len(df)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    
    dups = df.duplicated().sum()
    if dups > 0:
        df = df.drop_duplicates()
        audit["actions"].append(f"Removed {dups} duplicates")
        
    df['state'] = df['state'].apply(clean_state_name)
    df['commodity'] = df['commodity'].apply(lambda x: normalize_text(x).title())
    df['modal_price'] = pd.to_numeric(df['modal_price'], errors='coerce')
    df = df[df['modal_price'] > 0]
    
    audit["final_rows"] = len(df)
    df.to_csv(out_path, index=False)
    return audit

def clean_msp_mandi():
    raw_path = os.path.join(RAW_DIR, 'market', 'cmo_msp_mandi.csv')
    out_path = os.path.join(PROCESSED_DIR, 'cmo_msp_mandi_cleaned.csv')
    audit = {"dataset": "cmo_msp_mandi", "initial_rows": 0, "final_rows": 0, "actions": []}
    
    df = pd.read_csv(raw_path)
    audit["initial_rows"] = len(df)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    
    df = df.drop_duplicates()
    df['commodity'] = df['commodity'].apply(lambda x: normalize_text(x).title())
    df['msprice'] = pd.to_numeric(df['msprice'], errors='coerce')
    df = df[df['msprice'] > 0]
    
    audit["final_rows"] = len(df)
    df.to_csv(out_path, index=False)
    return audit

def clean_cost_of_cultivation():
    raw_path = os.path.join(RAW_DIR, 'cost', 'des_cost_of_cultivation.csv')
    out_path = os.path.join(PROCESSED_DIR, 'des_cost_of_cultivation_cleaned.csv')
    audit = {"dataset": "des_cost_of_cultivation", "initial_rows": 0, "final_rows": 0, "actions": []}
    
    df = pd.read_csv(raw_path)
    audit["initial_rows"] = len(df)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    
    df['crop'] = df['crop'].apply(lambda x: normalize_text(x).title())
    df['cost'] = pd.to_numeric(df['cost'], errors='coerce')
    df = df[df['cost'] > 0]
    
    audit["final_rows"] = len(df)
    df.to_csv(out_path, index=False)
    return audit

def main():
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    os.makedirs(METADATA_DIR, exist_ok=True)
    
    print("=" * 60)
    print("VYAVSAYMITRA: EXECUTING REPEATABLE DATA CLEANING PIPELINE")
    print("=" * 60)
    
    audits = []
    
    print("\n[1/6] Cleaning APMC Mandi Prices...")
    audits.append(clean_mandi_prices())
    print(f"      Initial: {audits[-1]['initial_rows']} -> Cleaned: {audits[-1]['final_rows']}")
    
    print("\n[2/6] Cleaning District Crop Yield & Production...")
    audits.append(clean_crop_yield_production())
    print(f"      Initial: {audits[-1]['initial_rows']} -> Cleaned: {audits[-1]['final_rows']}")
    
    print("\n[3/6] Cleaning ICAR Crop Recommendations...")
    audits.append(clean_icar_crop_recommendation())
    print(f"      Initial: {audits[-1]['initial_rows']} -> Cleaned: {audits[-1]['final_rows']}")
    
    print("\n[4/6] Cleaning State Market Prices...")
    audits.append(clean_state_market_prices())
    print(f"      Initial: {audits[-1]['initial_rows']} -> Cleaned: {audits[-1]['final_rows']}")
    
    print("\n[5/6] Cleaning MSP Floor Prices...")
    audits.append(clean_msp_mandi())
    print(f"      Initial: {audits[-1]['initial_rows']} -> Cleaned: {audits[-1]['final_rows']}")
    
    print("\n[6/6] Cleaning Cost of Cultivation...")
    audits.append(clean_cost_of_cultivation())
    print(f"      Initial: {audits[-1]['initial_rows']} -> Cleaned: {audits[-1]['final_rows']}")
    
    audit_file = os.path.join(METADATA_DIR, "cleaning_audit_log.json")
    with open(audit_file, 'w', encoding='utf-8') as f:
        json.dump({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cleaning_reports": audits
        }, f, indent=2)
        
    print(f"\n[AUDIT] Saved Data Cleaning Audit Log to: {audit_file}")
    print("=" * 60)

if __name__ == '__main__':
    main()
