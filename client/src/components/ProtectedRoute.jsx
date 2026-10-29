import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children, allowedRole }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  // Not logged in — same fix as the axios interceptor: there's no /login
  // page, login is a navbar popup, so send them home with a flag that
  // opens it, and remember where they were headed.
  if (!token || !user) {
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?login=1&redirect=${redirectTo}`} replace />;
  }

  // Wrong role
  if (user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;