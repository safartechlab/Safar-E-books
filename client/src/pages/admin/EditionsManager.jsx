import { useEffect, useState, useCallback } from "react";
import API from "../../api/axios";
import { toast } from "react-toastify";
import useOptions from "../../hooks/useOptions";
import { BookSection } from "../../components/BookFormParts";
import { getFileUrl } from "../../utils/fileUrl";

// Admin: manage the language editions of ONE book.
// Each language has its own PDF, page count and (optional) cover image.
// The page count is always read from the PDF automatically; admins cannot type it.
// A purchase belongs to the book, so every language is unlocked at once.
//
// Everything here is saved immediately (it does not wait for "Update Book"):
//   - add a language (language first, then cover + PDF)
//   - rename a language
//   - replace the PDF / replace or reset the cover
//   - make a language the default one
//   - remove a language
function EditionsManager({ bookId }) {
  const { languages } = useOptions();
  const [editions, setEditions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newLang, setNewLang] = useState("");
  const [newPdf, setNewPdf] = useState(null);
  const [newCover, setNewCover] = useState(null);
  const [fileKey, setFileKey] = useState(0);

  const load = useCallback(async () => {
    try {
      let res = await API.get(`/books/${bookId}`);
      let b = res.data?.book || res.data;

      // Old book (added before languages existed): upgrade it automatically,
      // so the admin never has to run a script to manage its languages.
      if (!b.editions?.length) {
        await API.post(`/books/${bookId}/editions/init`);
        res = await API.get(`/books/${bookId}`);
        b = res.data?.book || res.data;
      }
      setEditions(b.editions || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load languages");
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  const used = editions.map((e) => String(e.language).toLowerCase());
  const available = languages.filter((l) => !used.includes(l.toLowerCase()));

  const send = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
      await load(); // put the screen back in sync with the server
    } finally {
      setBusy(false);
    }
  };

  const multipart = { headers: { "Content-Type": "multipart/form-data" } };
  const putEdition = (edition, fd) =>
    API.put(`/books/${bookId}/editions/${edition._id}`, fd, multipart);

  const addEdition = () => {
    if (!newLang) return toast.warning("Choose a language");
    if (!newPdf) return toast.warning("Choose the PDF for this language");
    const fd = new FormData();
    fd.append("language", newLang);
    fd.append("pdfFile", newPdf);
    if (newCover) fd.append("coverImage", newCover);
    send(async () => {
      await API.post(`/books/${bookId}/editions`, fd, multipart);
      setNewLang("");
      setNewPdf(null);
      setNewCover(null);
      setFileKey((k) => k + 1);
    }, "Language added");
  };

  const replacePdf = (edition, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("pdfFile", file);
    send(() => putEdition(edition, fd), "PDF replaced (page count updated from the file)");
  };

  const replaceCover = (edition, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("coverImage", file);
    send(() => putEdition(edition, fd), "Cover updated");
  };

  const removeCover = (edition) => {
    const fd = new FormData();
    fd.append("removeCover", "true");
    send(() => putEdition(edition, fd), "Cover reset to the main cover");
  };

  const renameLanguage = (edition, language) => {
    if (!language || language === edition.language) return;
    const fd = new FormData();
    fd.append("language", language);
    send(() => putEdition(edition, fd), `Language changed to ${language}`);
  };

  const makeDefault = (edition) => {
    const fd = new FormData();
    fd.append("makeDefault", "true");
    send(() => putEdition(edition, fd), `${edition.language} is now the default language`);
  };

  const remove = (edition) => {
    if (!window.confirm(`Remove the ${edition.language} edition? Its PDF and cover will be deleted.`)) return;
    send(() => API.delete(`/books/${bookId}/editions/${edition._id}`), "Language removed");
  };

  // Languages this row may be renamed to: its own + the ones not used yet.
  const renameChoices = (edition) => [edition.language, ...available];

  return (
    <BookSection
      step="4"
      title="Languages, PDFs & covers"
      hint="One book, many languages. A purchase unlocks every language. Page counts are read from each PDF automatically. Changes here are saved immediately."
      className="mt-4"
    >
      {loading && <div className="form-text">Loading languages…</div>}

      {editions.map((e, i) => (
        <div key={e._id || e.language} className="bk-edition-row">
          <div className="d-flex align-items-center flex-wrap gap-2">
            <strong>{e.language}</strong>
            {i === 0 && <span className="badge text-bg-secondary">Default</span>}
            <span className={`badge ${e.pdfUrl ? "text-bg-success" : "text-bg-danger"}`}>
              {e.pdfUrl ? "PDF on file" : "No PDF yet"}
            </span>
            {e.pdfUrl && (
              <span className="badge text-bg-light border">
                {Number(e.pages) > 0 ? `${e.pages} pages (auto)` : "Pages: auto"}
              </span>
            )}
            {i > 0 && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm ms-auto"
                onClick={() => makeDefault(e)}
                disabled={busy}
              >
                Make default
              </button>
            )}
          </div>

          <div className="row g-2 align-items-end mt-1">
            <div className="col-12 col-md-3">
              <label className="form-label small mb-1">Language</label>
              <select
                className="form-select form-select-sm"
                value={e.language}
                onChange={(ev) => renameLanguage(e, ev.target.value)}
                disabled={busy}
              >
                {renameChoices(e).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md">
              <label className="form-label small mb-1">
                Cover for {e.language} {!e.coverImage && "(using the main cover)"}
              </label>
              <div className="d-flex align-items-center gap-2">
                {e.coverImage && (
                  <img
                    src={getFileUrl(e.coverImage)}
                    alt={`${e.language} cover`}
                    style={{ width: 36, height: 50, objectFit: "cover", borderRadius: 4 }}
                  />
                )}
                <input
                  type="file"
                  className="form-control form-control-sm"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(ev) => {
                    replaceCover(e, ev.target.files[0]);
                    ev.target.value = "";
                  }}
                />
                {e.coverImage && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => removeCover(e)}
                    disabled={busy}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="col-12 col-md">
              <label className="form-label small mb-1">
                {e.pdfUrl ? `Replace PDF (${e.language})` : `Upload PDF (${e.language})`}
              </label>
              <input
                type="file"
                className="form-control form-control-sm"
                accept="application/pdf,.pdf"
                disabled={busy}
                onChange={(ev) => {
                  replacePdf(e, ev.target.files[0]);
                  ev.target.value = "";
                }}
              />
            </div>

            {editions.length > 1 && (
              <div className="col-auto ms-auto">
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => remove(e)}
                  disabled={busy}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {!e.pdfUrl && (
            <div className="form-text text-danger">
              Readers can't open this language until you upload its PDF.
            </div>
          )}
        </div>
      ))}

      {/* Add a language: language first, then its cover and PDF */}
      <div className="bk-edition-add">
        <div className="small fw-semibold mb-2">Add another language</div>

        {available.length > 0 ? (
          <div className="bk-remaining-langs mb-3">
            <div className="form-label small mb-2">Remaining languages — click one to select it:</div>
            <div className="d-flex flex-wrap gap-2">
              {available.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`btn btn-sm ${newLang === l ? "btn-secondary" : "btn-outline-secondary"}`}
                  onClick={() => setNewLang(l)}
                  disabled={busy}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="form-text mb-2">
            All available languages are already added. (Add more under Categories &amp; Languages.)
          </div>
        )}

        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label small mb-1">Language *</label>
            <select
              className="form-select form-select-sm"
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              disabled={busy}
            >
              <option value="">Language…</option>
              {available.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md">
            <label className="form-label small mb-1">
              Cover{newLang ? ` (${newLang})` : ""} (optional)
            </label>
            <input
              key={`c${fileKey}`}
              type="file"
              className="form-control form-control-sm"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setNewCover(e.target.files[0] || null)}
              disabled={busy || !newLang}
            />
          </div>
          <div className="col-12 col-md">
            <label className="form-label small mb-1">
              PDF{newLang ? ` (${newLang})` : ""} *
            </label>
            <input
              key={fileKey}
              type="file"
              className="form-control form-control-sm"
              accept="application/pdf,.pdf"
              onChange={(e) => setNewPdf(e.target.files[0] || null)}
              disabled={busy || !newLang}
            />
          </div>
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-sm bk-btn-primary"
              onClick={addEdition}
              disabled={busy || available.length === 0 || !newLang}
            >
              {busy ? "Working…" : "Add language"}
            </button>
          </div>
        </div>
        <div className="form-text">Pages are counted automatically from the PDF.</div>
      </div>
    </BookSection>
  );
}

export default EditionsManager;