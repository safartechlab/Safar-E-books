import { useEffect, useState } from "react";
import { Table, Form, Button, Badge } from "react-bootstrap";
import API from "../../api/axios";
import "../../styles/ManageBooks.css"; // brand colors only
import { useNavigate } from "react-router-dom";
import AddBookModal from "./AddBookModal";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

function ManageBooks() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 5;

  useEffect(() => {
    fetchBooks();
  }, [showArchived]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const fetchBooks = async () => {
    try {
      const response = await API.get("/books", {
        params: showArchived ? { includeArchived: "true" } : undefined,
      });
      setBooks(response.data.books || response.data || []);
    } catch (error) {
      toast.error("Failed to load books");
    }
  };

  const restoreBook = async (book) => {
    try {
      await API.post(`/books/${book._id}/restore`);
      toast.success(`"${book.title}" restored to the catalog.`);
      fetchBooks();
    } catch (error) {
      toast.error("Failed to restore book.");
    }
  };

  const getImageUrl = (coverPath) => {
    if (!coverPath) return "/placeholder-cover.jpg";
    if (coverPath.startsWith("http")) return coverPath;
    const baseURL = API.defaults.baseURL
      ? API.defaults.baseURL.replace(/\/api\/?$/, "")
      : "http://localhost:5000";
    return `${baseURL}${coverPath.startsWith("/") ? "" : "/"}${coverPath}`;
  };

  const deleteBook = async (book) => {
  // "Delete" now archives the book (server-side: isArchived = true) — it
  // stays owned by anyone who already purchased it and can be restored
  // later. It's just hidden from the public catalog immediately.
  let warningText = "It will be hidden from the catalog immediately. You can restore it later from \"Show archived\" — nothing purchased by users is affected.";

  try {
    const res = await API.get(`/books/${book._id}/purchase-count`);
    const count = res.data.count || 0;
    if (count > 0) {
      warningText = `${count} user${count === 1 ? " has" : "s have"} purchased "${book.title}". They'll keep full access to it. It will just be hidden from the public catalog — you can restore it any time from "Show archived".`;
    }
  } catch (error) {
  }

  const result = await Swal.fire({
    title: "Archive Book?",
    text: warningText,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#D32F2F",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Archive",
  });

  if (!result.isConfirmed) return;

  try {
    await API.delete(`/books/${book._id}`);
    toast.success("Book archived — hidden from the catalog, restorable any time.");
    fetchBooks();
  } catch (error) {
    toast.error("Failed to archive book.");
  }
};
  const permanentlyDeleteBook = async (book) => {
    const result = await Swal.fire({
      title: "Permanently delete this book?",
      text: `This removes "${book.title}" and its files permanently. This action cannot be undone. Books with purchase/order history cannot be deleted. (Only archived books can be deleted.)`,
      icon: "error",
      showCancelButton: true,
      confirmButtonText: "Delete permanently",
      confirmButtonColor: "#b42318",
      cancelButtonText: "Keep book",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await API.delete(`/books/${book._id}/permanent`);
      toast.success("Book permanently deleted.");
      fetchBooks();
    } catch (error) {
      toast.error(error.response?.data?.message || "This book could not be permanently deleted.");
    }
  };

  const filteredBooks = books.filter(
    (book) =>
      book.title?.toLowerCase().includes(search.toLowerCase()) ||
      book.author?.toLowerCase().includes(search.toLowerCase()) ||
      book.category?.toLowerCase().includes(search.toLowerCase())
  );

  // ==========================
  // Pagination
  // ==========================
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage) || 1;
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * booksPerPage,
    currentPage * booksPerPage
  );

  return (
    <div className="manage-books-bg p-4" style={{ minHeight: "100vh" }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <h1 className="manage-books-heading fs-2 mb-0">Manage Books</h1>

        <div className="d-flex gap-3 flex-wrap align-items-center">
          <Form.Control
            type="text"
            placeholder="Search by title, author or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 300, maxWidth: "100%" }}
          />
          <Form.Check
            type="switch"
            id="show-archived-switch"
            label="Show archived"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          <Button className="fw-semibold manage-books-add-btn" onClick={() => setShowModal(true)}>
            + Add Book
          </Button>
        </div>
      </div>

      <div className="table-responsive rounded-3 shadow-sm">
        <Table hover className="align-middle mb-0 bg-white">
          <thead className="manage-books-thead">
            <tr>
              <th>Cover</th>
              <th>Title</th>
              <th>Author</th>
              <th>Category</th>
              <th>Language</th>
              <th>Access</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBooks.length > 0 ? (
              paginatedBooks.map((book) => (
                <tr key={book._id} className="text-center">
                  <td>
                    <img
                      src={getImageUrl(book.coverImage)}
                      alt={book.title}
                      className="rounded-2"
                      style={{ width: 60, height: 85, objectFit: "cover" }}
                    />
                  </td>
                  <td>
                    {book.title}{" "}
                    {book.isArchived && (
                      <Badge bg="secondary" pill>Archived</Badge>
                    )}
                  </td>
                  <td>{book.author}</td>
                  <td>{book.category}</td>
                  <td>
                    {(book.editions?.length
                      ? book.editions
                      : [{ language: book.language, pdfUrl: book.pdfUrl }]
                    ).map((e) => (
                      <div key={e.language} className="small">
                        {e.language}
                        {!e.pdfUrl && <span className="text-danger"> (no PDF)</span>}
                      </div>
                    ))}
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-1 justify-content-center">
                      {book.isFree && (
                        <Badge bg="success" pill>
                          Free
                        </Badge>
                      )}
                      {book.isSubscriptionRequired && (
                        <Badge bg="warning" text="dark" pill>
                          Subscription
                        </Badge>
                      )}
                      {!!book.price && (
                        <Badge bg="info" text="dark" pill>
                          ₹{book.price}
                        </Badge>
                      )}
                      {!book.isFree && !book.isSubscriptionRequired && !book.price && (
                        <span className="text-muted small">—</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Button
                      size="sm"
                      className="mx-1 manage-books-edit-btn"
                      onClick={() => navigate(`/admin/edit-book/${book._id}`)}
                    >
                      Edit
                    </Button>
                    {book.isArchived ? (
                      <>
                        <Button size="sm" variant="success" className="mx-1 mb-1" onClick={() => restoreBook(book)}>
                          Restore
                        </Button>
                        <Button size="sm" variant="outline-danger" className="mx-1 mb-1" onClick={() => permanentlyDeleteBook(book)}>
                          Delete permanently
                        </Button>
                      </>
                                        ) : (
                      <>
                        <Button size="sm" variant="outline-secondary" className="mx-1 mb-1" onClick={() => deleteBook(book)}>
                          Archive
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  No books found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {filteredBooks.length > booksPerPage && (
        <div className="admin-pagination d-flex justify-content-center align-items-center gap-3 mt-3">
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          >
            Next
          </button>
        </div>
      )}

      {showModal && (
        <AddBookModal onClose={() => setShowModal(false)} fetchBooks={fetchBooks} />
      )}
    </div>
  );
}

export default ManageBooks;