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

const PLAN_KEYS = Object.keys(PLANS);
const CYCLE_KEYS = ["monthly", "quarterly"];
const FREE_DEVICE_LIMIT = 1;

function getDeviceLimitForUser(user) {

  if (user?.role === "admin") return Infinity;

  const hasActiveSubscription =
    user?.isSubscribed &&
    user?.subscriptionExpiry &&
    new Date(user.subscriptionExpiry) > new Date();

  if (!hasActiveSubscription) return FREE_DEVICE_LIMIT;

  const plan = PLANS[user.subscriptionPlan];
  return plan ? plan.devices : FREE_DEVICE_LIMIT;
}

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