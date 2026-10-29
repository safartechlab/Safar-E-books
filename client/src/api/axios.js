import axios from "axios";

const API = axios.create({
  // VITE_API_URL is set in client/.env (development) and client/.env.production.
  // If it is missing: a dev build talks to the local server, while a production
  // build uses "/api" on the same domain as the website (e.g. safarebooks.com/api).
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:5000/api" : "/api"),
});

// Attach the token to every request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server says the token is invalid/expired, log the user out
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Only treat it as a forced sign-out when we actually had a session
      const hadSession = !!localStorage.getItem("token");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (hadSession) {
        sessionStorage.setItem(
          "forcedLogoutMessage",
          error.response.data?.message || "You have been signed out. Please log in again."
        );
      }
      // There is no dedicated /login page — login is a popup on the
      // navbar. Redirecting to "/login" (which didn't exist) left users
      // on a blank/404 screen. Redirect home instead, with a flag the
      // navbar picks up on mount to open the login popup automatically.
      window.location.href = "/?login=1";
    }
      if (
      error.response &&
      error.response.status === 503 &&
      error.response.data?.maintenance &&
      window.location.pathname !== "/maintenance"
    ) {
      window.location.href = "/maintenance";
    }
    return Promise.reject(error);
  }
);

export default API;