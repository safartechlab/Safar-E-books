import API from "../api/axios";
import { ADMIN_DESKTOP_ONLY_MESSAGE } from "../utils/device";
import "../styles/AdminDesktopOnly.css";

// Shown instead of the admin panel on phones and tablets.
function AdminDesktopOnly() {
  const signOutAndGoHome = async () => {
    try {
      await API.post("/auth/logout");
    } catch (e) {
      /* even if this fails we still clear the browser below */
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <div className="admin-desktop-only">
      <div className="admin-desktop-only-card">
        <div className="admin-desktop-only-icon" aria-hidden="true">🖥️</div>
        <h1>Admin panel is for computers</h1>
        <p>{ADMIN_DESKTOP_ONLY_MESSAGE}</p>
        <button type="button" onClick={signOutAndGoHome}>
          Sign out &amp; go to website
        </button>
      </div>
    </div>
  );
}

export default AdminDesktopOnly;
