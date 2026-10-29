// One mailer for the whole app. Every place that sends email calls
//   transporter.sendMail({ from, to, subject, html, text })
//
// EMAIL_PROVIDER decides HOW the message leaves the server:
//
//   smtp   (default) Gmail over SMTP, using EMAIL_USER + EMAIL_PASS.
//          Works on your own PC and on a VPS. It does NOT work on hosts that
//          block mail ports - e.g. Render's free plan.
//
//   resend  Sends through Resend's web API (HTTPS, port 443). Needs
//           RESEND_API_KEY and EMAIL_FROM (an address on a domain you have
//           verified in Resend, e.g. "SAFAR EBOOKS <no-reply@safarebooks.com>").
//
//   brevo   Same idea with Brevo (Sendinblue). Needs BREVO_API_KEY and
//           EMAIL_FROM (a sender / domain verified in Brevo).
//
// The web-API options use plain HTTPS, so they work on ANY host, free or paid.

const provider = String(process.env.EMAIL_PROVIDER || "smtp").trim().toLowerCase();

// "Support Team <a@b.com>"  ->  { name: "Support Team", email: "a@b.com" }
const parseAddress = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: "", email: text };
};

const toList = (value) => (Array.isArray(value) ? value : [value]).filter(Boolean);

// The "from" address must belong to the domain/sender verified with the
// email service, so for the web-API providers EMAIL_FROM wins over whatever
// the calling code passed (which is just EMAIL_USER, your Gmail address).
const resolveFrom = (passedFrom) => process.env.EMAIL_FROM || passedFrom;

const postJson = async (url, headers, body, label) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${label} email API error ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json().catch(() => ({}));
};

const sendWithResend = ({ from, to, subject, html, text }) =>
  postJson(
    "https://api.resend.com/emails",
    { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    { from: resolveFrom(from), to: toList(to), subject, html, text },
    "Resend"
  );

const sendWithBrevo = ({ from, to, subject, html, text }) => {
  const sender = parseAddress(resolveFrom(from));
  return postJson(
    "https://api.brevo.com/v3/smtp/email",
    { "api-key": process.env.BREVO_API_KEY },
    {
      sender: sender.name ? sender : { email: sender.email },
      to: toList(to).map((email) => ({ email })),
      subject,
      htmlContent: html,
      textContent: text,
    },
    "Brevo"
  );
};

let transporter;

if (provider === "resend") {
  transporter = { sendMail: sendWithResend };
} else if (provider === "brevo") {
  transporter = { sendMail: sendWithBrevo };
} else {
  // Loaded only when needed, so the web-API options never touch SMTP at all.
  const nodemailer = require("nodemailer");
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

module.exports = transporter;
module.exports.emailProvider = provider;
