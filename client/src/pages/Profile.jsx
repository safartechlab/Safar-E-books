import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Container, Card, Row, Col, Form, Button, Modal } from "react-bootstrap";
import { FaEye, FaEyeSlash, FaLock } from "react-icons/fa";
import API from "../api/axios";
import Swal from "sweetalert2";
import "../styles/Profile.css";

import maleAvatar from "../assets/images/male-avatar.png";
import femaleAvatar from "../assets/images/female-avatar.png";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");

  const [saving, setSaving] = useState(false);

  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);

  const [reminderSaving, setReminderSaving] = useState(false);
  const toggleReminders = async () => {
    setReminderSaving(true);
    try {
      const res = await API.post("/payments/auto-renew", { autoRenew: !user.autoRenew });
      setUser((prev) => ({ ...prev, autoRenew: res.data.autoRenew }));
      toast.success(res.data.autoRenew ? "Renewal reminders turned on." : "Renewal reminders turned off.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update this setting.");
    } finally {
      setReminderSaving(false);
    }
  };

  useEffect(() => {
    const loggedUser = JSON.parse(localStorage.getItem("user"));
    if (loggedUser) {
      API.get(`/auth/users/${loggedUser._id}`)
        .then((res) => {
          setUser(res.data.user);
          setName(res.data.user.name);
        })
        .catch(() => {
          toast.error("Failed to load profile.");
        });
    }
  }, []);

  const resetPasswordFields = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowPw({ current: false, next: false, confirm: false });
  };

  const openPasswordModal = () => {
    resetPasswordFields();
    setShowPwModal(true);
  };

  const closePasswordModal = () => {
    if (pwSaving) return;
    setShowPwModal(false);
    resetPasswordFields();
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setName(user?.name || "");
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.warning("Name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const loggedUser = JSON.parse(localStorage.getItem("user"));
      const nameRes = await API.put(`/auth/users/${loggedUser._id}`, { name });
      setUser(nameRes.data.user);
      localStorage.setItem("user", JSON.stringify(nameRes.data.user));
      toast.success("Profile updated successfully!");
      setEditMode(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
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
    if (newPassword === currentPassword) {
      toast.warning("New password must be different from the current password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.warning("New password and confirmation do not match.");
      return;
    }

    setPwSaving(true);
    try {
      await API.post("/auth/change-password", { currentPassword, newPassword });
      toast.success("Password changed. You've been logged out of your other devices.");
      setShowPwModal(false);
      resetPasswordFields();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  const passwordField = (key, label, value, setValue, placeholder, autoComplete) => (
    <Form.Group className="mb-3">
      <Form.Label className="small fw-semibold profile-label">{label}</Form.Label>
      <div className="profile-pw-wrap">
        <Form.Control
          type={showPw[key] ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="profile-input"
        />
        <button
          type="button"
          className="profile-pw-eye"
          onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
          aria-label={showPw[key] ? "Hide password" : "Show password"}
        >
          {showPw[key] ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
    </Form.Group>
  );

  if (!user) {
    return (
      <Container className="d-flex justify-content-center align-items-center profile-bg" style={{ minHeight: "100vh" }}>
        <h2 className="profile-heading fs-4">Loading Profile...</h2>
      </Container>
    );
  }

    const handleDeleteAccount = async () => {
    const result = await Swal.fire({
      title: "Delete your account?",
      html: "This permanently removes your profile, reviews, wishlist and reading history. Purchase records are kept for legal and accounting reasons. <b>This cannot be undone.</b>",
      icon: "warning",
      input: "password",
      inputLabel: "Enter your password to confirm",
      inputAttributes: { autocomplete: "current-password" },
      showCancelButton: true,
      confirmButtonText: "Delete my account",
      confirmButtonColor: "#b42318",
      inputValidator: (v) => (!v ? "Password is required" : undefined),
    });
    if (!result.isConfirmed) return;
    try {
      await API.delete("/auth/me", { data: { password: result.value } });
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      toast.success("Your account has been deleted.");
      window.location.href = "/";
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete your account.");
    }
  };

  const profileImage = user.gender === "female" ? femaleAvatar : maleAvatar;
  const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : "");

  const isActiveSub =
    user.isSubscribed &&
    user.subscriptionExpiry &&
    new Date(user.subscriptionExpiry) > new Date();

  const subscriptionValue = isActiveSub ? (
    <span className="profile-sub-active">
      {capitalize(user.subscriptionPlan) || "Premium"}
      {user.subscriptionCycle ? ` (${capitalize(user.subscriptionCycle)})` : ""} — active until{" "}
      {new Date(user.subscriptionExpiry).toLocaleDateString()}
    </span>
  ) : (
    <span className="profile-sub-inactive">
      Not subscribed —{" "}
      <span
        role="button"
        className="profile-link"
        onClick={() => navigate("/pricing")}
      >
        view plans
      </span>
    </span>
  );

  const rows = [
    { label: "Email", value: user.email },
    { label: "Gender", value: user.gender, className: "text-capitalize" },
    { label: "Role", value: user.role },
    { label: "Status", value: user.status },
        { label: "Subscription", value: subscriptionValue },
    ...(isActiveSub
      ? [
          {
            label: "Renewal reminder email",
            value: (
              <Form.Check
                type="switch"
                id="renewal-reminder-switch"
                className="d-inline-block"
                label={user.autoRenew ? "On" : "Off"}
                checked={Boolean(user.autoRenew)}
                onChange={toggleReminders}
                disabled={reminderSaving}
              />
            ),
          },
        ]
      : []),
    { label: "Member Since", value: new Date(user.createdAt).toLocaleDateString() },
  ];

  return (
    <Container
      fluid
      className="d-flex flex-column justify-content-center align-items-center profile-bg"
      style={{ minHeight: "100vh", padding: "120px 20px 60px" }}
    >
      <Card className="profile-card border-0 p-4 p-md-5 text-center">
        <img
          src={profileImage}
          alt="Profile"
          className="rounded-circle mx-auto mb-3 profile-avatar"
        />
        <h2 className="fw-bold mb-4 profile-name">{user.name}</h2>

        <div className="text-start">
          {/* Name Row */}
          <Row className="py-3 profile-row mx-0">
            <Col xs={12} sm={4} className="fw-semibold profile-label">Name</Col>
            <Col xs={12} sm={8} className="text-sm-end">
              {editMode ? (
                <Form.Control
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="profile-input d-inline-block w-auto"
                />
              ) : (
                <span className="profile-val">{user.name}</span>
              )}
            </Col>
          </Row>

          {/* Readonly Details Rows */}
          {rows.map((row) => (
            <Row key={row.label} className="py-3 profile-row mx-0">
              <Col xs={12} sm={4} className="fw-semibold profile-label">{row.label}</Col>
              <Col xs={12} sm={8} className={`profile-val text-sm-end ${row.className || ""}`}>
                {row.value}
              </Col>
            </Row>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="d-flex justify-content-center flex-wrap gap-2 mt-4">
          <Button
            className="fw-semibold px-4 py-2 profile-btn-primary"
            onClick={editMode ? handleSaveProfile : () => setEditMode(true)}
            disabled={saving}
          >
            {saving ? "Saving..." : editMode ? "Save Changes" : "Edit Profile"}
          </Button>

          {editMode ? (
            <Button
              variant="outline-secondary"
              className="fw-semibold px-4 py-2 profile-btn-cancel"
              onClick={handleCancelEdit}
              disabled={saving}
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="outline-secondary"
              className="fw-semibold px-4 py-2 profile-btn-cancel"
              onClick={openPasswordModal}
            >
              <FaLock size={12} className="me-2" />
                            Change Password
            </Button>
          )}
        </div>

        {!editMode && user.role !== "admin" && (
          <div className="mt-4">
            <Button variant="link" className="text-danger small" onClick={handleDeleteAccount}>
              Delete my account
            </Button>
          </div>
        )}
      </Card>

      {/* Change Password popup */}
      <Modal show={showPwModal} onHide={closePasswordModal} centered backdrop="static">
        <Form onSubmit={handleChangePassword}>
          <Modal.Header closeButton={!pwSaving} className="profile-modal-header">
            <Modal.Title className="fs-5 profile-heading">Change Password</Modal.Title>
          </Modal.Header>
          <Modal.Body className="profile-modal-body">
            <p className="small text-muted mb-3">
              Choose a new password of at least 8 characters. You'll be signed out of your other devices.
            </p>
            {passwordField("current", "Current Password", currentPassword, setCurrentPassword, "Enter current password", "current-password")}
            {passwordField("next", "New Password", newPassword, setNewPassword, "At least 8 characters", "new-password")}
            {passwordField("confirm", "Confirm New Password", confirmNewPassword, setConfirmNewPassword, "Re-enter new password", "new-password")}
          </Modal.Body>
          <Modal.Footer className="profile-modal-footer">
            <Button
              variant="outline-secondary"
              className="fw-semibold profile-btn-cancel"
              onClick={closePasswordModal}
              disabled={pwSaving}
            >
              Cancel
            </Button>
            <Button type="submit" className="fw-semibold profile-btn-primary" disabled={pwSaving}>
              {pwSaving ? "Updating..." : "Update Password"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default Profile;