import './TopInfoBar.css';

function IndiaFlag({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="13"
      viewBox="0 0 24 16"
      aria-label="Flag of India"
    >
      <rect width="24" height="5.33" fill="#FF9933" />
      <rect y="5.33" width="24" height="5.33" fill="#FFFFFF" />
      <rect y="10.67" width="24" height="5.33" fill="#138808" />
      <circle cx="12" cy="8" r="2.2" stroke="#000080" strokeWidth="0.6" fill="none" />
      <circle cx="12" cy="8" r="0.4" fill="#000080" />
    </svg>
  );
}

export default function TopInfoBar() {
  return (
    <div className="info-bar" role="banner" aria-label="National mission bar">
      <div className="info-bar__content container">
        <div className="info-bar__message">
          <IndiaFlag className="info-bar__flag" />
          <span>Towards a Prosperous Rural India</span>
        </div>
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
