import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaChevronDown } from "react-icons/fa";
import "../styles/FAQ.css";

const FAQ_SECTIONS = [
  {
    category: "Account & Getting Started",
    items: [
      {
        q: "How do I create a SAFAR EBOOKS account?",
        a: "Click “Login” in the top navigation, then “Create an account” in the popup. Enter your name, email, gender and a password. We’ll send a 6-digit verification code to your email — enter that code to activate your account.",
      },
      {
        q: "I didn’t receive my OTP — what do I do?",
        a: "First check your spam/junk folder. If it’s still not there, use the “Resend code” option on the verification screen — we’ll send a fresh code valid for 5 minutes.",
      },
      {
        q: "I forgot my password — how do I reset it?",
        a: "Click “Forgot password” on the login popup, enter your email, and verify the OTP we send you. You’ll then be able to set a new password.",
      },
      {
        q: "Why was my account blocked?",
        a: "Accounts are blocked by an administrator, usually for a violation of our terms of use. If you believe this was a mistake, please reach out through our Contact Us page.",
      },
    ],
  },
  {
    category: "Subscription Plans & Billing",
    items: [
      {
        q: "What’s the difference between Basic, Medium, and Premium?",
        a: "All three plans give you full access to the SAFAR EBOOKS library. They differ only in how many devices you can be logged into at once — Basic (1 device), Medium (2 devices), and Premium (4 devices).",
      },
      {
        q: "What does “devices at once” actually mean?",
        a: "It’s how many devices can be logged into your account at the same time. If you log in on a new device after reaching your plan’s limit, your oldest active session is automatically signed out to make room — you can always log back in on that device whenever you like.",
      },
      {
        q: "What’s the difference between Monthly and Quarterly billing?",
        a: "A Monthly pass lasts 30 days and a Quarterly pass lasts 90 days. You pay once at the start of each term — we never charge you automatically. Quarterly works out roughly 10% cheaper per month than buying Monthly",
      },
      {
        q: "Does my subscription auto-renew?",
        a: "No. Each plan is a fixed-term pass — 30 days for Monthly, 90 days for Quarterly — and it simply ends when that period is up. There’s nothing to cancel; when you’re ready to continue reading, just subscribe again from the Pricing page.",
      },
      {
        q: "What happens when my subscription expires?",
        a: "You’ll lose access to subscriber-only books beyond the free preview, but any individual books you’ve purchased separately remain yours to read forever. Re-subscribing any time restores full access instantly.",
      },
      {
        q: "Do Premium subscribers get anything Basic/Medium don't, besides device limit?",
        a: "Right now the three plans differ only in how many devices you can be logged into at once — full library access is the same across all of them.",
      },
      {
        q: "Can I upgrade or downgrade my plan?",
        a: "Not while a plan is still active — each plan runs for the full period you paid for. Once it expires, you're free to pick any plan (including a different one) the next time you subscribe from the Pricing page.",
      },
    ],
  },
  {
    category: "Reading & Library",
    items: [
      {
        q: "How much of a subscriber-only book can I read without subscribing?",
        a: "You can preview up to the first 20 pages of any subscriber-only book for free. Subscribing unlocks the rest instantly.",
      },
      {
        q: "How does “Continue Reading” work?",
        a: "SAFAR EBOOKS automatically saves your last page in every book you open. Pick up right where you left off from the Continue Reading section on the homepage or your full Reading History page.",
      },
      {
        q: "Can I read the same book on more than one device?",
        a: "Yes, as long as you’re logged in — your reading progress syncs automatically, so you can switch between devices (within your plan’s device limit) and pick up where you left off.",
      },
      {
        q: "Do I need an internet connection to read?",
        a: "Yes, currently SAFAR EBOOKS streams pages as you read, so an active internet connection is needed.",
      },
    ],
  },
  {
    category: "Buying Individual Books",
    items: [
      {
        q: "What’s the difference between buying a book and subscribing?",
        a: "Buying a book gives you permanent access to that one title, regardless of your subscription status. Subscribing gives you access to the whole library of subscriber-only books for as long as your plan is active.",
      },
      {
        q: "Once I buy a book, do I own it permanently?",
        a: "Yes — a purchased book stays in “My Purchases” and remains readable even if you never subscribe or your subscription lapses.",
      },
      {
        q: "Can I get a Kindle or print version of a book?",
        a: "Some titles include links to Kindle, Amazon, or Flipkart print editions on their book details page, where available.",
      },
    ],
  },
  {
    category: "Payments",
    items: [
      {
        q: "What payment methods do you accept?",
        a: "All payments are processed securely through Razorpay, which supports credit/debit cards, UPI, net banking, and popular wallets.",
      },
      {
        q: "Is my payment information safe?",
        a: "Yes. SAFAR EBOOKS never stores your card or bank details — all payment information is handled directly and securely by Razorpay.",
      },
      {
        q: "My payment failed but money was deducted — what now?",
        a: "This is usually a temporary bank-side delay and resolves itself within a few business days. If it doesn’t, please contact us with your payment date and amount and we’ll help sort it out.",
      },
      {
        q: "Where can I see my past purchases?",
        a: "Head to “My Purchases” from your profile menu — it lists every book and subscription order you’ve made, along with its status.",
      },
    ],
  },
  {
    category: "Troubleshooting",
    items: [
      {
        q: "A book won’t load, or the pages are stuck — what should I try?",
        a: "First, refresh the page and check your internet connection. If the issue persists, try the “Try again” button in the reader, or let us know which book via Contact Us so we can check the file.",
      },
      {
        q: "I got logged out unexpectedly — why?",
        a: "This usually happens when your account signs in on a new device after reaching your plan’s device limit — the oldest active session is signed out automatically. Simply log back in whenever you’re ready.",
      },
      {
        q: "Which browsers and devices are supported?",
        a: "SAFAR EBOOKS works on all modern browsers (Chrome, Firefox, Edge, Safari) on desktop, tablet, and mobile.",
      },
    ],
  },
  {
    category: "Contact & Support",
    items: [
      {
        q: "How do I contact support?",
        a: "Visit our Contact Us page and send us a message — our team typically replies within 1–2 business days.",
      },
      {
        q: "How do I report a wrong or broken book file?",
        a: "Please use the Contact Us page and mention the book title and what went wrong. We review every report and fix issues as quickly as we can.",
      },
    ],
  },
];

