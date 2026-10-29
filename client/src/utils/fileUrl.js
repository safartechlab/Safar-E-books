import API from "../api/axios";

// Turns a relative path the server returns (e.g. "/uploads/covers/x.jpg")
// into an absolute URL pointing at wherever the API actually lives —
// derived from VITE_API_URL instead of a hard-coded "localhost:5000",
// which would break as soon as this is deployed anywhere else.
export const getFileUrl = (relativePath) => {
  if (!relativePath) return NO_COVER_IMAGE;
  if (relativePath.startsWith("http")) return relativePath;

  const baseURL = API.defaults.baseURL
    ? API.defaults.baseURL.replace(/\/api\/?$/, "")
    : "http://localhost:5000";

  return `${baseURL}${relativePath.startsWith("/") ? "" : "/"}${relativePath}`;
};

// A small inline "no cover" placeholder, so book cards never depend on an
// external service (via.placeholder.com) that could be slow, blocked, or
// simply gone by the time this site is live.
export const NO_COVER_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
      <rect width="300" height="400" fill="#E8D2C4"/>
      <text x="50%" y="50%" font-family="sans-serif" font-size="18" fill="#9E8189" text-anchor="middle" dominant-baseline="middle">No Cover</text>
    </svg>`
  );
