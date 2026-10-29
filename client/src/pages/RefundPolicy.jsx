import { Container } from "react-bootstrap";
import useSiteInfo from "../hooks/useSiteInfo";
import "../styles/Legal.css";

// ---- Client: confirm these values before launch ----
const LAST_UPDATED = "14th October, 2026";
const REFUND_REQUEST_DAYS = 7; // how long after purchase a refund can be requested
const ACKNOWLEDGE_DAYS = "2 business days"; // how fast we reply to a request
const REFUND_TIMELINE = "5 to 7 business days"; // time for money to reach the customer
const REMINDER_DAYS = 3; // how many days before expiry the reminder email is sent
const PHYSICAL_REPORT_DAYS = 7; // only used if physical books are sold

// Block types: { p } paragraph, { list } bullet list, { lines } stacked lines
const intro = [
  {
    p: "This Refund & Cancellation Policy explains how cancellations, renewals and refunds work for purchases made on SAFAR EBOOKS, operated by SAFAR TECHLAB LLP. It should be read together with our Terms & Conditions and Privacy Policy.",
  },
];

const sections = [
  {
    title: "1. Individual E-book Purchases",
    blocks: [
      {
        p: "E-books are digital products and are made available in your account as soon as your payment is confirmed. Once access has been granted and the book has been opened, read or downloaded, the purchase is generally not eligible for cancellation or refund.",
      },
      {
        p: `A refund may be requested within ${REFUND_REQUEST_DAYS} days of purchase in the cases listed in Section 5.`,
      },
    ],
  },
  {
    title: "2. Subscription Plans",
    blocks: [
      {
        p: "Subscription plans (Basic, Medium and Premium) are fixed-term passes that are paid for in advance. Each plan is available for a monthly term (30 days) or a quarterly term (90 days), at the price shown at checkout.",
      },
      {
        p: "Access to the plan starts when your payment is confirmed and ends on the expiry date shown in your account. The device limit of each plan is shown on the Subscription page before you buy.",
      },
      {
        p: "Your subscription is not charged automatically. We do not store your card or bank details and we do not take any payment from you without your action. To continue after your plan ends, you need to purchase a new plan.",
      },
    ],
  },
  {
    title: "3. Renewal Reminders (Auto-Renew Setting)",
    blocks: [
      {
        p: `The “auto-renew” setting in your account does not charge you. When it is switched on, we send you a reminder email about ${REMINDER_DAYS} days before your plan expires, so that you can renew manually if you wish.`,
      },
      {
        p: "You can switch this setting off at any time from your account. Once it is off, we stop sending renewal reminders.",
      },
    ],
  },
  {
    title: "4. Cancelling a Subscription",
    blocks: [
      {
        p: "Because there is no recurring charge, cancelling a subscription means turning off renewal reminders. No further payment will be taken from you.",
      },
      {
        p: "Your current plan stays active until its expiry date. The unused part of a plan that you have already started using is not refunded, except in the cases listed in Section 5.",
      },
    ],
  },
  {
    title: "5. When You Are Eligible for a Refund",
        blocks: [
      {
        p: `You may request a refund within ${REFUND_REQUEST_DAYS} days of the purchase if:`,
      },
      {
        list: [
          "You were charged more than once for the same book or plan;",
          "Your payment was successful but you did not receive access to the book or plan, and we are unable to fix this;",
          "The amount charged is different from the price shown at checkout;",
          "A book file is defective or cannot be opened, and we are unable to fix it within a reasonable time;",
          "A refund is required under applicable law.",
        ],
      },
      {
        p: "E-book purchases can be refunded for any of the reasons above. Subscription plans can be refunded only if you were charged more than once or did not receive access, or where the law requires it. A subscription is not refunded for unused days, a change of mind, or technical problems that we are able to fix.",
      },
    ],
  },
  {
    title: "6. When a Refund Is Not Available",
    blocks: [
      { p: "Refunds are generally not available in these situations:" },
      {
        list: [
          "You changed your mind after access was granted;",
          "You have already opened, read or downloaded the book;",
          "You used a subscription plan and want a refund for the remaining days;",
          "Your plan has expired or you turned off renewal reminders;",
          "Your account was suspended or terminated for violating our Terms & Conditions;",
          "You bought the wrong book or plan and the plan features (such as the number of devices) were shown before purchase;",
          "The request is made after the refund request period.",
        ],
      },
      {
        p: "When we review a request for an e-book, we may check whether and how much of the book was opened. This does not apply where the problem is a duplicate charge, a wrong amount, or a defective file.",
      },
      {
        p: "Nothing in this policy limits any consumer right that cannot legally be excluded.",
      },
    ],
  },
  {
    title: "7. Payment Deducted but No Access",
    blocks: [
      {
        p: "If money was deducted from your account but your order failed, the amount is usually returned to you automatically by your bank or the payment provider. This can take several business days.",
      },
      {
        p: "If your payment was successful but you still do not have access after 24 hours, please contact us with your order or payment ID and we will look into it.",
      },
    ],
  },
  {
    title: "8. How to Request a Refund",
        blocks: [
      {
        p: "For e-book purchases, you can request a refund yourself:",
      },
      {
        list: [
          "Sign in and open My Purchases;",
          `Find the order and click “Request refund” (the button is available for ${REFUND_REQUEST_DAYS} days after purchase);`,
          "Choose the reason, describe the problem and send the request.",
        ],
      },
      {
        p: "We will email you a confirmation, and you can follow the status of your request in My Purchases.",
      },
      {
        p: "For a subscription (duplicate charge or no access only), or if you cannot use the button, please email us at the address in Section 12 with the following details:",
      },
      {
        list: [
          "The email address registered on your account;",
          "The order ID or payment ID (shown in My Purchases or in your payment receipt);",
          "The book or plan you purchased;",
          "The reason for your request.",
        ],
      },
      {
        p: "We may ask for additional information to verify your identity or the problem you faced.",
      },
    ],
  },
  {
    title: "9. Refund Processing",
    blocks: [
      {
        p: `We will acknowledge your request within ${ACKNOWLEDGE_DAYS}. If your request is approved, the refund is sent to the original payment method.`,
      },
      {
        p: `After we process a refund, it usually takes ${REFUND_TIMELINE} to appear in your account, depending on your bank or payment provider.`,
      },
    ],
  },
  {
    title: "10. Physical Books",
    blocks: [
      {
        p: `Where physical books are sold, damaged, defective or wrongly delivered items should be reported within ${PHYSICAL_REPORT_DAYS} days of delivery with photographs. Return, replacement and refund conditions for a particular product are stated on its product page or checkout page.`,
      },
    ],
  },
  {
    title: "11. Price Changes and Updates to This Policy",
    blocks: [
      {
        p: "The price you pay is the price shown at the time of your purchase. Later price changes do not affect orders already placed.",
      },
      {
        p: "We may update this policy from time to time. The updated version will be published on this page with a revised “Last Updated” date.",
      },
    ],
  },
];

