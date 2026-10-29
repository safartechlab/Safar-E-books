import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import API from "../../api/axios";
import { toast } from "react-toastify";
import "../../styles/AddBook.css";
import useOptions from "../../hooks/useOptions";
import { BookSection, BookAccessPicker } from "../../components/BookFormParts";
import EditionsManager from "./EditionsManager";

function EditBook() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState({
    title: "",
    author: "",
    category: "",
    language: "",
    publishedYear: "",
    description: "",
    coverImage: "",
    pdfUrl: "",
    isPopular: false,

    // Monetization & External Fields
    accessType: "free",
    isFree: true,
    isSubscriptionRequired: false,
    price: 0,
    kindleUrl: "",
    amazonPrintUrl: "",
    flipkartPrintUrl: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const submitLock = useRef(false);
  const { categories } = useOptions();

  // Keep a book's current value selectable even if it's missing from the
  // list, so opening Edit never silently blanks the field.
  const categoryChoices =
    book.category && !categories.includes(book.category)
      ? [book.category, ...categories]
      : categories;

  useEffect(() => {
    fetchBook();
  }, [id]);

  const fetchBook = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await API.get(`/books/${id}`);
      const fetchedBook = response.data?.book || response.data;

      // Derive accessType from flags
      let derivedAccessType = "free";
      if (fetchedBook.isSubscriptionRequired) derivedAccessType = "subscription";
      else if (fetchedBook.price > 0) derivedAccessType = "paid";
      else if (!fetchedBook.isFree && !fetchedBook.pdfUrl) derivedAccessType = "external_only";

      setBook({
        ...fetchedBook,
        accessType: derivedAccessType,
        isFree: Boolean(fetchedBook.isFree),
        isSubscriptionRequired: Boolean(fetchedBook.isSubscriptionRequired),
        price: fetchedBook.price || 0,
        kindleUrl: fetchedBook.kindleUrl || "",
        amazonPrintUrl: fetchedBook.amazonPrintUrl || "",
        flipkartPrintUrl: fetchedBook.flipkartPrintUrl || "",
      });
    } catch (error) {
      setLoadError(error.response?.data?.message || "Could not load this book. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setBook((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAccessTypeChange = (e) => {
    const selectedType = e.target.value;

    setBook((prev) => ({
      ...prev,
      accessType: selectedType,
      isFree: selectedType === "free",
      isSubscriptionRequired: selectedType === "subscription",
      price: selectedType === "paid" ? prev.price : 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLock.current) return;

    const formData = new FormData();

    const isFreeVal = book.accessType === "free";
    const isSubVal = book.accessType === "subscription";
    const priceVal = book.accessType === "paid" ? Number(book.price) : 0;

    // Page count is never sent: the server reads it from each language's PDF.
    formData.append("title", book.title);
    formData.append("author", book.author);
    formData.append("category", book.category);
    formData.append("publishedYear", book.publishedYear);
    formData.append("description", book.description || "");

    // Monetization fields string conversions
    formData.append("isFree", String(isFreeVal));
    formData.append("isSubscriptionRequired", String(isSubVal));
    formData.append("price", String(priceVal));

    // Store links
    formData.append("kindleUrl", book.kindleUrl || "");
    formData.append("amazonPrintUrl", book.amazonPrintUrl || "");
    formData.append("flipkartPrintUrl", book.flipkartPrintUrl || "");

    // Flags
    formData.append("isPopular", String(book.isPopular));

    submitLock.current = true;
    setSubmitting(true);
    try {
      await API.put(`/books/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Book updated successfully!");
      navigate("/admin/manage-books");
    } catch (error) {
      submitLock.current = false;
      setSubmitting(false);
      toast.error(error.response?.data?.message || "Failed to update book.");
    }
  };

  const goBack = () => navigate("/admin/manage-books");

  return (
    <div className="bk-page">
      {/* Page header */}
      <div className="bk-page-header">
        <div>
          <span className="bk-eyebrow">CATALOG MANAGEMENT</span>
          <h2>Edit Book</h2>
          <p>Update the book information, access settings and languages.</p>
        </div>
        <button type="button" className="btn bk-btn-ghost" onClick={goBack}>
          ← Back to books
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5" role="status">
          <Spinner animation="border" />
          <div className="mt-2 text-muted">Loading book details…</div>
        </div>
      ) : loadError ? (
        <div className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2" role="alert">
          <span>{loadError}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={fetchBook}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <form
            id="edit-book-form"
            className="bk-form"
            onSubmit={handleSubmit}
            encType="multipart/form-data"
          >
            <div className="row g-4">
              {/* ---------- Left: main details ---------- */}
              <div className="col-lg-8">
                <BookSection step="1" title="Book details">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label" htmlFor="bk-title">Book title *</label>
                      <input
                        id="bk-title"
                        type="text"
                        className="form-control"
                        name="title"
                        value={book.title}
                        onChange={handleChange}
                        maxLength={200}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label" htmlFor="bk-author">Author name *</label>
                      <input
                        id="bk-author"
                        type="text"
                        className="form-control"
                        name="author"
                        value={book.author}
                        onChange={handleChange}
                        maxLength={160}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label" htmlFor="bk-category">Category *</label>
                      <select
                        id="bk-category"
                        className="form-select"
                        name="category"
                        value={book.category}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select category</option>
                        {categoryChoices.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label" htmlFor="bk-year">Published year *</label>
                      <input
                        id="bk-year"
                        type="number"
                        className="form-control"
                        name="publishedYear"
                        value={book.publishedYear}
                        onChange={handleChange}
                        min="0"
                        max={new Date().getFullYear() + 1}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label d-block">Pages</label>
                      <div className="bk-auto-pages form-control-plaintext small text-muted">
                        <i className="bi bi-magic me-1" aria-hidden="true" />
                        Counted automatically from each PDF
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label" htmlFor="bk-desc">Description</label>
                      <textarea
                        id="bk-desc"
                        className="form-control"
                        rows="5"
                        name="description"
                        value={book.description}
                        onChange={handleChange}
                        maxLength={10000}
                      />
                    </div>
                  </div>
                  <div className="form-text mt-2">
                    Language, cover and PDF for each language are managed in the “Languages, PDFs &amp; covers” box below.
                  </div>
                </BookSection>

                <BookSection step="2" title="Website access & pricing">
                  <BookAccessPicker
                    accessType={book.accessType}
                    price={book.price}
                    onAccessTypeChange={handleAccessTypeChange}
                    onChange={handleChange}
                  />
                </BookSection>

                <BookSection step="3" title="External store links (optional)">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label" htmlFor="bk-kindle">Amazon Kindle eBook</label>
                      <input
                        id="bk-kindle"
                        type="url"
                        className="form-control"
                        name="kindleUrl"
                        placeholder="https://"
                        value={book.kindleUrl}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="bk-amazon">Amazon physical book</label>
                      <input
                        id="bk-amazon"
                        type="url"
                        className="form-control"
                        name="amazonPrintUrl"
                        placeholder="https://"
                        value={book.amazonPrintUrl}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="bk-flipkart">Flipkart physical book</label>
                      <input
                        id="bk-flipkart"
                        type="url"
                        className="form-control"
                        name="flipkartPrintUrl"
                        placeholder="https://"
                        value={book.flipkartPrintUrl}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </BookSection>
              </div>

              {/* ---------- Right: cover, options, save ---------- */}
              <div className="col-lg-4">
                <div className="bk-sticky">
                  <BookSection title="Options">
                    <div className="form-check form-switch">
                      <input
                        id="bk-popular"
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        name="isPopular"
                        checked={book.isPopular}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="bk-popular">
                        Mark as a popular book
                      </label>
                    </div>
                  </BookSection>

                  <BookSection title="Save">
                    <div className="d-grid gap-2">
                      <button type="submit" className="btn bk-btn-primary" disabled={submitting}>
                        {submitting ? (
                          <>
                            <Spinner size="sm" animation="border" className="me-2" />
                            Updating...
                          </>
                        ) : (
                          "Update Book"
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn bk-btn-ghost"
                        onClick={goBack}
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </BookSection>
                </div>
              </div>
            </div>
          </form>

          {/* Languages, PDFs & covers (kept outside the form so Enter never submits the book) */}
          <EditionsManager bookId={id} />
        </>
      )}
    </div>
  );
}

export default EditBook;