import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaHeart, FaBookOpen, FaSearch, FaCrown, FaGift, FaLayerGroup } from "react-icons/fa";
import { getWishlist, removeFromWishlist } from "../api/wishlist";
import API from "../api/axios";
import { toast } from "react-toastify";

import "../styles/Wishlist.css";

const PLACEHOLDER_COVER = "/placeholder-cover.jpg";

function Wishlist() {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) {
        setLoading(false);
        return;
      }

      const res = await getWishlist(user._id);
      const rawWishlist = res.data?.wishlist || [];

      const validWishlist = rawWishlist.filter(
        (item) => item && item.book && item.book._id
      );

      setWishlist(validWishlist);
    } catch (err) {
      toast.error("Failed to load wishlist.");
    } finally {
      setLoading(false);
    }
  };

  const removeBook = async (e, bookId) => {
    e.stopPropagation();
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;

      await removeFromWishlist(user._id, bookId);
      setWishlist((prev) => prev.filter((item) => item?.book?._id !== bookId));
      toast.info("Removed from Favorites");
    } catch (err) {
      toast.error("Could not remove book.");
    }
  };

  const stats = useMemo(() => {
    const books = wishlist.map((w) => w.book);
    return {
      total: books.length,
      free: books.filter((b) => b.isFree).length,
      vip: books.filter((b) => b.isSubscriptionRequired).length,
      categories: new Set(books.map((b) => b.category).filter(Boolean)).size,
    };
  }, [wishlist]);

  const categoryOptions = useMemo(
    () => ["All", ...new Set(wishlist.map((w) => w.book.category).filter(Boolean))],
    [wishlist]
  );

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = wishlist.filter((w) => {
      const b = w.book;
      if (categoryFilter !== "All" && b.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, z) => {
      if (sortBy === "title") return (a.book.title || "").localeCompare(z.book.title || "");
      if (sortBy === "author") return (a.book.author || "").localeCompare(z.book.author || "");

      return new Date(z.createdAt || 0) - new Date(a.createdAt || 0);
    });
    return list;
  }, [wishlist, search, categoryFilter, sortBy]);

  const priceLabel = (b) =>
    b.isFree ? "FREE" : b.isSubscriptionRequired ? "VIP" : b.price > 0 ? `₹${b.price}` : "";

  const getImageUrl = (path) => {
    if (!path) return PLACEHOLDER_COVER;
    if (path.startsWith("http")) return path;
    const baseURL = API.defaults.baseURL
      ? API.defaults.baseURL.replace(/\/api\/?$/, "")
      : "http://localhost:5000";
    return `${baseURL}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  return (
    <div className="wishlist-page">
      <div className="container">
        {/* Header */}
        <div className="wishlist-header">
          <h1 className="wishlist-title">My Favorites</h1>
          <p className="wishlist-subtitle">Books you've saved to read later.</p>
        </div>

        {!loading && wishlist.length > 0 && (
          <>
            {/* Quick stats */}
            <div className="wl-stats">
              <div className="wl-stat">
                <FaHeart className="wl-stat-icon" />
                <div>
                  <div className="wl-stat-value">{stats.total}</div>
                  <div className="wl-stat-label">Saved books</div>
                </div>
              </div>
              <div className="wl-stat">
                <FaGift className="wl-stat-icon" />
                <div>
                  <div className="wl-stat-value">{stats.free}</div>
                  <div className="wl-stat-label">Free to read</div>
                </div>
              </div>
              <div className="wl-stat">
                <FaCrown className="wl-stat-icon" />
                <div>
                  <div className="wl-stat-value">{stats.vip}</div>
                  <div className="wl-stat-label">VIP titles</div>
                </div>
              </div>
              <div className="wl-stat">
                <FaLayerGroup className="wl-stat-icon" />
                <div>
                  <div className="wl-stat-value">{stats.categories}</div>
                  <div className="wl-stat-label">Categories</div>
                </div>
              </div>
            </div>

            {/* Search / filter / sort */}
            <div className="wl-toolbar">
              <div className="wl-search">
                <FaSearch className="wl-search-icon" />
                <input
                  type="text"
                  placeholder="Search your favorites..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>
                ))}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="recent">Recently added</option>
                <option value="title">Title (A–Z)</option>
                <option value="author">Author (A–Z)</option>
              </select>
            </div>

            <p className="wl-result-count">
              Showing {visibleItems.length} of {wishlist.length} favorite{wishlist.length === 1 ? "" : "s"}
            </p>
          </>
        )}

        {loading ? (
          <div className="wishlist-empty-box">
            <h4>Loading favorites...</h4>
          </div>
        ) : wishlist.length === 0 ? (
          <div className="wishlist-empty-box">
            <div className="wl-empty-icon"><FaHeart /></div>
            <h3>Your favorites list is empty.</h3>
            <p>Explore our library and bookmark books you love.</p>
            <button
              type="button"
              className="wishlist-browse-btn"
              onClick={() => navigate("/library")}
            >
              Browse Library
            </button>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="wishlist-empty-box">
            <h3>No favorites match your search.</h3>
            <p>Try a different word or clear the filters.</p>
            <button
              type="button"
              className="wishlist-browse-btn"
              onClick={() => { setSearch(""); setCategoryFilter("All"); }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="wishlist-grid">
            {visibleItems.map((item) => {
              const book = item.book;
              if (!book) return null;

              return (
                <div
                  className="wl-book-card"
                  key={item._id || book._id}
                  onClick={() => navigate(`/book/${book._id}`)}
                >
                  <div className="wl-poster-wrap">
                    <img
                      src={getImageUrl(book.coverImage)}
                      alt={book.title || "Book Cover"}
                      className="wl-poster-img"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = PLACEHOLDER_COVER;
                      }}
                    />

                    {priceLabel(book) && (
                      <span className={`wl-price-pill ${book.isSubscriptionRequired && !book.isFree ? "vip" : ""}`}>
                        {priceLabel(book)}
                      </span>
                    )}

                    {/* Top Heart Button */}
                    <button
                      type="button"
                      className="wl-heart-remove-btn"
                      title="Remove from favorites"
                      onClick={(e) => removeBook(e, book._id)}
                    >
                      <FaHeart size={14} color="#e50914" />
                    </button>

                    {/* Hover Overlay */}
                    <div className="wl-hover-overlay">
                      <div className="wl-overlay-top">
                        <span className="wl-badge">
                          {book.category || "Book"}
                        </span>
                      </div>

                      <div className="wl-overlay-bottom">
                        <h4 className="wl-hover-title">{book.title}</h4>
                        <p className="wl-hover-author">{book.author || "Unknown Author"}</p>
                        <button
                          type="button"
                          className="wl-read-now-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/reader/${book._id}`);
                          }}
                        >
                          <FaBookOpen size={11} className="me-1" /> Read Now
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="wl-caption">
                    <h5 className="wl-caption-title">{book.title}</h5>
                    <p className="wl-caption-author">{book.author || "Unknown Author"}</p>
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

export default Wishlist;