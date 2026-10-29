import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHeart,
  FaRegHeart,
  FaAmazon,
  FaBookReader,
  FaBookOpen,
  FaShoppingBag,
  FaShoppingCart,
  FaArrowRight,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../api/axios";
import { getFileUrl, NO_COVER_IMAGE } from "../utils/fileUrl";
import { getBookAction, getStoredUser, openLoginPopup } from "../utils/bookAccess";
import { startPayment } from "../utils/payment";
import useWishlistIds from "../hooks/useWishlistIds";
import "../styles/NewArrivals.css";

// A horizontally scrolling row of book covers. The home page uses it three
// times: "New Arrivals" (the latest books added), "Free Books" and "VIP Access
// Books". The books always come straight from the server, newest first.
//
//   access  - "free" | "vip" | "paid" to only show that kind of book
//   limit   - how many books to show
const SKELETON_COUNT = 6;

const badgeFor = (book) => {
  if (book.isFree) return "FREE";
  if (book.isSubscriptionRequired) return "👑 VIP";
  if (book.price > 0) return `₹${book.price}`;
  return ""; // external-link-only book: nothing to label
};

function BookShelf({
  title,
  subtitle,
  access,
  limit = 6,
  viewAllTo = "/library",
  emptyText = "No books available right now.",
  hideWhenEmpty = false,
}) {
  const navigate = useNavigate();
  const trackRef = useRef(null);

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(getStoredUser);
  const [overflowing, setOverflowing] = useState(false);
  const { wishlistIds, toggleWishlist } = useWishlistIds();

  useEffect(() => {
    let cancelled = false;

    const fetchBooks = async () => {
      try {
        const res = await API.get("/books/latest", {
          params: { limit, ...(access ? { access } : {}) },
        });
        if (!cancelled) setBooks(res.data?.books || []);
      } catch (err) {
        if (!cancelled) setBooks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBooks();
    return () => {
      cancelled = true;
    };
  }, [access, limit]);

  // Show the left/right buttons only when the row is wider than the screen.
  const measure = useCallback(() => {
    const el = trackRef.current;
    if (el) setOverflowing(el.scrollWidth > el.clientWidth + 4);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, books]);

  const scrollTrack = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 200), behavior: "smooth" });
  };

  const handleAction = (e, book, action) => {
    e.stopPropagation();

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
        // startPayment refreshes the saved user; pick that up so this
        // button flips from "Buy Now" to "Read Now" straight away.
        onSuccess: () => setUser(getStoredUser()),
      });
      return;
    }

    if (action.kind === "vip") {
      if (
        window.confirm(
          "This book requires a VIP Subscription. Would you like to view subscription plans?"
        )
      ) {
        navigate("/pricing");
      }
      return;
    }

    navigate(`/reader/${book._id}`);
  };

  if (!loading && books.length === 0 && hideWhenEmpty) return null;

  return (
    <section className="na-section">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
          <div className="min-w-0">
            <h2 className="na-heading mb-1">{title}</h2>
            {subtitle && <p className="na-subtext mb-0 small">{subtitle}</p>}
          </div>

          {!loading && books.length > 0 && (
            <div className="d-flex align-items-center gap-2 flex-shrink-0">
              {overflowing && (
                <>
                  <button
                    type="button"
                    className="na-arrow-btn na-nav-btn d-none d-md-flex"
                    aria-label="Scroll left"
                    onClick={() => scrollTrack(-1)}
                  >
                    <FaChevronLeft size={12} />
                  </button>
                  <button
                    type="button"
                    className="na-arrow-btn na-nav-btn d-none d-md-flex"
                    aria-label="Scroll right"
                    onClick={() => scrollTrack(1)}
                  >
                    <FaChevronRight size={12} />
                  </button>
                </>
              )}
              <button
                type="button"
                className="na-arrow-btn"
                title="View All"
                aria-label={`View all: ${title}`}
                onClick={() => navigate(viewAllTo)}
              >
                <FaArrowRight size={13} />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="na-scroll-track" aria-hidden="true">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div className="na-book-card na-skeleton" key={i}>
                <div className="na-poster-wrap" />
              </div>
            ))}
          </div>
        ) : books.length > 0 ? (
          <div className="na-scroll-track" ref={trackRef}>
            {books.map((book) => {
              const inWishlist = wishlistIds.has(book._id);
              const action = getBookAction(book, user, "Read Now");
              const badge = badgeFor(book);

              return (
                <div
                  className="na-book-card"
                  key={book._id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/book/${book._id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate(`/book/${book._id}`);
                  }}
                >
                  <div className="na-poster-wrap">
                    <img
                      src={getFileUrl(book.coverImage || book.image || book.imageUrl)}
                      alt={book.title || "Book Cover"}
                      className="na-poster-img"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = NO_COVER_IMAGE;
                      }}
                    />

                    {/* Always-visible label, so phones (which have no hover) can
                        still tell Free / VIP / paid books apart. */}
                    {badge && <span className="na-corner-badge">{badge}</span>}

                    {/* Desktop hover overlay */}
                    <div className="na-hover-overlay">
                      <div className="na-overlay-top">
                        {badge ? <span className="na-badge">{badge}</span> : <span />}

                        <button
                          type="button"
                          className="na-heart-btn"
                          aria-label={inWishlist ? "Remove from favorites" : "Add to favorites"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(book._id);
                          }}
                        >
                          {inWishlist ? (
                            <FaHeart color="#ff4757" size={13} />
                          ) : (
                            <FaRegHeart color="#ffffff" size={13} />
                          )}
                        </button>
                      </div>

                      <div className="na-overlay-bottom">
                        <h4 className="na-hover-title">{book.title}</h4>
                        <p className="na-hover-author">{book.author || "Unknown Author"}</p>

                        <div
                          className="d-flex flex-column gap-2 mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {action && (
                            <button
                              type="button"
                              className="na-hover-read-btn"
                              onClick={(e) => handleAction(e, book, action)}
                            >
                              {action.kind === "buy" ? (
                                <FaShoppingCart size={12} className="me-1" />
                              ) : (
                                <FaBookReader size={12} className="me-1" />
                              )}
                              {action.label}
                            </button>
                          )}

                          {(book.kindleUrl || book.amazonPrintUrl || book.flipkartPrintUrl) && (
                            <div className="d-flex gap-2 justify-content-center mt-1">
                              {book.kindleUrl && (
                                <a
                                  href={book.kindleUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="na-store-btn"
                                  title="Read on Kindle"
                                >
                                  <FaBookOpen size={11} />
                                </a>
                              )}
                              {book.amazonPrintUrl && (
                                <a
                                  href={book.amazonPrintUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="na-store-btn"
                                  title="Buy on Amazon"
                                >
                                  <FaAmazon size={11} />
                                </a>
                              )}
                              {book.flipkartPrintUrl && (
                                <a
                                  href={book.flipkartPrintUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="na-store-btn"
                                  title="Buy on Flipkart"
                                >
                                  <FaShoppingBag size={11} />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="na-subtext text-center py-4 mb-0">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

export default BookShelf;
