import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaBookOpen, FaTimes, FaInfoCircle, FaSearch, FaCheckCircle, FaHourglassHalf, FaBook } from "react-icons/fa";
import API from "../api/axios";
import { toast } from "react-toastify";

import "../styles/ReadingHistory.css";

const PLACEHOLDER_COVER = "/placeholder-cover.jpg";

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

function ReadingHistory() {
  const navigate = useNavigate();
  const [user] = useState(getStoredUser);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search / filter / sort controls
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const fetchHistory = useCallback(async () => {
    if (!user?._id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await API.get(`/reading-history`);
      const historyList = res.data?.history || [];
      setHistory(historyList.filter((item) => item && item.book));
    } catch (err) {
      setError("We couldn't load your reading history.");
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const pct = (item) =>
    Math.min(100, Math.max(0, Math.round(Number(item.percentage) || 0)));

  const stats = useMemo(() => {
    const finished = history.filter((h) => pct(h) >= 100).length;
    const avg = history.length
      ? Math.round(history.reduce((sum, h) => sum + pct(h), 0) / history.length)
      : 0;
    return {
      total: history.length,
      finished,
      inProgress: history.length - finished,
      avg,
    };
  }, [history]);

  const sortedHistory = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = history.filter((h) => {
      const done = pct(h) >= 100;
      if (statusFilter === "finished" && !done) return false;
      if (statusFilter === "reading" && done) return false;
      if (!q) return true;
      return (
        h.book?.title?.toLowerCase().includes(q) ||
        h.book?.author?.toLowerCase().includes(q)
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "title") return (a.book?.title || "").localeCompare(b.book?.title || "");
      if (sortBy === "progress") return pct(b) - pct(a);
      const aTime = new Date(a.updatedAt || a.lastOpened || 0).getTime();
      const bTime = new Date(b.updatedAt || b.lastOpened || 0).getTime();
      return bTime - aTime;
    });
  }, [history, search, statusFilter, sortBy]);

  const handleRemove = async (e, item) => {
    e.stopPropagation();
    if (!window.confirm("Remove this book from your reading history?")) return;

    const historyId = item._id;
    const prevState = history;
    setHistory((prev) => prev.filter((h) => h._id !== historyId));

    try {
      await API.delete(`/reading-history/${historyId}`);
      toast.info("Removed from reading history.");
    } catch (err) {
      setHistory(prevState);
      toast.error("Couldn't remove that book. Please try again.");
    }
  };

  return (
    <div className="rh-page">
      <div className="container">
        {/* Header */}
        <div className="rh-header">
          <h1 className="rh-title">Reading History</h1>
          <p className="rh-subtitle">
            Every book you've opened, with your progress saved automatically.
          </p>
        </div>

        {!loading && !error && history.length > 0 && (
          <>
            <div className="rh-stats">
              <div className="rh-stat">
                <FaBook className="rh-stat-icon" />
                <div>
                  <div className="rh-stat-value">{stats.total}</div>
                  <div className="rh-stat-label">Books opened</div>
                </div>
              </div>
              <div className="rh-stat">
                <FaHourglassHalf className="rh-stat-icon" />
                <div>
                  <div className="rh-stat-value">{stats.inProgress}</div>
                  <div className="rh-stat-label">In progress</div>
                </div>
              </div>
              <div className="rh-stat">
                <FaCheckCircle className="rh-stat-icon" />
                <div>
                  <div className="rh-stat-value">{stats.finished}</div>
                  <div className="rh-stat-label">Finished</div>
                </div>
              </div>
              <div className="rh-stat">
                <div className="rh-ring" style={{ "--p": stats.avg }}>
                  <span>{stats.avg}%</span>
                </div>
                <div>
                  <div className="rh-stat-value rh-stat-value-sm">Average</div>
                  <div className="rh-stat-label">Progress</div>
                </div>
              </div>
            </div>

            <div className="rh-toolbar">
              <div className="rh-search">
                <FaSearch className="rh-search-icon" />
                <input
                  type="text"
                  placeholder="Search your reading history..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="rh-tabs">
                {[
                  ["all", "All"],
                  ["reading", "In progress"],
                  ["finished", "Finished"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`rh-tab ${statusFilter === key ? "active" : ""}`}
                    onClick={() => setStatusFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="recent">Recently read</option>
                <option value="progress">Most progress</option>
                <option value="title">Title (A–Z)</option>
              </select>
            </div>
          </>
        )}

        {loading ? (
          <div className="rh-empty-box">
            <h4>Loading reading history...</h4>
          </div>
        ) : error ? (
          <div className="rh-empty-box">
            <p className="text-danger mb-3">{error}</p>
            <button className="rh-action-btn" onClick={fetchHistory}>
              Try Again
            </button>
          </div>
        ) : history.length > 0 && sortedHistory.length === 0 ? (
          <div className="rh-empty-box">
            <h3>No books match your filters.</h3>
            <p>Try a different search or switch the tab.</p>
            <button
              type="button"
              className="rh-action-btn"
              onClick={() => { setSearch(""); setStatusFilter("all"); }}
            >
              Clear filters
            </button>
          </div>
        ) : sortedHistory.length === 0 ? (
          <div className="rh-empty-box">
            <div className="rh-empty-icon"><FaBookOpen /></div>
            <h3>You haven't started reading anything yet.</h3>
            <p>Explore the library to start your reading journey.</p>
            <button
              type="button"
              className="rh-action-btn"
              onClick={() => navigate("/library")}
            >
              Browse Library
            </button>
          </div>
        ) : (
          /* Book Cards Grid */
          <div className="rh-grid">
            {sortedHistory.map((item, index) => {
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
                  className="rh-book-card"
                  key={item._id || book._id || index}
                  onClick={() =>
                    navigate(
                      isFinished
                        ? `/reader/${book._id}?page=1${langQuery}`
                        : `/reader/${book._id}?page=${currentPage}${langQuery}`
                    )
                  }
                >
                  <div className="rh-poster-wrap">
                    <img
                      src={getImageUrl(book.coverImage)}
                      alt={book.title}
                      className="rh-poster-img"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = PLACEHOLDER_COVER;
                      }}
                    />

                    {/* Desktop Hover Overlay */}
                    <div className="rh-hover-overlay">
                      <div className="rh-overlay-top">
                        <span className="rh-badge">
                          {isFinished ? "FINISHED" : `${percentage}% READ`}
                        </span>
                      </div>

                      <div className="rh-overlay-bottom">
                        <h4 className="rh-hover-title">{book.title}</h4>
                        <p className="rh-hover-author">{book.author || "Unknown Author"}</p>

                        <button
                          type="button"
                          className="rh-read-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              isFinished
                                ? `/reader/${book._id}?page=1${langQuery}`
                                : `/reader/${book._id}?page=${currentPage}${langQuery}`
                            );
                          }}
                        >
                          <FaBookOpen size={11} className="me-1" />
                          {isFinished ? "Read Again" : "Continue"}
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="rh-progress-bar-bg">
                      <div
                        className="rh-progress-bar-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="rh-caption">
                    <h5 className="rh-caption-title">{book.title}</h5>
                    <p className="rh-caption-meta">
                      {isFinished ? "Finished" : `${percentage}% read · Page ${currentPage}`}
                      {item.lastOpened || item.updatedAt
                        ? ` · ${new Date(item.updatedAt || item.lastOpened).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>

                  {/* Card Bottom Controls */}
                  <div
                    className="rh-card-footer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="rh-footer-btn"
                      title="Book Details"
                      onClick={() => navigate(`/book/${book._id}`)}
                    >
                      <FaInfoCircle size={15} />
                    </button>

                    <button
                      type="button"
                      className="rh-footer-btn"
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
        )}
      </div>
    </div>
  );
}

export default ReadingHistory;