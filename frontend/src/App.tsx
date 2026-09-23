import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useUIStore } from './store/useUIStore';
import IndianTricolorBar from './components/common/IndianTricolorBar';
import './i18n';

/* Layouts */
const PublicLayout = React.lazy(() => import('./components/layout/PublicLayout'));
const DashboardLayout = React.lazy(() => import('./components/layout/DashboardLayout'));

/* Public Pages */
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const LoginPage = React.lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = React.lazy(() => import('./features/auth/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('./features/auth/ForgotPasswordPage'));

/* Onboarding */
const OnboardingPage = React.lazy(() => import('./features/onboarding/OnboardingPage'));

/* Dashboard Pages */
const DashboardHome = React.lazy(() => import('./features/dashboard/DashboardHome'));
const ProfilePage = React.lazy(() => import('./features/dashboard/ProfilePage'));
const SettingsPage = React.lazy(() => import('./features/dashboard/SettingsPage'));

/* Business Feasibility */
const BusinessFeasibility = React.lazy(() => import('./features/business/BusinessFeasibility'));
const LocationAnalysis = React.lazy(() => import('./features/business/LocationAnalysis'));
const MarketAnalysis = React.lazy(() => import('./features/business/MarketAnalysis'));
const CompetitorMapping = React.lazy(() => import('./features/business/CompetitorMapping'));
const OpportunityAnalysis = React.lazy(() => import('./features/business/OpportunityAnalysis'));
const SWOTAnalysis = React.lazy(() => import('./features/business/SWOTAnalysis'));
const RiskAnalysis = React.lazy(() => import('./features/business/RiskAnalysis'));
const ProductPricing = React.lazy(() => import('./features/business/ProductPricing'));
const FoodTechAdvisoryPage = React.lazy(() => import('./features/foodtech/FoodTechAdvisoryPage'));

/* Financial Calculator */
const FinancialCalculator = React.lazy(() => import('./features/finance/FinancialCalculator'));
const MarginCalculator = React.lazy(() => import('./features/finance/MarginCalculator'));
const EMICalculator = React.lazy(() => import('./features/finance/EMICalculator'));
const RepaymentSchedule = React.lazy(() => import('./features/finance/RepaymentSchedule'));
const OperationalCosts = React.lazy(() => import('./features/finance/OperationalCosts'));
const WorkingCapital = React.lazy(() => import('./features/finance/WorkingCapital'));
const MoratoriumSection = React.lazy(() => import('./features/finance/MoratoriumSection'));

/* Scheme & Funding */
const SchemeAdvisor = React.lazy(() => import('./features/schemes/SchemeAdvisor'));
const FundingSupport = React.lazy(() => import('./features/funding/FundingSupport'));

/* Business Plan */
const BusinessPlanPage = React.lazy(() => import('./features/business-plan/BusinessPlanPage'));

/* AI Mitra */
const AIMitra = React.lazy(() => import('./features/ai/AIMitra'));

/* Reports */
const ReportsPage = React.lazy(() => import('./features/reports/ReportsPage'));

/** Route guard for authenticated routes */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Loading fallback */
function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader__spinner" />
      <p className="page-loader__text">Loading...</p>
    </div>
  );
}

export default function App() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      {/* Global Indian Tricolour National Identity Strip */}
      <IndianTricolorBar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={
            <ProtectedRoute><OnboardingPage /></ProtectedRoute>
          } />

          {/* Dashboard routes */}
          <Route element={
            <ProtectedRoute><DashboardLayout /></ProtectedRoute>
          }>
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Business Feasibility */}
            <Route path="/business-feasibility" element={<BusinessFeasibility />} />
            <Route path="/business-feasibility/location" element={<LocationAnalysis />} />
            <Route path="/business-feasibility/market" element={<MarketAnalysis />} />
            <Route path="/business-feasibility/competitors" element={<CompetitorMapping />} />
            <Route path="/business-feasibility/opportunities" element={<OpportunityAnalysis />} />
            <Route path="/business-feasibility/swot" element={<SWOTAnalysis />} />
            <Route path="/business-feasibility/risks" element={<RiskAnalysis />} />
            <Route path="/business-feasibility/pricing" element={<ProductPricing />} />
            <Route path="/business-feasibility/foodtech" element={<Navigate to="/foodtech-advisory" replace />} />

            {/* FoodTech Advisory & Processing */}
            <Route path="/foodtech-advisory" element={<FoodTechAdvisoryPage />} />

            {/* Financial Calculator */}
            <Route path="/financial-calculator" element={<FinancialCalculator />} />
            <Route path="/financial-calculator/margin" element={<MarginCalculator />} />
            <Route path="/financial-calculator/project-cost" element={<MarginCalculator />} />
            <Route path="/financial-calculator/loan" element={<MarginCalculator />} />
            <Route path="/financial-calculator/emi" element={<EMICalculator />} />
            <Route path="/financial-calculator/moratorium" element={<MoratoriumSection />} />
            <Route path="/financial-calculator/repayment" element={<RepaymentSchedule />} />
            <Route path="/financial-calculator/operational-costs" element={<OperationalCosts />} />
            <Route path="/financial-calculator/working-capital" element={<WorkingCapital />} />

            {/* Schemes & Funding */}
            <Route path="/scheme-advisor" element={<SchemeAdvisor />} />
            <Route path="/funding-support" element={<FundingSupport />} />

            {/* Business Plan */}
            <Route path="/business-plan" element={<BusinessPlanPage />} />

            {/* AI Mitra */}
            <Route path="/ai-mitra" element={<AIMitra />} />

            {/* Reports */}
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Global Toast Container */}
      <ToastContainer />
    </BrowserRouter>
  );
}

/** Global toast notification container */
function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="alert" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <span className="toast__message">{toast.message}</span>
          <button className="toast__close" onClick={() => removeToast(toast.id)} aria-label="Close notification">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
