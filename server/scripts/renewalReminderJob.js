const User = require("../models/User");
const transporter = require("../config/email");
const { PLANS } = require("../config/plans");

// How far ahead of expiry to send the "your subscription is ending soon"
// reminder email.
const REMINDER_WINDOW_DAYS = 3;

// How often to run the check. This is a simple in-process interval timer
// rather than a cron dependency — good enough for a single server
// instance; move to a real scheduler (e.g. node-cron, or a platform cron
// job hitting an endpoint) if this ever runs on multiple instances.
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

// ==========================
// Find users who:
//   - are currently subscribed
//   - have auto-renew (reminder) turned on
//   - expire within the reminder window
//   - haven't already been emailed for THIS expiry date
// and send each one a reminder to come back and manually renew.
//
// NOTE: this does not charge anyone automatically — there is no saved
// payment method to charge. It only sends an email nudge.
// ==========================
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
      // Skip if we already sent a reminder for this exact expiry date
      // (e.g. the job ran twice in the same window).
      if (
        user.renewalReminderSentFor &&
        user.renewalReminderSentFor.getTime() === user.subscriptionExpiry.getTime()
      ) {
        continue;
      }

      try {
        // Use the user's actual plan name instead of a hardcoded
        // "Premium" — this reminder is sent to Basic/Medium/Premium
        // subscribers alike.
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
        // Don't let one failed email stop the rest of the batch.
        console.error(`[renewal-reminder] failed to email ${user.email}:`, mailErr.message);
      }
    }
  } catch (error) {
    console.error("[renewal-reminder] check failed:", error);
  }
};

// Starts the recurring check. Call once when the server boots.
const startRenewalReminderJob = () => {
  // Run once shortly after boot, then on the regular interval.
  setTimeout(runRenewalReminderCheck, 60 * 1000);
  setInterval(runRenewalReminderCheck, CHECK_INTERVAL_MS);
};

module.exports = { startRenewalReminderJob, runRenewalReminderCheck };