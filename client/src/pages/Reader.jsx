import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaChevronLeft,
  FaChevronRight,
  FaSun,
  FaMoon,
  FaBook,
  FaBookOpen,
  FaLock,
} from "react-icons/fa";
import { Document, Page, pdfjs } from "react-pdf";
import API from "../api/axios";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "../styles/Reader.css";

import { startPayment } from "../utils/payment";
import { toast } from "react-toastify";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const PREVIEW_PAGE_LIMIT = 20;

function toSpreadStart(page) {
  if (!page || page < 1) return 1;
  return page % 2 === 0 ? page - 1 : page;
}

function Reader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const containerRef = useRef(null);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reading needs an account. If someone opens a reader link while logged out,
  // send them to the login popup (and bring them back here afterwards).
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      toast.warning("Please login to read this book.");
      const here = window.location.pathname + window.location.search;
      navigate(`/?login=1&redirect=${encodeURIComponent(here)}`, { replace: true });
    }
  }, [navigate]);

  const SUBSCRIPTION_RECHECK_MS = 5 * 60 * 1000;
  useEffect(() => {
    if (!user?._id) return;

    const refreshUser = async () => {
      try {
        const res = await API.get(`/auth/users/${user._id}`);
        const freshUser = res.data.user;
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        }
      } catch (err) {}
    };

    refreshUser(); // check right away, not only after 5 minutes
    const interval = setInterval(refreshUser, SUBSCRIPTION_RECHECK_MS);
    return () => clearInterval(interval);
  }, [user?._id]);

  const [book, setBook] = useState(null);
  const [numPages, setNumPages] = useState(0);

  // Which language edition to open (from ?lang=). Falls back to the first
  // edition that has a PDF.
  const requestedLang = searchParams.get("lang");
  const bookEditions = book?.editions?.length ? book.editions : [];
  const activeLanguage =
    bookEditions.find(
      (e) => requestedLang && e.language.toLowerCase() === requestedLang.toLowerCase()
    )?.language ||
    bookEditions.find((e) => e.pdfUrl)?.language ||
    book?.language ||
    "";

  // Mobile mode switches by 1 page, Desktop by spread (2 pages)
  const [currentPage, setCurrentPage] = useState(() => {
    const p = Number(searchParams.get("page")) || 1;
    return window.innerWidth <= 768 ? Math.max(1, p) : toSpreadStart(p);
  });

  const [theme, setTheme] = useState("sepia");
  const [pageWidth, setPageWidth] = useState(360);
  const [pdfError, setPdfError] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [pageRatio, setPageRatio] = useState(0.72);
  const [turn, setTurn] = useState({ key: 0, dir: "next" });

  const isAdmin = user?.role === "admin";
  const hasActiveSubscription = Boolean(
    user?.isSubscribed &&
    user?.subscriptionExpiry &&
    new Date(user.subscriptionExpiry) > new Date()
  );
  const isSubscribed = Boolean(hasActiveSubscription || isAdmin);
  const hasPurchasedThisBook = Boolean(
    book?._id && user?.purchasedBooks?.some((bid) => bid.toString() === book._id.toString())
  );
  const requiresSubscription = Boolean(book?.isSubscriptionRequired);

  const isIndividuallyPaidBook = Boolean(
    book && !book.isFree && !book.isSubscriptionRequired && book.price > 0
  );
  // "Buy once" book this person hasn't bought: they can read a preview only.
  const needsPurchase = isIndividuallyPaidBook && !hasPurchasedThisBook && !isAdmin;

  // Preview mode (first 20 pages) applies to VIP books without a
  // subscription AND to paid books that haven't been bought yet. The server
  // enforces the same limit by only sending those pages.
  const isLocked =
    (requiresSubscription && !isSubscribed && !hasPurchasedThisBook) || needsPurchase;

  const effectiveMaxPage = isLocked
    ? Math.min(numPages || Infinity, PREVIEW_PAGE_LIMIT)
    : numPages;

  const saveReadingProgress = useCallback(
    (page) => {
      if (user?._id && id) {
        API.post("/reading-history", {
          bookId: id,
          language: activeLanguage,
          currentPage: page,
          totalPages: numPages,
        }).catch(console.error);
      }
    },
    [user?._id, id, numPages, activeLanguage]
  );

  const fetchBook = useCallback(async () => {
    try {
      const res = await API.get(`/books/${id}`);
      setBook(res.data.book || res.data);
      // Count one "read" per book per browser session (not on every refresh/retry).
      const readKey = `read-counted:${id}`;
      if (localStorage.getItem("token") && !sessionStorage.getItem(readKey)) {
        sessionStorage.setItem(readKey, "1");
        API.post(`/books/${id}/read`).catch(() => {});
      }
    } catch (err) {
      setPdfError("Failed to fetch book details.");
    }
  }, [id]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  // Responsive page width measurement
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      if (window.innerWidth <= 768) {
        // Mobile view: single page takes full available width with small margin
        const targetWidth = Math.min(containerWidth - 24, (containerHeight - 20) * pageRatio);
        setPageWidth(Math.floor(targetWidth));
      } else {
        // Desktop view: dual page spread
        const maxHeightWidth = (containerHeight - 30) * pageRatio;
        const maxWidthWidth = (containerWidth - 50) / 2;
        const calculatedWidth = Math.min(maxHeightWidth, maxWidthWidth);
        setPageWidth(Math.max(180, Math.min(Math.floor(calculatedWidth), 480)));
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pageRatio, isMobile]);

  const handlePageLoad = useCallback((page) => {
    if (!page?.width || !page?.height) return;
    const ratio = page.width / page.height;
    setPageRatio((prev) => (Math.abs(prev - ratio) > 0.01 ? ratio : prev));
  }, []);

  const getPdfUrl = (bookId, lang) => {
    const baseURL = API.defaults.baseURL
      ? API.defaults.baseURL.replace(/\/api\/?$/, "")
      : "http://localhost:5000";
    return `${baseURL}/api/books/${bookId}/pdf${lang ? `?lang=${encodeURIComponent(lang)}` : ""}`;
  };

  // Next page (Step = 1 on mobile, Step = 2 on desktop)
  const nextPage = useCallback(() => {
    const step = isMobile ? 1 : 2;
    const nextP = currentPage + step;

    if (nextP > effectiveMaxPage) {
      if (isLocked && currentPage < effectiveMaxPage) {
        setShowPaywall(true);
      }
      return;
    }
    setTurn((t) => ({ key: t.key + 1, dir: "next" }));
    setCurrentPage(nextP);
    saveReadingProgress(nextP);
  }, [currentPage, effectiveMaxPage, isLocked, isMobile, saveReadingProgress]);

  // Prev page (Step = 1 on mobile, Step = 2 on desktop)
  const prevPage = useCallback(() => {
    const step = isMobile ? 1 : 2;
    if (currentPage - step < 1) return;
    const prevP = currentPage - step;
    setTurn((t) => ({ key: t.key + 1, dir: "prev" }));
    setCurrentPage(prevP);
    saveReadingProgress(prevP);
  }, [currentPage, isMobile, saveReadingProgress]);

  useEffect(() => {
    if (isLocked && currentPage > effectiveMaxPage) {
      setCurrentPage(isMobile ? effectiveMaxPage : (effectiveMaxPage % 2 === 0 ? effectiveMaxPage - 1 : effectiveMaxPage));
      setShowPaywall(true);
    }
  }, [isLocked, effectiveMaxPage, currentPage, isMobile]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") nextPage();
      if (e.key === "ArrowLeft") prevPage();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nextPage, prevPage]);

  if (!book) {
    return (
      <div className="reader-loading-container position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center gap-3">
        <div className="loading-book">
          <FaBookOpen />
        </div>
        <h2>Opening your book…</h2>
      </div>
    );
  }

  const pdfUrl = getPdfUrl(book._id, activeLanguage);
  const isFirstSpread = currentPage <= 1;
  const isLastSpread = isMobile ? currentPage >= effectiveMaxPage : currentPage + 1 >= effectiveMaxPage;
  const rightPageAllowed = !isMobile && currentPage + 1 <= effectiveMaxPage;

  return (
    <div className={`book-reader-wrapper d-flex flex-column theme-${theme}`}>
      {/* 1. TOP HEADER (Back Button + Book Title + Desktop Controls) */}
      <header className="reader-top-header d-flex align-items-center justify-content-between px-3 px-md-4">
        {/* Left: Back Button & Title */}
        <div className="d-flex align-items-center gap-2 gap-md-3 text-truncate">
          <button
            className="reader-back-btn d-flex align-items-center justify-content-center rounded-circle"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <FaArrowLeft size={13} />
          </button>
          <div className="reader-header-book-meta text-truncate">
            <span className="reader-header-title text-truncate d-block">{book.title}</span>
            <span className="reader-header-author text-truncate d-block">by {book.author}</span>
          </div>
        </div>

        {/* Center: Desktop Navigation & Page Indicator */}
        <div className="d-none d-md-flex align-items-center gap-2">
          <button
            className="reader-header-nav-btn"
            disabled={isFirstSpread}
            onClick={prevPage}
            title="Previous Page"
          >
            <FaChevronLeft size={12} />
          </button>

          {isLocked ? (
            <div className="reader-preview-chip d-flex align-items-center gap-2 rounded-pill px-3 py-1">
              <FaLock size={11} />
              <span>
                Preview: {Math.min(currentPage + 1, effectiveMaxPage)} of {effectiveMaxPage || PREVIEW_PAGE_LIMIT}
              </span>
            </div>
          ) : (
            <div className="reader-progress-chip d-flex align-items-center gap-2 rounded-pill px-3 py-1">
              <FaBookOpen size={12} />
              <span>
                {currentPage}–{Math.min(currentPage + 1, numPages)} of {numPages}
              </span>
            </div>
          )}

          <button
            className="reader-header-nav-btn"
            disabled={isLastSpread}
            onClick={nextPage}
            title="Next Page"
          >
            <FaChevronRight size={12} />
          </button>
        </div>

        {/* Right: Theme Toggle Buttons */}
        <div className="theme-toggle-group d-flex align-items-center overflow-hidden rounded-pill">
          <button
            className={`d-flex px-2 px-md-3 py-1 ${theme === "light" ? "active" : ""}`}
            onClick={() => setTheme("light")}
            title="Light Theme"
          >
            <FaSun size={13} />
          </button>
          <button
            className={`d-flex px-2 px-md-3 py-1 ${theme === "sepia" ? "active" : ""}`}
            onClick={() => setTheme("sepia")}
            title="Sepia Theme"
          >
            <FaBook size={13} />
          </button>
          <button
            className={`d-flex px-2 px-md-3 py-1 ${theme === "dark" ? "active" : ""}`}
            onClick={() => setTheme("dark")}
            title="Dark Theme"
          >
            <FaMoon size={13} />
          </button>
        </div>
      </header>

      {/* 2. MAIN READING DESK CANVAS */}
      <main
        className={`reading-desk-canvas position-relative flex-fill d-flex justify-content-center align-items-center overflow-hidden theme-${theme}`}
        ref={containerRef}
      >
        {pdfError ? (
          <div className="reader-error-box text-center rounded-3 p-4">
            <h2>This page won't turn</h2>
            <p>{pdfError}</p>
            <button
              className="retry-btn rounded-pill fw-semibold border-0 px-4 py-2"
              onClick={fetchBook}
            >
              Try again
            </button>
          </div>
        ) : (
          <Document
            // Different key for preview vs full book, so right after a
            // purchase the file is downloaded again (now the whole book).
            key={`${isLocked ? "preview" : "full"}-${activeLanguage}`}
            file={{
              url: pdfUrl,
              httpHeaders: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            }}
            loading={
              <div className="pdf-inline-loading d-flex flex-column align-items-center gap-2">
                <div className="loading-book">
                  <FaBookOpen />
                </div>
                <span>Loading page…</span>
              </div>
            }
            onLoadSuccess={({ numPages: total }) => {
              setNumPages(total);
              const cap = isLocked ? Math.min(total, PREVIEW_PAGE_LIMIT) : total;

              setCurrentPage((cur) => {
                if (cur <= cap) return cur;
                return isMobile ? Math.max(1, cap) : toSpreadStart(Math.max(1, cap));
              });
            }}
            onLoadError={(err) => {
              setPdfError(err.message);
            }}
          >
            <div
              className="book-container position-relative d-flex justify-content-center align-items-center"
              style={{ maxHeight: "100%", maxWidth: "100%" }}
            >
              <div className="book-shadow position-absolute"></div>

              <div
                className={`book-spread position-relative d-flex align-items-stretch turn-${turn.dir} ${
                  isMobile ? "mobile-single-page" : ""
                }`}
                key={turn.key}
                style={{ zIndex: 2, maxHeight: "100%" }}
              >
                {/* Single Page on Mobile / Left Page on Desktop */}
                <button
                  type="button"
                  className="book-page left-page position-relative d-flex justify-content-center align-items-center overflow-hidden"
                  onClick={prevPage}
                  disabled={isFirstSpread}
                  aria-label="Previous page"
                >
                  {currentPage <= effectiveMaxPage && (
                    <Page
                      pageNumber={currentPage}
                      width={pageWidth}
                      onLoadSuccess={handlePageLoad}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                    />
                  )}
                  {!isFirstSpread && !isMobile && (
                    <span className="turn-hint turn-hint-left position-absolute d-flex align-items-center justify-content-center rounded-circle">
                      <FaChevronLeft />
                    </span>
                  )}
                </button>

                {/* Spine is hidden on mobile */}
                {!isMobile && <div className="book-spine flex-shrink-0 position-relative"></div>}

                {/* Right Page is hidden on mobile */}
                {!isMobile && (
                  <button
                    type="button"
                    className="book-page right-page position-relative d-flex justify-content-center align-items-center overflow-hidden"
                    onClick={nextPage}
                    disabled={isLastSpread}
                    aria-label="Next page"
                  >
                    {rightPageAllowed && currentPage + 1 <= numPages && (
                      <Page
                        pageNumber={currentPage + 1}
                        width={pageWidth}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                      />
                    )}
                    {!isLastSpread && (
                      <span className="turn-hint turn-hint-right position-absolute d-flex align-items-center justify-content-center rounded-circle">
                        <FaChevronRight />
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </Document>
        )}

        {/* 3. MOBILE FLOATING PILL TOOLBAR (Screenshot 2 Match) */}
        <div className="mobile-reader-floating-pill d-flex d-md-none align-items-center justify-content-between">
          <button
            type="button"
            className="mobile-pill-btn"
            disabled={isFirstSpread}
            onClick={prevPage}
          >
            <FaChevronLeft size={13} />
          </button>

          <span className="mobile-pill-counter">
            {currentPage} / {numPages || 1}
          </span>

          <button
            type="button"
            className="mobile-pill-btn"
            disabled={isLastSpread}
            onClick={nextPage}
          >
            <FaChevronRight size={13} />
          </button>
        </div>

        {/* Paywall Overlay */}
        {showPaywall && (
          <div className="paywall-overlay position-absolute d-flex align-items-center justify-content-center">
            <div className="paywall-card text-center rounded-4 p-4">
              <div className="paywall-icon">
                <FaLock size={26} />
              </div>
              <h3>You&rsquo;ve reached the end of the preview</h3>
              {needsPurchase ? (
                <p>
                  Buy &ldquo;{book.title}&rdquo; for ₹{book.price} to keep reading the full book.
                </p>
              ) : (
                <p>
                  Subscribe to keep reading &ldquo;{book.title}&rdquo; and unlock the full
                  SAFAR EBOOKS library.
                </p>
              )}
              <div className="d-flex gap-2 justify-content-center mt-3">
                <button
                  className="btn-subscribe rounded-pill fw-bold px-4 py-2 border-0"
                  onClick={() => {
                    if (!needsPurchase) {
                      navigate("/pricing");
                      return;
                    }
                    startPayment({
                      type: "book",
                      bookId: book._id,
                      onSuccess: () => {
                        // startPayment already saved the refreshed user
                        setUser(JSON.parse(localStorage.getItem("user") || "null"));
                        setShowPaywall(false);
                      },
                    });
                  }}
                >
                  {needsPurchase ? `Buy Now — ₹${book.price}` : "View Plans"}
                </button>
                <button
                  className="btn-dismiss rounded-pill fw-semibold px-4 py-2 border-0"
                  onClick={() => setShowPaywall(false)}
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Reader;