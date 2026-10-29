import { useEffect } from "react";
import API from "../api/axios";

// How often a logged-in tab re-checks its session (milliseconds)
const CHECK_EVERY_MS = 30000;

// 1) Device limit: if this session was removed on the server, the 401
//    interceptor in api/axios.js signs the user out automatically.
// 2) Refunds: if the list of purchased books changed on the server (for
//    example admin refunded a book), update this browser's saved user and
//    reload, so the book shows "Buy Now" / preview only everywhere.
function SessionGuard() {
  useEffect(() => {
    const ids = (a) => (a || []).map(String).sort().join(",");

    const check = () => {
      if (!localStorage.getItem("token")) return;
      if (document.visibilityState === "hidden") return;

      API.get("/auth/session")
        .then(({ data }) => {
          const fresh = data?.user;
          const raw = localStorage.getItem("user");
          if (!fresh || !raw) return;

          const cached = JSON.parse(raw);
          const booksChanged = ids(cached.purchasedBooks) !== ids(fresh.purchasedBooks);
          const subChanged =
            Boolean(cached.isSubscribed) !== Boolean(fresh.isSubscribed) ||
            String(cached.subscriptionExpiry || "") !== String(fresh.subscriptionExpiry || "") ||
            String(cached.subscriptionPlan || "") !== String(fresh.subscriptionPlan || "");

          if (booksChanged || subChanged) {
            localStorage.setItem(
              "user",
              JSON.stringify({
                ...cached,
                purchasedBooks: fresh.purchasedBooks,
                isSubscribed: fresh.isSubscribed,
                subscriptionExpiry: fresh.subscriptionExpiry,
                subscriptionPlan: fresh.subscriptionPlan,
                subscriptionCycle: fresh.subscriptionCycle,
              })
            );
            // Do not yank the page away while someone is in the middle of a
            // book. The Reader refreshes its own copy; everywhere else we reload.
            if (!window.location.pathname.startsWith("/reader")) {
              window.location.reload();
            }
          }
        })
        .catch(() => {
          /* 401 is handled by the axios interceptor; other errors are ignored */
        });
    };

    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  return null;
}

export default SessionGuard;