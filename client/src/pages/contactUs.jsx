import { useState, useEffect, useRef } from "react";
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import { Phone, Mail, MapPin } from "lucide-react";
import API from "../api/axios";
import useSiteInfo from "../hooks/useSiteInfo";
import { toast } from "react-toastify";

import contactHeroImg from "../assets/images/image.jpg";
import "../styles/ContactUs.css";

const QUERY_TYPES = [
  { value: "book", label: "Book Inquiry" },
  { value: "payment", label: "Payment / Subscription" },
  { value: "technical", label: "Technical Issue" },
  { value: "feedback", label: "Feedback / Suggestion" },
  { value: "other", label: "Other" },
];

const EMPTY_FORM = { name: "", email: "", queryType: "", bookName: "", message: "" };

function ContactUs() {
  const siteInfo = useSiteInfo();
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const bookBoxRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQueryTypeChange = (e) => {
    setFormData({ ...formData, queryType: e.target.value, bookName: "" });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (formData.queryType !== "book") return;

    const term = formData.bookName.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await API.get("/books/suggestions", { params: { q: term } });
        if (!cancelled) {
          setSuggestions(res.data.books || []);
          setActiveIndex(-1);
        }
      } catch (error) {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.bookName, formData.queryType]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bookBoxRef.current && !bookBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectSuggestion = (book) => {
    setFormData((prev) => ({ ...prev, bookName: book.title }));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleBookKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/contact", formData);
      toast.success("Message sent successfully!");
      setFormData(EMPTY_FORM);
      setSuggestions([]);
    } catch (error) {
      toast.error("Failed to send message.");
    }
  };

  const infoItems = [
    siteInfo.contactPhone && {
      icon: <Phone size={20} />,
      title: siteInfo.contactPhone,
      text: "Call or Message Us",
    },
    siteInfo.supportEmail && {
      icon: <Mail size={20} />,
      title: siteInfo.supportEmail,
      text: "Send Your Query",
    },
    siteInfo.address && {
      icon: <MapPin size={20} />,
      title: siteInfo.address,
      text: "Our Location",
    },
  ].filter(Boolean);

  return (
    <div className="contact-page">
      {/* 1. HERO HEADER SECTION */}
      <section className="contact-hero pb-5">
        <Container>
          <Row className="align-items-start align-items-md-center">
            <Col xs={7} md={6}>
              <div className="contact-hero-text">
                <h1 className="contact-hero-title">Contact Us</h1>
                <p className="contact-hero-p">
                  Have questions about a specific title, order inquiries, or
                  looking for book recommendations? Reach out to our literary
                  team and we will be happy to assist you.
                </p>
              </div>
            </Col>

            <Col xs={5} md={6} className="d-flex justify-content-end">
              <div className="contact-cover-frame">
                <img src={contactHeroImg} alt="Bookstore Arch Library" />
              </div>
            </Col>
          </Row>
        </Container>

        <div className="contact-hero-wave">
          <svg viewBox="0 0 1440 180" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,60 C320,140 420,10 720,80 C1020,150 1120,20 1440,60 L1440,180 L0,180 Z" fill="var(--color-light-blush)" />
          </svg>
        </div>
      </section>

      {/* 2. MAIN CONTENT SECTION */}
      <section className="py-5">
        <Container>
          <Row className="g-5 align-items-center">
            <Col md={6}>
              <Card className="contact-form-card border-0">
                <Card.Body className="p-4 p-md-5">
                  <h2 className="contact-form-title">Get In Touch !</h2>
                  <p className="contact-form-p">
                    Found a typo, have a billing question, or just want to
                    recommend a book for us to add? Send us a message below.
                  </p>

                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Control
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="rounded-pill contact-input"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Control
                        type="text"
                        name="name"
                        placeholder="Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="rounded-pill contact-input"
                      />
                    </Form.Group>

                    {/* NEW: Query type */}
                    <Form.Group className="mb-3">
                      <Form.Select
                        name="queryType"
                        value={formData.queryType}
                        onChange={handleQueryTypeChange}
                        required
                        className="rounded-pill contact-input"
                      >
                        <option value="" disabled>
                          Select query type
                        </option>
                        {QUERY_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {/* NEW: Book name with autosuggest (only for Book Query) */}
                    {formData.queryType === "book" && (
                      <div className="mb-3 contact-autosuggest" ref={bookBoxRef}>
                        <Form.Control
                          type="text"
                          name="bookName"
                          placeholder="Book name (start typing, e.g. India)"
                          value={formData.bookName}
                          onChange={(e) => {
                            handleChange(e);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          onKeyDown={handleBookKeyDown}
                          autoComplete="off"
                          required
                          maxLength={200}
                          className="rounded-pill contact-input"
                        />

                        {showSuggestions && formData.bookName.trim().length >= 2 && (
                          <ul className="contact-suggestions" role="listbox">
                            {loadingSuggestions ? (
                              <li className="contact-suggestion-empty">Searching...</li>
                            ) : suggestions.length > 0 ? (
                              suggestions.map((book, idx) => (
                                <li
                                  key={book._id}
                                  role="option"
                                  aria-selected={idx === activeIndex}
                                  className={`contact-suggestion-item ${
                                    idx === activeIndex ? "active" : ""
                                  }`}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    selectSuggestion(book);
                                  }}
                                  onMouseEnter={() => setActiveIndex(idx)}
                                >
                                  <span className="contact-suggestion-title">{book.title}</span>
                                  <span className="contact-suggestion-author">{book.author}</span>
                                </li>
                              ))
                            ) : (
                              <li className="contact-suggestion-empty">
                                No matching books found. You can still send the name you typed.
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    )}

                    <Form.Group className="mb-4">
                      <Form.Control
                        as="textarea"
                        rows={5}
                        name="message"
                        placeholder="Message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        className="rounded-4 contact-input"
                      />
                    </Form.Group>

                    <Button type="submit" className="rounded-pill fw-semibold px-4 contact-submit-btn">
                      Send Message
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <div className="ps-md-4">
                <h2 className="contact-form-title fs-2">Contact Information</h2>
                <p className="contact-form-p mb-4">
                  Visit our bookstore, reach out via email, or give us a call.
                  Our team is available Monday to Saturday to help you find
                  your next great read.
                </p>

                <div className="d-flex flex-column gap-4 mt-4">
                  {infoItems.map((item) => (
                    <div className="d-flex align-items-center gap-3" key={item.title}>
                      <div className="contact-icon-circle rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <h6 className="contact-info-title fw-bold mb-0">{item.title}</h6>
                        <p className="contact-info-sub small mb-0">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
}

export default ContactUs;