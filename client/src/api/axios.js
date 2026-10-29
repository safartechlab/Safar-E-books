import axios from "axios";

const API = axios.create({
 
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:5000/api" : "/api"),
});


API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {

      const hadSession = !!localStorage.getItem("token");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (hadSession) {
        sessionStorage.setItem(
          "forcedLogoutMessage",
          error.response.data?.message || "You have been signed out. Please log in again."
        );
      }
      
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