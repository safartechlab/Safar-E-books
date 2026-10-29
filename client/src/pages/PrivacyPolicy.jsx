import { Container } from "react-bootstrap";
import useSiteInfo from "../hooks/useSiteInfo";
import "../styles/Legal.css";

const LAST_UPDATED = "10th October 2026";

const intro = [
  {
    p: "This Privacy Policy explains how SAFAR TECHLAB LLP (“SAFAR TECHLAB LLP”, “we”, “us”, or “our”), operating the SAFAR EBOOKS website and application, collects, uses, stores, shares and protects information relating to users of our Platform.",
  },
  {
    p: "By using SAFAR EBOOKS, you acknowledge that you have read and understood this Privacy Policy.",
  },
];

const sections = [
  {
    title: "1. About This Privacy Policy",
    blocks: [
      { p: "This Privacy Policy applies to information collected through:" },
      {
        list: [
          "The SAFAR EBOOKS website;",
          "The SAFAR EBOOKS mobile application;",
          "Online purchases;",
          "Account registration;",
          "Customer-support communications;",
          "Marketing communications;",
          "Other services operated by SAFAR TECHLAB LLP that link to this Privacy Policy.",
        ],
      },
      { p: "This Policy should be read together with our Terms & Conditions." },
    ],
  },
  {
    title: "2. Information We Collect",
    blocks: [
      {
        p: "Depending on how you use SAFAR EBOOKS, we may collect the following categories of information.",
      },

      { sub: "A. Account Information" },
      { p: "When you create an account, we may collect:" },
      {
        list: [
          "Name;",
          "Email address;",
          "Mobile number;",
          "Login credentials or authentication information;",
          "Account preferences;",
          "Profile information that you choose to provide.",
        ],
      },

      { sub: "B. Purchase Information" },
      { p: "When you purchase a product or service, we may collect:" },
      {
        list: [
          "Order details;",
          "Products purchased;",
          "Transaction amount;",
          "Billing information;",
          "Shipping address for physical products;",
          "Delivery information;",
          "Refund or cancellation information.",
        ],
      },
      {
        p: "Payment-card, UPI or banking credentials may be processed directly by third-party payment service providers rather than being stored by SAFAR TECHLAB LLP, depending on the payment method used.",
      },

      { sub: "C. Digital Reading and Usage Information" },
      {
        p: "We may collect information relating to your use of the Platform, such as:",
      },
      {
        list: [
          "Books purchased or accessed;",
          "Downloads;",
          "Reading or access activity;",
          "Device information;",
          "Application usage;",
          "Preferences and settings;",
          "Technical logs.",
        ],
      },
      {
        p: "Where applicable, such information may be used to provide, secure and improve the service.",
      },

      { sub: "D. Device and Technical Information" },
      {
        p: "When you access the Platform, we may automatically collect certain technical information, including:",
      },
      {
        list: [
          "IP address;",
          "Browser type;",
          "Device type;",
          "Operating system;",
          "Application version;",
          "Language preferences;",
          "Approximate location derived from technical information where permitted;",
          "Log and diagnostic information.",
        ],
      },

      { sub: "E. Communications" },
      {
        p: "If you contact us, we may retain information contained in your communication, including your name, email address, phone number and the contents of your request.",
      },

      { sub: "F. Cookies and Similar Technologies" },
      { p: "We may use cookies, SDKs, pixels and similar technologies to:" },
      {
        list: [
          "Keep users signed in;",
          "Remember preferences;",
          "Understand Platform usage;",
          "Improve performance;",
          "Detect fraud and security threats;",
          "Measure marketing effectiveness;",
          "Provide relevant communications where legally permitted.",
        ],
      },
      {
        p: "You may be able to control cookies through your browser or device settings. Disabling certain cookies may affect Platform functionality.",
      },
    ],
  },
  {
    title: "3. How We Use Information",
    blocks: [
      { p: "We may process personal information for purposes including:" },
      {
        list: [
          "Creating and managing user accounts;",
          "Processing orders and payments;",
          "Delivering physical products;",
          "Providing access to digital books;",
          "Providing customer support;",
          "Processing refunds and cancellations;",
          "Sending service-related communications;",
          "Improving our website and application;",
          "Understanding Platform usage;",
          "Preventing fraud and abuse;",
          "Protecting Platform security;",
          "Maintaining business and transaction records;",
          "Complying with applicable legal obligations;",
          "Enforcing our Terms & Conditions;",
          "Developing and improving products and services;",
          "Sending promotional communications where permitted and where applicable consent or another lawful basis is required.",
        ],
      },
      {
        p: "We seek to collect and process information that is reasonably necessary for the relevant purpose.",
      },
    ],
  },
  {
    title: "4. Consent and Your Choices",
    blocks: [
      {
        p: "Where consent is required under applicable law, we will seek consent in an appropriate manner.",
      },
      {
        p: "Where processing is based on consent, you may withdraw your consent subject to applicable law and the consequences of such withdrawal.",
      },
      {
        p: "Withdrawal of consent may affect certain Platform functions where the relevant information is necessary to provide the requested service.",
      },
      {
        p: "The Digital Personal Data Protection Act, 2023 provides for consent to be free, specific, informed, unconditional and unambiguous, and provides for withdrawal of consent where consent is the basis for processing. (MeitY)",
      },
    ],
  },
  {
    title: "5. Marketing Communications",
    blocks: [
      { p: "Where permitted by applicable law, we may send you:" },
      {
        list: [
          "New-book announcements;",
          "Offers;",
          "Promotional campaigns;",
          "SAFAR EBOOKS updates;",
          "Recommendations;",
          "Newsletters.",
        ],
      },
      {
        p: "You may unsubscribe from promotional communications by using the unsubscribe mechanism provided in the communication or by contacting us.",
      },
      {
        p: "Service-related communications, such as order confirmations, security alerts and important account notifications, may continue where necessary to provide the service or comply with legal obligations.",
      },
    ],
  },
  {
    title: "6. Sharing of Information",
    blocks: [
      {
        p: "We may share information with trusted service providers where reasonably necessary to operate SAFAR EBOOKS.",
      },
      { p: "These may include:" },
      {
        list: [
          "Payment processors;",
          "Hosting and cloud-service providers;",
          "Database providers;",
          "Analytics providers;",
          "Email and communication providers;",
          "Shipping and logistics providers;",
          "Customer-support providers;",
          "Security and fraud-prevention providers;",
          "Technology and infrastructure providers;",
          "Professional advisers;",
          "Government authorities or law-enforcement agencies where legally required.",
        ],
      },
      {
        p: "We do not intend to sell your personal information as a standalone commercial product.",
      },
      {
        p: "Third-party service providers may process information according to their own terms and privacy policies.",
      },
    ],
  },
  {
    title: "7. Payment Information",
    blocks: [
      { p: "Payments may be handled by third-party payment gateways." },
      {
        p: "Where payment information is processed by such providers, the payment provider may collect and process information necessary to complete the transaction.",
      },
      {
        p: "SAFAR TECHLAB LLP does not intentionally store complete payment-card credentials unless specifically required and lawfully permitted for a particular payment arrangement.",
      },
      {
        p: "Users should review the privacy policies of the relevant payment provider where applicable.",
      },
    ],
  },
  {
    title: "8. Data Security",
    blocks: [
      {
        p: "We take reasonable technical and organizational measures designed to protect personal information against unauthorized access, alteration, disclosure, loss or misuse.",
      },
      { p: "Security measures may include:" },
      {
        list: [
          "Access controls;",
          "Authentication mechanisms;",
          "Encryption or secure transmission where appropriate;",
          "Monitoring;",
          "Logging;",
          "Security updates;",
          "Restricted access to personal information.",
        ],
      },
      {
        p: "However, no internet-based system can be guaranteed to be completely secure.",
      },
    ],
  },
  {
    title: "9. Data Retention",
    blocks: [
      {
        p: "We retain personal information only for as long as reasonably necessary for the purposes for which it was collected, including:",
      },
      {
        list: [
          "Providing services;",
          "Maintaining accounts;",
          "Completing transactions;",
          "Customer support;",
          "Security and fraud prevention;",
          "Legal and regulatory compliance;",
          "Resolving disputes;",
          "Enforcing agreements;",
          "Maintaining appropriate business records.",
        ],
      },
      {
        p: "Retention periods may vary depending on the type of information and applicable legal requirements.",
      },
      {
        p: "When information is no longer required, we may delete, anonymize or securely dispose of it, subject to applicable law.",
      },
    ],
  },
  {
    title: "10. Children’s Privacy",
    blocks: [
      {
        p: "SAFAR EBOOKS is not intended to knowingly collect personal information from children in circumstances where such collection is prohibited by applicable law.",
      },
      {
        p: "Where parental or guardian consent is required by applicable law, we will seek to comply with the applicable requirements.",
      },
      {
        p: "If you believe that a child has provided personal information to us in circumstances where it should not have been collected, please contact us.",
      },
    ],
  },
  {
    title: "11. Your Rights",
    blocks: [
      {
        p: "Subject to applicable law, users may have rights relating to their personal information, including rights to:",
      },
      {
        list: [
          "Obtain information about processing;",
          "Request access to certain personal information;",
          "Request correction of inaccurate information;",
          "Request deletion where legally applicable;",
          "Withdraw consent where processing is based on consent;",
          "Request information regarding certain disclosures or processing;",
          "Raise a grievance regarding processing of personal information.",
        ],
      },
      { p: "Requests may be submitted through our contact details below." },
      {
        p: "We may need to verify your identity before processing certain requests.",
      },
    ],
  },
  {
    title: "12. Data Transfers",
    blocks: [
      {
        p: "Your information may be processed or stored through service providers located in India or other jurisdictions, subject to applicable law and appropriate safeguards where required.",
      },
    ],
  },
  {
    title: "13. Third-Party Links",
    blocks: [
      {
        p: "SAFAR EBOOKS may contain links to third-party websites, applications or services.",
      },
      {
        p: "We are not responsible for the privacy practices, security or content of third-party services.",
      },
      {
        p: "We encourage users to review the privacy policies of third-party services before providing personal information.",
      },
    ],
  },
  {
    title: "14. Analytics",
    blocks: [
      {
        p: "We may use analytics and performance tools to understand how users interact with our Platform.",
      },
      {
        p: "Such tools may collect information such as device type, pages viewed, application events, approximate location and technical information.",
      },
      {
        p: "Where required, we will implement appropriate notice, consent or opt-out mechanisms.",
      },
    ],
  },
  {
    title: "15. Business Transfers",
    blocks: [
      {
        p: "If SAFAR TECHLAB LLP undergoes a merger, restructuring, acquisition, financing, sale of assets or other corporate transaction, personal information may be transferred as part of that transaction, subject to applicable law.",
      },
    ],
  },
  {
    title: "16. Legal Disclosures",
    blocks: [
      {
        p: "We may disclose personal information where reasonably necessary to:",
      },
      {
        list: [
          "Comply with applicable law;",
          "Respond to lawful government requests;",
          "Protect our legal rights;",
          "Prevent fraud or abuse;",
          "Protect users or the public;",
          "Investigate security incidents;",
          "Enforce our Terms & Conditions.",
        ],
      },
    ],
  },
  {
    title: "17. Changes to This Privacy Policy",
    blocks: [
      { p: "We may update this Privacy Policy from time to time." },
      {
        p: "The updated version will be published on the Platform with a revised “Last Updated” date.",
      },
      {
        p: "Where required by applicable law, we may provide additional notice regarding material changes.",
      },
    ],
  },
  {
    title: "18. Grievance and Privacy Contact",
    blocks: [
      {
        p: "For privacy-related questions, requests or complaints, please contact:",
      },
      {
        lines: [
          "SAFAR TECHLAB LLP",
          "Operator of SAFAR EBOOKS",
          "",
          `Privacy / Grievance Email: {{email}}`,
          `Customer Support Email: {{email}}`,
          `Registered Office: {{address}}`,
        ],
      },
      {
        p: "We will endeavour to respond to privacy-related requests and grievances within the period required under applicable law.",
      },
    ],
  },
  {
    title: "19. Contact Us",
    blocks: [
      { p: "For questions regarding this Privacy Policy:" },
      {
        lines: [
          "SAFAR TECHLAB LLP",
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
  if (block.sub) {
    return (
      <h6 key={key} className="legal-subheading">
        {block.sub}
      </h6>
    );
  }
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

function PrivacyPolicy() {
  const info = useSiteInfo();

  return (
    <div className="legal-page">
    <Container className="legal-container">
      <h1 className="legal-title">Privacy Policy</h1>
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
        By continuing to use SAFAR EBOOKS, you acknowledge that you have read
        this Privacy Policy.
      </p>
    </Container>
    </div>
  );
}

export default PrivacyPolicy;
