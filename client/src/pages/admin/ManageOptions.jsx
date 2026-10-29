import { useCallback, useEffect, useState } from "react";
import { Row, Col, Form, Button, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { FaPlus, FaEdit, FaTrashAlt, FaCheck, FaTimes } from "react-icons/fa";
import API from "../../api/axios";
import "../../styles/ManageOptions.css";

const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

function OptionPanel({ title, type, items, onChanged }) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setBusy(true);
    try {
      await API.post("/options", { type, name });
      toast.success(`"${name}" added`);
      setNewName("");
      await onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Could not add this item."));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setEditName(item.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleRename = async (item) => {
    const name = editName.trim();
    if (!name || name === item.name) return cancelEdit();

    if (item.bookCount > 0) {
      const ok = window.confirm(
        `Rename "${item.name}" to "${name}"?\n\nThis will also update ${item.bookCount} book${item.bookCount === 1 ? "" : "s"}.`
      );
      if (!ok) return;
    }

    setBusy(true);
    try {
      const res = await API.put(`/options/${item._id}`, { name });
      const n = res.data.updatedBooks || 0;
      toast.success(n > 0 ? `Renamed. ${n} book${n === 1 ? "" : "s"} updated.` : "Renamed.");
      cancelEdit();
      await onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Could not rename."));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;

    setBusy(true);
    try {
      await API.delete(`/options/${item._id}`);
      toast.success(`"${item.name}" deleted`);
      await onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="options-panel shadow-sm">
      <h5 className="options-panel-title">
        {title} <Badge bg="secondary" pill>{items.length}</Badge>
      </h5>

      <form className="options-add-row" onSubmit={handleAdd}>
        <Form.Control
          type="text"
          placeholder={`New ${type} (e.g. ${type === "category" ? "Poetry" : "Marathi"})`}
          value={newName}
          maxLength={60}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button type="submit" className="options-add-btn" disabled={busy || !newName.trim()}>
          <FaPlus size={12} /> Add
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted mb-0">Nothing here yet.</p>
      ) : (
        <ul className="options-list">
          {items.map((item) => (
            <li key={item._id} className="options-item">
              {editingId === item._id ? (
                <>
                  <Form.Control
                    size="sm"
                    autoFocus
                    value={editName}
                    maxLength={60}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(item);
                      if (e.key === "Escape") cancelEdit();
                    }}
                  />
                  <button
                    type="button"
                    className="options-icon-btn ok"
                    onClick={() => handleRename(item)}
                    disabled={busy}
                    aria-label="Save"
                  >
                    <FaCheck size={13} />
                  </button>
                  <button
                    type="button"
                    className="options-icon-btn"
                    onClick={cancelEdit}
                    aria-label="Cancel"
                  >
                    <FaTimes size={13} />
                  </button>
                </>
              ) : (
                <>
                  <span className="options-name">{item.name}</span>
                  <span className="options-count">
                    {item.bookCount ?? 0} book{item.bookCount === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    className="options-icon-btn"
                    onClick={() => startEdit(item)}
                    disabled={busy}
                    aria-label={`Rename ${item.name}`}
                  >
                    <FaEdit size={13} />
                  </button>
                  <button
                    type="button"
                    className="options-icon-btn danger"
                    onClick={() => handleDelete(item)}
                    disabled={busy}
                    aria-label={`Delete ${item.name}`}
                  >
                    <FaTrashAlt size={13} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ManageOptions() {
  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOptions = useCallback(async () => {
    try {
      const res = await API.get("/options");
      setCategories(res.data.categories || []);
      setLanguages(res.data.languages || []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load categories and languages."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return (
    <div className="manage-options-bg">
      <h1 className="manage-options-heading fs-2 mb-1">Categories &amp; Languages</h1>
      <p className="text-muted mb-4">
        These lists feed the Add Book / Edit Book forms and the Library filters.
        A category or language can only be deleted once no book uses it.
      </p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <Row className="g-4">
          <Col md={6}>
            <OptionPanel
              title="Categories"
              type="category"
              items={categories}
              onChanged={fetchOptions}
            />
          </Col>
          <Col md={6}>
            <OptionPanel
              title="Languages"
              type="language"
              items={languages}
              onChanged={fetchOptions}
            />
          </Col>
        </Row>
      )}
    </div>
  );
}

export default ManageOptions;