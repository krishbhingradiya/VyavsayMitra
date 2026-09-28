import React from 'react';
import { Link } from 'react-router-dom';
import './BrandLogo.css';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'navbar' | 'sidebar';
  showTagline?: boolean;
  iconOnly?: boolean;
  asLink?: boolean;
  to?: string;
  className?: string;
  theme?: 'light' | 'dark' | 'white' | 'auto';
  variant?: 'light' | 'dark' | 'white' | 'auto';
  height?: number;
}

export const BrandEmblem: React.FC<{
  size?: number;
  className?: string;
  theme?: 'light' | 'dark' | 'white' | 'auto';
}> = ({
  size = 42,
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
  theme,
  variant,
  height: customHeight,
}) => {
  const ASPECT_RATIO = 947 / 317; // exact ~2.9874 ratio of the trimmed official logo

  const dimensions: Record<string, { height: number; width: number }> = {
    sm: { height: 42, width: Math.round(42 * ASPECT_RATIO) },
    md: { height: 56, width: Math.round(56 * ASPECT_RATIO) },
    navbar: { height: 68, width: Math.round(68 * ASPECT_RATIO) },
    sidebar: { height: 68, width: Math.round(68 * ASPECT_RATIO) },
    lg: { height: 74, width: Math.round(74 * ASPECT_RATIO) },
    xl: { height: 88, width: Math.round(88 * ASPECT_RATIO) },
  };

  const dim = customHeight
    ? { height: customHeight, width: Math.round(customHeight * ASPECT_RATIO) }
    : dimensions[size] || dimensions.md;

  const resolvedTheme = variant || theme || 'auto';

  let content: React.ReactNode;

  if (iconOnly) {
    content = (
      <img
        src="/logo-icon.png"
        alt="VYAVSAYMITRA"
        width={dim.height}
        height={dim.height}
        className={`brand-logo-img brand-logo-img--icon brand-logo-img--${size} ${className}`}
        style={{
          height: `${dim.height}px`,
          width: `${dim.height}px`,
          display: 'block',
          objectFit: 'contain',
          maxWidth: '100%',
        }}
      />
    );
  } else if (resolvedTheme === 'dark') {
    // Explicit dark-background logo (crisp pure white VYAVSAY + vibrant emerald MITRA + clean white tagline)
    content = (
      <img
        src="/logo-white.png"
        alt="VYAVSAYMITRA — Market. Money. Mitra."
        width={dim.width}
        height={dim.height}
        className={`brand-logo-img brand-logo-img--full brand-logo-img--dark brand-logo-img--${size} ${className}`}
        style={{
          height: `${dim.height}px`,
          width: 'auto',
          display: 'block',
          objectFit: 'contain',
          maxWidth: '100%',
        }}
      />
    );
  } else if (resolvedTheme === 'white') {
    // Monochrome all-white logo for solid brand green or saffron backgrounds
    content = (
      <img
        src="/logo-monochrome.png"
        alt="VYAVSAYMITRA — Market. Money. Mitra."
        width={dim.width}
        height={dim.height}
        className={`brand-logo-img brand-logo-img--full brand-logo-img--white brand-logo-img--${size} ${className}`}
        style={{
          height: `${dim.height}px`,
          width: 'auto',
          display: 'block',
          objectFit: 'contain',
          maxWidth: '100%',
        }}
      />
    );
  } else if (resolvedTheme === 'light') {
    // Explicit light-background logo
    content = (
      <img
        src="/logo.png"
        alt="VYAVSAYMITRA — Market. Money. Mitra."
        width={dim.width}
        height={dim.height}
        className={`brand-logo-img brand-logo-img--full brand-logo-img--light brand-logo-img--${size} ${className}`}
        style={{
          height: `${dim.height}px`,
          width: 'auto',
          display: 'block',
          objectFit: 'contain',
          maxWidth: '100%',
        }}
      />
    );
  } else {
    // 'auto': dual rendering responsive to dark/light containers and dark mode via CSS
    content = (
      <span className={`brand-logo-wrap brand-logo-wrap--auto brand-logo-wrap--${size} ${className}`}>
        <img
          src="/logo.png"
          alt="VYAVSAYMITRA — Market. Money. Mitra."
          width={dim.width}
          height={dim.height}
          className={`brand-logo-img brand-logo-img--full brand-logo-img--light-bg brand-logo-img--${size}`}
          style={{
            height: `${dim.height}px`,
            width: 'auto',
            objectFit: 'contain',
            maxWidth: '100%',
          }}
        />
        <img
          src="/logo-white.png"
          alt="VYAVSAYMITRA — Market. Money. Mitra."
          width={dim.width}
          height={dim.height}
          className={`brand-logo-img brand-logo-img--full brand-logo-img--dark-bg brand-logo-img--${size}`}
          style={{
            height: `${dim.height}px`,
            width: 'auto',
            objectFit: 'contain',
            maxWidth: '100%',
          }}
        />
      </span>
    );
  }

  if (asLink) {
    return (
      <Link to={to} className="brand-logo-link" aria-label="VYAVSAYMITRA Home">
        {content}
      </Link>
    );
  }

  return <>{content}</>;
};

export default BrandLogo;
