import { useEffect } from "react";
import API from "../api/axios";

const CHECK_EVERY_MS = 30000;

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
           
            if (!window.location.pathname.startsWith("/reader")) {
              window.location.reload();
            }
          }
        })
        .catch(() => {
      
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