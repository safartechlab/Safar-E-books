export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null") || null;
  } catch {
    return null;
  }
};

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

export const getBookAction = (book, user, readLabel = "Read eBook") => {
  if (!book) return null;

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

export const openLoginPopup = (navigate) => {
  const here = window.location.pathname + window.location.search;
  navigate(`${window.location.pathname}?login=1&redirect=${encodeURIComponent(here)}`);
};
