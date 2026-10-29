import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import API from "../api/axios";
import "../styles/CategoryChips.css";

const VISIBLE_COUNT = 3;

function CategoryChips() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        const res = await API.get("/books");
        const books = res.data?.books || res.data || [];
        const counts = new Map();
        books.forEach((book) => {
          const name = String(book?.category || "").trim();
          if (name && !book?.isArchived) counts.set(name, (counts.get(name) || 0) + 1);
        });
        const list = [...counts.entries()]
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([name]) => name);
        if (isMounted) setCategories(list);
      } catch {
        if (isMounted) setCategories([]);
      }
    };
    fetchCategories();
    return () => { isMounted = false; };
  }, []);

  if (!categories.length) return null;
  const visible = categories.slice(0, VISIBLE_COUNT);
  const goToCategory = (name) => {
    setShowAll(false);
    navigate(`/library?category=${encodeURIComponent(name)}`);
  };

  return (
    <section className="category-chips-wrapper" aria-label="Browse book categories">
      <div className="category-chips-scroll" role="list">
        {visible.map((name) => (
          <button key={name} type="button" role="listitem" className="category-chip" onClick={() => goToCategory(name)}>
            {name}
          </button>
        ))}
        <button
          type="button"
          role="listitem"
          className={`category-chip category-chip-more ${showAll ? "open" : ""}`}
          onClick={() => setShowAll((value) => !value)}
          aria-expanded={showAll}
          aria-haspopup="true"
        >
          All Categories {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {showAll && (
        <div className="category-chips-more-panel" role="menu" aria-label="All book categories">
          {categories.map((name) => (
            <button key={name} type="button" role="menuitem" className="category-chip" onClick={() => goToCategory(name)}>
              {name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export default CategoryChips;
