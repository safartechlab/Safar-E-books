import { useState, useRef } from "react";
import API from "../api/axios";
import { toast } from "react-toastify";
import "../styles/Auth.css";

function ResetPasswordForm({ email, resetToken, closeReset, openLogin }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (submitLock.current) return;

    if (password !== confirmPassword) {
      toast.warning("Passwords do not match");
      return;
    }

    if (!resetToken) {
      toast.error("Reset session has expired. Please start again.");
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      const response = await API.post("/auth/reset-password", {
        email,
        password,
        resetToken,
      });

      toast.success(response.data.message);

      setTimeout(() => {
        closeReset();
        openLogin();
      }, 1000);
    } catch (error) {
      submitLock.current = false;
      setSubmitting(false);
      toast.error(error.response?.data?.message || "Password Reset Failed");
    }
  };

  return (
    <div className="w-100">
      <h3 className="text-center mb-4 fw-bold" style={{ color: "#3E3239" }}>
        Reset Password
      </h3>

      <form onSubmit={handleResetPassword}>
        <input
          type="password"
          className="form-control form-control-brand mb-3"
          placeholder="New Password (at least 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />

        <input
          type="password"
          className="form-control form-control-brand mb-3"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button type="submit" className="btn btn-brand w-100 fw-semibold py-2" disabled={submitting}>
          {submitting ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

export default ResetPasswordForm;