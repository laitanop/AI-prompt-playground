export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <p className="footer-description">
            This is a showcase of practical demos and projects I built while learning from
            <strong> "Building with the Claude API"</strong> — a comprehensive course covering the full spectrum
            of working with Anthropic models using the Claude API.
          </p>
        </div>
        <div className="footer-credit">
          <p>
            © {currentYear} <a href="https://laitanop.dev" target="_blank" rel="noopener noreferrer">laitanop.dev</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
