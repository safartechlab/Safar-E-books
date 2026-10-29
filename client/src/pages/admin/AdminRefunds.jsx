import { useEffect, useState, useCallback } from "react";
import { Container, Table, Button, Badge, ButtonGroup, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../../api/axios";

const REASONS = {
  duplicate_charge: "Charged more than once",
  no_access: "Paid but no access",
  wrong_amount: "Wrong amount charged",
  defective_file: "Defective / unreadable file",
  technical_fault: "Technical fault",
  other: "Other",
};
const VARIANT = { pending: "warning", processing: "info", approved: "success", rejected: "secondary" };
const FILTERS = ["pending", "processing", "approved", "rejected", "all"];

const DAY_MS = 24 * 60 * 60 * 1000;
const ACK_BUSINESS_DAYS = 2;

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const itemName = (o = {}) =>
  o.type === "book"
    ? o.book?.title || "Book (deleted)"
    : `${o.plan ? o.plan[0].toUpperCase() + o.plan.slice(1) : "Premium"} subscription${o.billingCycle ? ` (${o.billingCycle})` : ""}`;

const addBusinessDays = (start, days) => {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
};

const waitingBadge = (r) => {
  if (r.status !== "pending") return null;
  const created = new Date(r.createdAt);
  const days = Math.floor((Date.now() - created.getTime()) / DAY_MS);
  const overdue = Date.now() > addBusinessDays(created, ACK_BUSINESS_DAYS).getTime();
  return overdue ? (
    <Badge bg="danger" className="mt-1">Overdue · {days}d</Badge>
  ) : (
    <Badge bg="light" text="dark" className="mt-1 border">
      {days === 0 ? "New today" : `Waiting ${days}d`}
    </Badge>
  );
};

const readingCell = (r) => {
  if (r.order?.type !== "book") return <span className="text-muted">—</span>;
  if (!r.reading) return <Badge bg="success">Not opened</Badge>;
  const pct = Math.min(100, Math.max(0, Math.round(Number(r.reading.percentage) || 0)));
  const heavy = pct >= 50;
  return (
    <>
      <Badge bg={heavy ? "danger" : "warning"} text={heavy ? undefined : "dark"}>
        {pct}% read
      </Badge>
      <div className="small text-muted">
        Page {r.reading.currentPage} of {r.reading.totalPages}
      </div>
    </>
  );
};

function AdminRefunds() {
  const [requests, setRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/refunds/admin", {
        params: filter === "all" ? {} : { status: filter },
      });
      setRequests(res.data.requests || []);
      setPendingCount(res.data.pendingCount || 0);
    } catch {
      toast.error("Could not load refund requests");
    } finally {
      setLoading(false);
      window.dispatchEvent(new Event("refund-count-changed"));
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (r) => {
    const o = r.order || {};
    const maxRefundable = Math.max(0, Math.round(((o.amount || 0) - (o.refundedAmount || 0)) * 100) / 100);
    const { value } = await Swal.fire({
      title: "Approve refund",
      html: `
        <p style="margin:0 0 8px">${esc(itemName(o))} — ${esc(r.user?.email)}</p>
        <label>Refund amount (₹, max ${maxRefundable})</label>
        <input id="rf-amount" class="swal2-input" type="number" min="0.01" max="${maxRefundable}" step="0.01" value="${maxRefundable}">
        <label style="display:block;margin-top:8px">
          <input id="rf-revoke" type="checkbox" checked> Also remove the customer's access (full refunds only)
        </label>
        <textarea id="rf-note" class="swal2-textarea" placeholder="Note for the customer (optional)"></textarea>`,
      showCancelButton: true,
      confirmButtonText: "Send refund",
      focusConfirm: false,
      preConfirm: () => {
        const amount = Number(document.getElementById("rf-amount").value);
        if (!(amount > 0) || amount > maxRefundable) {
          Swal.showValidationMessage(`Enter an amount up to ₹${maxRefundable}`);
          return false;
        }
        return {
          amount,
          revokeAccess: document.getElementById("rf-revoke").checked,
          adminNote: document.getElementById("rf-note").value.trim(),
        };
      },
    });
    if (!value) return;
    try {
      const res = await API.patch(`/refunds/admin/${r._id}/approve`, value);
      toast.success(res.data.message);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Refund failed");
      load();
    }
  };

  const reject = async (r) => {
    const { value } = await Swal.fire({
      title: "Reject this request?",
      input: "textarea",
      inputLabel: "Reason (the customer will receive this by email)",
      showCancelButton: true,
      confirmButtonText: "Reject",
      confirmButtonColor: "#b42318",
      inputValidator: (v) => (!v || v.trim().length < 5 ? "Please write at least 5 characters" : undefined),
    });
    if (!value) return;
    try {
      const res = await API.patch(`/refunds/admin/${r._id}/reject`, { adminNote: value });
      toast.success(res.data.message);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not reject");
    }
  };

  return (
    <Container fluid className="py-4">
      <h2 className="mb-1">Refund Requests</h2>
      <p className="text-muted small mb-3">
        The “Reading” column shows how much of the book the customer has opened. Opened or read
        books are generally not refundable (see Refund Policy, Section 6).
      </p>

      <ButtonGroup className="mb-3">
        {FILTERS.map((s) => (
          <Button key={s} variant={filter === s ? "dark" : "outline-dark"} onClick={() => setFilter(s)}>
            {s[0].toUpperCase() + s.slice(1)}
            {s === "pending" && pendingCount > 0 && (
              <Badge bg="danger" pill className="ms-2">
                {pendingCount}
              </Badge>
            )}
          </Button>
        ))}
      </ButtonGroup>

      {loading ? (
        <Spinner animation="border" />
      ) : (
        <div className="table-responsive">
          <Table bordered hover className="align-middle">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Item</th>
                <th>Paid</th>
                <th>Reading</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-4">No requests.</td>
                </tr>
              )}
              {requests.map((r) => (
                <tr key={r._id}>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    {r.user?.name}
                    <br />
                    <small className="text-muted">{r.user?.email}</small>
                  </td>
                  <td>{itemName(r.order)}</td>
                  <td>
                    ₹{r.order?.amount}
                    {r.order?.refundedAmount > 0 && (
                      <>
                        <br />
                        <small className="text-muted">refunded ₹{r.order.refundedAmount}</small>
                      </>
                    )}
                  </td>
                  <td>{readingCell(r)}</td>
                  <td style={{ maxWidth: 280 }}>
                    <strong>{REASONS[r.reason] || r.reason}</strong>
                    <br />
                    <small>{r.details}</small>
                    {r.adminNote && (
                      <>
                        <br />
                        <small className="text-muted">Admin note: {r.adminNote}</small>
                      </>
                    )}
                  </td>
                  <td>
                    <Badge bg={VARIANT[r.status] || "secondary"}>{r.status}</Badge>
                    {r.status === "pending" && <div>{waitingBadge(r)}</div>}
                    {r.status === "approved" && (
                      <div className="small text-muted">
                        ₹{r.refundAmount}
                        {r.accessRevoked ? " · access removed" : ""}
                      </div>
                    )}
                  </td>
                  <td>
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" variant="success" className="me-1 mb-1" onClick={() => approve(r)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline-danger" className="mb-1" onClick={() => reject(r)}>
                          Reject
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Container>
  );
}

export default AdminRefunds;