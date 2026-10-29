const provider = String(process.env.EMAIL_PROVIDER || "smtp").trim().toLowerCase();

const parseAddress = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: "", email: text };
};

const toList = (value) => (Array.isArray(value) ? value : [value]).filter(Boolean);

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
