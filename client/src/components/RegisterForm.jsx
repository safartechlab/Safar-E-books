import { useState, useRef } from "react";
import API from "../api/axios";
import { toast } from "react-toastify";
import "../styles/Auth.css";

function RegisterForm({ closeRegister, openLogin, openSignupOtp  }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const submitLock = useRef(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLock.current) return;

    if (!agreed) {
      toast.warning("Please accept the Terms & Conditions and Privacy Policy to continue");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.warning("Passwords do not match");
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      const response = await API.post("/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        gender: formData.gender,
      });

            toast.success(response.data.message);

      setTimeout(() => {
        closeRegister();
        openSignupOtp(formData.email);
      }, 1000);
    } catch (error) {
      submitLock.current = false;
      setSubmitting(false);
      toast.error(error.response?.data?.message || "Registration Failed");
    }
  };

  return (
    <div className="w-100">
      <h3 className="text-center mb-4 fw-bold" style={{ color: "#3E3239" }}>
        Create Account
      </h3>

      <form onSubmit={handleSubmit} className="d-flex flex-column">
        <input
          type="text"
          name="name"
          className="form-control form-control-brand mb-3"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          className="form-control form-control-brand mb-3"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <select
          name="gender"
          className="form-select form-select-brand mb-3"
          value={formData.gender}
          onChange={handleChange}
          required
        >
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <input
          type="password"
          name="password"
          className="form-control form-control-brand mb-3"
          placeholder="Password (at least 8 characters)"
          value={formData.password}
          onChange={handleChange}
          minLength={8}
          required
        />

        <input
          type="password"
          name="confirmPassword"
          className="form-control form-control-brand mb-3"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />

        <div className="form-check mb-3 small">
          <input
            type="checkbox"
            id="agreeTerms"
            className="form-check-input"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
          />
          <label className="form-check-label" htmlFor="agreeTerms">
            I agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              Terms &amp; Conditions
            </a>{" "}
            and{" "}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
          </label>
        </div>

        <button type="submit" className="btn btn-brand fw-semibold py-2" disabled={submitting}>
          {submitting ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="text-center mt-3 small mb-0">
        Already have an account?{" "}
        <span
          className="link-brand"
          role="button"
          onClick={() => {
            closeRegister();
            openLogin();
          }}
        >
          Login
        </span>
      </p>
    </div>
  );
}

export default RegisterForm;