import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 20px",
      }}
    >
      <h1 style={{ fontSize: "4rem", marginBottom: 0, color: "#3E3239" }}>404</h1>
      <p style={{ fontSize: "1.1rem", color: "#555", marginBottom: "20px" }}>
        We couldn't find the page you were looking for.
      </p>
      <Link
        to="/"
        style={{
          padding: "10px 24px",
          borderRadius: "6px",
          background: "#3E3239",
          color: "#fff",
          textDecoration: "none",
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}

export default NotFound;
