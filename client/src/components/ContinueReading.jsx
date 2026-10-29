import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaInfoCircle, FaTimes, FaBookOpen } from "react-icons/fa";
import API from "../api/axios";
import { toast } from "react-toastify";

import "../styles/ContinueReading.css";

const PLACEHOLDER_COVER = "/placeholder-cover.jpg";
const DISPLAY_LIMIT = 8;

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function getImageUrl(path) {
  if (!path) return PLACEHOLDER_COVER;
  if (path.startsWith("http")) return path;
  const baseURL = API.defaults.baseURL
    ? API.defaults.baseURL.replace(/\/api\/?$/, "")
    : "http://localhost:5000";
  return `${baseURL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function ContinueReading() {
  const navigate = useNavigate();
  const [user] = useState(getStoredUser);
  const [continueReading, setContinueReading] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContinueReading = useCallback(async () => {
    if (!user?._id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await API.get(`/reading-history`);
      const historyList = res.data?.history || [];
      const validHistory = historyList.filter((item) => item && item.book);
      setContinueReading(validHistory);
    } catch (err) {
      setError("We couldn't load your reading history.");
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchContinueReading();
  }, [fetchContinueReading]);

  const sortedReading = useMemo(() => {
    return [...continueReading].sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.lastReadAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.lastReadAt || 0).getTime();
      return bTime - aTime;
    });
  }, [continueReading]);

  const handleRemove = async (e, item) => {
    e.stopPropagation();
    if (!window.confirm("Remove this book from Continue Reading?")) return;

    const historyId = item._id;
    const prevState = continueReading;
    setContinueReading((prev) => prev.filter((h) => h._id !== historyId));

    try {
      await API.delete(`/reading-history/${historyId}`);
    } catch (err) {
      setContinueReading(prevState);
      toast.error("Couldn't remove that book.");
    }
  };

  if (!user || (!loading && continueReading.length === 0)) return null;

  const firstName = user?.name ? user.name.split(" ")[0] : "Reader";
  const visibleItems = sortedReading.slice(0, DISPLAY_LIMIT);

  return (
    <section className="continue-reading-section">
      <div className="container">
        {/* Heading */}
        <div className="cr-header-wrap mb-3">
          <h2 className="continue-section-heading">
            Continue Reading for {firstName}
          </h2>
        </div>

        {/* Horizontal Track */}
        <div className="cr-scroll-track">
          {visibleItems.map((item, index) => {
            const book = item.book;
            const currentPage = item.currentPage || 1;
            const percentage = Math.min(
              100,
              Math.max(0, Math.round(Number(item.percentage) || 0))
            );
            const isFinished = percentage >= 100;
            const langQuery = item.language ? `&lang=${encodeURIComponent(item.language)}` : "";

            return (
              <div
                className="cr-book-card"
                key={item._id || book._id || index}
                onClick={() =>
                  navigate(
                    isFinished
                      ? `/reader/${book._id}?page=1${langQuery}`
                      : `/reader/${book._id}?page=${currentPage}${langQuery}`
                  )
                }
              >
                <div className="cr-poster-wrap">
                  <img
                    src={getImageUrl(book.coverImage)}
                    alt={book.title}
                    className="cr-poster-img"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = PLACEHOLDER_COVER;
                    }}
                  />

                  {/* Top-Left Progress Badge (Screenshot Match) */}
                  <div className="cr-progress-pill">
                    {isFinished ? "FINISHED" : `${percentage}% READ`}
                  </div>

                  {/* Desktop Hover Overlay */}
                  <div className="cr-hover-overlay">
                    <div className="cr-overlay-top">
                      <span className="cr-badge-type">
                        {book.price === 0 || !book.price ? "FREE" : `₹${book.price}`}
                      </span>
                    </div>

                    <div className="cr-overlay-bottom">
                      <h4 className="cr-hover-book-title">{book.title}</h4>
                      <p className="cr-hover-book-author">{book.author || "SAFAR EBOOKS"}</p>
                      <button
                        type="button"
                        className="cr-hover-read-now-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(
                            isFinished
                              ? `/reader/${book._id}?page=1${langQuery}`
                              : `/reader/${book._id}?page=${currentPage}${langQuery}`
                          );
                        }}
                      >
                        <FaBookOpen size={12} className="me-1" />
                        {isFinished ? "Read Again" : "Continue"}
                      </button>
                    </div>
                  </div>

                  {/* Bottom Progress Bar */}
                  <div className="cr-progress-bar-bg">
                    <div
                      className="cr-progress-bar-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Footer Bar */}
                <div
                  className="cr-card-footer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="cr-icon-btn"
                    title="Book Details"
                    onClick={() => navigate(`/book/${book._id}`)}
                  >
                    <FaInfoCircle size={15} />
                  </button>

                  <button
                    type="button"
                    className="cr-icon-btn"
                    title="Remove"
                    onClick={(e) => handleRemove(e, item)}
                  >
                    <FaTimes size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ContinueReading;