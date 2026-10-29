import { useEffect, useState, useRef } from "react";
import { Form, Button } from "react-bootstrap";
import { getFileUrl } from "../../utils/fileUrl";
import API from "../../api/axios";
import { toast } from "react-toastify";
import {
  FaTrashAlt,
  FaEdit,
  FaPlus,
  FaCheckCircle,
  FaBullhorn,
  FaBookOpen,
  FaTimes,
} from "react-icons/fa";
import "../../styles/AdminBanner.css";

function AdminBanner() {
  const [books, setBooks] = useState([]);
  const [banners, setBanners] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [selectedBook, setSelectedBook] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);

  useEffect(() => {
    fetchBooks();
    fetchBanners();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await API.get("/books");
      setBooks(res.data.books || []);
    } catch (err) {}
  };

  const fetchBanners = async () => {
    try {
      const res = await API.get("/banner");
      setBanners(res.data.banners || []);
    } catch (err) {}
  };

  const isBookBanner = (bookId) => {
    return banners.find((b) => b.book?._id === bookId || b.book === bookId);
  };

  const handleOpenCreateModal = (book) => {
    setEditingBanner(null);
    setSelectedBook(book._id);
    setTitle(book.title || "");
    setDescription(book.description || "");
    setShowModal(true);
  };

  const handleOpenEditModal = (banner) => {
    setEditingBanner(banner);
    setSelectedBook(banner.book?._id || banner.book);
    setTitle(banner.title || "");
    setDescription(banner.description || "");
    setShowModal(true);
  };

  const handleSaveBanner = async () => {
    if (!selectedBook || !title.trim()) {
      toast.warning("Title and book are required.");
      return;
    }
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    try {
      if (editingBanner) {
        await API.put(`/banner/${editingBanner._id}`, {
          book: selectedBook,
          title,
          description,
        });
        toast.success("Banner updated successfully!");
      } else {
        await API.post("/banner", {
          book: selectedBook,
          title,
          description,
        });
        toast.success("Banner created successfully!");
      }
      closeModal();
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save banner.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const handleDeleteBanner = async (bannerId, bannerTitle) => {
    if (!window.confirm(`Delete banner "${bannerTitle}"?`)) return;
    try {
      await API.delete(`/banner/${bannerId}`);
      toast.success("Banner deleted successfully!");
      fetchBanners();
    } catch (err) {
      toast.error("Failed to delete banner.");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBanner(null);
    setSelectedBook("");
    setTitle("");
    setDescription("");
  };

  return (
    <div className="banner-mgmt-page">
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="banner-page-title">
            <FaBullhorn className="me-2 text-plum" /> Banner Management
          </h1>
          <p className="banner-page-subtitle">
            Feature your best books directly on the homepage banner slider.
          </p>
        </div>
        <span className="banner-count-badge">
          {banners.length} Active Banners
        </span>
      </div>

      {/* 1. CURRENT ACTIVE BANNERS */}
      <div className="banner-shelf-card mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="banner-shelf-title mb-0">
            🔥 Current Active Banners ({banners.length})
          </h2>
          <span className="small text-muted">Visible on home carousel</span>
        </div>

        {banners.length === 0 ? (
          <div className="banner-empty-box">
            <FaBookOpen size={30} className="mb-2 text-muted" />
            <p className="mb-0">
              No banners active right now. Select an available book below to create one.
            </p>
          </div>
        ) : (
          <div className="banner-posters-grid">
            {banners.map((item) => (
              <div key={item._id} className="banner-book-item is-active">
                <div className="banner-poster-frame">
                  <img
                    src={getFileUrl(item.book?.coverImage)}
                    alt={item.title}
                    className="banner-poster-img"
                  />
                  <div className="banner-status-tag">
                    <FaCheckCircle size={11} className="me-1" /> Active
                  </div>
                  <div className="banner-overlay-actions">
                    <button
                      type="button"
                      className="banner-action-btn edit"
                      onClick={() => handleOpenEditModal(item)}
                    >
                      <FaEdit size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      className="banner-action-btn delete"
                      onClick={() => handleDeleteBanner(item._id, item.title)}
                    >
                      <FaTrashAlt size={12} /> Delete
                    </button>
                  </div>
                </div>

                <div className="banner-item-meta">
                  <h4 className="banner-item-title">{item.title}</h4>
                  <span className="banner-item-author">
                    {item.book?.author || "SAFAR EBOOKS"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. AVAILABLE BOOKS */}
      <div className="banner-shelf-card">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="banner-shelf-title mb-0">
            📚 Available Books in Library ({books.length})
          </h2>
          <span className="small text-muted">
            Click &ldquo;Add to Banner&rdquo; to open details modal
          </span>
        </div>

        <div className="banner-posters-grid">
          {books.map((book) => {
            const isFeatured = isBookBanner(book._id);
            return (
              <div
                key={book._id}
                className={`banner-book-item ${isFeatured ? "is-active" : ""}`}
              >
                <div className="banner-poster-frame">
                  <img
                    src={getFileUrl(book.coverImage)}
                    alt={book.title}
                    className="banner-poster-img"
                  />
                  {isFeatured && (
                    <div className="banner-status-tag">
                      <FaCheckCircle size={11} className="me-1" /> Added
                    </div>
                  )}
                  <div className="banner-overlay-actions">
                    {isFeatured ? (
                      <button
                        type="button"
                        className="banner-action-btn delete"
                        onClick={() => handleDeleteBanner(isFeatured._id, book.title)}
                      >
                        <FaTrashAlt size={12} /> Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="banner-action-btn add"
                        onClick={() => handleOpenCreateModal(book)}
                      >
                        <FaPlus size={12} /> Add to Banner
                      </button>
                    )}
                  </div>
                </div>

                <div className="banner-item-meta">
                  <h4 className="banner-item-title">{book.title}</h4>
                  <span className="banner-item-author">{book.author}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE / EDIT BANNER POPUP MODAL */}
      {showModal && (
        <div className="banner-modal-backdrop" onClick={closeModal}>
          <div
            className="banner-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="banner-modal-heading m-0">
                {editingBanner ? "Edit Banner" : "Create Banner"}
              </h2>
              <button
                type="button"
                className="banner-modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                <FaTimes size={18} />
              </button>
            </div>

            <Form className="d-flex flex-column gap-3">
              <div>
                <Form.Label className="banner-field-label">Banner Title</Form.Label>
                <Form.Control
                  type="text"
                  className="banner-input-box"
                  placeholder="e.g. Life is SAFARING"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <Form.Label className="banner-field-label">Banner Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  className="banner-input-box"
                  placeholder="Banner description or subtitle..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="d-flex justify-content-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  className="banner-btn-cancel rounded-pill px-4"
                  onClick={closeModal}
                >
                  Cancel
                </Button>
                <Button
                  className="banner-btn-submit rounded-pill px-4"
                  onClick={handleSaveBanner}
                  disabled={saving}
                >
                  {saving ? "Saving..." : editingBanner ? "Update Banner" : "Save Banner"}
                </Button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBanner;