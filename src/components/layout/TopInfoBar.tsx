import './TopInfoBar.css';

export default function TopInfoBar() {
  return (
    <div className="info-bar" role="banner" aria-label="National mission bar">
      <div className="info-bar__tricolor">
        <span className="info-bar__stripe info-bar__stripe--saffron" />
        <span className="info-bar__stripe info-bar__stripe--white" />
        <span className="info-bar__stripe info-bar__stripe--green" />
      </div>
      <div className="info-bar__content container">
        <span className="info-bar__message">
          🇮🇳 Towards a Prosperous Rural India
          <span className="info-bar__flag-icon" aria-hidden="true">
            <span style={{ background: '#FF9933' }} />
            <span style={{ background: '#FFFFFF' }} />
            <span style={{ background: '#128807' }} />
          </span>
        </span>
        <div className="info-bar__badges">
          <span className="info-bar__badge">Digital India</span>
          <span className="info-bar__sep">|</span>
          <span className="info-bar__badge">Startup India</span>
          <span className="info-bar__sep">|</span>
          <span className="info-bar__badge">Viksit Bharat</span>
        </div>
      </div>
    </div>
  );
}
