import { useEffect, useState, useMemo, useCallback } from "react";
import { NO_COVER_IMAGE } from "../utils/fileUrl";
import API from "../api/axios";
import { getBookAction, getStoredUser, openLoginPopup } from "../utils/bookAccess";
import { startPayment } from "../utils/payment";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/Library.css";
import useOptions from "../hooks/useOptions";
import {
  FaHeart,
  FaRegHeart,
  FaAmazon,
  FaBookReader,
  FaBookOpen,
  FaShoppingBag,
  FaShoppingCart,
} from "react-icons/fa";

import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} from "../api/wishlist";

// ?access=free|vip|paid in the URL (used by the "view all" buttons on the
// home page) pre-selects the matching filter tab.
const ACCESS_FROM_QUERY = { free: "Free", vip: "VIP", paid: "Paid" };

function Library() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(() => searchParams.get("category") || "All");
  const [language, setLanguage] = useState("All");
  const [accessFilter, setAccessFilter] = useState(
    () => ACCESS_FROM_QUERY[searchParams.get("access")] || "All"
  );

  // Admin-managed lists (Admin > Categories & Languages)
  const { categories: categoryList, languages: languageList } = useOptions();
  const categories = useMemo(() => ["All", ...categoryList], [categoryList]);
  const languages = useMemo(() => ["All", ...languageList], [languageList]);

  // Kept in state (not read once) so that right after a purchase the button
  // changes from "Buy Now" to "Read eBook" without reloading the page.
  const [user, setUser] = useState(() => getStoredUser() || {});

  const fetchBooks = useCallback(async () => {
    try {
      const res = await API.get("/books");
      const booksData = res.data?.books || res.data || [];
      setBooks(booksData);
      setFilteredBooks(booksData);
    } catch (err) {}
  }, []);

  const fetchWishlist = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await getWishlist(user._id);
      const wishlistArray = res.data?.wishlist || [];
      const ids = wishlistArray
        .filter((item) => item && item.book && item.book._id)
        .map((item) => item.book._id);
      setWishlist(ids);
    } catch (err) {}
  }, [user?._id]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);
  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const toggleWishlist = async (bookId) => {
    if (!user?._id) {
      toast.warning("Please login to manage your wishlist.");
      return;
    }
    const isWishlisted = wishlist.includes(bookId);
    setWishlist((prev) => (isWishlisted ? prev.filter((id) => id !== bookId) : [...prev, bookId]));
    try {
      if (isWishlisted) {
        await removeFromWishlist(user._id, bookId);
        toast.info("Removed from Favorites");
      } else {
        await addToWishlist(user._id, bookId);
        toast.success("Added to Favorites ❤️");
      }
    } catch (err) {
      setWishlist((prev) => (isWishlisted ? [...prev, bookId] : prev.filter((id) => id !== bookId)));
      toast.error("Failed to update wishlist. Please try again.");
    }
  };

  useEffect(() => {
    let data = [...books];
    if (category !== "All") data = data.filter((book) => book?.category === category);
    if (language !== "All") {
      data = data.filter((book) => {
        const langs = book?.languages?.length ? book.languages : [book?.language];
        return langs.includes(language);
      });
    }

    if (accessFilter === "Free") data = data.filter((book) => book?.isFree);
    else if (accessFilter === "Paid")
      data = data.filter((book) => !book?.isFree && !book?.isSubscriptionRequired && book?.price > 0);
    else if (accessFilter === "VIP") data = data.filter((book) => book?.isSubscriptionRequired);
    else if (accessFilter === "External")
      data = data.filter((book) => book?.kindleUrl || book?.amazonPrintUrl || book?.flipkartPrintUrl);

    if (search.trim()) {
      const query = search.toLowerCase();
      data = data.filter(
        (book) =>
          book?.title?.toLowerCase().includes(query) ||
          book?.author?.toLowerCase().includes(query)
      );
    }
    setFilteredBooks(data);
  }, [books, category, language, accessFilter, search]);

  const getImageUrl = (book) => {
    const rawImage = book?.coverImage || book?.image || book?.imageUrl;
    if (!rawImage) return NO_COVER_IMAGE;
    if (rawImage.startsWith("http")) return rawImage;
    const baseURL = API.defaults.baseURL
      ? API.defaults.baseURL.replace(/\/api\/?$/, "")
      : "http://localhost:5000";
    return `${baseURL}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;
  };

  const handleActionClick = (e, book, action) => {
    e.stopPropagation();

    // Reading and buying both need an account. (Before this, a visitor who
    // wasn't logged in was sent to a reader page that could not load the file.)
    if (!user?._id) {
      toast.warning(
        action.kind === "buy" ? "Please login to buy this book." : "Please login to read this book."
      );
      openLoginPopup(navigate);
      return;
    }

    if (action.kind === "buy") {
      startPayment({
        type: "book",
        bookId: book._id,
        onSuccess: () => setUser(getStoredUser() || {}),
      });
      return;
    }

    navigate(`/reader/${book._id}`);
  };

  return (
    <div className="library-page m-0 p-0">
      {/* HERO SECTION */}
      <section className="library-hero position-relative text-center overflow-visible">
        <div className="library-hero-content position-relative z-2">
          {/* mb-1 se title aur subtitle ke beech ka space clean aur compact ho gaya */}
          <h1 className="fw-bold mb-1 library-title">SAFAR EBOOKS Digital Library</h1>
          <p className="fw-semibold mt-0 mb-4 library-subtitle">
            Read online, subscribe for VIP access, or order copies directly from major stores.
          </p>

          <div className="library-top d-flex justify-content-center gap-3 flex-wrap">
            <input
              type="text"
              className="rounded-pill px-4 py-2 border-0 shadow-sm"
              placeholder="Search title or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {/* Category + language stay on ONE line, even on phones */}
            <div className="library-select-row">
              <select
                className="rounded-pill px-4 py-2 border-0 shadow-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "All" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
              <select
                className="rounded-pill px-4 py-2 border-0 shadow-sm"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang === "All" ? "All Languages" : lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-tabs d-flex justify-content-center align-items-center gap-2 mt-3 flex-wrap">
            {["All", "Free", "Paid", "VIP", "External"].map((tab) => (
              <button
                key={tab}
                className={`filter-tab rounded-pill fw-semibold border-0 px-3 py-2 ${accessFilter === tab ? "active" : ""}`}
                onClick={() => setAccessFilter(tab)}
              >
                {tab === "VIP" ? "👑 VIP Subscription" : tab === "External" ? "🛍️ Physical / Kindle" : tab === "Paid" ? "💳 Paid" : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Wave */}
        <div className="library-hero-wave">
          <svg viewBox="0 0 1440 180" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,60 C320,140 420,10 720,80 C1020,150 1120,20 1440,60 L1440,180 L0,180 Z" fill="var(--color-light-blush)" />
          </svg>
        </div>
      </section>

      {/* GRID */}
      <section className="library-main-section px-4 px-md-5 py-5">
        <h2 className="section-title fw-bold mb-4">Explore Collection</h2>

        <div className="library-grid">
          {filteredBooks.length > 0 ? (
            filteredBooks.map((book) => {
              if (!book || !book._id) return null;
              // "Buy Now" for paid books the person hasn't bought yet,
              // "Unlock VIP" for VIP books, otherwise "Read eBook".
              const action = getBookAction(book, user, "Read eBook");
              return (
                <div
                  className="library-card position-relative rounded-4 overflow-hidden shadow-sm"
                  key={book._id}
                  onClick={() => navigate(`/book/${book._id}`)}
                >
                  <div className="card-badges position-absolute d-flex gap-1 z-3">
                    {book.isFree ? (
                      <span className="badge-sm badge-free rounded-1 fw-bold text-uppercase px-2 py-1">FREE</span>
                    ) : book.isSubscriptionRequired ? (
                      <span className="badge-sm badge-vip rounded-1 fw-bold text-uppercase px-2 py-1">👑 VIP</span>
                    ) : book.price > 0 ? (
                      <span className="badge-sm badge-paid rounded-1 fw-bold text-uppercase px-2 py-1">₹{book.price}</span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="wishlist-icon position-absolute rounded-circle d-flex align-items-center justify-content-center border-0 z-3"
                    aria-label="Add to Wishlist"
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(book._id); }}
                  >
                    {wishlist.includes(book._id) ? <FaHeart color="#ff4757" size={16} /> : <FaRegHeart color="#fff" size={16} />}
                  </button>

                  <img src={getImageUrl(book)} alt={book.title || "Book Cover"} />

                  <div className="library-card-content position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-end p-3">
                    <h3 className="card-title fw-bold text-truncate mb-1">{book.title}</h3>
                    <p className="card-author text-truncate mb-2">{book.author}</p>

                    <div className="action-button-group d-flex flex-column gap-2" onClick={(e) => e.stopPropagation()}>
                      {action && (
                        <button
                          className={`btn-action w-100 border-0 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2 py-2 ${
                            action.kind === "buy" ? "btn-buy" : action.kind === "vip" ? "btn-vip" : "btn-read"
                          }`}
                          onClick={(e) => handleActionClick(e, book, action)}
                        >
                          {action.kind === "buy" ? <FaShoppingCart size={13} /> : <FaBookReader size={13} />}
                          {action.label}
                        </button>
                      )}

                      <div className="external-store-links d-flex gap-1">
                        {book.kindleUrl && (
                          <a href={book.kindleUrl} target="_blank" rel="noreferrer" className="store-btn kindle flex-fill d-flex align-items-center justify-content-center gap-1 text-decoration-none rounded-2 py-1" title="Read on Kindle">
                            <FaBookOpen size={11} /> Kindle
                          </a>
                        )}
                        {book.amazonPrintUrl && (
                          <a href={book.amazonPrintUrl} target="_blank" rel="noreferrer" className="store-btn amazon flex-fill d-flex align-items-center justify-content-center gap-1 text-decoration-none rounded-2 py-1" title="Buy Physical Copy on Amazon">
                            <FaAmazon size={11} /> Amazon
                          </a>
                        )}
                        {book.flipkartPrintUrl && (
                          <a href={book.flipkartPrintUrl} target="_blank" rel="noreferrer" className="store-btn flipkart flex-fill d-flex align-items-center justify-content-center gap-1 text-decoration-none rounded-2 py-1" title="Buy Physical Copy on Flipkart">
                            <FaShoppingBag size={11} /> Flipkart
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <h3 className="no-books text-center text-secondary w-100">No books match your selection.</h3>
          )}
        </div>
      </section>
    </div>
  );
}

export default Library;