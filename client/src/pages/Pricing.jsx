import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaCheck } from "react-icons/fa";
import { startPayment } from "../utils/payment";
import "../styles/Pricing.css";

const PLANS = [
  {
    key: "basic",
    name: "Basic",
    tagline: "Perfect for casual readers",
    monthlyPrice: 149,
    quarterlyPrice: 399,
    quarterlyMonthlyEquivalent: 133,
    features: [
      "Full access to the ebook library",
      "Reading progress synced automatically",
      "1 device at a time",
    ],
    highlight: false,
  },
  {
    key: "medium",
    name: "Medium",
    tagline: "Great for regular readers",
    monthlyPrice: 249,
    quarterlyPrice: 699,
    quarterlyMonthlyEquivalent: 233,
    features: [
      "Full access to the ebook library",
      "Reading progress synced automatically",
      "2 devices at once",
    ],
    highlight: true,
  },
  {
    key: "premium",
    name: "Premium",
    tagline: "For the dedicated bookworm",
    monthlyPrice: 399,
    quarterlyPrice: 1099,
    quarterlyMonthlyEquivalent: 366,
    features: [
      "Full access to the ebook library",
      "Reading progress synced automatically",
      "4 devices at once",
    ],
    highlight: false,
  },
];

function Pricing() {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState("monthly");
  const loggedUser = JSON.parse(localStorage.getItem("user"));

  const handleSubscribe = (plan) => {
  if (!loggedUser) {
    toast.info("Please log in to choose a plan.");
    navigate(`/pricing?login=1&redirect=${encodeURIComponent("/pricing")}`);
    return;
  }

  startPayment({
    type: "subscription",
    plan: plan.key,
    billingCycle: cycle,
    onSuccess: () => navigate("/library"),
  });
};

  return (
    <div className="pricing-page">
      <div className="pricing-hero text-center">
        <h1 className="pricing-title">Choose your reading plan</h1>
        <p className="pricing-subtitle">
          Unlimited stories, one simple subscription — pick the plan that
          fits how you read.
        </p>

        <div className="cycle-toggle" role="tablist" aria-label="Billing cycle">
          <button
            type="button"
            role="tab"
            aria-selected={cycle === "monthly"}
            className={`cycle-btn ${cycle === "monthly" ? "active" : ""}`}
            onClick={() => setCycle("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={cycle === "quarterly"}
            className={`cycle-btn ${cycle === "quarterly" ? "active" : ""}`}
            onClick={() => setCycle("quarterly")}
          >
            Quarterly <span className="save-chip">Save up to 11%</span>
          </button>
        </div>
      </div>

      <div className="pricing-grid">
        {PLANS.map((plan) => {
          const price = cycle === "monthly" ? plan.monthlyPrice : plan.quarterlyPrice;

          return (
            <div
              key={plan.key}
              className={`pricing-card ${plan.highlight ? "highlight" : ""}`}
            >
              {plan.highlight && (
                <span className="popular-badge">Most Popular</span>
              )}

              <h2 className="plan-name">{plan.name}</h2>
              <p className="plan-tagline">{plan.tagline}</p>

              <div className="plan-price">
                <span className="price-amount">₹{price}</span>
                <span className="price-period">
                  /{cycle === "monthly" ? "mo" : "qtr"}
                </span>
              </div>

              {cycle === "quarterly" ? (
                <p className="price-equivalent">
                  ~₹{plan.quarterlyMonthlyEquivalent}/mo, billed every 3 months
                </p>
              ) : (
                <p className="price-equivalent price-equivalent-spacer">&nbsp;</p>
              )}

              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <FaCheck className="check-icon" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`plan-cta ${plan.highlight ? "plan-cta-filled" : ""}`}
                onClick={() => handleSubscribe(plan)}
              >
                Choose {plan.name}
              </button>
            </div>
          );
        })}
      </div>

      <p className="pricing-footnote">
        All prices are in INR. Quarterly plans are billed once every 3 months.
      </p>
    </div>
  );
}

export default Pricing;