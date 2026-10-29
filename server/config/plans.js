// Single source of truth for subscription pricing.
//
// IMPORTANT: prices are only ever read from here, on the server, when
// creating a Razorpay order. The client tells us which plan+cycle the user
// picked, but never the price — that way a tampered/replayed request from
// the browser can never charge a different amount than what's listed here.
//
// Amounts are in INR rupees (converted to paise later, right before calling
// Razorpay).

const PLANS = {
  basic: {
    label: "Basic",
    devices: 1,
    monthly: { amount: 149, durationDays: 30 },
    quarterly: { amount: 399, durationDays: 90 },
  },
  medium: {
    label: "Medium",
    devices: 2,
    monthly: { amount: 249, durationDays: 30 },
    quarterly: { amount: 699, durationDays: 90 },
  },
  premium: {
    label: "Premium",
    devices: 4,
    monthly: { amount: 399, durationDays: 30 },
    quarterly: { amount: 1099, durationDays: 90 },
  },
};

const PLAN_KEYS = Object.keys(PLANS); // ["basic", "medium", "premium"]
const CYCLE_KEYS = ["monthly", "quarterly"];

// Non-subscribers (or a lapsed subscription) get this many concurrent
// devices — kept at 1 so "devices at once" is a real, felt upgrade when
// someone subscribes, not just a number on the Pricing page.
const FREE_DEVICE_LIMIT = 1;

// Works out how many devices a user is allowed to be logged into at once,
// right now, based on their live subscription status — not just whatever
// plan is stored on their profile (a lapsed subscription falls back to the
// free limit even if subscriptionPlan is still set from before).
function getDeviceLimitForUser(user) {
  // Admin/staff accounts aren't a subscription tier — don't constrain them
  // to consumer device limits (they routinely test from multiple browsers).
  if (user?.role === "admin") return Infinity;

  const hasActiveSubscription =
    user?.isSubscribed &&
    user?.subscriptionExpiry &&
    new Date(user.subscriptionExpiry) > new Date();

  if (!hasActiveSubscription) return FREE_DEVICE_LIMIT;

  const plan = PLANS[user.subscriptionPlan];
  return plan ? plan.devices : FREE_DEVICE_LIMIT;
}

// Returns { amount, durationDays, planLabel, devices } or null if the
// plan/cycle combination is invalid — callers must check for null.
function getPlanPrice(planKey, cycleKey) {
  const plan = PLANS[planKey];
  if (!plan) return null;

  const cycle = plan[cycleKey];
  if (!cycle) return null;

  return {
    amount: cycle.amount,
    durationDays: cycle.durationDays,
    planLabel: plan.label,
    devices: plan.devices,
  };
}

module.exports = { PLANS, PLAN_KEYS, CYCLE_KEYS, FREE_DEVICE_LIMIT, getPlanPrice, getDeviceLimitForUser };