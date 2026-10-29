import { useState, useRef } from "react";
import API from "../api/axios";
import { toast } from "react-toastify";
import "../styles/Auth.css";

function VerifyOtpForm({ email, mode = "reset", closeOtp, openForgot, openReset, openLogin }) {
  const [otp, setOtp] = useState("");
  const [resending, setResending] = useState(false); // <-- was missing
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (submitLock.current) return;

    submitLock.current = true;
    setSubmitting(true);
    try {
      const endpoint = mode === "signup" ? "/auth/verify-signup-otp" : "/auth/verify-otp";
      const response = await API.post(endpoint, { email, otp });

      toast.success(response.data.message);

      setTimeout(() => {
        closeOtp();
        if (mode === "signup") {
          openLogin();
        } else {
          openReset(email, response.data.resetToken);
        }
      }, 1000);
    } catch (error) {
      submitLock.current = false;
      setSubmitting(false);
      toast.error(error.response?.data?.message || "OTP Verification Failed");
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      const response = await API.post("/auth/resend-signup-otp", { email });
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-100">
      <h3 className="text-center mb-3 fw-bold" style={{ color: "#3E3239" }}>
        Verify OTP
      </h3>

      <p className="text-center text-muted mb-4">
        Enter the OTP sent to your email.
      </p>

      <form onSubmit={handleVerifyOtp}>
        <input
          type="text"
          className="form-control form-control-brand mb-3"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
        />

        <button type="submit" className="btn btn-brand w-100 fw-semibold py-2" disabled={submitting}>
          {submitting ? "Verifying..." : "Verify OTP"}
        </button>
      </form>

      {mode === "signup" && (
        <p className="text-center mt-3 small mb-0">
          Didn't get the code?{" "}
          <span
            className="link-brand"
            role="button"
            onClick={!resending ? handleResendOtp : undefined}
          >
            {resending ? "Sending..." : "Resend OTP"}
          </span>
        </p>
      )}

      {mode === "reset" && (
        <p className="text-center mt-3 small mb-0">
          Wrong Email?{" "}
          <span
            className="link-brand"
            role="button"
            onClick={() => {
              closeOtp();
              openForgot();
            }}
          >
            Go Back
          </span>
        </p>
      )}
    </div>
  );
}

export default VerifyOtpForm;