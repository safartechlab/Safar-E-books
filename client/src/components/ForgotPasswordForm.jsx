import { useState, useRef } from "react";
import API from "../api/axios";
import { toast } from "react-toastify";
import "../styles/Auth.css";

function ForgotPasswordForm({ closeForgot, openLogin, openOtp }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (submitLock.current) return;

    submitLock.current = true;
    setSubmitting(true);
    try {
      const response = await API.post("/auth/forgot-password", { email });

      toast.success(response.data.message);

      setTimeout(() => {
        closeForgot();
        openOtp(email);
      }, 1000);
    } catch (error) {
      submitLock.current = false;
      setSubmitting(false);
      toast.error(error.response?.data?.message || "Failed to send OTP");
    }
  };

  return (
    <div className="w-100">
      <h3 className="text-center mb-3 fw-bold" style={{ color: "#3E3239" }}>
        Forgot Password
      </h3>

      <p className="text-center text-muted mb-4">
        Enter your registered email address.
      </p>

      <form onSubmit={handleSendOtp}>
        <input
          type="email"
          className="form-control form-control-brand mb-3"
          placeholder="Registered Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button type="submit" className="btn btn-brand w-100 fw-semibold py-2" disabled={submitting}>
          {submitting ? "Sending..." : "Send OTP"}
        </button>
      </form>

      <p className="text-center mt-3 small mb-0">
        Remember your password?{" "}
        <span
          className="link-brand"
          role="button"
          onClick={() => {
            closeForgot();
            openLogin();
          }}
        >
          Login
        </span>
      </p>
    </div>
  );
}

export default ForgotPasswordForm;