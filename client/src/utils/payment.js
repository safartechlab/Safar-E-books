import API from "../api/axios";
import { toast } from "react-toastify";

export async function startPayment({ type, bookId, plan, billingCycle, onSuccess }) {
  try {
    const { data } = await API.post("/payments/create-order", {
      type,
      bookId,
      plan,
      billingCycle,
    });

    const user = JSON.parse(localStorage.getItem("user"));

    const options = {
      key: data.razorpayKeyId,
      amount: data.amount,
      currency: data.currency,
      name: "SAFAR EBOOKS",
      description:
        type === "subscription"
          ? `SAFAR EBOOKS ${plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Premium"} Subscription (${billingCycle || "monthly"})`
          : "Book Purchase",
      order_id: data.orderId,
      handler: async function (response) {
        try {
          await API.post("/payments/verify", response);

          if (user?._id) {
            const freshUserRes = await API.get(`/auth/users/${user._id}`);
            localStorage.setItem("user", JSON.stringify(freshUserRes.data.user));
          }

          toast.success("Payment successful!");
          onSuccess?.();
        } catch (error) {
          toast.error("Payment verification failed. Contact support if money was deducted.");
        }
      },
      prefill: {
        name: user?.name || "",
        email: user?.email || "",
      },
      theme: { color: "#2563eb" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (error) {
    toast.error(error.response?.data?.message || "Could not start payment");
  }
}