import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axios";
import { getFileUrl } from "../utils/fileUrl";
import { toast } from "react-toastify";
import "../styles/BookDetails.css";
import { startPayment } from "../utils/payment";
import { getBookAction, openLoginPopup } from "../utils/bookAccess";

function StarRating({ value, onChange, readOnly = false }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${(hover || value) >= star ? "star-filled" : ""}`}
          onClick={!readOnly ? () => onChange(star) : undefined}
          onMouseEnter={!readOnly ? () => setHover(star) : undefined}
          onMouseLeave={!readOnly ? () => setHover(0) : undefined}
          style={{ cursor: readOnly ? "default" : "pointer" }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function BookDetails() {
  const { id } = useParams();

  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [myReview, setMyReview] = useState(null); // existing review by this user, if any
  const [submitting, setSubmitting] = useState(false);
  const [selectedLang, setSelectedLang] = useState("");

  const loggedUser = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  useEffect(() => {
    fetchBook();
    fetchReviews();
  }, [id]);

  useEffect(() => {
    if (!book) return;

    let recentBooks = JSON.parse(localStorage.getItem("recentBooks")) || [];
    recentBooks = recentBooks.filter((item) => item._id !== book._id);
    recentBooks.unshift(book);
    recentBooks = recentBooks.slice(0, 10);
    localStorage.setItem("recentBooks", JSON.stringify(recentBooks));
  }, [book]);

  const fetchBook = async () => {
    try {
      const response = await API.get(`/books/${id}`);
      setBook(response.data.book);
    } catch (error) {
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await API.get(`/reviews/book/${id}`);
      setReviews(response.data.reviews || []);
      setAverageRating(response.data.averageRating || 0);
      setReviewCount(response.data.reviewCount || 0);

      if (loggedUser) {
        const existing = response.data.reviews.find(
          (r) => r.user?._id === loggedUser._id
        );
        if (existing) {
          setMyReview(existing);
          setMyRating(existing.rating);
          setMyComment(existing.comment || "");
        }
      }
    } catch (error) {
    }
  };

  // Just navigate to the reader — do NOT create/overwrite a reading-history
  // entry here. Reader.jsx is the only place that knows the real current
  // page + totalPages; posting {bookId only} here used to reset any
  // existing progress to page 1 of 1 (100%), wiping it every time someone
  // clicked "Read Book" from the details page.
  const handleReadBook = () => {
    const lang = activeEdition?.language;
    navigate(`/reader/${book._id}${lang ? `?lang=${encodeURIComponent(lang)}` : ""}`);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!loggedUser) {
      toast.warning("Please log in to leave a review.");
      return;
    }

    if (myRating === 0) {
      toast.warning("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    try {
      if (myReview) {
        await API.put(`/reviews/${myReview._id}`, {
          rating: myRating,
          comment: myComment,
        });
        toast.success("Review updated");
      } else {
        await API.post("/reviews", {
          bookId: id,
          rating: myRating,
          comment: myComment,
        });
        toast.success("Review submitted");
      }
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!myReview) return;
    if (!window.confirm("Delete your review?")) return;

    try {
      await API.delete(`/reviews/${myReview._id}`);
      toast.success("Review deleted");
      setMyReview(null);
      setMyRating(0);
      setMyComment("");
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete review");
    }
  };

  // One book, several language editions. Old records without editions[]
  // fall back to their single language.
  const editions = book?.editions?.length
    ? book.editions
    : book
    ? [{ language: book.language, pages: book.pages, pdfUrl: book.pdfUrl }]
    : [];
  // Only languages that really have a PDF are offered to readers
  // (a language the admin has not uploaded yet would just give an error).
  const readableEditions = editions.filter((e) => e.pdfUrl);
  const chipEditions = readableEditions.length ? readableEditions : editions;
  const activeEdition =
    chipEditions.find((e) => e.language === selectedLang) || chipEditions[0];

  // One shared rule (same as the Library) for what the main button should be.
  const action = book ? getBookAction(book, loggedUser) : null;

  // Store links the admin added. Used for the small link row (readable books)
  // and for the big buttons shown when the book can't be read on the website.
  const storeLinks = book
    ? [
        { url: book.kindleUrl, label: "Get Kindle eBook", short: "Kindle", cls: "kindle", title: "Read on Kindle" },
        { url: book.amazonPrintUrl, label: "Buy on Amazon", short: "Amazon (Print)", cls: "amazon", title: "Buy Physical Copy on Amazon" },
        { url: book.flipkartPrintUrl, label: "Buy on Flipkart", short: "Flipkart (Print)", cls: "flipkart", title: "Buy Physical Copy on Flipkart" },
      ].filter((l) => l.url)
    : [];

  const handleBuy = () => {
    if (!loggedUser?._id) {
      toast.warning("Please login to buy this book.");
      openLoginPopup(navigate);
      return;
    }
    startPayment({
      type: "book",
      bookId: book._id,
      onSuccess: () => navigate("/library"),
    });
  };

  if (!book) {
    return (
      <h2 style={{ textAlign: "center", marginTop: "100px" }}>Loading...</h2>
    );
  }

  return (
    <div className="book-details-page">
      <div className="book-details">
        <div className="book-left">
          <img
            src={getFileUrl(activeEdition?.coverImage || book.coverImage)}
            alt={`${book.title}${activeEdition?.language ? ` (${activeEdition.language})` : ""}`}
          />
        </div>

        <div className="book-right">
          <h1>{book.title}</h1>
          <h3>{book.author}</h3>

          <div className="book-rating-summary">
            <StarRating value={Math.round(averageRating)} onChange={() => {}} readOnly />
            <span className="rating-number">
              {averageRating > 0 ? averageRating : "No ratings yet"}
            </span>
            {reviewCount > 0 && (
              <span className="review-count">
                ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
              </span>
            )}
          </div>

          <p><strong>Category:</strong> {book.category}</p>
          <div className="language-row">
            <strong>Language:</strong>
            <div className="language-chips" role="tablist" aria-label="Book language">
              {chipEditions.map((e) => (
                <button
                  key={e.language}
                  type="button"
                  role="tab"
                  aria-selected={activeEdition?.language === e.language}
                  className={`language-chip ${activeEdition?.language === e.language ? "active" : ""}`}
                  onClick={() => setSelectedLang(e.language)}
                >
                  {e.language}
                </button>
              ))}
            </div>
          </div>
          <p><strong>Pages:</strong> {activeEdition?.pages || book.pages}</p>
          <p><strong>Published:</strong> {book.publishedYear}</p>
          <p className="description">{book.description}</p>

          {/* Small store links. Only when the book is also readable here; for
              external-only books the big buttons below replace them. */}
          {action && storeLinks.length > 0 && (
            <div className="d-flex gap-2 flex-wrap mb-3">
              {storeLinks.map((l) => (
                <a
                  key={l.cls}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`store-btn ${l.cls} text-decoration-none rounded-2 px-3 py-1`}
                  title={l.title}
                >
                  {l.short}
                </a>
              ))}
            </div>
          )}

          {action?.kind === "buy" && (
            <button className="buy-now-btn" onClick={handleBuy}>
              Buy Now — ₹{book.price}
            </button>
          )}

          {action?.kind === "buy" && chipEditions.length > 1 && (
            <p className="all-langs-note">
              One purchase unlocks all {chipEditions.length} languages.
            </p>
          )}

          {action?.kind === "vip" && (
            <button className="buy-now-btn" onClick={() => navigate("/pricing")}>
              Subscribe to Read
            </button>
          )}

          {action ? (
            <button onClick={handleReadBook}>
              {action.kind === "buy" || action.kind === "vip"
                ? "📖 Read 20-Page Preview"
                : "📖 Read Book"}
            </button>
          ) : storeLinks.length > 0 ? (
            // External-only book: buttons that open the store pages.
            <div className="d-flex gap-2 flex-wrap">
              {storeLinks.map((l) => (
                <a
                  key={l.cls}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="buy-now-btn text-decoration-none d-inline-block"
                  title={l.title}
                >
                  {l.label}
                </a>
              ))}
            </div>
          ) : (
            <p className="all-langs-note">
              This book isn't available to read right now.
            </p>
          )}
        </div>
      </div>

      <div className="reviews-section">
        <h2>Reviews</h2>

        {loggedUser ? (
          <form className="review-form" onSubmit={handleSubmitReview}>
            <h4>{myReview ? "Edit your review" : "Write a review"}</h4>
            <StarRating value={myRating} onChange={setMyRating} />
            <textarea
              placeholder="Share your thoughts about this book (optional)"
              value={myComment}
              onChange={(e) => setMyComment(e.target.value)}
              maxLength={1000}
              rows={3}
            />
            <div className="review-form-actions">
              <button type="submit" disabled={submitting}>
                {myReview ? "Update Review" : "Submit Review"}
              </button>
              {myReview && (
                <button type="button" className="delete-review-btn" onClick={handleDeleteReview}>
                  Delete Review
                </button>
              )}
            </div>
          </form>
        ) : (
          <p className="login-to-review">
            <span className="link-brand" role="button" onClick={() => navigate("/?login=1")}>
              Log in
            </span>{" "}
            to leave a review.
          </p>
        )}

        <div className="reviews-list">
          {reviews.length === 0 ? (
            <p>No reviews yet. Be the first to review this book!</p>
          ) : (
            reviews.map((r) => (
              <div className="review-card" key={r._id}>
                <div className="review-card-header">
                  <strong>{r.user?.name || "Anonymous"}</strong>
                  <StarRating value={r.rating} onChange={() => {}} readOnly />
                </div>
                {r.comment && <p className="review-comment">{r.comment}</p>}
                <span className="review-date">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default BookDetails;