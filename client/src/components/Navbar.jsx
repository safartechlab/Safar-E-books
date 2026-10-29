import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { FaBookOpen, FaBars, FaUserShield } from "react-icons/fa";

import API from "../api/axios";
import useSiteInfo from "../hooks/useSiteInfo";

import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import ForgotPasswordForm from "../components/ForgotPasswordForm";
import VerifyOtpForm from "../components/VerifyOtpForm";
import ResetPasswordForm from "../components/ResetPasswordForm";

import { toast } from "react-toastify";
import "../styles/Navbar.css";

import maleAvatar from "../assets/images/male-avatar.png";
import femaleAvatar from "../assets/images/female-avatar.png";
import loginIcon from "../assets/images/login.png";

// Defined at module level on purpose. When this lived inside Navbar(), every
// Navbar re-render (scroll, route change, any state update) created a brand-new
// component type, so React unmounted and remounted the open popup and wiped
// whatever the user had typed into the login/register forms.
const Popup = ({ onClose, children }) => (
  <div
    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3 popup-overlay"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-4 p-4 position-relative popup-box"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="btn-close position-absolute top-0 end-0 m-3"
        onClick={onClose}
        aria-label="Close"
      />
      {children}
    </div>
  </div>
);

function Navbar() {
  const navigate = useNavigate();
  const info = useSiteInfo();
  const location = useLocation();
  const profileRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const profileImage = user?.gender === "female" ? femaleAvatar : maleAvatar;

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [showPopup, setShowPopup] = useState(false);
  const [showRegisterPopup, setShowRegisterPopup] = useState(false);
  const [showForgotPopup, setShowForgotPopup] = useState(false);
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSignupOtpPopup, setShowSignupOtpPopup] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        if (!event.target.closest(".hamburger-btn")) {
          setMobileMenuOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowProfileMenu(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const msg = sessionStorage.getItem("forcedLogoutMessage");
    if (msg) {
      sessionStorage.removeItem("forcedLogoutMessage");
      toast.warning(msg, { autoClose: 6000 });
    }
  }, []);

  useEffect(() => {
    const handleScroll = (e) => {
      const rootEl = document.getElementById("root");
      const scrollPos =
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        (rootEl ? rootEl.scrollTop : 0) ||
        (e?.target?.scrollTop || 0);

      setScrolled(scrollPos > 15);
    };

    window.addEventListener("scroll", handleScroll, true);
    document.addEventListener("scroll", handleScroll, true);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("login") === "1") {
      setShowPopup(true);
      params.delete("login");
      const redirect = params.get("redirect");
      params.delete("redirect");
      const rest = params.toString();
      navigate(
        { pathname: location.pathname, search: rest ? `?${rest}` : "" },
        { replace: true }
      );
      if (redirect) {
        sessionStorage.setItem("postLoginRedirect", redirect);
      }
    }
  }, [location.search, location.pathname, navigate]);

  const handleLogout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (err) {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully!");
    setTimeout(() => (window.location.href = "/"), 1000);
  };

  return (
    <>
      <nav
        className={`navbar-custom fixed-top d-flex justify-content-between align-items-center py-2 py-md-3 px-3 px-lg-5 ${
          scrolled ? "scrolled" : ""
        }`}
      >
        {/* Logo */}
        <div
          className="d-flex align-items-center gap-2 logo-text"
          role="button"
          onClick={() => navigate("/")}
        >
          <FaBookOpen className="brand-book-icon flex-shrink-0" />
          <span className="fw-bold brand-title-text">{info.siteName}</span>
        </div>

        {/* Links & Mobile Drawer */}
        <div
          ref={mobileMenuRef}
          className={`nav-content d-flex flex-column flex-lg-row align-items-lg-center gap-lg-5 ${
            mobileMenuOpen ? "open" : ""
          }`}
        >
          {/* Drawer close button (mobile only) */}
          <div className="d-flex d-lg-none justify-content-end mb-3">
            <button
              type="button"
              className="btn-close"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close"
            />
          </div>

          <ul className="d-flex flex-column flex-lg-row list-unstyled gap-lg-3 gap-xl-4 gap-3 m-0 nav-links">
            <li>
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            </li>
            <li>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)}>About</Link>
            </li>
            <li>
              <Link to="/library" onClick={() => setMobileMenuOpen(false)}>Library</Link>
            </li>
            <li>
              <Link to="/pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
            </li>
            <li>
              <Link to="/contactUs" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
            </li>
          </ul>
        </div>

        {/* Right Controls */}
        <div className="d-flex align-items-center gap-2 gap-sm-3 nav-right-controls">
          {user ? (
            <div className="position-relative" ref={profileRef}>
              {user.role === "admin" ? (
                <div
                  className="d-flex align-items-center fs-2"
                  role="button"
                  onClick={() => navigate("/admin/dashboard")}
                >
                  <FaUserShield />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="avatar-toggle-btn p-0 bg-transparent border-0"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    aria-label="Toggle user profile menu"
                  >
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="rounded-circle border border-white avatar-sm"
                    />
                  </button>

                  {showProfileMenu && (
                    <div className="position-absolute end-0 mt-2 rounded-4 shadow-lg overflow-hidden profile-dropdown">
                      <div className="text-center p-3">
                        <img
                          src={profileImage}
                          alt="Profile"
                          className="rounded-circle mb-2 avatar-lg"
                        />
                        <h4 className="mb-0 fs-6 fw-bold profile-dropdown-name">{user.name}</h4>
                        <p className="mt-1 text-muted small text-break">{user.email}</p>
                      </div>
                      <hr className="m-0" />
                      <button
                        className="w-100 border-0 bg-transparent text-start px-3 py-2"
                        onClick={() => { setShowProfileMenu(false); navigate("/profile"); }}
                      >
                         My Profile
                      </button>
                      <button
                        className="w-100 border-0 bg-transparent text-start px-3 py-2"
                        onClick={() => navigate("/wishlist")}
                      >
                         Favorites
                      </button>
                      <button
                        className="w-100 border-0 bg-transparent text-start px-3 py-2"
                        onClick={() => { setShowProfileMenu(false); navigate("/my-purchases"); }}
                      >
                         My Purchases
                      </button>
                      <button
                        className="w-100 border-0 bg-transparent text-start px-3 py-2"
                        onClick={() => { setShowProfileMenu(false); navigate("/reading-history"); }}
                      >
                         Reading History
                      </button>
                      <button
                        className="w-100 border-0 bg-transparent text-start px-3 py-2 text-danger fw-semibold"
                        onClick={handleLogout}
                      >
                         Logout
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="login-btn rounded-pill d-flex align-items-center justify-content-center fw-semibold"
              onClick={() => { setMobileMenuOpen(false); setShowPopup(true); }}
              title="Login"
              aria-label="Login"
            >
              <img src={loginIcon} alt="Login" className="login-btn-icon-img" />
              <span className="login-btn-text">Login</span>
            </button>
          )}

          {/* Hamburger Menu Toggle */}
          <div
            className="d-lg-none fs-4 hamburger-btn d-flex align-items-center justify-content-center"
            role="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Open navigation menu"
          >
            <FaBars />
          </div>
        </div>
      </nav>

      {/* Auth Popups */}
      {showPopup && (
        <Popup onClose={() => setShowPopup(false)}>
          <LoginForm
            closeLogin={() => setShowPopup(false)}
            openRegister={() => setShowRegisterPopup(true)}
            openForgotPassword={() => setShowForgotPopup(true)}
            openSignupOtp={(email) => {
              setSignupEmail(email);
              setShowSignupOtpPopup(true);
            }}
          />
        </Popup>
      )}

      {showRegisterPopup && (
        <Popup onClose={() => setShowRegisterPopup(false)}>
          <RegisterForm
            closeRegister={() => setShowRegisterPopup(false)}
            openLogin={() => setShowPopup(true)}
            openSignupOtp={(email) => {
              setSignupEmail(email);
              setShowRegisterPopup(false);
              setShowSignupOtpPopup(true);
            }}
          />
        </Popup>
      )}

      {showForgotPopup && (
        <Popup onClose={() => setShowForgotPopup(false)}>
          <ForgotPasswordForm
            closeForgot={() => setShowForgotPopup(false)}
            openLogin={() => { setShowForgotPopup(false); setShowPopup(true); }}
            openOtp={(email) => { setForgotEmail(email); setShowForgotPopup(false); setShowOtpPopup(true); }}
          />
        </Popup>
      )}

      {showOtpPopup && (
        <Popup onClose={() => setShowOtpPopup(false)}>
          <VerifyOtpForm
            email={forgotEmail}
            closeOtp={() => setShowOtpPopup(false)}
            openForgot={() => { setShowOtpPopup(false); setShowForgotPopup(true); }}
            openReset={(email, token) => { setForgotEmail(email); setResetToken(token); setShowOtpPopup(false); setShowResetPopup(true); }}
          />
        </Popup>
      )}

      {showSignupOtpPopup && (
        <Popup onClose={() => setShowSignupOtpPopup(false)}>
          <VerifyOtpForm
            email={signupEmail}
            mode="signup"
            closeOtp={() => setShowSignupOtpPopup(false)}
            openLogin={() => { setShowSignupOtpPopup(false); setShowPopup(true); }}
          />
        </Popup>
      )}

      {showResetPopup && (
        <Popup onClose={() => setShowResetPopup(false)}>
          <ResetPasswordForm
            email={forgotEmail}
            resetToken={resetToken}
            closeReset={() => { setShowResetPopup(false); setResetToken(""); }}
            openLogin={() => { setShowResetPopup(false); setResetToken(""); setShowPopup(true); }}
          />
        </Popup>
      )}
    </>
  );
}

export default Navbar;