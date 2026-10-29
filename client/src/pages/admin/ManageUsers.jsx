import { useEffect, useState } from "react";
import API from "../../api/axios";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import "../../styles/ManageUsers.css";

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [blockedUsers, setBlockedUsers] = useState(0);

  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null); // { deviceLimit, sessionCount, sessions }
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [forceLogoutLoading, setForceLogoutLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const fetchUsers = async () => {
    try {
      const res = await API.get("/auth/users");

      const filtered = res.data.users.filter(
        (user) => user.role === "user"
      );

      setUsers(filtered);

      setTotalUsers(filtered.length);

      setActiveUsers(
        filtered.filter((user) => user.status === "active").length
      );

      setBlockedUsers(
        filtered.filter((user) => user.status === "blocked").length
      );
    } catch (error) {
      toast.error("Failed to load users");
    }
  };

  const viewUser = (user) => {
    setSelectedUser(user);
    setShowModal(true);
    fetchSessions(user._id);
  };

  const fetchSessions = async (userId) => {
    setSessionsLoading(true);
    setSessionInfo(null);
    try {
      const res = await API.get(`/auth/users/${userId}/sessions`);
      setSessionInfo(res.data);
    } catch (error) {
      toast.error("Failed to load device sessions");
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleForceLogout = async () => {
    if (!selectedUser) return;

    const result = await Swal.fire({
      title: "Log out all devices?",
      text: `${selectedUser.name} will be signed out everywhere and will need to log in again.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#6B5560",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Force Logout",
    });

    if (!result.isConfirmed) return;

    setForceLogoutLoading(true);
    try {
      const res = await API.post(`/auth/users/${selectedUser._id}/force-logout`);
      setSessionInfo(res.data);
      toast.success("User logged out of all devices");
    } catch (error) {
      toast.error("Failed to force logout");
    } finally {
      setForceLogoutLoading(false);
    }
  };

  const toggleStatus = async (user) => {
    const newStatus =
      user.status === "active" ? "blocked" : "active";

    const result = await Swal.fire({
      title: `${
        newStatus === "blocked" ? "Block" : "Unblock"
      } User?`,
      text: `Are you sure you want to ${newStatus} this user?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#6B5560",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes",
    });

    if (!result.isConfirmed) return;

    try {
      await API.patch(`/auth/users/${user._id}/status`, {
        status: newStatus,
      });

      toast.success(
        `User ${
          newStatus === "blocked" ? "blocked" : "unblocked"
        } successfully`
      );

      fetchUsers();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const deleteUser = async (id) => {
    const result = await Swal.fire({
      title: "Delete User?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#D32F2F",
      confirmButtonText: "Delete",
    });

    if (!result.isConfirmed) return;

    try {
      await API.delete(`/auth/users/${id}`);

      toast.success("User deleted successfully");

      fetchUsers();
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      (user.name || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (user.email || "")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  return (
    <div className="manage-users mx-auto p-4">
      <div className="page-header d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Manage Users</h1>

        <input
          type="text"
          placeholder="Search user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-box rounded-pill px-3 py-2"
        />
      </div>

      {/* Statistics */}
      <div className="user-stats row row-cols-3 g-3 mb-4">
        <div className="stat-card col rounded-3 p-4">
          <h3 className="text-uppercase mb-2">Total Users</h3>
          <h2 className="mb-0">{totalUsers}</h2>
        </div>

        <div className="stat-card col rounded-3 p-4">
          <h3 className="text-uppercase mb-2">Active Users</h3>
          <h2 className="mb-0">{activeUsers}</h2>
        </div>

        <div className="stat-card col rounded-3 p-4">
          <h3 className="text-uppercase mb-2">Blocked Users</h3>
          <h2 className="mb-0">{blockedUsers}</h2>
        </div>
      </div>

      {/* Table */}
      <table className="users-table table table-hover align-middle rounded-3 overflow-hidden mb-0">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {paginatedUsers.length > 0 ? (
            paginatedUsers.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>

                <td>
                  <span
                    className={`rounded-pill px-2 py-1 fw-semibold small ${
                      user.status === "active" ? "status-active" : "status-blocked"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>

                <td>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>

                <td className="user-actions-cell d-flex gap-2">
                  <button
                    className="block-btn btn btn-sm rounded-2 fw-medium"
                    onClick={() => toggleStatus(user)}
                  >
                    {user.status === "active" ? "Block" : "Unblock"}
                  </button>

                  <button
                    className="delete-btn btn btn-sm rounded-2 fw-medium"
                    onClick={() => deleteUser(user._id)}
                  >
                    Delete
                  </button>

                  <button
                    className="view-btn btn btn-sm rounded-2 fw-medium"
                    onClick={() => viewUser(user)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center py-4">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {filteredUsers.length > usersPerPage && (
        <div className="admin-pagination d-flex justify-content-center align-items-center gap-3 mt-3">
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          >
            Next
          </button>
        </div>
      )}

      {/* ==========================
          User Details Popup Modal
      ========================== */}
      {showModal && selectedUser && (
        <div
          className="app-modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="app-modal-content user-modal-content text-center position-relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="user-modal-close-icon position-absolute border-0 bg-transparent"
              onClick={() => { setShowModal(false); setSessionInfo(null); }}
            >
              ✕
            </button>

            <div className="user-avatar rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3">
              {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : "U"}
            </div>

            <h2 className="user-modal-title mb-4">{selectedUser.name}</h2>

            <div className="user-info text-start rounded-2 p-3 d-flex flex-column gap-2">
              <p className="d-flex justify-content-between mb-0">
                <strong>Email:</strong> {selectedUser.email}
              </p>

              <p className="d-flex justify-content-between mb-0">
                <strong>Role:</strong> {selectedUser.role}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`rounded-pill px-2 py-1 fw-semibold small ${
                    selectedUser.status === "active" ? "status-active" : "status-blocked"
                  }`}
                >
                  {selectedUser.status}
                </span>
              </p>

              <p className="d-flex justify-content-between mb-0">
                <strong>Joined:</strong>{" "}
                {new Date(selectedUser.createdAt).toLocaleDateString()}
              </p>

              {selectedUser.updatedAt && (
                <p className="d-flex justify-content-between mb-0">
                  <strong>Last Updated:</strong>{" "}
                  {new Date(selectedUser.updatedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* ==========================
                Device Sessions
            ========================== */}
            <div className="user-info text-start rounded-2 p-3 mt-3">
              <p className="d-flex justify-content-between align-items-center mb-2">
                <strong>Device Sessions</strong>
                {sessionInfo && (
                  <span
                    className={`rounded-pill px-2 py-1 fw-semibold small ${
                      sessionInfo.deviceLimit !== null && sessionInfo.sessionCount >= sessionInfo.deviceLimit
                        ? "status-blocked"
                        : "status-active"
                    }`}
                  >
                    {sessionInfo.sessionCount} / {sessionInfo.deviceLimit === null ? "∞" : sessionInfo.deviceLimit}
                  </span>
                )}
              </p>

              {sessionsLoading && (
                <p className="text-muted small mb-0">Loading sessions...</p>
              )}

              {!sessionsLoading && sessionInfo && sessionInfo.sessions.length === 0 && (
                <p className="text-muted small mb-0">Not currently logged in on any device.</p>
              )}

              {!sessionsLoading && sessionInfo && sessionInfo.sessions.length > 0 && (
                <ul className="list-unstyled mb-0 small" style={{ maxHeight: 130, overflowY: "auto" }}>
                  {sessionInfo.sessions.map((s, i) => (
                    <li key={i} className="d-flex justify-content-between gap-2 py-1 border-bottom">
                      <span className="text-truncate" title={s.device} style={{ maxWidth: 220 }}>
                        {s.device}
                      </span>
                      <span className="text-muted text-nowrap">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {!sessionsLoading && sessionInfo && sessionInfo.sessions.length > 0 && (
                <button
                  className="btn btn-sm btn-outline-danger w-100 mt-3"
                  onClick={handleForceLogout}
                  disabled={forceLogoutLoading}
                >
                  {forceLogoutLoading ? "Logging out..." : "Force Logout All Devices"}
                </button>
              )}
            </div>

            <button
              className="btn-app-primary w-100 mt-4"
              onClick={() => { setShowModal(false); setSessionInfo(null); }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUsers;