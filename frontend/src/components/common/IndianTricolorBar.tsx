import './IndianTricolorBar.css';

/**
 * Global National Identity Tricolor Bar
 * A subtle, thin Indian Tricolour (Saffron, White, Green) identity strip
 * rendered at the absolute top of the entire VyavsayMitra application.
 */
export default function IndianTricolorBar() {
  return (
    <div
      className="indian-tricolor-bar"
      role="presentation"
      aria-hidden="true"
    >
      <div className="indian-tricolor-bar__band indian-tricolor-bar__band--saffron" />
      <div className="indian-tricolor-bar__band indian-tricolor-bar__band--white" />
      <div className="indian-tricolor-bar__band indian-tricolor-bar__band--green" />
    </div>
  );
}
