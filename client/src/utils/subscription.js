export const hasActiveSubscription = (user) => {
  return Boolean(
    user?.isSubscribed &&
    user?.subscriptionExpiry &&
    new Date(user.subscriptionExpiry) > new Date()
  );
};
