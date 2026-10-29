import API from "../api/axios";

export const getFileUrl = (relativePath) => {
  if (!relativePath) return NO_COVER_IMAGE;
  if (relativePath.startsWith("http")) return relativePath;

  const baseURL = API.defaults.baseURL
    ? API.defaults.baseURL.replace(/\/api\/?$/, "")
    : "http://localhost:5000";

  return `${baseURL}${relativePath.startsWith("/") ? "" : "/"}${relativePath}`;
};

export const NO_COVER_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
      <rect width="300" height="400" fill="#E8D2C4"/>
      <text x="50%" y="50%" font-family="sans-serif" font-size="18" fill="#9E8189" text-anchor="middle" dominant-baseline="middle">No Cover</text>
    </svg>`
  );
