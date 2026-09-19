import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../common/BrandLogo';
import './Footer.css';

export default function Footer() {
  const { i18n } = useTranslation();
  const year = new Date().getFullYear();

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('vyavsaymitra-lang', langCode);
  };

  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer__grid">
          {/* Left: Brand */}
          <div className="footer__brand">
            <div className="footer__logo">
              <BrandLogo size="md" theme="dark" />
            </div>
            <p className="footer__desc">
              Empowering rural entrepreneurs with better information, planning and guidance.
            </p>
            <p className="footer__moto">
              "Sapne Se Safal Vyavsay Tak"
            </p>
          </div>

          {/* Col 1: Product */}
          <div className="footer__col">
            <h4 className="footer__heading">Product</h4>
            <Link to="/business-feasibility" className="footer__link">
              Business Analysis
            </Link>
            <Link to="/financial-calculator" className="footer__link">
              Financial Planner
            </Link>
            <Link to="/scheme-advisor" className="footer__link">
              Scheme Advisor
            </Link>
            <Link to="/ai-mitra" className="footer__link">
              Mitra AI
            </Link>
          </div>

          {/* Col 2: Resources */}
          <div className="footer__col">
            <h4 className="footer__heading">Resources</h4>
            <Link to="/business-plan" className="footer__link">
              Business Planning (DPR)
            </Link>
            <Link to="/funding-support" className="footer__link">
              Financial Education & Subsidies
            </Link>
            <Link to="/reports" className="footer__link">
              Appraisal Dossiers
            </Link>
            <a href="#support" className="footer__link">
              Support Center
            </a>
          </div>

          {/* Col 3: Languages */}
          <div className="footer__col">
            <h4 className="footer__heading">Languages</h4>
            <button
              type="button"
              className={`footer__lang-btn ${i18n.language === 'en' ? 'footer__lang-btn--active' : ''}`}
              onClick={() => changeLanguage('en')}
            >
              English
            </button>
            <button
              type="button"
              className={`footer__lang-btn ${i18n.language === 'hi' ? 'footer__lang-btn--active' : ''}`}
              onClick={() => changeLanguage('hi')}
            >
              हिन्दी
            </button>
            <button
              type="button"
              className={`footer__lang-btn ${i18n.language === 'gu' ? 'footer__lang-btn--active' : ''}`}
              onClick={() => changeLanguage('gu')}
            >
              ગુજરાતી
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer__bottom">
          <div className="footer__tricolor">
            <span style={{ background: '#FF9933' }} />
            <span style={{ background: '#FFFFFF' }} />
            <span style={{ background: '#128807' }} />
          </div>
          <p className="footer__copyright">
            © {year} VYAVSAYMITRA. Built for rural entrepreneurship.
          </p>
          <p className="footer__disclaimer">
            *All financial estimations and scheme criteria are for advisory & planning demonstration purposes.
          </p>
        </div>
      </div>
    </footer>
  );
}
