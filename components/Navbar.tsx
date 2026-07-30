import Link from "next/link";

export default function Navbar() {
  const currentYear = new Date().getFullYear();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Left: Logo/Title */}
        <div className="navbar-brand">
          <Link href="/" className="navbar-logo">
            <span className="navbar-logo-icon">🎓</span>
            <span className="navbar-logo-text">Claude API Playground</span>
          </Link>
        </div>

        {/* Center: Course Info */}
        <div className="navbar-info">
          <p className="navbar-tagline">
            Learning from <strong>"Building with the Claude API"</strong> — A comprehensive course on Anthropic models
          </p>
        </div>

        {/* Right: Credit */}
        <div className="navbar-credit">
          <a href="https://laitanop.dev" target="_blank" rel="noopener noreferrer" className="navbar-link">
            laitanop.dev
          </a>
          <span className="navbar-year">{currentYear}</span>
        </div>
      </div>
    </nav>
  );
}
