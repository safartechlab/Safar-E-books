import "../styles/AddBook.css";

// A white card with a numbered title, used by Add Book and Edit Book.
export function BookSection({ step, title, hint, children, className = "" }) {
  return (
    <section className={`bk-section ${className}`}>
      <h3 className="bk-section-title">
        {step && <span className="bk-step">{step}</span>}
        <span>{title}</span>
      </h3>
      {hint && <p className="bk-hint">{hint}</p>}
      {children}
    </section>
  );
}

const ACCESS_OPTIONS = [
  { value: "free", icon: "🌍", name: "Free", desc: "Anyone can read it on the website." },
  { value: "subscription", icon: "👑", name: "VIP (subscription)", desc: "Only subscribers can read the full book." },
  { value: "paid", icon: "💳", name: "Paid (one-time)", desc: "Readers buy this book once to unlock it." },
  { value: "external_only", icon: "🛍️", name: "External link only", desc: "Not readable on the website; store links only." },
];

// Four clickable cards instead of a dropdown. It calls the same handlers the
// old <select> used, so the saving logic does not change.
export function BookAccessPicker({ accessType, price, onAccessTypeChange, onChange }) {
  return (
    <>
      <div className="bk-access-grid" role="radiogroup" aria-label="Website access and pricing model">
        {ACCESS_OPTIONS.map((o) => (
          <label key={o.value} className="bk-access-option">
            <input
              type="radio"
              name="accessType"
              value={o.value}
              checked={accessType === o.value}
              onChange={onAccessTypeChange}
            />
            <span className="bk-access-card">
              <span className="bk-access-icon">{o.icon}</span>
              <span>
                <span className="bk-access-name d-block">{o.name}</span>
                <span className="bk-access-desc d-block">{o.desc}</span>
              </span>
            </span>
          </label>
        ))}
      </div>

      {accessType === "paid" && (
        <div className="mt-3" style={{ maxWidth: 240 }}>
          <label className="form-label" htmlFor="bk-price">Price (₹) *</label>
          <div className="input-group">
            <span className="input-group-text">₹</span>
            <input
              id="bk-price"
              type="number"
              className="form-control"
              name="price"
              value={price}
              onChange={onChange}
              min="1"
              step="1"
              required
            />
          </div>
        </div>
      )}
    </>
  );
}