import { useEffect, useState } from "react";
import {
  Row,
  Col,
  Table,
  Form,
  Badge,
  Button,
  Spinner,
  Modal,
  Pagination,
} from "react-bootstrap";
import API from "../../api/axios";
import "../../styles/ContactMessages.css";
import Swal from "sweetalert2";

function ContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // View & Reply Modals
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyData, setReplyData] = useState({
    toEmail: "",
    name: "",
    subject: "",
    message: "",
  });
  const [sendingReply, setSendingReply] = useState(false);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    fetchMessages();
  }, []);

  // Reset page to 1 whenever search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const fetchMessages = async () => {
    try {
      const res = await API.get("/contact");
      setMessages(res.data.messages || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (msg) => {
    try {
      const updatedStatus = !msg.isRead;
      await API.patch(`/contact/${msg._id}`, { isRead: updatedStatus });
      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? { ...m, isRead: updatedStatus } : m))
      );
    } catch (error) {
      Swal.fire("Error", "Could not update status.", "error");
    }
  };

  const deleteMessage = async (id) => {
    const result = await Swal.fire({
      title: "Delete Message?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#6B5560",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Delete",
    });

    if (!result.isConfirmed) return;

    try {
      await API.delete(`/contact/${id}`);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchMessages();
      setSelectedIds((prev) => prev.filter((item) => item !== id));

      // Fix: Adjust page if last item on current page was deleted
      if (currentMessages.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
    } catch (error) {
      Swal.fire("Error", "Unable to delete message.", "error");
    }
  };

  const handleOpenReplyModal = (msg) => {
    setReplyData({
      toEmail: msg.email,
      name: msg.name,
      subject: msg.bookName
  ? `Re: Your query about "${msg.bookName}"`
  : `Re: Inquiry from ${msg.name}`,
      message: "",
    });
    setShowReplyModal(true);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    setSendingReply(true);
    try {
      await API.post("/contact/reply", replyData);
      Swal.fire({
        icon: "success",
        title: "Email Sent!",
        timer: 2000,
        showConfirmButton: false,
      });
      setShowReplyModal(false);
    } catch (error) {
      Swal.fire("Error", "Failed to send email reply.", "error");
    } finally {
      setSendingReply(false);
    }
  };

  // Filter Logic
  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      msg.name.toLowerCase().includes(search.toLowerCase()) ||
      msg.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "read"
        ? msg.isRead
        : !msg.isRead;

    return matchesSearch && matchesStatus;
  });

  // Calculate Paginated Items
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMessages = filteredMessages.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);

  // Fix: Check selection status relative ONLY to the current page items
  const isAllCurrentSelected =
    currentMessages.length > 0 &&
    currentMessages.every((msg) => selectedIds.includes(msg._id));

  const handleSelectAll = (e) => {
    const currentIds = currentMessages.map((msg) => msg._id);
    if (e.target.checked) {
      // Merge unique IDs
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentIds])));
    } else {
      // Uncheck only items on current page
      setSelectedIds((prev) => prev.filter((id) => !currentIds.includes(id)));
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      title: `Delete ${selectedIds.length} Messages?`,
      text: "This will permanently remove selected records.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#D32F2F",
      confirmButtonText: "Delete All Selected",
    });

    if (!result.isConfirmed) return;

    try {
      await API.post("/contact/bulk-delete", { ids: selectedIds });
      Swal.fire("Deleted!", "Selected messages have been deleted.", "success");
      setSelectedIds([]);
      fetchMessages();

      // Reset page if needed
      if (selectedIds.length >= currentMessages.length && currentPage > 1) {
        setCurrentPage(1);
      }
    } catch (error) {
      Swal.fire("Error", "Failed to delete selected messages.", "error");
    }
  };

  const exportToCSV = () => {
    if (filteredMessages.length === 0) {
      Swal.fire("No Data", "There are no messages to export.", "info");
      return;
    }
    const headers = ["Name", "Email", "Query Type", "Book Name", "Status", "Date", "Message"];
const rows = filteredMessages.map((msg) => [
  `"${msg.name}"`,
  `"${msg.email}"`,
  `"${msg.queryType || "general"}"`,
  `"${(msg.bookName || "").replace(/"/g, '""')}"`,
  `"${msg.isRead ? "Read" : "Unread"}"`,
  `"${new Date(msg.createdAt).toLocaleDateString()}"`,
  `"${msg.message.replace(/"/g, '""')}"`,
]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `contact_messages_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalMessages = messages.length;
  const readMessages = messages.filter((msg) => msg.isRead).length;
  const unreadMessages = totalMessages - readMessages;

  return (
    <div className="contact-page-wrapper p-4">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="page-title m-0">Contact Messages</h2>
        <div className="d-flex gap-3 align-items-center">
          <Button className="btn-export-csv" onClick={exportToCSV}>
            📥 Export CSV
          </Button>
          <div style={{ width: "260px" }}>
            <Form.Control
              type="text"
              placeholder="Search user..."
              className="search-input-pill"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <Row className="g-4 mb-4">
        <Col md={4}>
          <div className="custom-stat-card border-0 text-center py-4">
            <span className="stat-label">Total Messages</span>
            <h2 className="stat-value mt-2 mb-0">{totalMessages}</h2>
          </div>
        </Col>
        <Col md={4}>
          <div className="custom-stat-card border-0 text-center py-4">
            <span className="stat-label">Read Messages</span>
            <h2 className="stat-value mt-2 mb-0">{readMessages}</h2>
          </div>
        </Col>
        <Col md={4}>
          <div className="custom-stat-card border-0 text-center py-4">
            <span className="stat-label">Unread Messages</span>
            <h2 className="stat-value mt-2 mb-0">{unreadMessages}</h2>
          </div>
        </Col>
      </Row>

      {/* Filters & Bulk Actions */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="filter-tabs d-flex gap-2">
          <Button
            className={`filter-btn ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All ({totalMessages})
          </Button>
          <Button
            className={`filter-btn ${
              statusFilter === "unread" ? "active" : ""
            }`}
            onClick={() => setStatusFilter("unread")}
          >
            Unread ({unreadMessages})
          </Button>
          <Button
            className={`filter-btn ${statusFilter === "read" ? "active" : ""}`}
            onClick={() => setStatusFilter("read")}
          >
            Read ({readMessages})
          </Button>
        </div>

        {selectedIds.length > 0 && (
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">
              {selectedIds.length} selected
            </span>
            <Button
              variant="danger"
              size="sm"
              className="rounded-3"
              onClick={handleBulkDelete}
            >
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-responsive standalone-table-wrapper">
        <Table hover className="align-middle border-0 mb-0 clean-theme-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }} className="text-center">
                <Form.Check
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={isAllCurrentSelected}
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Date</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-5">
                  <Spinner animation="border" style={{ color: "#6B5560" }} />
                </td>
              </tr>
            ) : currentMessages.length > 0 ? (
              currentMessages.map((msg) => (
                <tr key={msg._id}>
                  <td className="text-center">
                    <Form.Check
                      type="checkbox"
                      checked={selectedIds.includes(msg._id)}
                      onChange={() => handleSelectOne(msg._id)}
                    />
                  </td>
                  <td className="fw-normal">{msg.name}</td>
                  <td>{msg.email}</td>
                  <td>
                    <Badge
                      pill
                      className={`status-badge-toggle ${
                        msg.isRead
                          ? "status-badge-active"
                          : "status-badge-unread"
                      }`}
                      onClick={() => toggleStatus(msg)}
                    >
                      {msg.isRead ? "active" : "unread"}
                    </Badge>
                  </td>
                  <td>{new Date(msg.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="d-flex gap-2 justify-content-center">
                      <Button
                        className="btn-action-reply"
                        onClick={() => handleOpenReplyModal(msg)}
                      >
                        Reply
                      </Button>
                      <Button
                        className="btn-action-delete"
                        onClick={() => deleteMessage(msg._id)}
                      >
                        Delete
                      </Button>
                      <Button
                        className="btn-action-view"
                        onClick={() => {
                          setSelectedMessage(msg);
                          setShowViewModal(true);
                          if (!msg.isRead) toggleStatus(msg);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-5 text-muted">
                  No Messages Found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3 px-2">
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">Rows per page:</span>
            <Form.Select
              size="sm"
              style={{ width: "70px", borderRadius: "8px" }}
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </Form.Select>
          </div>

          <Pagination className="custom-pagination mb-0">
            <Pagination.Prev
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            />
            {[...Array(totalPages)].map((_, idx) => (
              <Pagination.Item
                key={idx + 1}
                active={idx + 1 === currentPage}
                onClick={() => setCurrentPage(idx + 1)}
              >
                {idx + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            />
          </Pagination>
        </div>
      )}

      {/* View Modal */}
      <Modal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold" style={{ color: "#3E3239" }}>
            Contact Message Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-3">
          <Row className="mb-3">
            <Col md={6}>
              <small className="text-muted d-block">Name</small>
              <strong>{selectedMessage?.name}</strong>
            </Col>
            <Col md={6}>
              <small className="text-muted d-block">Email</small>
              <a
                href={`mailto:${selectedMessage?.email}`}
                className="text-decoration-none fw-semibold"
                style={{ color: "#6B5560" }}
              >
                {selectedMessage?.email}
              </a>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col md={6}>
              <small className="text-muted d-block">Status</small>
              <Badge
                pill
                className={
                  selectedMessage?.isRead
                    ? "status-badge-active"
                    : "status-badge-unread"
                }
              >
                {selectedMessage?.isRead ? "active" : "unread"}
              </Badge>
            </Col>
            <Col md={6}>
              <small className="text-muted d-block">Date</small>
              <span>
                {selectedMessage &&
                  new Date(selectedMessage.createdAt).toLocaleString()}
              </span>
            </Col>
          </Row>
          <Row className="mb-3">
  <Col md={6}>
    <small className="text-muted d-block">Query Type</small>
    <span className="text-capitalize">{selectedMessage?.queryType || "general"}</span>
  </Col>
  {selectedMessage?.queryType === "book" && (
    <Col md={6}>
      <small className="text-muted d-block">Book Name</small>
      <strong>{selectedMessage?.bookName || "-"}</strong>
    </Col>
  )}
</Row>
          <hr />
          <small className="text-muted d-block mb-2">Message Body</small>
          <div
            className="p-3 rounded-3"
            style={{
              backgroundColor: "#F7EFE7",
              color: "#3E3239",
              whiteSpace: "pre-wrap",
            }}
          >
            {selectedMessage?.message}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            className="btn-action-reply"
            onClick={() => {
              setShowViewModal(false);
              handleOpenReplyModal(selectedMessage);
            }}
          >
            Reply Direct
          </Button>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Direct Reply Modal */}
      <Modal
        show={showReplyModal}
        onHide={() => setShowReplyModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold" style={{ color: "#3E3239" }}>
            Send Email Reply
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSendReply}>
          <Modal.Body className="px-4 py-3">
            <Form.Group className="mb-3">
              <Form.Label className="small text-muted mb-1">To</Form.Label>
              <Form.Control
                type="email"
                value={`${replyData.name} <${replyData.toEmail}>`}
                disabled
                className="bg-light"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small text-muted mb-1">Subject</Form.Label>
              <Form.Control
                type="text"
                required
                value={replyData.subject}
                onChange={(e) =>
                  setReplyData({ ...replyData, subject: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small text-muted mb-1">
                Reply Message
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                required
                placeholder="Type your reply here..."
                value={replyData.message}
                onChange={(e) =>
                  setReplyData({ ...replyData, message: e.target.value })
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button
              variant="secondary"
              onClick={() => setShowReplyModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="btn-send-email"
              disabled={sendingReply}
            >
              {sendingReply ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                "Send Email"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default ContactMessages;