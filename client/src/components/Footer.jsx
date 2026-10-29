import { Link } from "react-router-dom";
import { Container, Row, Col } from "react-bootstrap";
import { FaBookOpen, FaArrowUp } from "react-icons/fa";
import useSiteInfo from "../hooks/useSiteInfo";

import "../styles/Footer.css";

function Footer() {
const info = useSiteInfo();

const scrollToTop = () => {
window.scrollTo({
top: 0,
behavior: "smooth",
});
};

return ( <footer className="footer-wrapper"> <Container fluid="lg" className="footer-content-container py-4 px-3 px-md-4"> <Row className="footer-main-row align-items-center g-4 text-start">
{/* Left side: Branding and navigation links */} <Col xs={8} md={7} className="footer-links-column"> <div className="footer-brand-color d-flex align-items-center gap-2 fs-3 fw-bold"> <FaBookOpen className="footer-brand-icon" /> <span className="footer-brand-name">
{info.siteName} </span> </div>
        <p className="footer-tagline small fw-semibold mt-1">
          Read Beyond Limits
        </p>

        <hr className="footer-divider w-100" />

        <nav className="footer-navigation" aria-label="Footer navigation">
          <Link to="/about" className="footer-link">
            About
          </Link>

          <Link to="/library" className="footer-link">
            Library
          </Link>

          <Link to="/pricing" className="footer-link">
            Subscription
          </Link>

          <Link to="/reviews" className="footer-link">
            Reviews
          </Link>

          <Link to="/faq" className="footer-link">
            FAQ
          </Link>
        </nav>
      </Col>

      {/* Right side: Animated wireframe book */}
      <Col
        xs={4}
        md={5}
        className="footer-illustration-column"
      >
        <div
          className="footer-wireframe-container"
          aria-label="Animated open book illustration"
          role="img"
        >
          <svg
            viewBox="0 0 240 220"
            className="footer-wireframe-svg"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="bookWireframeGlow"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="#FFFFFF"
                  stopOpacity="0.95"
                />
                <stop
                  offset="50%"
                  stopColor="#E2CAD0"
                  stopOpacity="0.75"
                />
                <stop
                  offset="100%"
                  stopColor="#8A6B7D"
                  stopOpacity="0.35"
                />
              </linearGradient>
            </defs>

            <ellipse
              cx="120"
              cy="110"
              rx="105"
              ry="48"
              stroke="url(#bookWireframeGlow)"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              transform="rotate(-15 120 110)"
              className="wireframe-orbit"
            />

            <polygon
              points="120,45 35,75 45,155 120,130"
              stroke="url(#bookWireframeGlow)"
              strokeWidth="1.5"
              fill="rgba(74, 59, 71, 0.12)"
            />

            <line
              x1="120"
              y1="45"
              x2="45"
              y2="155"
              stroke="url(#bookWireframeGlow)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            <line
              x1="35"
              y1="75"
              x2="120"
              y2="130"
              stroke="url(#bookWireframeGlow)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            <polygon
              points="120,45 205,75 195,155 120,130"
              stroke="url(#bookWireframeGlow)"
              strokeWidth="1.5"
              fill="rgba(74, 59, 71, 0.12)"
            />

            <line
              x1="120"
              y1="45"
              x2="195"
              y2="155"
              stroke="url(#bookWireframeGlow)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            <line
              x1="205"
              y1="75"
              x2="120"
              y2="130"
              stroke="url(#bookWireframeGlow)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            <line
              x1="45"
              y1="155"
              x2="45"
              y2="170"
              stroke="url(#bookWireframeGlow)"
              strokeWidth="1.5"
            />

            <line
              x1="120"
              y1="130"
              x2="120"
              y2="150"
              stroke="url(#bookWireframeGlow)"
              strokeWidth="2"
            />

            <line
              x1="195"
              y1="155"
              x2="195"
              y2="170"
              stroke="url(#bookWireframeGlow)"
              strokeWidth="1.5"
            />

            <polygon
              points="45,170 120,150 195,170 120,130"
              stroke="url(#bookWireframeGlow)"
              strokeWidth="1.2"
            />

            <circle
              cx="120"
              cy="45"
              r="3.5"
              fill="#FFFFFF"
              className="node-pulse"
            />

            <circle cx="35" cy="75" r="3" fill="#FFFFFF" />
            <circle cx="205" cy="75" r="3" fill="#FFFFFF" />

            <circle
              cx="120"
              cy="130"
              r="3.5"
              fill="#FFFFFF"
              className="node-pulse"
            />

            <circle cx="45" cy="155" r="3" fill="#FFFFFF" />
            <circle cx="195" cy="155" r="3" fill="#FFFFFF" />
          </svg>
        </div>
      </Col>
    </Row>
  </Container>

  {/* Diagonal stepped banner */}
  <div className="diagonal-stepped-banner">
    <div className="step-layer layer-deep-mauve" />
    <div className="step-layer layer-plum" />

    <div className="step-layer layer-dusty-mauve">
      <button
        type="button"
        className="scroll-top-btn"
        onClick={scrollToTop}
        title="Scroll to top"
        aria-label="Scroll to top"
      >
        <FaArrowUp />
      </button>
    </div>
  </div>

  {/* Footer bottom bar */}
  <div className="footer-bottom-bar py-3 px-3 px-md-4 small">
    <Container
      fluid="lg"
      className="footer-bottom-content d-flex flex-column flex-md-row justify-content-between align-items-center gap-2"
    >
      <nav
        className="footer-legal-navigation"
        aria-label="Legal navigation"
      >
        <Link to="/privacy-policy" className="footer-legal-link">
          Privacy Policy
        </Link>

        <span className="footer-dot" aria-hidden="true">
          •
        </span>

        <Link to="/terms" className="footer-legal-link">
          Terms &amp; Conditions
        </Link>

        <span className="footer-dot" aria-hidden="true">
          •
        </span>

        <Link to="/refund-policy" className="footer-legal-link">
          Refund &amp; Cancellation
        </Link>
      </nav>

      <div className="footer-copyright">
        {info.copyrightText ||
          "© 2026 SAFAR EBOOKS, operated by SAFAR TECHLAB LLP. All Rights Reserved."}
      </div>
    </Container>
  </div>
</footer>


);
}

export default Footer;
