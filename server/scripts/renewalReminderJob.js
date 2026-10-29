const User = require("../models/User");
const transporter = require("../config/email");
const { PLANS } = require("../config/plans");

const REMINDER_WINDOW_DAYS = 3;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const runRenewalReminderCheck = async () => {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const usersDue = await User.find({
      isSubscribed: true,
      autoRenew: true,
      subscriptionExpiry: { $gt: now, $lte: windowEnd },
    });

    for (const user of usersDue) {

      if (
        user.renewalReminderSentFor &&
        user.renewalReminderSentFor.getTime() === user.subscriptionExpiry.getTime()
      ) {
        continue;
      }

      try {

        const planLabel = PLANS[user.subscriptionPlan]?.label || "SAFAR EBOOKS";

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: `Your SAFAR EBOOKS ${planLabel} subscription is ending soon`,
          html: `
            <h2>Hi ${user.name},</h2>
            <p>Your SAFAR EBOOKS ${planLabel} subscription ends on
              <b>${user.subscriptionExpiry.toDateString()}</b>.</p>
            <p>We don't auto-charge your card — to keep your premium
              access, just log in and renew from the Pricing page before
              then.</p>
          `,
        });

        user.renewalReminderSentFor = user.subscriptionExpiry;
        await user.save();
      } catch (mailErr) {

        console.error(`[renewal-reminder] failed to email ${user.email}:`, mailErr.message);
      }
    }
  } catch (error) {
    console.error("[renewal-reminder] check failed:", error);
  }
};

const startRenewalReminderJob = () => {

  setTimeout(runRenewalReminderCheck, 60 * 1000);
  setInterval(runRenewalReminderCheck, CHECK_INTERVAL_MS);
};

module.exports = { startRenewalReminderJob, runRenewalReminderCheck };