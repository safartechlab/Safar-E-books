import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../../api/axios";
import { FaUserShield, FaLock, FaToggleOn, FaGlobe, FaEye, FaEyeSlash } from "react-icons/fa";
import { pickSiteInfo, refreshSiteInfo } from "../../hooks/useSiteInfo";
import "../../styles/AdminDashboard.css";
import "../../styles/AdminSettings.css";

function AdminSettings() {
  const admin = JSON.parse(localStorage.getItem("user") || "null");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [activeTab, setActiveTab] = useState("account");
  // Site controls
  const [signupsPaused, setSignupsPaused] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [siteLoading, setSiteLoading] = useState(true);
  const [siteSaving, setSiteSaving] = useState(false);

  // Basic website details
  const [info, setInfo] = useState(pickSiteInfo({ siteName: "" }));
  const [infoSaving, setInfoSaving] = useState(false);

  useEffect(() => {
    const loadSiteSettings = async () => {
      try {
        const res = await API.get("/settings/public");
        setSignupsPaused(Boolean(res.data.signupsPaused));
        setMaintenanceMode(Boolean(res.data.maintenanceMode));
        setMaintenanceMessage(res.data.maintenanceMessage || "");
        setInfo({
          siteName: res.data.siteName || "",
          supportEmail: res.data.supportEmail || "",
          contactPhone: res.data.contactPhone || "",
          address: res.data.address || "",
          websiteUrl: res.data.websiteUrl || "",
          copyrightText: res.data.copyrightText || "",
        });
      } catch (error) {
        toast.error("Failed to load site settings.");
      } finally {
        setSiteLoading(false);
      }
    };
    loadSiteSettings();
  }, []);

  const saveSiteSettings = async (changes, successText) => {
    setSiteSaving(true);
    try {
      const res = await API.put("/settings", changes);
      setSignupsPaused(Boolean(res.data.signupsPaused));
      setMaintenanceMode(Boolean(res.data.maintenanceMode));
      setMaintenanceMessage(res.data.maintenanceMessage || "");
      toast.success(successText);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update settings.");
    } finally {
      setSiteSaving(false);
    }
  };

  const handleInfoChange = (e) => {
    setInfo({ ...info, [e.target.name]: e.target.value });
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setInfoSaving(true);
    try {
      const res = await API.put("/settings", info);
      refreshSiteInfo(res.data);
      toast.success("Website information saved.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save website information.");
    } finally {
      setInfoSaving(false);
    }
  };

  const handleToggleSignups = () => {
    const next = !signupsPaused;
    saveSiteSettings(
      { signupsPaused: next },
      next ? "New signups paused." : "New signups re-enabled."
    );
  };

  const handleToggleMaintenance = async () => {
    const next = !maintenanceMode;

    if (next) {
      const result = await Swal.fire({
        title: "Turn on maintenance mode?",
        text: "All visitors and users will be locked out of the site. Only admins can keep using it.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#D32F2F",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, turn it on",
      });
      if (!result.isConfirmed) return;
    }

    saveSiteSettings(
      { maintenanceMode: next },
      next ? "Maintenance mode is ON." : "Maintenance mode is OFF."
    );
  };

  const handleSaveMessage = () => {
    saveSiteSettings({ maintenanceMessage }, "Maintenance message saved.");
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.warning("Please fill all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      toast.warning("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.warning("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      await API.post("/auth/change-password", { currentPassword, newPassword });
      toast.success("Password changed. You've been logged out of any other devices.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: "account", label: "Account & Security", icon: <FaLock /> },
    { key: "site", label: "Site Controls", icon: <FaToggleOn /> },
    { key: "info", label: "Website Information", icon: <FaGlobe /> },
  ];

  const infoField = (name, label, props = {}) => (
    <div className="set-field">
      <label htmlFor={name}>{label}</label>
      {props.textarea ? (
        <textarea
          id={name}
          name={name}
          className="set-input"
          rows={2}
          maxLength={props.maxLength}
          placeholder={props.placeholder}
          value={info[name]}
          onChange={handleInfoChange}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={props.type || "text"}
          className="set-input"
          maxLength={props.maxLength}
          placeholder={props.placeholder}
          value={info[name]}
          onChange={handleInfoChange}
        />
      )}
    </div>
  );

  const renderToggle = (checked, onChange, label) => (
    <label className="set-switch" aria-label={label}>
      <input type="checkbox" checked={checked} disabled={siteSaving} onChange={onChange} />
      <span className="set-slider" />
    </label>
  );

  return (
    <div className="admin-dashboard-container set-page">
      <div className="admin-simple-header">
        <div>
          <h1 className="admin-welcome-h1">Settings</h1>
          <p className="admin-welcome-sub">Manage your admin account, site controls and website details</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="set-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTab === t.key}
            className={`set-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ================= Account & Security ================= */}
      {activeTab === "account" && (
        <div className="set-grid">
          <section className="set-card">
            <div className="set-card-head">
              <span className="set-card-icon"><FaUserShield /></span>
              <div>
                <h3>Admin Account</h3>
                <p>Your sign-in details</p>
              </div>
            </div>

            <div className="set-profile">
              <div className="set-avatar">{(admin?.name || "A").charAt(0).toUpperCase()}</div>
              <div className="set-profile-text">
                <div className="set-profile-name">{admin?.name}</div>
                <div className="set-profile-email">{admin?.email}</div>
                <span className="set-role-pill">Administrator</span>
              </div>
            </div>
          </section>

          <section className="set-card">
            <div className="set-card-head">
              <span className="set-card-icon"><FaLock /></span>
              <div>
                <h3>Change Password</h3>
                <p>You'll be signed out of your other devices</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="set-form">
              <div className="set-field">
                <label htmlFor="cur-pw">Current password</label>
                <input
                  id="cur-pw"
                  type={showPw ? "text" : "password"}
                  className="set-input"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="set-field">
                <label htmlFor="new-pw">New password</label>
                <input
                  id="new-pw"
                  type={showPw ? "text" : "password"}
                  className="set-input"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="set-field">
                <label htmlFor="conf-pw">Confirm new password</label>
                <input
                  id="conf-pw"
                  type={showPw ? "text" : "password"}
                  className="set-input"
                  placeholder="Re-enter new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="set-actions">
                <button type="button" className="set-btn-ghost" onClick={() => setShowPw((v) => !v)}>
                  {showPw ? <FaEyeSlash /> : <FaEye />} {showPw ? "Hide" : "Show"} passwords
                </button>
                <button type="submit" className="set-btn" disabled={saving}>
                  {saving ? "Saving..." : "Update Password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ================= Site Controls ================= */}
      {activeTab === "site" && (
        <div className="set-grid single">
          <section className="set-card">
            <div className="set-card-head">
              <span className="set-card-icon"><FaToggleOn /></span>
              <div>
                <h3>Site Controls</h3>
                <p>Switches that affect every visitor</p>
              </div>
            </div>

            {siteLoading ? (
              <p className="mb-0">Loading...</p>
            ) : (
              <>
                <div className="set-row">
                  <div>
                    <div className="set-row-title">Pause new signups</div>
                    <div className="set-row-sub">Blocks new accounts. Existing users can still log in.</div>
                  </div>
                  {renderToggle(signupsPaused, handleToggleSignups, "Pause new signups")}
                </div>

                <div className="set-row">
                  <div>
                    <div className="set-row-title">Maintenance mode</div>
                    <div className="set-row-sub">Locks everyone except admins out of the site.</div>
                  </div>
                  {renderToggle(maintenanceMode, handleToggleMaintenance, "Maintenance mode")}
                </div>

                {maintenanceMode && (
                  <div className="set-alert">
                    Maintenance mode is ON. Visitors currently see the maintenance page.
                  </div>
                )}

                <div className="set-field mt-3">
                  <label htmlFor="maintenance-message">Maintenance message (optional)</label>
                  <textarea
                    id="maintenance-message"
                    className="set-input"
                    rows={3}
                    maxLength={300}
                    placeholder="e.g. We're upgrading our servers and will be back by 6 PM."
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                  />
                  <div className="set-hint">{maintenanceMessage.length}/300</div>
                </div>

                <div className="set-actions">
                  <button type="button" className="set-btn" onClick={handleSaveMessage} disabled={siteSaving}>
                    {siteSaving ? "Saving..." : "Save message"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* ================= Website Information ================= */}
      {activeTab === "info" && (
        <div className="set-grid single">
          <section className="set-card">
            <div className="set-card-head">
              <span className="set-card-icon"><FaGlobe /></span>
              <div>
                <h3>Website Information</h3>
                <p>
                  Shown in the footer, Contact page and the Terms, Privacy and Refund pages.
                  Leave a field empty to hide it.
                </p>
              </div>
            </div>

            {siteLoading ? (
              <p className="mb-0">Loading...</p>
            ) : (
              <form onSubmit={handleSaveInfo} className="set-form">
                <div className="set-two-col">
                  {infoField("siteName", "Website name", { maxLength: 80, placeholder: "SAFAR EBOOKS" })}
                  {infoField("websiteUrl", "Website URL", { maxLength: 200, placeholder: "https://yourdomain.com" })}
                  {infoField("supportEmail", "Support email", { type: "email", maxLength: 120, placeholder: "support@yourdomain.com" })}
                  {infoField("contactPhone", "Phone number", { maxLength: 40, placeholder: "+91 00000 00000" })}
                </div>
                {infoField("address", "Address", { textarea: true, maxLength: 300, placeholder: "Registered office address" })}
                {infoField("copyrightText", "Copyright text", { maxLength: 200, placeholder: "© 2026 SAFAR EBOOKS, operated by SAFAR TECHLAB LLP. All Rights Reserved." })}

                <div className="set-actions">
                  <button type="submit" className="set-btn" disabled={infoSaving}>
                    {infoSaving ? "Saving..." : "Save website information"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminSettings;
