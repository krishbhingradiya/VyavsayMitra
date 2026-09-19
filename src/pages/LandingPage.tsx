import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCountUp, useScrollReveal } from '../hooks';
import { useAuthStore } from '../store/useAuthStore';
import ruralHeroImg from '../assets/rural-hero.jpg';
import {
  MapPin,
  TrendingUp,
  Calculator,
  Landmark,
  Bot,
  ArrowRight,
  BarChart3,
  Coins,
  Sparkles,
  ShieldCheck,
  Globe2,
  FileCheck2,
  X,
  Lock,
  Lightbulb,
  Users,
  Sprout,
} from 'lucide-react';
import './LandingPage.css';

export default function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  // Modal state for pre-login action guards
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    targetRoute: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    targetRoute: '',
  });

  const handleProtectedAction = (targetRoute: string, customTitle?: string, customDesc?: string) => {
    if (isAuthenticated) {
      navigate(targetRoute);
    } else {
      setAuthModal({
        isOpen: true,
        title: customTitle || "Let's Start Your Business Journey",
        description: customDesc || 'Create your free profile to begin your personalized business analysis and access verified rural funding.',
        targetRoute,
      });
    }
  };

  return (
    <div className="landing">
      {/* 1. HERO SECTION (Includes organic bottom curved wave & integrated stats strip) */}
      <HeroSection onStartAction={handleProtectedAction} />

      {/* 2. HOW IT WORKS */}
      <JourneySection onStartAction={handleProtectedAction} />

      {/* 4. CORE FEATURES */}
      <FeaturesSection onFeatureAction={handleProtectedAction} />

      {/* 5. WHY VYAVSAYMITRA */}
      <WhyVyavsayMitraSection />

      {/* 6. CALL TO ACTION */}
      <CTASection onStartAction={handleProtectedAction} />

      {/* PRE-LOGIN AUTH MODAL */}
      {authModal.isOpen && (
        <div
          className="auth-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setAuthModal({ ...authModal, isOpen: false })}
        >
          <div
            className="auth-modal card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="auth-modal__close"
              onClick={() => setAuthModal({ ...authModal, isOpen: false })}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            <div className="auth-modal__header">
              <div className="auth-modal__icon">
                <Lock size={24} />
              </div>
              <h3 className="auth-modal__title">{authModal.title}</h3>
              <p className="auth-modal__desc">{authModal.description}</p>
            </div>

            <div className="auth-modal__actions">
              <Link
                to="/register"
                className="btn btn--primary btn--full"
                onClick={() => setAuthModal({ ...authModal, isOpen: false })}
              >
                Create Free Account
              </Link>
              <Link
                to="/login"
                className="btn btn--outline btn--full"
                onClick={() => setAuthModal({ ...authModal, isOpen: false })}
              >
                Sign In to Existing Account
              </Link>
            </div>

            <p className="auth-modal__footnote">
              Takes less than 1 minute. No credit card required.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   1. HERO SECTION
   -------------------------------------------------------------------------- */
interface HeroSectionProps {
  onStartAction: (route: string, title?: string, desc?: string) => void;
}

function HeroSection({ onStartAction }: HeroSectionProps) {
  return (
    <section className="hero" aria-label="Hero section">
      {/* Full-width background — rural-hero.jpg contains the composed scene */}
      <div className="hero__backdrop">
        <img
          src={ruralHeroImg}
          alt="Rural Indian entrepreneurs in village farmland with signboards and milestone"
          className="hero__bg-image"
          width="1024"
          height="503"
          loading="eager"
        />
      </div>

      {/* TOP-LEFT: Badge, Main Heading, Subtitle, CTAs, Taglines */}
      <div className="hero__content">
        <div className="hero__text">
          {/* Badge matching Image 3 */}
          <div className="hero__badge">
            <Sprout size={14} className="hero__badge-icon" />
            <span>Empowering Rural Entrepreneurs</span>
          </div>

          {/* Main Heading */}
          <h1 className="hero__heading">
            <span>Big Dreams,</span>
            <span className="hero__heading-highlight">Stronger Villages</span>
          </h1>

          {/* Subtitle */}
          <p className="hero__subtext">
            Make informed business decisions with local market intelligence,
            financial planning and AI guidance — all in one place.
          </p>

          {/* CTAs */}
          <div className="hero__ctas">
            <button
              type="button"
              className="btn hero__btn-primary"
              onClick={() =>
                onStartAction(
                  '/business-feasibility',
                  "Let's Start Your Business Journey",
                  'Create your free profile to begin your personalized hyper-local business feasibility study.'
                )
              }
            >
              <span>Start Your Business Analysis</span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="btn hero__btn-secondary"
              onClick={() =>
                onStartAction(
                  '/scheme-advisor',
                  'Explore Financial Support & Schemes',
                  'Sign in to personalize government scheme information and subsidies based on your location and project cost.'
                )
              }
            >
              Explore Schemes
            </button>
          </div>

          {/* Brand Taglines with hand-drawn underline */}
          <div className="hero__taglines">
            <div className="hero__tagline-main-wrapper">
              <p className="hero__tagline-main">"Sapne Se Safal Vyavsay Tak"</p>
              <svg className="hero__tagline-swoosh" viewBox="0 0 260 16" fill="none" aria-hidden="true">
                <path
                  d="M4 11C50 3 110 2 140 6C170 10 220 8 256 12"
                  stroke="#F28C28"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M12 13C60 6 130 5 180 9C210 11 240 10 252 14"
                  stroke="#16834A"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.4"
                />
              </svg>
            </div>
            <p className="hero__tagline-sub">Vyavsay Ka Sahi Saathi</p>
          </div>
        </div>
      </div>

      {/* BOTTOM-LEFT: Statistics bar cleanly seated on the white curve matching Image 3 */}
      <div className="hero__stats-bar">
        <div className="hero__stats-bar-inner">
          <div className="hero__stats-row">
            <HeroStatCol
              icon={<Lightbulb size={24} strokeWidth={2} />}
              iconTheme="amber"
              target={500}
              suffix="+"
              label="Business Ideas"
            />

            <div className="hero__stat-divider" />

            <HeroStatCol
              icon={<Landmark size={24} strokeWidth={2} />}
              iconTheme="green"
              target={100}
              suffix="+"
              label="Government Schemes"
            />

            <div className="hero__stat-divider" />

            <HeroStatCol
              icon={<Users size={24} strokeWidth={2} />}
              iconTheme="blue"
              target={1000000}
              suffix="+"
              label="Rural Entrepreneurs"
              displayValue="1M"
            />

            <div className="hero__stat-divider" />

            <HeroStatCol
              icon={<MapPin size={24} strokeWidth={2} />}
              iconTheme="orange"
              target={28}
              suffix="+"
              label="States & UTs"
            />
          </div>

          {/* Substrip: Local Insights | Financial Clarity | Sustainable Growth */}
          <div className="hero__substrip">
            <Sprout size={16} className="hero__substrip-icon" />
            <span>Local Insights</span>
            <span className="hero__substrip-sep">|</span>
            <span>Financial Clarity</span>
            <span className="hero__substrip-sep">|</span>
            <span>Sustainable Growth</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStatCol({
  icon,
  iconTheme,
  target,
  suffix,
  label,
  displayValue,
}: {
  icon: React.ReactNode;
  iconTheme: 'amber' | 'green' | 'blue' | 'orange';
  target: number;
  suffix: string;
  label: string;
  displayValue?: string;
}) {
  const { count, ref } = useCountUp(target, 800);
  const display = displayValue
    ? count >= target
      ? displayValue
      : `${Math.floor(count / 1000)}K`
    : count.toLocaleString('en-IN');

  return (
    <div className="hero__stat-col" ref={ref}>
      <div className={`hero__stat-icon hero__stat-icon--${iconTheme}`}>
        {icon}
      </div>
      <span className="hero__stat-value font-data">
        {display}{suffix}
      </span>
      <span className="hero__stat-label">{label}</span>
    </div>
  );
}

/* --------------------------------------------------------------------------
   3. HOW IT WORKS (From Idea to Enterprise)
   -------------------------------------------------------------------------- */
interface JourneySectionProps {
  onStartAction: (route: string) => void;
}

function JourneySection({ onStartAction }: JourneySectionProps) {
  const { ref, isVisible } = useScrollReveal();

  const steps = [
    {
      num: '01',
      title: 'Choose Location',
      desc: 'Select state, district, block, and village to map local reach.',
      icon: <MapPin size={22} />,
    },
    {
      num: '02',
      title: 'Choose Business',
      desc: 'Select your sector from dairy, retail, agriculture, or services.',
      icon: <BarChart3 size={22} />,
    },
    {
      num: '03',
      title: 'Enter Capital',
      desc: 'Input available equity to calculate project scale & 10% margin.',
      icon: <Coins size={22} />,
    },
    {
      num: '04',
      title: 'Analyze Market',
      desc: 'Evaluate 10 KM consumer demand and competitor density.',
      icon: <TrendingUp size={22} />,
    },
    {
      num: '05',
      title: 'Plan Finance',
      desc: 'Auto-match schemes, compute exact EMI and moratorium grace.',
      icon: <Calculator size={22} />,
    },
    {
      num: '06',
      title: 'Build Plan',
      desc: 'Export bank-ready Detailed Project Report (DPR) for credit sanction.',
      icon: <FileCheck2 size={22} />,
    },
  ];

  return (
    <section className="journey-section section" aria-label="From Idea to Enterprise">
      <div className="container">
        <div className="section-header text-center">
          <span className="section-header__badge">Structured Methodology</span>
          <h2 className="section-heading">From Idea to Enterprise</h2>
          <p className="section-subheading">
            A simple, guided 6-step roadmap designed specifically for rural business creators.
          </p>
        </div>

        <div ref={ref} className={`journey-grid ${isVisible ? 'revealed' : ''}`}>
          {steps.map((step, i) => (
            <div key={i} className="journey-step">
              <div className="journey-step__top">
                <span className="journey-step__number">{step.num}</span>
                <div className="journey-step__icon">{step.icon}</div>
              </div>
              <h3 className="journey-step__title">{step.title}</h3>
              <p className="journey-step__desc">{step.desc}</p>
              {i < steps.length - 1 && <div className="journey-step__connector" />}
            </div>
          ))}
        </div>

        <div className="text-center" style={{ marginTop: 'var(--space-8)' }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onStartAction('/business-feasibility')}
          >
            Start Step 1 Now →
          </button>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
   4. CORE FEATURES SECTION (5 Cards)
   -------------------------------------------------------------------------- */
interface FeaturesSectionProps {
  onFeatureAction: (route: string) => void;
}

function FeaturesSection({ onFeatureAction }: FeaturesSectionProps) {
  const { ref, isVisible } = useScrollReveal();

  const features = [
    {
      icon: <TrendingUp size={26} />,
      title: 'Market Insights',
      desc: 'Understand local village demand, consumer demographics, competitor locations, and growth opportunities within 5–10 KM.',
      route: '/business-feasibility/market',
      tag: 'Hyper-Local Data',
      color: 'green',
    },
    {
      icon: <Calculator size={26} />,
      title: 'Financial Planner',
      desc: 'Structure your project cost, compute 10% self-margin requirement, term loan, exact monthly EMI, and moratorium schedules.',
      route: '/financial-calculator',
      tag: 'Deterministic Math',
      color: 'navy',
    },
    {
      icon: <Landmark size={26} />,
      title: 'Scheme Advisor',
      desc: 'Find verified financial support under PMEGP, MUDRA, and NABARD. Get auto-matched by project cost and prepare checklists.',
      route: '/scheme-advisor',
      tag: 'Subsidies & Grants',
      color: 'saffron',
    },
    {
      icon: <FileCheck2 size={26} />,
      title: 'Business Plan (DPR)',
      desc: 'Generate a comprehensive, 3-year bank-ready Detailed Project Report formatted for branch manager appraisal.',
      route: '/business-plan',
      tag: 'Bank Dossier',
      color: 'navy',
    },
    {
      icon: <Bot size={26} />,
      title: 'Mitra AI',
      desc: 'Get simple, personalized guidance on pricing, cost reduction, and bank interviews in English, Hindi, or Gujarati.',
      route: '/ai-mitra',
      tag: '24/7 Companion',
      color: 'green',
    },
  ];

  return (
    <section className="features-section section" aria-label="Platform core features">
      <div className="container">
        <div className="section-header text-center">
          <span className="section-header__badge">Enterprise Suite</span>
          <h2 className="section-heading">Integrated Platform Capabilities</h2>
          <p className="section-subheading">
            Everything a rural entrepreneur needs to plan, fund, and grow a sustainable business.
          </p>
        </div>

        <div ref={ref} className={`features-grid ${isVisible ? 'stagger-children' : ''}`}>
          {features.map((feat, i) => (
            <div
              key={i}
              className={`feature-card feature-card--${feat.color}`}
              onClick={() => onFeatureAction(feat.route)}
            >
              <div className="feature-card__top">
                <div className="feature-card__icon">{feat.icon}</div>
                <span className="feature-card__tag">{feat.tag}</span>
              </div>
              <h3 className="feature-card__title">{feat.title}</h3>
              <p className="feature-card__desc">{feat.desc}</p>
              <span className="feature-card__cta">
                Explore Feature <ArrowRight size={14} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
   5. WHY VYAVSAYMITRA SECTION
   -------------------------------------------------------------------------- */
function WhyVyavsayMitraSection() {
  const pillars = [
    {
      icon: <MapPin size={24} />,
      title: 'Local Intelligence',
      desc: 'Catchment analysis customized down to villages and blocks, not generic national statistics.',
    },
    {
      icon: <ShieldCheck size={24} />,
      title: 'Financial Clarity',
      desc: 'Pure deterministic math with standard RBI and bank appraisal rules — zero fabricated figures.',
    },
    {
      icon: <Sparkles size={24} />,
      title: 'Simple Guidance',
      desc: 'Clear, jargon-free instructions and interactive document checklists ready for bank submission.',
    },
    {
      icon: <Globe2 size={24} />,
      title: 'Multilingual Support',
      desc: 'Deep native support for English, हिन्दी, and ગુજરાતી so entrepreneurs work in their comfortable language.',
    },
  ];

  return (
    <section className="why-section section" aria-label="Why choose VyavsayMitra">
      <div className="container">
        <div className="section-header text-center">
          <span className="section-header__badge">Trust & Reliability</span>
          <h2 className="section-heading">Why Rural Entrepreneurs Trust VyavsayMitra</h2>
          <p className="section-subheading">
            Combining the reliability of Indian public services with the intelligence of modern fintech.
          </p>
        </div>

        <div className="why-grid">
          {pillars.map((pillar, i) => (
            <div key={i} className="why-card">
              <div className="why-card__icon">{pillar.icon}</div>
              <h3 className="why-card__title">{pillar.title}</h3>
              <p className="why-card__desc">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
   6. CALL TO ACTION SECTION
   -------------------------------------------------------------------------- */
interface CTASectionProps {
  onStartAction: (route: string) => void;
}

function CTASection({ onStartAction }: CTASectionProps) {
  return (
    <section className="cta-section" aria-label="Call to action">
      <div className="container text-center">
        <div className="cta-section__card">
          <span className="cta-section__badge">Start Today</span>
          <h2 className="cta-section__heading">Ready to Build Your Business?</h2>
          <p className="cta-section__text">
            Join thousands of rural entrepreneurs making confident, well-planned decisions with VyavsayMitra.
          </p>
          <div className="cta-section__buttons">
            <button
              type="button"
              className="btn btn--primary btn--xl"
              onClick={() => onStartAction('/business-feasibility')}
            >
              <span>Start Your Business Analysis</span>
              <ArrowRight size={18} />
            </button>
            <Link to="/register" className="btn btn--outline btn--xl">
              Create Free Account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
