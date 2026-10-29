import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Hero.css";
import heroImg from "../assets/images/hero-book.jpg";

function Hero() {
  const navigate = useNavigate();

  return (
    <section className="editorial-hero-root">
      {/* SVG Wave Definition for Organic Left Curve */}
      <svg className="svg-wave-defs" aria-hidden="true">
        <defs>
          <clipPath id="heroOrganicWave" clipPathUnits="objectBoundingBox">
            <path d="M 0.18,0 C 0.04,0.18 0.18,0.38 0.05,0.58 C -0.04,0.74 0.12,0.88 0,1 L 1,1 L 1,0 Z" />
          </clipPath>
        </defs>
      </svg>

      <div className="editorial-hero-container">
        {/* Left Column: Editorial Text Block */}
        <div className="editorial-text-col">
          <h1 className="editorial-headline">
            We bring stories<br />
            to life<span className="dot-accent">.</span>
          </h1>

          {/* Book Accent Divider */}
          <div className="editorial-divider">
            <span className="div-bar"></span>
            <span className="div-icon">
              <svg width="20" height="16" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M2 3.5C5.5 2 9.5 2.5 12 5C14.5 2.5 18.5 2 22 3.5V17C18.5 15.5 14.5 16 12 18.5C9.5 16 5.5 15.5 2 17V3.5Z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 5V18.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="div-bar"></span>
          </div>

          <p className="editorial-subtext">
            SAFAR EBOOKS is dedicated to discovering powerful voices and crafting books that inspire, inform, and leave a lasting impact.
          </p>

          <button
            type="button"
            className="editorial-btn"
            onClick={() => navigate("/about")}
          >
            READ MORE &nbsp;&rarr;
          </button>
        </div>

        {/* Right Stage: Flush Edge Wave Image */}
        <div className="editorial-visual-col">
          <div className="editorial-wave-wrapper">
            <img
              src={heroImg}
              alt="Curated Book Collection"
              className="editorial-wave-image"
            />
          </div>
        </div>
      </div>

      {/* Bottom 4-Column Feature Bar */}
      <div className="editorial-footer-strip">
        <div className="editorial-footer-inner">
          <div className="footer-feature-item">
            <div className="f-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="8" x2="2" y2="22" strokeLinecap="round"/>
                <line x1="17.5" y1="15" x2="9" y2="15" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="f-text">
              <h6>AUTHOR FOCUSED</h6>
              <p>We support authors at every step.</p>
            </div>
          </div>

          <div className="footer-feature-item">
            <div className="f-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="f-text">
              <h6>QUALITY PUBLISHING</h6>
              <p>Exceptional editing, design, and production.</p>
            </div>
          </div>

          <div className="footer-feature-item">
            <div className="f-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="f-text">
              <h6>MEANINGFUL STORIES</h6>
              <p>Books that connect, teach, and inspire.</p>
            </div>
          </div>

          <div className="footer-feature-item">
            <div className="f-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12" strokeLinecap="round"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="f-text">
              <h6>GLOBAL REACH</h6>
              <p>Bringing stories to readers everywhere.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;