function renderBlock(block, key) {
  if (block.p) return <p key={key}>{block.p}</p>;
  if (block.list) {
    return (
      <ul key={key}>
        {block.list.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.lines) {
    return (
      <p key={key}>
        {block.lines.map((line, i) => (
          <span key={i}>
            {line}
            {i < block.lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  }
  return null;
}

function RefundPolicy() {
  const info = useSiteInfo();

  const contactLines = [
    "SAFAR TECHLAB LLP",
    "Operator of SAFAR EBOOKS",
    `Email: ${info.supportEmail || "Not available"}`,
    ...(info.contactPhone ? [`Phone: ${info.contactPhone}`] : []),
    `Address: ${info.address || "Not available"}`,
  ];

  return (
    <div className="legal-page">
    <Container className="legal-container">
      <h1 className="legal-title">Refund & Cancellation Policy</h1>
      <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

      {intro.map((block, i) => renderBlock(block, `intro-${i}`))}

      {sections.map((section) => (
        <section key={section.title}>
          <h5 className="legal-heading">{section.title}</h5>
          {section.blocks.map((block, i) =>
            renderBlock(block, `${section.title}-${i}`)
          )}
        </section>
      ))}

      <section>
        <h5 className="legal-heading">12. Contact</h5>
        <p>For refund, cancellation or renewal questions, please contact:</p>
        {renderBlock({ lines: contactLines }, "contact")}
      </section>
    </Container>
    </div>
  );
}

export default RefundPolicy;
