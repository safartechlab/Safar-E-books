import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Badge } from "react-bootstrap";
import {
  FaHome,
  FaBook,
  FaList,
  FaUsers,
  FaCommentDots,
  FaCog,
  FaSignOutAlt,
  FaGlobe,
  FaStar,
  FaBookOpen,
  FaCreditCard,
  FaUndoAlt,
  FaTags,
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../api/axios";

import "../styles/AdminSidebar.css";

const UNREAD_POLL_MS = 30 * 1000;

function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0); // orders needing manual review
  const [refundCount, setRefundCount] = useState(0); // pending refund requests

  const fetchUnreadCount = async () => {
    try {
      const res = await API.get("/contact/unread-count");
      setUnreadCount(res.data.count || 0);
    } catch (error) {
      // Non-critical
    }
  };

  const fetchReviewCount = async () => {
    try {
      const res = await API.get("/payments/admin/summary");
      setReviewCount(res.data.summary?.needsReview || 0);
    } catch (error) {
      // Non-critical
    }
  };

  const fetchRefundCount = async () => {
    try {
      const res = await API.get("/refunds/admin/pending-count");
      setRefundCount(res.data.count || 0);
    } catch (error) {
      // Non-critical
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    fetchReviewCount();
    fetchRefundCount();
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchReviewCount();
      fetchRefundCount();
    }, UNREAD_POLL_MS);
    // The Refund Requests page fires this after approve / reject
    window.addEventListener("refund-count-changed", fetchRefundCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener("refund-count-changed", fetchRefundCount);
    };
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    fetchReviewCount();
    fetchRefundCount();
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (err) {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully!");
    navigate("/", { replace: true });
  };

  const links = [
    { to: "/admin/dashboard", icon: <FaHome size={16} />, label: "Dashboard" },
    { to: "/admin/banner", icon: <FaBook size={16} />, label: "Manage Banner" },
    { to: "/admin/manage-books", icon: <FaList size={16} />, label: "Manage Books" },
    { to: "/admin/categories-languages", icon: <FaTags size={16} />, label: "Categories & Languages" },
    { to: "/admin/users", icon: <FaUsers size={16} />, label: "Users" },
        { to: "/admin/orders", icon: <FaCreditCard size={16} />, label: "Orders & Payments", badge: reviewCount },
    { to: "/admin/refunds", icon: <FaUndoAlt size={16} />, label: "Refund Requests", badge: refundCount },
    { to: "/admin/reviews", icon: <FaStar size={16} />, label: "Reviews" },
    { to: "/admin/contact", icon: <FaCommentDots size={16} />, label: "Messages", badge: unreadCount },
    { to: "/admin/settings", icon: <FaCog size={16} />, label: "Settings" },
    { to: "/", icon: <FaGlobe size={16} />, label: "Visit Website" },
  ];

  return (
    <aside className="aesthetic-admin-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand-box">
        <div className="sidebar-brand-icon">
          <FaBookOpen size={20} />
        </div>
        <div>
          <h2 className="sidebar-brand-title">SAFAR EBOOKS</h2>
          <span className="sidebar-brand-sub">Admin Workspace</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav-container">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-label">{item.label}</span>

            {!!item.badge && (
              <Badge pill bg="danger" className="ms-auto sidebar-unread-badge">
                {item.badge > 99 ? "99+" : item.badge}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout Action */}
      <button type="button" className="sidebar-logout-btn" onClick={handleLogout}>
        <FaSignOutAlt size={15} />
        <span>Logout</span>
      </button>
    </aside>
  );
}

export default AdminSidebar;