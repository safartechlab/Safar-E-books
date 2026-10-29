import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useState, useRef } from "react";
import API from "../api/axios";
import { isMobileOrTabletDevice, ADMIN_DESKTOP_ONLY_MESSAGE } from "../utils/device";
import "../styles/Auth.css";
import { toast } from "react-toastify";

function LoginForm({ closeLogin, openRegister, openForgotPassword, openSignupOtp  }) {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLock.current) return;

    submitLock.current = true;
    setSubmitting(true);
    try {
      // rememberMe tells the server how long the token should last
      // (30 days if checked, 1 day if not).
      const response = await API.post("/auth/login", { ...formData, rememberMe });

      // Admins may only sign in from a laptop/desktop. The server already
      // refuses most phones; this second check also catches iPads, which
      // pretend to be Macs. Undo the session it just created and stop.
      if (response.data.user?.role === "admin" && isMobileOrTabletDevice()) {
        try {
          await API.post("/auth/logout", null, {
            headers: { Authorization: `Bearer ${response.data.token}` },
          });
        } catch (e) {
          /* nothing saved in the browser yet, so there is nothing else to undo */
        }
        submitLock.current = false;
        setSubmitting(false);
        toast.error(ADMIN_DESKTOP_ONLY_MESSAGE);
        return;
      }

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      if (rememberMe) {
        localStorage.removeItem("sessionOnly");
        document.cookie = "bv_session=; path=/; max-age=0";
      } else {
        // Session cookie (no max-age): shared by all tabs, dropped when the
        // browser closes. main.jsx signs the user out if the flag is set
        // but this cookie is gone.
        localStorage.setItem("sessionOnly", "1");
        document.cookie = "bv_session=1; path=/; SameSite=Lax";
      }

      toast.success(response.data.message);
      closeLogin();

      const postLoginRedirect = sessionStorage.getItem("postLoginRedirect");
      sessionStorage.removeItem("postLoginRedirect");

      setTimeout(() => {
        if (response.data.user.role === "admin") {
          window.location.href = "/admin/dashboard";
        } else {
          window.location.href = postLoginRedirect || "/";
        }
      }, 1000);
    } catch (error) {
      const data = error.response?.data;
      submitLock.current = false;
      setSubmitting(false);

      if (data?.unverified) {
        toast.warning(data.message || "Please verify your email first.");
        closeLogin();
        openSignupOtp(data.email);
      } else {
        toast.error(data?.message || "Login Failed");
      }
    }
  };

  return (
    <div className="w-100">
      <h3 className="text-center mb-4 fw-bold" style={{ color: "#3E3239" }}>
        Login
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="input-group mb-3">
          <span className="input-group-text bg-white">
            <FaEnvelope />
          </span>
          <input
            type="email"
            name="email"
            className="form-control form-control-brand"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group mb-3">
          <span className="input-group-text bg-white">
            <FaLock />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            className="form-control form-control-brand"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <span
            className="input-group-text bg-white"
            role="button"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3 small">
          <label className="d-flex align-items-center gap-2 mb-0">
            <input
              type="checkbox"
              className="form-check-input m-0"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember Me
          </label>

          <span
            className="link-brand"
            role="button"
            onClick={() => {
              closeLogin();
              openForgotPassword();
            }}
          >
            Forgot Password?
          </span>
        </div>

        <button
          type="submit"
          className="btn btn-brand w-100 fw-semibold py-2"
          disabled={submitting}
        >
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="text-center mt-3 small mb-0">
        Don't have an account?{" "}
        <span
          className="link-brand"
          role="button"
          onClick={() => {
            closeLogin();
            openRegister();
          }}
        >
          Register Now
        </span>
      </p>
    </div>
  );
}

export default LoginForm;