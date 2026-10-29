import Navbar from "../../components/Navbar";

function UserDashboard() {
  return (
    <>
      <Navbar />

      <div
        style={{
          padding: "40px",
          background: "#FBF7F3",
          minHeight: "100vh",
        }}
      >
        <h1>Welcome to SAFAR EBOOKS </h1>

        <p>
          Continue reading your favourite books.
        </p>
      </div>
    </>
  );
}

export default UserDashboard;