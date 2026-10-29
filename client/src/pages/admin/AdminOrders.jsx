import { useEffect, useState, useCallback } from "react";
import { Table, Form, Button, Modal, Badge } from "react-bootstrap";
import { FaChartLine } from "react-icons/fa";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import API from "../../api/axios";
import RevenueAnalytics from "../../components/RevenueAnalytics";
import Pagination from "../../components/Pagination";
import "../../styles/AdminOrders.css";

const PAGE_SIZE = 10;

const TABS = [
  { key: "", label: "All" },
  { key: "review", label: "Needs review" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
  { key: "refunded", label: "Refunded" },
  { key: "paid", label: "Paid" },
];

const STATUS_BG = { paid: "success", pending: "warning", failed: "danger", refunded: "secondary" };

const money = (n) =>
  `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const itemLabel = (o) =>
  o.type === "book"
    ? o.book?.title || "Book deleted"
    : `Subscription · ${o.plan || "-"} (${o.billingCycle || "-"})`;

const toYMD = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function AdminOrders() {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await API.get("/payments/admin/summary");
      setSummary(res.data.summary);
    } catch (e) {
    
    }
  }, []);

  const fetchOrders = useCallback(
    async (pageToLoad) => {
      setLoading(true);
      try {
        const res = await API.get("/payments/admin/orders", {
          params: {
            page: pageToLoad,
            limit: PAGE_SIZE,
            status: tab || undefined,
            type: type || undefined,
            search: search || undefined,
            from: from || undefined,
            to: to || undefined,
          },
        });
        setOrders(res.data.orders || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.totalCount || 0);
        setPage(res.data.currentPage || 1);
      } catch (e) {
        toast.error(e.response?.data?.message || "Failed to load orders.");
      } finally {
        setLoading(false);
      }
    },
    [tab, type, search, from, to]
  );

  useEffect(() => {
    const t = setTimeout(() => fetchOrders(1), search ? 350 : 0);
    return () => clearTimeout(t);
  }, [tab, type, search, from, to]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleMarkReviewed = async (order) => {
    const result = await Swal.fire({
      title: "Mark as reviewed?",
      text: "Add a short note about what you did (optional).",
      input: "textarea",
      inputPlaceholder: "e.g. Refunded manually, access revoked",
      inputAttributes: { maxlength: 500 },
      showCancelButton: true,
      confirmButtonText: "Mark reviewed",
      confirmButtonColor: "#5D4857",
    });
    if (!result.isConfirmed) return;

    try {
      await API.patch(`/payments/admin/orders/${order._id}/review`, {
        note: result.value || "",
      });
      toast.success("Marked as reviewed.");
      setSelected(null);
      fetchOrders(page);
      fetchSummary();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update order.");
    }
  };

  const applyPreset = (key) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (key === "month") {
      setFrom(toYMD(new Date(y, m, 1)));
      setTo(toYMD(now));
    } else if (key === "lastMonth") {
      setFrom(toYMD(new Date(y, m - 1, 1)));
      setTo(toYMD(new Date(y, m, 0)));
    } else if (key === "30") {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      setFrom(toYMD(start));
      setTo(toYMD(now));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await API.get("/payments/admin/orders/export", {
        params: {
          status: tab || undefined,
          type: type || undefined,
          search: search || undefined,
          from: from || undefined,
          to: to || undefined,
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: "text/csv;charset=utf-8;" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders_${from || "all"}_to_${to || toYMD(new Date())}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    } catch (e) {
     
      let msg = "Export failed.";
      try {
        const text = await e.response?.data?.text?.();
        const parsed = JSON.parse(text);
        if (parsed?.message) msg = parsed.message;
      } catch (_) {}
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  };

  const cards = summary
    ? [
        { label: "Net revenue", value: money(summary.netRevenue), tone: "" },
        { label: "Needs review", value: summary.needsReview, tone: summary.needsReview ? "alert" : "", tab: "review" },
        { label: "Pending", value: summary.pending, tone: "", tab: "pending" },
        { label: "Failed", value: summary.failed, tone: "", tab: "failed" },
        { label: "Refunded", value: `${summary.refundedCount} · ${money(summary.refundedAmount)}`, tone: "", tab: "refunded" },
      ]
    : [];

  return (
    <div className="admin-orders-bg p-4" style={{ minHeight: "100vh" }}>
      {/* Header with Analytics toggle */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="admin-orders-heading fs-2 mb-0">
            {showAnalytics ? "Revenue Analytics" : "Orders & Payments"}
          </h1>
          <p className="text-muted mb-0">
            {showAnalytics
              ? "Net of refunds, by payment date (IST)"
              : `${totalCount} order${totalCount === 1 ? "" : "s"} match this view`}
          </p>
        </div>

        <Button
          variant={showAnalytics ? "outline-secondary" : "dark"}
          onClick={() => setShowAnalytics((v) => !v)}
        >
          {showAnalytics ? (
            "← Back to orders"
          ) : (
            <>
              <FaChartLine className="me-2" />
              Analytics
            </>
          )}
        </Button>
      </div>

      {showAnalytics ? (
        <RevenueAnalytics />
      ) : (
        <>
          {/* Summary cards */}
          <div className="admin-orders-cards mb-4">
            {cards.map((c) => (
              <button
                key={c.label}
                type="button"
                className={`admin-orders-card ${c.tone}`}
                onClick={() => c.tab && setTab(c.tab)}
                disabled={!c.tab}
              >
                <span className="admin-orders-card-label">{c.label}</span>
                <span className="admin-orders-card-value">{c.value}</span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
            <div className="d-flex gap-2 flex-wrap">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`admin-orders-tab ${tab === t.key ? "active" : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  {t.key === "review" && summary?.needsReview > 0 && (
                    <Badge pill bg="danger" className="ms-2">{summary.needsReview}</Badge>
                  )}
                </button>
              ))}
            </div>

            <div className="d-flex gap-2 flex-wrap">
              <Form.Control
                type="text"
                placeholder="Name, email or Razorpay ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 240 }}
              />
              <Form.Select value={type} onChange={(e) => setType(e.target.value)} style={{ width: 150 }}>
                <option value="">All types</option>
                <option value="book">Book</option>
                <option value="subscription">Subscription</option>
              </Form.Select>
            </div>
          </div>

          {/* Date range + export */}
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-3">
            <div className="d-flex gap-2 flex-wrap align-items-end">
              <div>
                <label className="small text-muted d-block">From</label>
                <Form.Control
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="small text-muted d-block">To</label>
                <Form.Control
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <Button size="sm" variant="outline-secondary" onClick={() => applyPreset("30")}>Last 30 days</Button>
              <Button size="sm" variant="outline-secondary" onClick={() => applyPreset("month")}>This month</Button>
              <Button size="sm" variant="outline-secondary" onClick={() => applyPreset("lastMonth")}>Last month</Button>
              {(from || to) && (
                <Button size="sm" variant="link" onClick={() => { setFrom(""); setTo(""); }}>
                  Clear dates
                </Button>
              )}
            </div>

            <Button
              variant="dark"
              onClick={handleExport}
              disabled={exporting || totalCount === 0}
            >
              {exporting ? "Exporting..." : `Export CSV (${totalCount})`}
            </Button>
          </div>

          {/* Table */}
          <div className="table-responsive rounded-3 shadow-sm">
            <Table hover className="align-middle mb-0 bg-white">
              <thead className="admin-orders-thead">
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-4">Loading orders...</td></tr>
                ) : orders.length > 0 ? (
                  orders.map((o) => (
                    <tr key={o._id}>
                      <td className="text-nowrap">
                        {new Date(o.createdAt).toLocaleDateString()}
                        <div className="text-muted small">
                          {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold">{o.user?.name || "Deleted user"}</div>
                        <div className="text-muted small">{o.user?.email || ""}</div>
                      </td>
                      <td style={{ maxWidth: 200 }} className="text-truncate">{itemLabel(o)}</td>
                      <td className="text-nowrap">
                        {money(o.amount)}
                        {o.refundedAmount > 0 && (
                          <div className="text-danger small">−{money(o.refundedAmount)} refunded</div>
                        )}
                      </td>
                      <td>
                        <Badge bg={STATUS_BG[o.status] || "secondary"} className="text-capitalize">{o.status}</Badge>
                        {o.needsReview && <Badge bg="danger" className="ms-1">Review</Badge>}
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <span className="admin-orders-note">
                          {o.needsReview ? o.reviewReason : o.failureReason || ""}
                        </span>
                      </td>
                      <td className="text-nowrap">
                        <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => setSelected(o)}>
                          Details
                        </Button>
                        {o.needsReview && (
                          <Button size="sm" variant="success" onClick={() => handleMarkReviewed(o)}>
                            Mark reviewed
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="7" className="text-center py-4">No orders found.</td></tr>
                )}
              </tbody>
            </Table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onChange={fetchOrders}
          />
        </>
      )}

      {/* Details modal */}
      <Modal show={!!selected} onHide={() => setSelected(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5">Order details</Modal.Title>
        </Modal.Header>
        {selected && (
          <Modal.Body>
            <dl className="admin-orders-dl">
              <dt>Customer</dt>
              <dd>{selected.user?.name || "Deleted user"} ({selected.user?.email || "-"})</dd>
              <dt>Item</dt>
              <dd>{itemLabel(selected)}</dd>
              <dt>Amount</dt>
              <dd>{money(selected.amount)} {selected.currency}</dd>
              <dt>Status</dt>
              <dd className="text-capitalize">{selected.status}</dd>
              <dt>Access granted</dt>
              <dd>{selected.accessGrantedAt ? new Date(selected.accessGrantedAt).toLocaleString() : "No"}</dd>
              <dt>Razorpay order</dt>
              <dd className="text-break">{selected.razorpayOrderId}</dd>
              <dt>Razorpay payment</dt>
              <dd className="text-break">{selected.razorpayPaymentId || "-"}</dd>
              {selected.failureReason && (<><dt>Failure reason</dt><dd>{selected.failureReason}</dd></>)}
              {selected.refundedAmount > 0 && (
                <>
                  <dt>Refunded</dt>
                  <dd>{money(selected.refundedAmount)} on {selected.refundedAt ? new Date(selected.refundedAt).toLocaleString() : "-"}</dd>
                </>
              )}
              {selected.needsReview && (<><dt>Needs review</dt><dd>{selected.reviewReason}</dd></>)}
              {selected.reviewedAt && (
                <>
                  <dt>Reviewed</dt>
                  <dd>{new Date(selected.reviewedAt).toLocaleString()}{selected.reviewNote ? ` — ${selected.reviewNote}` : ""}</dd>
                </>
              )}
            </dl>
          </Modal.Body>
        )}
        <Modal.Footer>
          {selected?.needsReview && (
            <Button variant="success" onClick={() => handleMarkReviewed(selected)}>Mark reviewed</Button>
          )}
          <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default AdminOrders;