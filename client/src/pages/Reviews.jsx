import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaStar } from "react-icons/fa";
import API from "../api/axios";
import "../styles/Reviews.css";

const RATING_FILTERS = [
  { label: "All ratings", value: 0 },
  { label: "5 stars", value: 5 },
  { label: "4 stars & up", value: 4 },
  { label: "3 stars & up", value: 3 },
];

const AVATAR_COLORS = [
  "#9E8189", "#6B5560", "#3E7C59", "#2F5C8A", "#8A3B3B", "#5B4B8A",
];

function avatarColorFor(name) {
  const code = (name || "?").charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const baseURL = API.defaults.baseURL
    ? API.defaults.baseURL.replace(/\/api\/?$/, "")
    : "http://localhost:5000";
  return `${baseURL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function StarRow({ rating }) {
  return (
    <div className="review-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <FaStar key={n} className={n <= rating ? "star-filled" : "star-empty"} />
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  const user = review.user;
  const book = review.book;
  const bookCover = getImageUrl(book?.coverImage);
  const initial = (user?.name || "?").charAt(0).toUpperCase();

  return (
    <div className="review-card">
      <StarRow rating={review.rating} />
      <p className="review-comment">&ldquo;{review.comment}&rdquo;</p>

      <div className="review-footer">
        <div className="review-person">
          <div
            className="review-avatar review-avatar-initial"
            style={{ background: avatarColorFor(user?.name) }}
          >
            {initial}
          </div>
          <div className="review-person-text">
            <span className="review-name">{user?.name || "A reader"}</span>
            <span className="review-date">
              {new Date(review.createdAt).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {book && (
          <Link to={`/book/${book._id}`} className="review-book-link">
            {bookCover ? (
              <img src={bookCover} alt={book.title} className="review-book-cover" />
            ) : (
              <div className="review-book-cover review-book-cover-placeholder">📖</div>
            )}
            <span className="review-book-title text-truncate">{book.title}</span>
          </Link>
        )}
      </div>
    </div>
  );
}

function ReviewCardSkeleton() {
  return (
    <div className="review-card review-card-skeleton">
      <div className="skeleton-line w-25 mb-3" style={{ height: 14 }} />
      <div className="skeleton-line w-100 mb-1" style={{ height: 12 }} />
      <div className="skeleton-line w-100 mb-1" style={{ height: 12 }} />
      <div className="skeleton-line w-75 mb-4" style={{ height: 12 }} />
      <div className="d-flex align-items-center gap-2">
        <div className="skeleton-block" style={{ width: 40, height: 40, borderRadius: "50%" }} />
        <div className="skeleton-line w-50" style={{ height: 12 }} />
      </div>
    </div>
  );
}

function Reviews() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0, totalBooksReviewed: 0 });
  const [sort, setSort] = useState("recent"); // "recent" | "rating"
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async (pageToLoad, replace) => {
    replace ? setLoading(true) : setLoadingMore(true);
    setError(null);

    try {
      const res = await API.get("/reviews/all", {
        params: {
          page: pageToLoad,
          limit: 12,
          sort,
          minRating: minRating || undefined,
        },
      });

      const data = res.data;
      setStats(data.stats);
      setTotalPages(data.totalPages);
      setPage(data.currentPage);
      setReviews((prev) => (replace ? data.reviews : [...prev, ...data.reviews]));
    } catch (err) {
      setError("We couldn't load reviews right now.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sort, minRating]);

  useEffect(() => {
    fetchReviews(1, true);

  }, [sort, minRating]);

  const handleLoadMore = () => {
    if (page < totalPages) fetchReviews(page + 1, false);
  };

  return (
    <div className="reviews-page">
      <div className="reviews-hero text-center">
        <h1 className="reviews-title">What Readers Are Saying</h1>
        <p className="reviews-subtitle">
          Real reviews from real SAFAR EBOOKS readers across our library.
        </p>

        <div className="reviews-stats">
          <div className="reviews-stat">
            <span className="reviews-stat-value">
              {stats.averageRating || "—"} <FaStar className="reviews-stat-star" />
            </span>
            <span className="reviews-stat-label">Average rating</span>
          </div>
          <div className="reviews-stat-divider" />
          <div className="reviews-stat">
            <span className="reviews-stat-value">{stats.totalReviews}</span>
            <span className="reviews-stat-label">Reviews</span>
          </div>
          <div className="reviews-stat-divider" />
          <div className="reviews-stat">
            <span className="reviews-stat-value">{stats.totalBooksReviewed}</span>
            <span className="reviews-stat-label">Books reviewed</span>
          </div>
        </div>
      </div>

      <div className="reviews-controls">
        <div className="reviews-sort-toggle" role="tablist" aria-label="Sort reviews">
          <button
            type="button"
            className={`reviews-sort-btn ${sort === "recent" ? "active" : ""}`}
            onClick={() => setSort("recent")}
          >
            Most Recent
          </button>
          <button
            type="button"
            className={`reviews-sort-btn ${sort === "rating" ? "active" : ""}`}
            onClick={() => setSort("rating")}
          >
            Highest Rated
          </button>
        </div>

        <div className="reviews-filter-chips">
          {RATING_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`reviews-chip ${minRating === f.value ? "active" : ""}`}
              onClick={() => setMinRating(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="reviews-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <ReviewCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-5">
          <p className="text-muted">{error}</p>
          <button className="btn btn-dark" onClick={() => fetchReviews(1, true)}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && reviews.length === 0 && (
        <div className="text-center py-5">
          <p className="text-muted mb-3">No reviews match this filter yet.</p>
        </div>
      )}

      {!loading && !error && reviews.length > 0 && (
        <>
          <div className="reviews-grid">
            {reviews.map((review) => (
              <ReviewCard key={review._id} review={review} />
            ))}
          </div>

          {page < totalPages && (
            <div className="text-center mt-4">
              <button
                type="button"
                className="reviews-load-more"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More Reviews"}
              </button>
            </div>
          )}
        </>
      )}

      <div className="reviews-cta text-center">
        <h3>Read something you loved?</h3>
        <p>Share your thoughts and help other readers discover their next book.</p>
        <button
          type="button"
          className="reviews-cta-btn"
          onClick={() => navigate("/library")}
        >
          Browse the Library
        </button>
      </div>
    </div>
  );
}

export default Reviews;