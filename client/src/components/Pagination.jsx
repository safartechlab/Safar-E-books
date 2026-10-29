import "../styles/Pagination.css";

// Numbered pagination with First / Prev / Next / Last, an ellipsis for long
// ranges and a "Showing X-Y of Z" summary. Always renders (even for one page)
// so admins can see the totals.
//
// props: page, totalPages, totalCount, pageSize, onChange(newPage)
function Pagination({ page, totalPages, totalCount, pageSize, onChange }) {
  const pages = [];
  const windowSize = 1; // neighbours on each side of the current page

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= windowSize) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="app-pagination">
      <span className="app-pagination-summary">
        Showing {from}–{to} of {totalCount}
      </span>

      <div className="app-pagination-controls">
        <button type="button" disabled={page <= 1} onClick={() => onChange(1)} aria-label="First page">«</button>
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ Prev</button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="app-pagination-dots">…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={p === page ? "active" : ""}
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next ›</button>
        <button type="button" disabled={page >= totalPages} onClick={() => onChange(totalPages)} aria-label="Last page">»</button>
      </div>
    </div>
  );
}

export default Pagination;
