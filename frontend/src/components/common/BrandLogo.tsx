import React from 'react';
import { Link } from 'react-router-dom';
import './BrandLogo.css';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  iconOnly?: boolean;
  asLink?: boolean;
  to?: string;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export const BrandEmblem: React.FC<{ size?: number; className?: string }> = ({
  size = 38,
  className = '',
}) => {
  return (
    <img
      src="/logo-icon.png"
      alt="VYAVSAYMITRA Emblem"
      width={size}
      height={size}
      className={`brand-emblem ${className}`}
      style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain', display: 'block' }}
      aria-hidden="true"
    />
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  iconOnly = false,
  asLink = false,
  to = '/',
  className = '',
}) => {
  const heights = {
    sm: 32,
    md: 42,
    lg: 52,
    xl: 66,
  };

  const currentHeight = heights[size];

  const content = iconOnly ? (
    <img
      src="/logo-icon.png"
      alt="VYAVSAYMITRA"
      height={currentHeight}
      className={`brand-logo-img brand-logo-img--icon ${className}`}
      style={{ height: `${currentHeight}px`, width: 'auto', display: 'block', objectFit: 'contain' }}
    />
  ) : (
    <img
      src="/logo.png"
      alt="VYAVSAYMITRA — Market. Money. Mitra."
      height={currentHeight}
      className={`brand-logo-img brand-logo-img--full ${className}`}
      style={{ height: `${currentHeight}px`, width: 'auto', display: 'block', objectFit: 'contain' }}
    />
  );

  if (asLink) {
    return (
      <Link to={to} className="brand-logo-link" aria-label="VYAVSAYMITRA Home">
        {content}
      </Link>
    );
  }

  return content;
};

export default BrandLogo;
