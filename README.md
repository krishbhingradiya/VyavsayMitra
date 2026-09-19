# VYAVSAYMITRA (व्यवसाय मित्र)

### *Market. Money. Mitra.*
> *"Sapne Se Safal Vyavsay Tak"*

[![Build & Lint Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/krishbhingradiya/Vyavsay_Mitra)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![SIH](https://img.shields.io/badge/SIH-2026-orange.svg)](https://sih.gov.in/)

**VYAVSAYMITRA** is an AI-driven, hyper-local business advisory and financial structuring platform tailored specifically for rural and semi-urban micro-entrepreneurs in India. By bridging the gap between grassroots village aspirations, bank credit requirements, and state/central government welfare schemes, VYAVSAYMITRA empowers micro-entrepreneurs to make data-backed, financially sound business decisions.

---

## 🌾 Problem Statement (SIH 2026)

Rural and semi-urban micro-entrepreneurs across India face structural disadvantages when starting or expanding enterprises:
1. **Lack of Local Market Intelligence**: Limited visibility into competitor density, village demand catchment, and raw material supply dynamics within 5–15 KM.
2. **Opaque Financial Structuring**: Difficulty understanding margin money ratios, bank debt servicing capacities, moratorium tenures, and monthly EMIs.
3. **Complex Government Welfare Schemes**: Inability to match enterprise capital outlay with appropriate central and state subsidy schemes (e.g., PMEGP, MUDRA, NABARD, Stand-Up India).
4. **Lack of Bank-Ready Documentation**: Missing formal Detailed Project Reports (DPR), break-even analyses, and required statutory document checklists.
5. **Linguistic & Technological Barriers**: Complex financial portals often lack accessible, multilingual vernacular guidance.

---

## 💡 Solution

VYAVSAYMITRA provides an all-in-one vernacular platform that democratizes enterprise intelligence:
- **Instant Project Structuring**: Derives total project cost, debt requirement, and subsidy eligibility directly from the entrepreneur's available margin capital.
- **Hyper-Local Feasibility Studies**: Interactive geographic mapping of competitor density, location advantages, risks, and SWOT parameters within village radii.
- **Intelligent Scheme Matching**: Algorithmic scheme selection with automated interest, tenure, and moratorium scheduling.
- **Bank-Ready DPR Generator**: Produces 3-year projected cash flows, profit & loss projections, and break-even calculations exportable for bank credit officers.
- **AI Mitra Advisory**: Contextual AI companion providing conversational guidance on subsidies, licensing, operating cost reductions, and risk mitigation.
- **Tri-Lingual Support**: Native interface in **English**, **हिन्दी (Hindi)**, and **ગુજરાતી (Gujarati)**.

---

## 🚀 Core Features

### 1. Business Feasibility & Market Intelligence
- **Location Analysis**: Village, block, and district demographic profiling with geographic mapping.
- **Competitor Mapping**: Visual clustering of existing local businesses, market saturation levels, and unmet demand gaps within 5–15 KM.
- **SWOT & Risk Matrix**: Auto-generated Strengths, Weaknesses, Opportunities, and Threats along with actionable mitigation roadmaps.
- **Product Value & Pricing Strategy**: Benchmark pricing guidelines balancing rural purchasing power with sustainable gross margins.

### 2. Financial Calculator & Capital Structuring
- **Available Margin Logic**:
  $$\text{Total Project Cost} = \frac{\text{Available Margin}}{0.10} \quad (10\%\text{ Margin Capital})$$
  $$\text{Bank Loan Amount} = \text{Project Cost} \times 0.90 \quad (90\%\text{ Term Loan})$$
- **Micro vs. Term Loan Routing**:
  - **Project Cost $\le$ ₹1.40 Lakh**: Micro Finance Scheme (6.5% interest, 3-year tenure, 3-month moratorium).
  - **Project Cost $>$ ₹1.40 Lakh to $\le$ ₹50 Lakh**: Term Loan Scheme (8.0% interest, 7-year tenure, 6-month moratorium).
- **EMI & Repayment Schedule**: Monthly principal and interest amortization tables accounting for capitalized moratorium periods.
- **Working Capital & Operational Expense Planner**: Cost estimation covering raw materials, labor, electricity, logistics, maintenance, and emergency buffers.

### 3. Scheme Advisor & Funding Support
- **Auto-Matching Engine**: Filters 100+ national and state schemes by capital bracket, sector, social category, and location.
- **Funding Directory**: Profiles of Scheduled Commercial Banks, Regional Rural Banks (RRBs), Cooperative Banks, KVIC, and NABARD channelizing agencies.
- **Interactive Document Readiness Checklist**: Tracks Aadhaar, PAN, land/rental agreements, quotation bills, caste certificates, and bank statements.

### 4. Detailed Business Plan (DPR)
- Executive summary, 3-year revenue growth models, operational expense escalations, break-even unit sales, and month-by-month cash flow forecasts.
- One-click print / PDF export formatted for bank submission.

### 5. AI Mitra — Conversational Business Advisor
- Domain-expert rural business guidance engine with built-in financial context awareness.
- Optional integration with **Google Gemini AI** (`VITE_GEMINI_API_KEY`) for live generative assistance with automatic graceful fallback.

### 6. Vernacular Accessibility & Modern UI
- Instant language toggle between English, हिन्दी, and ગુજરાતી.
- High-contrast, responsive design matching rural fintech aesthetics, accessible on mobile and desktop without viewport clipping.

---

## 🛠 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19.2, TypeScript 6.0 |
| **Build Tool** | Vite 8.3 with HMR and code-splitting |
| **State Management** | Zustand 5.0 with persistent `localStorage` middleware |
| **Routing** | React Router DOM 7.18 (`PublicLayout`, `DashboardLayout`, `<ProtectedRoute>`) |
| **Styling** | Modular Vanilla CSS, CSS Variables Design System, Responsive Flexbox/Grid |
| **Internationalization** | i18next, react-i18next, LanguageDetector |
| **Visuals & Charts** | Recharts 3.10, Leaflet 1.9, React-Leaflet 5.0, Lucide React Icons |
| **AI Integration** | Google Gemini REST API (`gemini-1.5-flash`) + Offline Advisory Engine |
| **Linter** | Oxlint (0 warnings, 0 errors) |

---

## 📂 Project Structure

```
VYAVSAYMITRA/
├── public/                     # Static assets and icons
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/                 # Brand assets & composed rural hero artwork
│   │   ├── rural-hero.jpg
│   │   └── hero.png
│   ├── components/             # Reusable UI & layout components
│   │   └── layout/             # Public Navbar, TopInfoBar, DashboardLayout, Footer
│   ├── config/                 # Scheme routing rules, constants, languages
│   ├── data/                   # Realistic demo business & demographic data
│   ├── features/               # Domain feature modules
│   │   ├── ai/                 # AI Mitra companion with Gemini integration
│   │   ├── auth/               # Login, Register, Forgot Password
│   │   ├── business/           # Location, Market, Competitors, SWOT, Risk
│   │   ├── business-plan/      # Detailed Project Report (DPR) generator
│   │   ├── dashboard/          # Dashboard Home, Profile, Settings
│   │   ├── finance/            # Margin, Project Cost, EMI, Moratorium, Repayment
│   │   ├── funding/            # Institutional funding & document checklist
│   │   ├── onboarding/         # 6-step entrepreneur onboarding wizard
│   │   ├── reports/            # Exportable summary dossiers
│   │   └── schemes/            # Scheme Advisor & eligibility filtering
│   ├── hooks/                  # Custom React hooks (forms, scroll, count-up)
│   ├── i18n/                   # Translation keys (English, Hindi, Gujarati)
│   ├── pages/                  # LandingPage (Hero, Journey, Stats, CTA)
│   ├── store/                  # Zustand stores with localStorage persistence
│   ├── styles/                 # Design tokens, variables, reset, animations
│   ├── types/                  # TypeScript interface contracts
│   ├── utils/                  # Verified financial calculation algorithms
│   ├── App.tsx                 # Route declarations and guards
│   ├── index.css               # Base typography and imports
│   └── main.tsx                # Application root entry point
├── .env.example                # Documented configuration template
├── .gitignore                  # Security-first ignore rules
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## ⚡ Local Setup & Running Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

### 1. Clone the Repository
```bash
git clone https://github.com/krishbhingradiya/Vyavsay_Mitra.git
cd Vyavsay_Mitra
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration (Optional)
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```
Configure environment variables if needed:
```env
# Optional: backend API URL (defaults to client-side mode)
VITE_API_URL=http://localhost:5000

# Optional: Google Gemini API key for live AI completions
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```
> **Note**: VYAVSAYMITRA runs 100% offline out-of-the-box using its built-in rule and advisory engine. An API key is purely optional.

### 4. Run Frontend Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Running Backend (If Applicable)
VYAVSAYMITRA is currently architected as a standalone, offline-first client application using Zustand state persistence (`localStorage`). If connecting to an external REST service, ensure `VITE_API_URL` points to your backend server.

### 6. Lint & Quality Check
```bash
npm run lint
```

### 7. Production Build & Preview
```bash
# Typecheck and create production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🛡️ Security & Secret Protection

- **Zero Hardcoded Secrets**: All credentials, keys, and endpoints are loaded exclusively through `import.meta.env`.
- **Git Protection**: `.env`, `.env.*`, and temporary directories are strictly excluded via `.gitignore`.
- **Offline Reliability**: Graceful fallbacks ensure no crashes occur even if external APIs or network connectivity fail.

---

## 👥 Project Information

- **Project**: VYAVSAYMITRA
- **Event**: Smart India Hackathon (SIH) 2026
- **Repository**: [https://github.com/krishbhingradiya/Vyavsay_Mitra](https://github.com/krishbhingradiya/Vyavsay_Mitra)
- **Owner**: Krish Bhingradiya ([@krishbhingradiya](https://github.com/krishbhingradiya))

---

*Made with ❤️ for Rural Entrepreneurs across India.*
