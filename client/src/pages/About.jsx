import { Container, Row, Col, Card, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  FaBookOpen,
  FaUsers,
  FaHeart,
  FaCrown,
  FaMobileAlt,
  FaShieldAlt,
  FaGlobe,
  FaCheck,
  FaStar,
} from "react-icons/fa";
import { useState, useEffect } from "react";
import API from "../api/axios";
import "../styles/About.css";

const galleryImages = [
  {
    src: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80",
    alt: "Reading space",
    height: "tall",
  },
  {
    src: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=600&q=80",
    alt: "Library collection",
    height: "short",
  },
  {
    src: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=600&q=80",
    alt: "Digital library",
    height: "tall",
  },
  {
    src: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
    alt: "Book stack",
    height: "short",
  },
];
// 1250 -> "1.2K+", 12000 -> "12K+", 840 -> "840"
const formatCount = (n) => {
  if (n === null || n === undefined) return "—";
  if (n < 1000) return n.toLocaleString("en-IN");
  const k = Math.floor(n / 100) / 10;
  return `${Number.isInteger(k) ? k : k.toFixed(1)}K+`;
};

function About() {
  const navigate = useNavigate();
    const [stats, setStats] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await API.get("/stats");
        if (isMounted) setStats(res.data?.stats || null);
      } catch (error) {
        // leave stats null -> cards show "—"
      }
    };
    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="about-page">
      {/* 1. HERO SECTION WITH RESTORED WAVE */}
      <section className="about-hero">
        <Container className="position-relative" style={{ zIndex: 2 }}>
          <div className="text-center mx-auto mb-4" style={{ maxWidth: 640 }}>
            <h1 className="about-hero-title mb-1">About us</h1>
            <p className="about-hero-subtitle mt-0 mb-4">
              SAFAR EBOOKS is a modern digital library that connects readers with
              thousands of books across multiple categories and languages. Our goal
              is to make reading simple, enjoyable, and accessible for everyone.
            </p>
          </div>

          <Row className="justify-content-center g-3 about-gallery-grid">
            {galleryImages.map((img) => (
              <Col xs={6} md={3} key={img.alt}>
                <div className={`gallery-card gallery-card-${img.height}`}>
                  <img src={img.src} alt={img.alt} />
                </div>
              </Col>
            ))}
          </Row>
        </Container>

        {/* RESTORED ORIGINAL WAVE */}
        <div className="about-hero-wave">
          <svg
            viewBox="0 0 1440 180"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,60 C320,140 420,10 720,80 C1020,150 1120,20 1440,60 L1440,180 L0,180 Z"
              fill="var(--color-light-blush)"
            />
          </svg>
        </div>
      </section>

      {/* 2. VISION & VALUES PILLARS */}
      <section className="about-vision-section">
        <Container>
          <div className="text-center mx-auto mb-5" style={{ maxWidth: 640 }}>
            <span className="about-eyebrow">OUR CORE PHILOSOPHY</span>
            <h2 className="about-heading">Building a Better Reading Future</h2>
            <p className="about-text-muted">
              We envision a world where stories unite minds, eliminate barriers,
              and inspire lifelong reading habits for every curious thinker.
            </p>
          </div>

          <Row className="g-4">
            <Col md={4}>
              <div className="vision-pill-card">
                <div className="vision-icon-bubble">
                  <FaUsers size={20} />
                </div>
                <h3 className="vision-card-title">Readers First</h3>
                <p className="vision-card-desc">
                  We design responsive typography, dark/sepia modes, and bookmarking
                  tools tailored strictly for visual comfort and long-form immersion.
                </p>
              </div>
            </Col>

            <Col md={4}>
              <div className="vision-pill-card">
                <div className="vision-icon-bubble">
                  <FaGlobe size={20} />
                </div>
                <h3 className="vision-card-title">Borderless Access</h3>
                <p className="vision-card-desc">
                  Curating multi-lingual literature from classic to modern indie works,
                  instantly accessible on phones, tablets, or laptops.
                </p>
              </div>
            </Col>

            <Col md={4}>
              <div className="vision-pill-card">
                <div className="vision-icon-bubble">
                  <FaCrown size={20} />
                </div>
                <h3 className="vision-card-title">Fair Ecosystem</h3>
                <p className="vision-card-desc">
                  Providing transparent revenue channels so authors are fairly rewarded
                  for publishing unique, impactful digital books.
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* 3. USP / WHAT WE DO GRID */}
      <section className="about-usp-section">
        <Container>
          <div className="mb-4">
            <span className="about-eyebrow">WHAT WE DELIVER</span>
            <h2 className="about-heading">Solutions that fuel literary culture</h2>
          </div>

          <Row className="g-4">
            <Col lg={8}>
              <Row className="g-3">
                <Col sm={6}>
                  <div className="usp-grid-card">
                    <FaBookOpen className="usp-icon" />
                    <h4>Digital eBooks & PDFs</h4>
                    <p>Clean typography, responsive zoom, and adjustable reading themes.</p>
                  </div>
                </Col>

                <Col sm={6}>
                  <div className="usp-grid-card">
                    <FaCrown className="usp-icon" />
                    <h4>VIP Memberships</h4>
                    <p>Unlimited access to premium bestsellers, early access, and bonus editions.</p>
                  </div>
                </Col>

                <Col sm={6}>
                  <div className="usp-grid-card">
                    <FaMobileAlt className="usp-icon" />
                    <h4>Cross-Device Sync</h4>
                    <p>Resume reading on your laptop, phone, or tablet with automatic progress tracking.</p>
                  </div>
                </Col>

                <Col sm={6}>
                  <div className="usp-grid-card">
                    <FaShieldAlt className="usp-icon" />
                    <h4>Secure Book DRM</h4>
                    <p>Encrypted delivery and secure cloud reader preventing unauthorized redistribution.</p>
                  </div>
                </Col>
              </Row>
            </Col>

            {/* Right Highlight Card */}
            <Col lg={4}>
              <div className="usp-highlight-card">
                <span className="highlight-tag">OUR ADVANTAGE</span>
                <h3 className="highlight-heading">Why readers choose SAFAR EBOOKS</h3>
                <ul className="highlight-list">
                  <li><FaCheck size={12} className="check-icon" /> Completely distraction-free UI</li>
                  <li><FaCheck size={12} className="check-icon" /> Seamless Razorpay subscription checkout</li>
                  <li><FaCheck size={12} className="check-icon" /> Amazon Kindle & Flipkart print order links</li>
                  <li><FaCheck size={12} className="check-icon" /> Curated reviews & community ratings</li>
                  <li><FaCheck size={12} className="check-icon" /> Fast lightweight web-first reading viewer</li>
                </ul>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* 4. SOCIAL PROOF / NUMBERS */}
      <section className="about-proof-section">
        <Container>
          <div className="text-center mb-4">
            <span className="about-eyebrow">PLATFORM REACH</span>
            <h2 className="about-heading">Numbers that speak for our library</h2>
          </div>

          <div className="proof-metrics-strip">
            <div className="proof-item">
              <FaUsers className="proof-icon" />
              <div className="proof-content">
                <h3>{formatCount(stats?.readers)}</h3>
