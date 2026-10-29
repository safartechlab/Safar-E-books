import { useState, useRef } from "react";
import { Modal, Spinner } from "react-bootstrap";
import API from "../../api/axios";
import { toast } from "react-toastify";
import "../../styles/AddBook.css";
import useOptions from "../../hooks/useOptions";
import useObjectUrl from "../../hooks/useObjectUrl";
import { BookSection, BookAccessPicker } from "../../components/BookFormParts";

function AddBookModal({ onClose, fetchBooks }) {
  const [book, setBook] = useState({
    title: "",
    author: "",
    category: "",
    language: "",
    publishedYear: "",
    description: "",
    isPopular: false,

    accessType: "free",
    isFree: true,
    isSubscriptionRequired: false,
    price: 0,

    kindleUrl: "",
    amazonPrintUrl: "",
    flipkartPrintUrl: "",
  });

  const [coverImage, setCoverImage] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const { categories, languages } = useOptions();
  const coverPreview = useObjectUrl(coverImage);

  const [extraEditions, setExtraEditions] = useState([]);

  const addExtraRow = (language = "") =>
    setExtraEditions((prev) => [
      ...prev,
      { key: `${Date.now()}-${Math.random()}`, language, pdf: null, cover: null },
    ]);

  const updateExtra = (key, field, value) =>
    setExtraEditions((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    );

  const removeExtra = (key) =>
    setExtraEditions((prev) => prev.filter((r) => r.key !== key));

 
  const takenLanguages = [book.language, ...extraEditions.map((r) => r.language)]
    .filter(Boolean)
    .map((l) => l.toLowerCase());

  
  const remainingLanguages = languages.filter(
    (l) => !takenLanguages.includes(l.toLowerCase())
  );

  const isExternalOnly = book.accessType === "external_only";

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setBook((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFirstLanguageChange = (e) => {
    const value = e.target.value;
    setBook((prev) => ({ ...prev, language: value }));
    setExtraEditions((prev) =>
      prev.map((r) =>
        r.language && r.language.toLowerCase() === value.toLowerCase()
          ? { ...r, language: "" }
          : r
      )
    );
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

  const handleHide = () => {
    if (!submitting) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLock.current) return;

    const extras = book.accessType === "external_only" ? [] : extraEditions;
    for (const row of extras) {
      if (!row.language) {
        toast.warning("Choose a language for every extra language row.");
        return;
      }
      if (!row.pdf) {
        toast.warning(`Choose the PDF for ${row.language}.`);
        return;
      }
    }

    const formData = new FormData();

    const isFreeVal = book.accessType === "free";
    const isSubVal = book.accessType === "subscription";
    const priceVal = book.accessType === "paid" ? Number(book.price) : 0;

    formData.append("title", book.title);
    formData.append("author", book.author);
    formData.append("category", book.category);
    formData.append("language", book.language);
    formData.append("publishedYear", book.publishedYear);
    formData.append("description", book.description || "");

    formData.append("isFree", String(isFreeVal));
    formData.append("isSubscriptionRequired", String(isSubVal));
    formData.append("price", String(priceVal));


    formData.append("kindleUrl", book.kindleUrl || "");
    formData.append("amazonPrintUrl", book.amazonPrintUrl || "");
    formData.append("flipkartPrintUrl", book.flipkartPrintUrl || "");

    formData.append("isPopular", String(book.isPopular));

    if (coverImage) {
      formData.append("coverImage", coverImage);
    }

    if (pdfFile && book.accessType !== "external_only") {
      formData.append("pdfFile", pdfFile);
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      const res = await API.post("/books", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const newBookId = res.data?.book?._id;
      const failed = [];
      for (const row of extras) {
        try {
          const fd = new FormData();
          fd.append("language", row.language);
          fd.append("pdfFile", row.pdf);
          if (row.cover) fd.append("coverImage", row.cover);
          await API.post(`/books/${newBookId}/editions`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (err) {
          failed.push(`${row.language}: ${err.response?.data?.message || "upload failed"}`);
        }
      }

      if (failed.length) {
        toast.warning(
          `Book added, but some languages failed. Add them from Edit Book. (${failed.join(" | ")})`,
          { autoClose: 9000 }
        );
      } else {
        toast.success(
          extras.length
            ? `Book added with ${extras.length + 1} languages!`
            : "Book added successfully!"
        );
      }
      fetchBooks();
      onClose();
    } catch (error) {
      submitLock.current = false;
      setSubmitting(false);
      toast.error(error.response?.data?.message || "Failed to add book. Check all required fields.");
    }
  };

  return (
    <Modal
      show
      onHide={handleHide}
      size="lg"
      centered
      scrollable
      backdrop="static"
      keyboard={!submitting}
      className="bk-modal"
    >
      <Modal.Header closeButton closeVariant="white">
        <Modal.Title as="div">
          <span className="bk-eyebrow bk-eyebrow-light">CATALOG MANAGEMENT</span>
          <h2 className="bk-modal-title">Add New Book</h2>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <form
          id="add-book-form"
          className="bk-form"
          onSubmit={handleSubmit}
          encType="multipart/form-data"
        >
          {/* 1. Book details */}
          <BookSection step="1" title="Book details">
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label" htmlFor="bk-title">Book title *</label>
                <input
                  id="bk-title"
                  type="text"
                  className="form-control"
                  name="title"
                  placeholder="e.g. The Silent Library"
                  value={book.title}
                  onChange={handleChange}
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
                  {categories.map((c) => (
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
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label d-block">Pages</label>
                <div className="bk-auto-pages form-control-plaintext small text-muted">
                  <i className="bi bi-magic me-1" aria-hidden="true" />
                  Counted automatically from the PDF
                </div>
              </div>

              <div className="col-12">
                <label className="form-label" htmlFor="bk-desc">Description</label>
                <textarea
                  id="bk-desc"
                  className="form-control"
                  rows="3"
                  name="description"
                  placeholder="A short summary readers will see on the book page"
                  value={book.description}
                  onChange={handleChange}
                />
              </div>
            </div>
          </BookSection>

          {/* 2. Access & pricing */}
          <BookSection step="2" title="Website access & pricing">
            <BookAccessPicker
              accessType={book.accessType}
              price={book.price}
              onAccessTypeChange={handleAccessTypeChange}
              onChange={handleChange}
            />
          </BookSection>

          {/* 3. Language, cover & PDF */}
          <BookSection
            step="3"
            title="Language, cover & PDF"
            hint="Pick the language first. The cover and PDF below belong to that language."
          >
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="bk-language">Language *</label>
                <select
                  id="bk-language"
                  className="form-select"
                  name="language"
                  value={book.language}
                  onChange={handleFirstLanguageChange}
                  required
                >
                  <option value="">Select language</option>
                  {languages.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label d-block">
                  Cover preview{book.language ? ` (${book.language})` : ""}
                </label>
                <div className={`bk-cover-preview ${coverPreview ? "has-image" : ""}`}>
                  {coverPreview ? (
                    <img src={coverPreview} alt="Selected cover" />
                  ) : (
                    <span>No cover chosen yet</span>
                  )}
                </div>
              </div>

              <div className="col-md-8">
                <label className="form-label" htmlFor="bk-cover">
                  Cover image{book.language ? ` for ${book.language}` : ""} *
                </label>
                <input
                  id="bk-cover"
                  type="file"
                  className="form-control mb-3"
                  accept="image/*"
                  disabled={!book.language}
                  onChange={(e) => setCoverImage(e.target.files[0] || null)}
                  required
                />

                {!isExternalOnly ? (
                  <>
                    <label className="form-label" htmlFor="bk-pdf">
                      Book PDF{book.language ? ` for ${book.language}` : ""} *
                    </label>
                    <input
                      id="bk-pdf"
                      type="file"
                      className="form-control"
                      accept=".pdf"
                      disabled={!book.language}
                      onChange={(e) => setPdfFile(e.target.files[0] || null)}
                      required
                    />
                    {pdfFile && (
                      <div className="form-text">
                        {pdfFile.name} · {(pdfFile.size / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    )}
                  </>
                ) : (
                  <div className="alert alert-info py-2 mb-0 small">
                    This book is not read on the website, so no PDF is needed.
                  </div>
                )}

                {!book.language && (
                  <div className="form-text">Choose a language to enable the uploads.</div>
                )}
              </div>
            </div>
          </BookSection>

          {/* 4. More languages */}
          {!isExternalOnly && (
            <BookSection
              step="4"
              title="More languages (optional)"
              hint="Same book in other languages? Add each one here instead of adding the book again. One purchase unlocks every language."
            >
              {!book.language ? (
                <div className="alert alert-secondary py-2 small mb-0">
                  Choose the first language in step 3 to see the remaining languages.
                </div>
              ) : (
                <>
                  {extraEditions.map((row) => (
                    <div key={row.key} className="bk-lang-row">
                      <div className="row g-2 align-items-end">
                        <div className="col-md-3">
                          <label className="form-label">Language *</label>
                          <select
                            className="form-select"
                            value={row.language}
                            onChange={(e) => updateExtra(row.key, "language", e.target.value)}
                            required
                          >
                            <option value="">Select</option>
                            {languages
                              .filter(
                                (l) =>
                                  l.toLowerCase() === row.language.toLowerCase() ||
                                  !takenLanguages.includes(l.toLowerCase())
                              )
                              .map((l) => (
                                <option key={l} value={l}>{l}</option>
                              ))}
                          </select>
                        </div>

                        <div className="col-12 col-md-4">
                          <label className="form-label">
                            PDF{row.language ? ` (${row.language})` : ""} *
                          </label>
                          <input
                            type="file"
                            className="form-control"
                            accept=".pdf"
                            onChange={(e) => updateExtra(row.key, "pdf", e.target.files[0] || null)}
                            required
                          />
                        </div>

                        <div className="col-12 col-md-4">
                          <label className="form-label">
                            Cover{row.language ? ` (${row.language})` : ""} (optional)
                          </label>
                          <input
                            type="file"
                            className="form-control"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => updateExtra(row.key, "cover", e.target.files[0] || null)}
                          />
                        </div>

                        <div className="col-auto ms-auto">
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => removeExtra(row.key)}
                            disabled={submitting}
                            aria-label="Remove this language"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="form-text">Pages are counted automatically from the PDF.</div>
                    </div>
                  ))}

                  {remainingLanguages.length > 0 ? (
                    <div className="bk-remaining-langs">
                      <div className="form-label small mb-2">
                        Remaining languages — click one to add it:
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {remainingLanguages.map((l) => (
                          <button
                            key={l}
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => addExtraRow(l)}
                            disabled={submitting}
                          >
                            + {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="form-text">All available languages have been added.</div>
                  )}
                </>
              )}
            </BookSection>
          )}

          {/* 5. External links */}
          <BookSection
            step={isExternalOnly ? "4" : "5"}
            title="External store links (optional)"
          >
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

          {/* Options */}
          <BookSection title="Options">
            <div className="form-check form-switch mb-2">
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
        </form>
      </Modal.Body>

      <Modal.Footer>
        <button
          type="button"
          className="btn bk-btn-ghost"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          form="add-book-form"
          className="btn bk-btn-primary"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Spinner size="sm" animation="border" className="me-2" />
              Adding...
            </>
          ) : (
            "Add Book"
          )}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

export default AddBookModal;