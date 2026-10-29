import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Row, Col, Button, Badge } from "react-bootstrap";
import API from "../../api/axios";
import "../../styles/UserDetails.css";

function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await API.get(`/auth/users/${id}`);
      setUser(res.data.user);
    } catch (err) {
    }
  };

  if (!user) return <h2 className="text-center mt-5">Loading...</h2>;

  const rows = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Role", value: user.role },
    { label: "Joined On", value: new Date(user.createdAt).toLocaleDateString() },
  ];

  return (
    <Card className="border-0 shadow-sm rounded-4 p-4 mx-auto my-4" style={{ maxWidth: 900 }}>
      <h1 className="fs-2 mb-4 pb-2 border-bottom user-details-heading">User Details</h1>

      <Row className="align-items-center g-4 text-center text-md-start">
        <Col md={4} className="d-flex justify-content-center justify-content-md-start">
          <div className="user-avatar rounded-circle d-flex align-items-center justify-content-center">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </Col>

        <Col md={8} className="d-flex flex-column gap-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-1 gap-sm-0 bg-light rounded-3 px-3 py-2"
            >
              <span className="fw-semibold user-details-heading">{row.label}</span>
              <span className="text-secondary">{row.value}</span>
            </div>
          ))}

          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-1 gap-sm-0 bg-light rounded-3 px-3 py-2">
            <span className="fw-semibold user-details-heading">Status</span>
            <Badge bg={user.status === "active" ? "success" : "danger"} className="rounded-pill px-3 py-2 align-self-start align-self-sm-auto">
              {user.status}
            </Badge>
          </div>
        </Col>
      </Row>

      <Button className="mt-4 w-100 w-sm-auto align-self-start user-details-back-btn" onClick={() => navigate(-1)}>
        ← Back
      </Button>
    </Card>
  );
}

export default UserDetails;