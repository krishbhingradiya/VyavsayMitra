# VYAVSAYMITRA (व्यवसाय मित्र)

### *Market. Money. Mitra.*
> *"Sapne Se Safal Vyavsay Tak"*

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/krishbhingradiya/Vyavsay_Mitra)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.1-black.svg?logo=express)](https://expressjs.com/)
[![Python](https://img.shields.io/badge/Python-3.14-blue.svg?logo=python)](https://python.org/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.3+-orange.svg?logo=scikit-learn)](https://scikit-learn.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![SIH](https://img.shields.io/badge/SIH-2026-orange.svg)](https://sih.gov.in/)

**VYAVSAYMITRA** is an AI-driven, hyper-local business advisory and financial structuring platform tailored specifically for rural and semi-urban micro-entrepreneurs in India. By bridging the gap between grassroots village aspirations, bank credit requirements, and state/central government welfare schemes, VYAVSAYMITRA empowers micro-entrepreneurs to make data-backed, financially sound business decisions.

---

## 🏗️ Architecture & Project Structure

The project follows a clean, modular, multi-tier architecture:

```
VyavsayMitra/
├── frontend/                     # React 19 + TypeScript 6 + Vite 8 SPA
│   ├── src/
│   │   ├── api/                  # Centralized, typed API Client (apiClient.ts)
│   │   ├── components/           # Reusable UI components (layout, brand, common)
│   │   ├── features/             # Feature slices (auth, dashboard, business, finance, etc.)
│   │   ├── hooks/                # Custom React hooks
│   │   ├── i18n/                 # Vernacular translations (English, Hindi, Gujarati)
│   │   ├── store/                # Zustand client state stores (auth, business, finance, UI)
│   │   └── types/                # Shared TypeScript definitions
│   ├── public/                   # Static assets, branding, and imagery
│   ├── package.json              # Frontend dependencies and scripts
│   └── vite.config.ts            # Vite build configuration
│
├── backend/                      # Express 5 REST API & Computation Engine
│   ├── src/
│   │   ├── config/               # Database (sql.js) & freshness policy
│   │   ├── controllers/          # Business & Auth request controllers
│   │   ├── middleware/           # Rate limiting & error handlers
│   │   ├── models/               # Data access models (User, OTP)
│   │   ├── routes/               # Express API route declarations
│   │   └── services/             # Core business intelligence & advisory engines:
│   │       ├── ai/               # AI synthesis & qualitative advisory
│   │       ├── business/         # Domain engines (Crop, Dairy, Poultry, Food-Processing, MSME)
│   │       ├── calculations/     # Deterministic financial calculation engines
│   │       ├── data/             # Historical & APMC mandi market fusion service
│   │       ├── email/            # Nodemailer OTP email service
│   │       ├── ml/               # Subprocess Python ML model bridge & governance
│   │       └── validation/       # Strict payload & schema validators
│   ├── data/                     # SQLite database storage (vyavsaymitra.db)
│   ├── tests/                    # Backend automated test suites (46 tests)
│   ├── package.json              # Backend dependencies and scripts
│   └── index.js                  # Backend entry point
│
├── ml/                           # Python Machine Learning Subsystem
│   ├── inference/                # Production model inference scripts (predict.py)
│   ├── training/                 # Model training pipelines (Yield, Suitability, Mandi)
│   ├── pipelines/                # Feature engineering & preprocessing pipelines
│   ├── evaluation/               # Model audit & metrics evaluation
│   └── requirements.txt          # Python ML dependencies
│
├── data/                         # Curated & Validated Datasets
│   ├── validated/                # Cleaned NABARD benchmarks, Mandi prices, Schemes
│   ├── metadata/                 # Dataset registries & data dictionaries
│   ├── features/                 # Generated ML feature stores
│   └── raw/                      # Raw government source datasets
│
├── models/                       # Serialized production ML model artifacts (.joblib)
├── tests/                        # Python unit tests for ML & data pipeline (12 tests)
├── package.json                  # Root orchestrator scripts
└── README.md
```

---

## 🌾 Core Capabilities

### 1. Hyper-Local Business Feasibility & Sector Archetypes
- **Agri-Crops**: Yield prediction, crop suitability recommendations, cost-of-cultivation benchmarks.
- **Dairy Units**: NABARD unit economics for 2-cow micro to 10-cow commercial units.
- **Poultry Broilers**: 500-bird cyclical batch production models with feed-conversion benchmarks.
- **Food Processing**: Mini flour mills (Atta Chakki), oil extraction, and agro-processing units.
- **General MSME**: Extensible natural language idea classifier with instant capital sizing.

### 2. Market Data Fusion (AGMARKNET + Verified Benchmarks)
- Real-time mandi price tracking from official government sources (`data.gov.in` / `agmarknet.gov.in`).
- Safe fallback to verified regional APMC historical benchmarks.
- Unit normalization (INR/quintal vs. INR/kg) and provenance tracking.

### 3. Machine Learning Governance
- Subprocess execution with base64 safety serialization.
- Production status gate (`production_candidate` / `active_production`).
- Conformal prediction intervals with uncertainty bounds.
- Rejection of stale or unverified models with automatic fallback.

### 4. Financial Calculators & DPR Generator
- Margin capital formula: Total Project Cost = Available Margin / 10%.
- Automatic loan routing (Micro Finance vs. Term Loan).
- Moratorium handling, amortization schedules, and working capital estimations.

---

## ⚡ Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Python**: v3.10+ (with virtual environment in `.venv`)

### 1. Installation
Install all dependencies (root, frontend, and backend) in one step:
```bash
npm run install:all
```

For Python ML environment:
```bash
pip install -r ml/requirements.txt
```

### 2. Running Locally

#### Run Both Frontend and Backend Concurrently:
```bash
npm run dev
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

#### Run Services Individually:
```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```

---

## 🧪 Testing

The platform includes a total of **58 automated tests**:

```bash
# Run all tests (Backend + ML)
npm run test:all

# Run backend test suites (46 tests)
npm run test:backend

# Run ML and data pipeline tests (12 tests)
npm run test:ml
```

### Test Suite Breakdown:
1. **Production Backend Governance Test Suite** (14 tests) — input validation, edge cases, model fallbacks.
2. **Business & Calculations Test Suite** (18 tests) — domain engines, idea classifier, ML regressor.
3. **Historical + Current Market Data Fusion Suite** (14 tests) — price normalization, location fallback, freshness guards.
4. **ML Production & Pipeline Unit Tests** (12 tests) — inference safety, schema validation, data pipeline tests.

---

## 📦 Building for Production

```bash
npm run build
```
Creates an optimized production bundle in `frontend/dist`.

---

## 👥 Project Information

- **Project**: VYAVSAYMITRA
- **Event**: Smart India Hackathon (SIH) 2026
- **Repository**: [https://github.com/krishbhingradiya/Vyavsay_Mitra](https://github.com/krishbhingradiya/Vyavsay_Mitra)
- **Owner**: Krish Bhingradiya ([@krishbhingradiya](https://github.com/krishbhingradiya))

---

*Made with ❤️ for Rural Entrepreneurs across India.*
