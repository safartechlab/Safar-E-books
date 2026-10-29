import { useEffect, useState, useCallback } from "react";
import { Table, Form, Button } from "react-bootstrap";
import { FaStar } from "react-icons/fa";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../../api/axios";
import "../../styles/ManageReviews.css";

const RATING_OPTIONS = [
  { label: "All ratings", value: "" },
  { label: "5 stars", value: "5" },
  { label: "4 stars", value: "4" },
  { label: "3 stars", value: "3" },
  { label: "2 stars", value: "2" },
  { label: "1 star", value: "1" },
];

function getImageUrl(coverPath) {
  if (!coverPath) return "/placeholder-cover.jpg";
  if (coverPath.startsWith("http")) return coverPath;
  const baseURL = API.defaults.baseURL
    ? API.defaults.baseURL.replace(/\/api\/?$/, "")
    : "http://localhost:5000";
  return `${baseURL}${coverPath.startsWith("/") ? "" : "/"}${coverPath}`;
}

function StarRow({ rating }) {
  return (
    <span className="manage-reviews-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <FaStar key={n} className={n <= rating ? "star-filled" : "star-empty"} />
      ))}
    </span>
  );
}

function ManageReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [sort, setSort] = useState("recent"); // "recent" | "rating-high" | "rating-low"
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchReviews = useCallback(async (pageToLoad) => {
    setLoading(true);
    try {
      const res = await API.get("/reviews/admin/all", {
        params: {
          page: pageToLoad,
          limit: 15,
          sort,
          minRating: ratingFilter || undefined,
          search: search || undefined,
        },
      });
      setReviews(res.data.reviews || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.totalCount || 0);
      setPage(res.data.currentPage || 1);
    } catch (error) {
      toast.error("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [sort, ratingFilter, search]);

  // Re-fetch from page 1 whenever a filter/sort/search changes
  useEffect(() => {
    const timeout = setTimeout(() => fetchReviews(1), search ? 350 : 0); // debounce the search box only
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, ratingFilter, search]);

  const handleDelete = async (review) => {
    const result = await Swal.fire({
      title: "Delete this review?",
      html: `This will permanently remove <strong>${review.user?.name || "this user"}</strong>'s review of <strong>${review.book?.title || "this book"}</strong>. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#D32F2F",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Delete",
    });

    if (!result.isConfirmed) return;

    try {
      await API.delete(`/reviews/${review._id}`);
      toast.success("Review deleted successfully!");
      // Re-fetch the current page; if it's now empty (and not page 1), step back a page
      if (reviews.length === 1 && page > 1) {
        fetchReviews(page - 1);
      } else {
        fetchReviews(page);
      }
    } catch (error) {
      toast.error("Failed to delete review.");
    }
  };

  return (
    <div className="manage-reviews-bg p-4" style={{ minHeight: "100vh" }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="manage-reviews-heading fs-2 mb-0">Manage Reviews</h1>
          <p className="text-muted mb-0">{totalCount} review{totalCount === 1 ? "" : "s"} total</p>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <Form.Control
            type="text"
            placeholder="Search review text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
          <Form.Select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            style={{ width: 150 }}
          >
            {RATING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Form.Select>
          <Form.Select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ width: 170 }}
          >
            <option value="recent">Most Recent</option>
            <option value="rating-high">Highest Rated</option>
            <option value="rating-low">Lowest Rated</option>
          </Form.Select>
        </div>
      </div>

      <div className="table-responsive rounded-3 shadow-sm">
        <Table hover className="align-middle mb-0 bg-white">
          <thead className="manage-reviews-thead">
            <tr>
              <th>Book</th>
              <th>Reviewer</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-4">Loading reviews...</td>
              </tr>
            ) : reviews.length > 0 ? (
              reviews.map((review) => (
                <tr key={review._id}>
                  <td style={{ minWidth: 160 }}>
                    {review.book ? (
                      <Link to={`/book/${review.book._id}`} className="manage-reviews-book-link">
                        <img
                          src={getImageUrl(review.book.coverImage)}
                          alt={review.book.title}
                          className="rounded-2"
                          style={{ width: 34, height: 48, objectFit: "cover" }}
                        />
                        <span className="text-truncate" style={{ maxWidth: 130 }}>
                          {review.book.title}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-muted fst-italic">Book deleted</span>
                    )}
                  </td>
                  <td>
                    <div className="fw-semibold">{review.user?.name || "Unknown user"}</div>
                    <div className="text-muted small">{review.user?.email || ""}</div>
                  </td>
                  <td><StarRow rating={review.rating} /></td>
                  <td style={{ maxWidth: 320 }}>
                    {review.comment ? (
                      <span className="manage-reviews-comment">{review.comment}</span>
                    ) : (
                      <span className="text-muted fst-italic">No comment</span>
                    )}
                  </td>
                  <td className="text-nowrap">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(review)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  No reviews found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="admin-pagination d-flex justify-content-center align-items-center gap-3 mt-3">
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page === 1}
            onClick={() => fetchReviews(page - 1)}
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page === totalPages}
            onClick={() => fetchReviews(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default ManageReviews;