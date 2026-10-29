// Single source of truth for "does this user currently have an active
// subscription" on the client. Mirrors the server's own check
// (config/plans.js -> getDeviceLimitForUser and pdfController's
// hasActiveSubscription) — isSubscribed alone is NOT enough, since it
// stays true after a plan lapses until the user resubscribes.
export const hasActiveSubscription = (user) => {
  return Boolean(
    user?.isSubscribed &&
    user?.subscriptionExpiry &&
    new Date(user.subscriptionExpiry) > new Date()
  );
};
