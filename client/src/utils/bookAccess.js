// One place that answers: "what should the main button on this book say, and
// what should it do for THIS person?" Used by the Library page and by the
// home page book rows so they can never disagree.

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null") || null;
  } catch {
    return null;
  }
};

// "Buy once" book: not free, not part of the VIP subscription, has a price.
export const isPaidBook = (book) =>
  Boolean(book && !book.isFree && !book.isSubscriptionRequired && book.price > 0);

export const hasPurchasedBook = (user, book) =>
  Boolean(
    book?._id &&
      Array.isArray(user?.purchasedBooks) &&
      user.purchasedBooks.some((id) => String(id) === String(book._id))
  );

const hasActiveSubscription = (user) =>
  Boolean(
    user?.isSubscribed &&
      user?.subscriptionExpiry &&
      new Date(user.subscriptionExpiry) > new Date()
  );

// Returns null when the book has nothing to read/buy on this site (for
// example a book that is only sold through Kindle/Amazon/Flipkart links).
//
//   kind "buy"  -> paid book this person has not bought yet   -> "Buy Now"
//   kind "vip"  -> VIP book and no active subscription         -> "Unlock VIP"
//   kind "read" -> everything else (free, bought, subscribed, admin)
export const getBookAction = (book, user, readLabel = "Read eBook") => {
  if (!book) return null;

  // No PDF uploaded yet -> there is nothing to read or buy on this site
  // (this used to show a "Read" button that led to an error page).
  const hasFile =
    Boolean(book.pdfUrl) || (Array.isArray(book.editions) && book.editions.some((e) => e.pdfUrl));
  if (!hasFile) return null;

  if (user?.role === "admin") return { kind: "read", label: readLabel };

  if (isPaidBook(book) && !hasPurchasedBook(user, book)) {
    return { kind: "buy", label: "Buy Now" };
  }

  if (book.isSubscriptionRequired && !hasActiveSubscription(user)) {
    return { kind: "vip", label: "Unlock VIP" };
  }

  return { kind: "read", label: readLabel };
};

// There is no separate login page — login is a popup the navbar opens when it
// sees ?login=1. "redirect" is where to send the person after they sign in.
export const openLoginPopup = (navigate) => {
  const here = window.location.pathname + window.location.search;
  navigate(`${window.location.pathname}?login=1&redirect=${encodeURIComponent(here)}`);
};
