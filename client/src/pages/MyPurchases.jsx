import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NO_COVER_IMAGE } from "../utils/fileUrl";
import API from "../api/axios";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { FaBookOpen, FaCrown } from "react-icons/fa";
import "../styles/MyPurchases.css";

const REFUND_WINDOW_DAYS = 7; // keep in sync with the Refund Policy page
const DAY_MS = 24 * 60 * 60 * 1000;

const REFUND_STATUS_LABEL = {
  pending: "Refund requested",
  processing: "Refund processing",
  approved: "Refund approved",
  rejected: "Refund rejected",
};

function MyPurchases() {
  const [orders, setOrders] = useState([]);
  const [refunds, setRefunds] = useState({}); // keyed by order id
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const [ordersRes, refundsRes] = await Promise.all([
        API.get("/payments/my-orders"),
        API.get("/refunds/my").catch(() => ({ data: { refunds: [] } })),
      ]);
      setOrders(ordersRes.data.orders || []);
      setRefunds(
        Object.fromEntries((refundsRes.data.refunds || []).map((r) => [String(r.order), r]))
      );
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (coverPath) => {
    if (!coverPath) return NO_COVER_IMAGE;
    if (coverPath.startsWith("http")) return coverPath;
    const baseURL = API.defaults.baseURL
      ? API.defaults.baseURL.replace(/\/api\/?$/, "")
      : "http://localhost:5000";
    return `${baseURL}${coverPath.startsWith("/") ? "" : "/"}${coverPath}`;
  };

  const statusBadge = (status) => {
    const classes = {
      paid: "status-badge status-paid",
      pending: "status-badge status-pending",
      failed: "status-badge status-failed",
      refunded: "status-badge status-refunded",
    };
    return <span className={classes[status] || "status-badge"}>{status}</span>;
  };

  // Same rule as the server: the window starts when access was granted.
  const refundDeadline = (order) =>
    new Date(new Date(order.accessGrantedAt || order.createdAt).getTime() + REFUND_WINDOW_DAYS * DAY_MS);

  const refundWindowOpen = (order) => Date.now() <= refundDeadline(order).getTime();

  // Only book purchases can be refunded from here (subscriptions are not refundable).
  const canRequestRefund = (order) =>
    order.type === "book" &&
    order.status === "paid" &&
    Boolean(order.razorpayPaymentId) &&
    !refunds[String(order._id)] &&
    refundWindowOpen(order);

  const renderRefundInfo = (order) => {
    const request = refunds[String(order._id)];
    const isBook = order.type === "book";

    // 1) Money has been returned
    if (order.status === "refunded" || order.refundedAmount > 0) {
      const full = order.status === "refunded";
      const accessRemoved = full && isBook && request?.accessRevoked !== false;
      return (
        <p className="refund-line refund-line-done">
          Refunded ₹{order.refundedAmount}
          {full ? "" : " (partial)"}
          {accessRemoved ? " · Access removed" : ""}
        </p>
      );
    }

    // 2) A request exists
    if (request) {
      return (
        <div className="refund-line">
          <span className={`refund-badge refund-${request.status}`}>
            {REFUND_STATUS_LABEL[request.status] || request.status}
          </span>
          {request.status === "rejected" && request.adminNote && (
            <span className="refund-note">{request.adminNote}</span>
          )}
        </div>
      );
    }

    // 3) Paid book with no request yet: show the deadline
    if (isBook && order.status === "paid") {
      if (refundWindowOpen(order)) {
        const until = refundDeadline(order).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        });
        return <p className="refund-hint">Refund available until {until}</p>;
      }
      return <p className="refund-hint refund-hint-closed">Refund window closed</p>;
    }

    return null;
  };

  const requestRefund = async (order) => {
    const { value } = await Swal.fire({
      title: "Request a refund",
      html: `
        <select id="rf-reason" class="swal2-select" style="width:90%">
          <option value="">Select a reason</option>
          <option value="duplicate_charge">I was charged more than once</option>
          <option value="no_access">Payment successful but I did not get access</option>
          <option value="wrong_amount">Amount charged differs from the price shown</option>
          <option value="defective_file">The book file is defective / cannot be opened</option>
          <option value="other">Other (required by law)</option>
        </select>
        <textarea id="rf-details" class="swal2-textarea" placeholder="Tell us what went wrong"></textarea>`,
      showCancelButton: true,
      confirmButtonText: "Send request",
      focusConfirm: false,
      preConfirm: () => {
        const reason = document.getElementById("rf-reason").value;
        const details = document.getElementById("rf-details").value.trim();
        if (!reason) {
          Swal.showValidationMessage("Please choose a reason");
          return false;
        }
        if (details.length < 10) {
          Swal.showValidationMessage("Please add a few details (at least 10 characters)");
          return false;
        }
        return { reason, details };
      },
    });
    if (!value) return;
    try {
      const res = await API.post("/refunds", { orderId: order._id, ...value });
      toast.success(res.data.message || "Refund request sent.");
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send your request.");
    }
  };

  const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : "");

  const subscriptionTitle = (order) => {
    const planLabel = capitalize(order.plan) || "Premium";
    const cycleLabel = order.billingCycle ? ` (${capitalize(order.billingCycle)})` : "";
    return `SAFAR EBOOKS ${planLabel} Subscription${cycleLabel}`;
  };

  return (
    <div className="my-purchases-page">
      <div className="purchases-inner-container">
        {/* Header */}
        <div className="purchases-header">
          <h1 className="purchases-title">🧾 My Purchases</h1>
          <p className="purchases-subtitle">Manage your book purchases and subscriptions.</p>
        </div>

        {loading ? (
          <div className="purchases-status-box">
            <p>Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="purchases-status-box">
            <h3>No purchases found</h3>
            <p>You haven't made any purchases or subscribed yet.</p>
            <button
              type="button"
              className="purchases-browse-btn"
              onClick={() => navigate("/library")}
            >
              Browse Library
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div className="order-card" key={order._id}>
                {order.type === "book" && order.book ? (
                  <img
                    src={getImageUrl(order.book.coverImage)}
                    alt={order.book.title}
                    className="order-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = NO_COVER_IMAGE;
                    }}
                  />
                ) : (
                  <div className="order-cover order-cover-subscription">
                    <FaCrown size={24} color="#d4a373" />
                  </div>
                )}

                <div className="order-details">
                  <h3 className="order-item-title">
                    {order.type === "subscription"
                      ? subscriptionTitle(order)
                      : order.book?.title || "Book (deleted)"}
                  </h3>
                  <p className="order-date">
                    {new Date(order.createdAt).toLocaleDateString()} &middot; ₹{order.amount}
                  </p>
                  {statusBadge(order.status)}
                  <p className="order-date" style={{ fontSize: 12, wordBreak: "break-all" }}>
                    Order ID: {order.razorpayOrderId}
                    {order.razorpayPaymentId && (
                      <>
                        <br />
                        Payment ID: {order.razorpayPaymentId}
                      </>
                    )}
                  </p>

                  {renderRefundInfo(order)}

                  {canRequestRefund(order) && (
                    <button
                      type="button"
                      className="order-refund-btn"
                      onClick={() => requestRefund(order)}
                    >
                      Request refund
                    </button>
                  )}
                </div>

                {order.type === "book" && order.status === "paid" && order.book && (
                  <button
                    type="button"
                    className="order-read-btn"
                    onClick={() => navigate(`/reader/${order.book._id}`)}
                  >
                    <FaBookOpen size={12} className="me-1" /> Read Now
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyPurchases;