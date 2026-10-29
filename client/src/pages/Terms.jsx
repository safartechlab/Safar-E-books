import { Container } from "react-bootstrap";
import useSiteInfo from "../hooks/useSiteInfo";
import "../styles/Legal.css";

const LAST_UPDATED = "10 October 2026";

const intro = [
  {
    p: "Welcome to SAFAR EBOOKS, a digital and online book platform operated by SAFAR TECHLAB LLP (“SAFAR TECHLAB LLP”, “SAFAR EBOOKS”, “we”, “us”, or “our”).",
  },
  {
    p: "These Terms & Conditions (“Terms”) govern your access to and use of the SAFAR EBOOKS website, mobile application, digital products, physical books, services, content and related features (collectively, the “Platform”).",
  },
  {
    p: "By accessing, browsing, registering on, purchasing from, downloading from, or otherwise using the Platform, you acknowledge that you have read, understood and agreed to these Terms. If you do not agree with these Terms, please do not use the Platform.",
  },
];

const sections = [
  {
    title: "1. About SAFAR EBOOKS",
    blocks: [
      {
        p: "SAFAR EBOOKS is a publishing and digital-content platform operated by SAFAR TECHLAB LLP. The Platform may provide access to:",
      },
      {
        list: [
          "E-books and digital publications;",
          "Physical books and printed publications;",
          "Audiobooks or other digital media, where available;",
          "Book-related information, previews and promotional content;",
          "Reading, downloading or viewing functionality;",
          "Membership, subscription or other services, where introduced;",
          "Other products and services introduced by SAFAR TECHLAB LLP from time to time.",
        ],
      },
      {
        p: "SAFAR TECHLAB LLP reserves the right to introduce, modify, suspend or discontinue any product or feature of the Platform.",
      },
    ],
  },
  {
    title: "2. Eligibility",
    blocks: [
      {
        p: "You must have the legal capacity to enter into a binding agreement under applicable law to use the Platform or make purchases.",
      },
      {
        p: "If you are a minor, you may use the Platform only with the involvement and permission of your parent or legal guardian where required by applicable law.",
      },
      {
        p: "By using the Platform, you represent that the information provided by you is accurate and that you are legally permitted to use the Platform.",
      },
    ],
  },
  {
    title: "3. User Account",
    blocks: [
      { p: "Certain features may require you to create an account." },
      { p: "You are responsible for:" },
      {
        list: [
          "Providing accurate and complete information;",
          "Maintaining the confidentiality of your login credentials;",
          "Keeping your account information updated;",
          "All activities carried out through your account.",
        ],
      },
      {
        p: "You must notify us promptly if you believe your account has been accessed without authorization.",
      },
      {
        p: "SAFAR TECHLAB LLP may suspend or terminate an account where it reasonably believes that the account is being misused, fraudulent activity is occurring, or these Terms are being violated.",
      },
    ],
  },
  {
    title: "4. Books and Digital Content",
    blocks: [
      {
        p: "All books, e-books, manuscripts, text, illustrations, graphics, cover designs, photographs, audio, video, software, branding and other content made available through the Platform are protected by applicable intellectual-property laws.",
      },
      {
        p: "Unless expressly stated otherwise, purchasing an e-book or other digital publication gives you a limited, personal, non-exclusive, non-transferable and revocable licence to access and read the purchased content.",
      },
      {
        p: "A purchase does not transfer ownership of the underlying copyright or other intellectual-property rights to you.",
      },
      { p: "You may not, without our prior written permission:" },
      {
        list: [
          "Copy or reproduce purchased content except where expressly permitted by law;",
          "Redistribute, resell or commercially exploit the content;",
          "Upload purchased books to file-sharing platforms;",
          "Share downloaded files with other persons;",
          "Modify or create derivative works from the content;",
          "Remove copyright, watermark, author or ownership notices;",
          "Circumvent technical protection or access controls;",
          "Use our content for unauthorized artificial-intelligence training, commercial data extraction or similar purposes.",
        ],
      },
      {
        p: "Nothing in these Terms limits any rights that cannot legally be excluded under applicable law.",
      },
    ],
  },
  {
    title: "5. Physical Books",
    blocks: [
      { p: "Where physical books are sold through the Platform:" },
      {
        list: [
          "Product descriptions, photographs and specifications are provided for informational purposes;",
          "Minor variations in colour, printing, paper, binding or appearance may occur;",
          "Delivery times may vary depending on location, availability and logistics;",
          "Any applicable shipping charges, taxes or other charges will be displayed where applicable.",
        ],
      },
      {
        p: "Specific return, replacement and refund conditions may be stated separately on the relevant product page or checkout page.",
      },
    ],
  },
  {
    title: "6. Digital Purchases and Downloads",
    blocks: [
      {
        p: "Digital products may be delivered through account access, download links, application functionality, email or another method selected by SAFAR TECHLAB LLP.",
      },
      {
        p: "You are responsible for maintaining a compatible device, operating system, internet connection and software necessary to access digital content.",
      },
      {
        p: "We do not guarantee that every digital product will remain compatible with every device, operating system or third-party application indefinitely.",
      },
      {
        p: "We may use reasonable technical measures to protect digital content against unauthorized copying or distribution.",
      },
    ],
  },
  {
    title: "7. Pricing and Payments",
    blocks: [
      {
        p: "Prices displayed on the Platform may be changed at any time before an order is confirmed.",
      },
      {
        p: "Applicable taxes, delivery charges, platform charges or other fees, where applicable, will be displayed during the purchase process.",
      },
      {
        p: "Payments may be processed through third-party payment service providers. By making a payment, you agree to comply with the applicable terms of the relevant payment provider.",
      },
      {
        p: "SAFAR TECHLAB LLP does not generally receive or store complete payment-card information where payment processing is handled by a third-party payment provider.",
      },
    ],
  },
  {
    title: "8. Orders and Acceptance",
    blocks: [
      {
        p: "Placing an order constitutes an offer to purchase the selected product or service.",
      },
      {
        p: "An order may be accepted, rejected or cancelled by us for legitimate reasons, including:",
      },
      {
        list: [
          "Product unavailability;",
          "Pricing or listing errors;",
          "Payment failure;",
          "Suspected fraudulent activity;",
          "Technical errors;",
          "Violation of these Terms.",
        ],
      },
      {
        p: "Where an order is cancelled after payment has been successfully received, the applicable refund will be processed according to our refund policy and applicable law.",
      },
    ],
  },
  {
    title: "9. Refunds, Returns and Cancellations",
    blocks: [
      {
        p: "Refund, return and cancellation eligibility may differ between:",
      },
      {
        list: [
          "Physical books;",
          "E-books;",
          "Downloads;",
          "Subscriptions;",
          "Other digital products or services.",
        ],
      },
      {
        p: "The applicable refund or cancellation terms will be communicated on the relevant product page, checkout page or separate refund policy.",
      },
      {
        p: "For digital products, access or download may affect eligibility for cancellation or refund to the extent permitted by applicable law.",
      },
      {
        p: "Nothing in these Terms is intended to exclude or restrict any consumer rights that cannot legally be excluded.",
      },
      {
        p: "Subscription plans are fixed-term and are not charged automatically. The auto-renew setting only sends a reminder email before your plan ends. Details of renewal, cancellation and refunds are set out in our Refund & Cancellation Policy.",
      },
    ],
  },
  {
    title: "10. Intellectual Property",
    blocks: [
      {
        p: "All intellectual property associated with SAFAR EBOOKS and SAFAR TECHLAB LLP, including but not limited to:",
      },
      {
        list: [
          "Names;",
          "Logos;",
          "Trademarks;",
          "Book titles;",
          "Book covers;",
          "Written content;",
          "Illustrations;",
          "Graphics;",
          "Website design;",
          "Application design;",
          "Software;",
          "Source code;",
          "Databases;",
          "Layouts;",
          "Promotional materials;",
        ],
      },
      {
        p: "belongs to SAFAR TECHLAB LLP, its authors, licensors or other respective rights holders, unless expressly stated otherwise.",
      },
      {
        p: "Unauthorized use may constitute infringement of applicable intellectual-property laws.",
      },
    ],
  },
  {
    title: "11. User-Generated Content",
    blocks: [
      {
        p: "If the Platform permits reviews, comments, ratings, feedback or other user-generated content, you remain responsible for the content you submit.",
      },
      {
        p: "You must not submit content that is unlawful, defamatory, abusive, fraudulent, threatening, hateful, misleading, infringing or otherwise inappropriate.",
      },
      {
        p: "By submitting content, you grant SAFAR TECHLAB LLP a non-exclusive, worldwide, royalty-free licence to use, reproduce, display and distribute that content for operating, improving and promoting the Platform, subject to applicable law and our Privacy Policy.",
      },
      {
        p: "We reserve the right to remove content that violates these Terms or applicable law.",
      },
    ],
  },
  {
    title: "12. Prohibited Activities",
    blocks: [
      { p: "You must not use the Platform to:" },
      {
        list: [
          "Commit or facilitate unlawful activities;",
          "Attempt unauthorized access to our systems;",
          "Interfere with Platform security;",
          "Introduce malware, viruses or harmful code;",
          "Scrape or systematically extract Platform data without permission;",
          "Circumvent technological restrictions;",
          "Create fraudulent accounts or transactions;",
          "Impersonate another person or entity;",
          "Abuse promotional offers;",
          "Infringe intellectual-property rights;",
          "Resell access to the Platform without authorization.",
        ],
      },
    ],
  },
  {
    title: "13. Third-Party Services",
    blocks: [
      {
        p: "The Platform may integrate with third-party services, including payment gateways, cloud providers, analytics providers, authentication services, app stores, logistics providers and other service providers.",
      },
      {
        p: "Your use of such services may also be subject to the third party’s terms and privacy policies.",
      },
      {
        p: "SAFAR TECHLAB LLP is not responsible for independent third-party services that are outside our reasonable control.",
      },
    ],
  },
  {
    title: "14. Availability of the Platform",
    blocks: [
      {
        p: "We aim to keep SAFAR EBOOKS available and functional, but we do not guarantee uninterrupted or error-free operation.",
      },
      { p: "The Platform may occasionally be unavailable because of:" },
      {
        list: [
          "Maintenance;",
          "Updates;",
          "Technical failures;",
          "Network problems;",
          "Security incidents;",
          "Third-party service failures;",
          "Circumstances beyond our reasonable control.",
        ],
      },
      { p: "We may modify or discontinue any feature or service at any time." },
    ],
  },
  {
    title: "15. Accuracy of Information",
    blocks: [
      {
        p: "We make reasonable efforts to maintain accurate product and Platform information.",
      },
      {
        p: "However, errors may occasionally occur, including typographical, pricing, availability or technical errors.",
      },
      {
        p: "We reserve the right to correct errors and update information without prior notice.",
      },
    ],
  },
  {
    title: "16. Disclaimer",
    blocks: [
      {
        p: "The books and other content published through SAFAR EBOOKS may contain educational, philosophical, literary, psychological, cultural, business or general informational material.",
      },
      {
        p: "Unless expressly stated otherwise, such content is not professional legal, financial, medical, psychological, investment or other professional advice.",
      },
      {
        p: "Readers should independently evaluate information and seek qualified professional advice where appropriate.",
      },
    ],
  },
  {
    title: "17. Limitation of Liability",
    blocks: [
      {
        p: "To the maximum extent permitted by applicable law, SAFAR TECHLAB LLP shall not be liable for indirect, incidental, special, consequential or punitive damages arising from your use of the Platform.",
      },
      {
        p: "Nothing in these Terms excludes or limits liability that cannot legally be excluded or limited under applicable law.",
      },
    ],
  },
  {
    title: "18. Indemnification",
    blocks: [
      {
        p: "To the extent permitted by applicable law, you agree to indemnify and hold harmless SAFAR TECHLAB LLP and its partners, employees, contractors and service providers from claims, losses, liabilities and expenses arising from:",
      },
      {
        list: [
          "Your violation of these Terms;",
          "Your unlawful use of the Platform;",
          "Your infringement of third-party rights;",
          "Your misuse of purchased or accessed content.",
        ],
      },
    ],
  },
  {
    title: "19. Suspension and Termination",
    blocks: [
      {
        p: "We may suspend or terminate your access to the Platform where:",
      },
      {
        list: [
          "You materially violate these Terms;",
          "Your activities create security or legal risks;",
          "Fraudulent activity is suspected;",
          "Required by law;",
          "The Platform or a particular service is discontinued.",
        ],
      },
      {
        p: "Termination does not affect rights or obligations that arose before termination.",
      },
    ],
  },
  {
    title: "20. Changes to These Terms",
    blocks: [
      { p: "We may update these Terms from time to time." },
      {
        p: "The updated version will be published on the Platform with a revised “Last Updated” date.",
      },
      {
        p: "Your continued use of the Platform after the updated Terms become effective constitutes acceptance of the revised Terms to the extent permitted by law.",
      },
    ],
  },
  {
    title: "21. Privacy",
    blocks: [
      {
        p: "Your use of the Platform is also governed by our Privacy Policy.",
      },
      {
        p: "Our Privacy Policy explains how we collect, use, store, disclose and protect personal information.",
      },
    ],
  },
  {
    title: "22. Governing Law and Jurisdiction",
    blocks: [
      { p: "These Terms shall be governed by the laws of India." },
      {
        p: "Subject to applicable consumer-protection laws and mandatory statutory rights, disputes relating to the Platform shall be subject to the jurisdiction of the competent courts/authorities having jurisdiction over the registered office of SAFAR TECHLAB LLP.",
      },
      {
        p: "Nothing in this clause prevents a consumer from exercising any mandatory statutory rights available under applicable law.",
      },
    ],
  },
  {
    title: "23. Grievance Redressal",
    blocks: [
      {
        p: "For questions, complaints, refund requests, privacy concerns or other grievances, users may contact SAFAR TECHLAB LLP through the official customer-support/grievance contact details published on the Platform.",
      },
      {
        lines: [
          `Grievance Contact: {{email}}`,
          `Customer Support: {{email}}`,
          `Registered Office: {{address}}`,
        ],
      },
      {
        p: "We will endeavour to acknowledge and address grievances within the period required under applicable law.",
      },
    ],
  },
  {
    title: "24. Contact",
    blocks: [
      { p: "For general queries relating to these Terms:" },
      {
        lines: [
          "SAFAR TECHLAB LLP",
          "Operator of SAFAR EBOOKS",
          `Email: {{email}}`,
          `Website: {{website}}`,
          `Address: {{address}}`,
        ],
      },
    ],
  },
];

function fill(text, info) {
  return text
    .replaceAll("{{email}}", info.supportEmail || "Not available")
    .replaceAll("{{website}}", info.websiteUrl || window.location.origin)
    .replaceAll("{{address}}", info.address || "Not available");
}

function renderBlock(block, key, info) {
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
            {fill(line, info)}
            {i < block.lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  }
  return null;
}

function Terms() {
  const info = useSiteInfo();

  return (
    <div className="legal-page">
    <Container className="legal-container">
      <h1 className="legal-title">Terms & Conditions</h1>
      <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

      {intro.map((block, i) => renderBlock(block, `intro-${i}`, info))}

      {sections.map((section) => (
        <section key={section.title}>
          <h5 className="legal-heading">{section.title}</h5>
          {section.blocks.map((block, i) =>
            renderBlock(block, `${section.title}-${i}`, info)
          )}
        </section>
      ))}

      <p className="legal-footer-note">
        By using SAFAR EBOOKS, you acknowledge that you have read and understood
        these Terms & Conditions.
      </p>
    </Container>
    </div>
  );
}

export default Terms;