<p>Happy Active Readers</p>
              </div>
            </div>

            <div className="proof-item">
              <FaBookOpen className="proof-icon" />
              <div className="proof-content">
                <h3>{formatCount(stats?.books)}</h3>
<p>Books Cataloged</p>
              </div>
            </div>

            <div className="proof-item">
              <FaStar className="proof-icon" />
              <div className="proof-content">
                <h3>
  {stats?.averageRating != null ? `${stats.averageRating} / 5` : "—"}
</h3>
<p>Reader Reviews</p>
              </div>
            </div>

            <div className="proof-item">
              <FaHeart className="proof-icon" />
              <div className="proof-content">
                <h3>
  {stats?.satisfaction != null ? `${stats.satisfaction}%` : "—"}
</h3>
<p>Reader Satisfaction</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 5. CLOSING CTA BANNER */}
      <section className="about-cta-section">
        <Container>
          <div className="about-cta-card">
            <span className="cta-eyebrow">START EXPLORING TODAY</span>
            <h2 className="cta-headline">Ready to discover your next favorite book?</h2>
            <p className="cta-sub">
              Join thousands of readers who start their literary journey on SAFAR EBOOKS every day.
            </p>
            <Button
              className="btn-cta-action"
              onClick={() => navigate("/library")}
            >
              Browse Digital Library
            </Button>
          </div>
        </Container>
      </section>
    </div>
  );
}

export default About;