import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children, allowedRole }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) {
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?login=1&redirect=${redirectTo}`} replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;