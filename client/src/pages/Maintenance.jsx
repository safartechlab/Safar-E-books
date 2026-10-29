import { useEffect, useState } from "react";
import API from "../api/axios";
import LoginForm from "../components/LoginForm";
import "../styles/Auth.css";

const noop = () => {};

function Maintenance() {
  const [message, setMessage] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await API.get("/settings/public");
        setMessage(res.data.maintenanceMessage || "");
        // Maintenance is over: send people back to the site
        if (!res.data.maintenanceMode) {
          window.location.href = "/";
        }
      } catch (err) {}
    };

    check();
    const interval = setInterval(check, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center text-center px-3"
      style={{ minHeight: "100vh", background: "#FBF7F3" }}
    >
      <div style={{ fontSize: 56 }}>🛠️</div>
      <h1 className="fw-bold mt-3" style={{ color: "#3E3239" }}>
        We'll be right back
      </h1>
      <p className="text-muted" style={{ maxWidth: 480 }}>
        {message || "SAFAR EBOOKS is under maintenance. Please check back soon."}
      </p>

      {!showAdminLogin ? (
        <button
          type="button"
          className="btn btn-link small text-muted"
          onClick={() => setShowAdminLogin(true)}
        >
          Admin login
        </button>
      ) : (
        <div
          className="bg-white rounded-4 p-4 mt-3 shadow-sm"
          style={{ width: "100%", maxWidth: 380 }}
        >
          <LoginForm
            closeLogin={noop}
            openRegister={noop}
            openForgotPassword={noop}
            openSignupOtp={noop}
          />
        </div>
      )}
    </div>
  );
}

export default Maintenance;