function FAQItem({ id, q, a, isOpen, onToggle }) {
  return (
    <div className={`faq-item ${isOpen ? "open" : ""}`}>
      <button
        type="button"
        className="faq-question"
        aria-expanded={isOpen}
        onClick={() => onToggle(id)}
      >
        <span className="faq-question-text">{q}</span>
        <FaChevronDown className="faq-chevron" />
      </button>

      {/* Answer only renders once this item is clicked open */}
      <div className={`faq-collapse ${isOpen ? "show" : ""}`}>
        <div className="faq-answer-inner">
          <p className="faq-answer">{a}</p>
        </div>
      </div>
    </div>
  );
}

function FAQ() {
  const navigate = useNavigate();
  const [openId, setOpenId] = useState(null);

  const toggle = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="faq-page">
      <div className="faq-container">
        {/* Header Hero */}
        <div className="faq-hero text-center">
          <h1 className="faq-title">Frequently Asked Questions</h1>
          <p className="faq-subtitle">
            Everything you need to know about plans, reading, and payments.
            Can&rsquo;t find your answer?{" "}
            <Link to="/contactUs" className="faq-contact-link">
              Contact us
            </Link>
            .
          </p>
        </div>

        {/* Categories */}
        <div className="faq-sections">
          {FAQ_SECTIONS.map((section, sIndex) => (
            <div className="faq-section" key={section.category}>
              <h2 className="faq-section-title">{section.category}</h2>
              <div className="faq-list">
                {section.items.map((item, iIndex) => {
                  const id = `${sIndex}-${iIndex}`;
                  return (
                    <FAQItem
                      key={id}
                      id={id}
                      q={item.q}
                      a={item.a}
                      isOpen={openId === id}
                      onToggle={toggle}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="faq-cta text-center">
          <h3>Still have questions?</h3>
          <p>Our team is happy to help with anything not covered here.</p>
          <div className="faq-cta-buttons">
            <button
              type="button"
              className="faq-cta-btn faq-cta-filled"
              onClick={() => navigate("/contactUs")}
            >
              Contact Support
            </button>
            <button
              type="button"
              className="faq-cta-btn"
              onClick={() => navigate("/pricing")}
            >
              View Plans
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FAQ;