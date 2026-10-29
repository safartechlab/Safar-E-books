import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaBookOpen,
  FaBook,
  FaLeaf,
  FaHeart,
  FaSmile,
  FaLandmark,
  FaLayerGroup,
  FaGraduationCap,
  FaMicrochip,
  FaAtom
} from "react-icons/fa";
import API from "../api/axios";
import "../styles/Browsecategories.css";

const DISPLAY_LIMIT = 6;

const CATEGORY_META = {
  fiction: {
    subtitle: "Explore Stories",
    icon: <FaBookOpen />,
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80"
  },
  "non-fiction": {
    subtitle: "Expand Knowledge",
    icon: <FaBook />,
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80"
  },
  biography: {
    subtitle: "Real Legacies",
    icon: <FaLandmark />,
    image: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80"
  },
  "self-help": {
    subtitle: "Better Yourself",
    icon: <FaLeaf />,
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80"
  },
  romance: {
    subtitle: "Feel the Love",
    icon: <FaHeart />,
    image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80"
  },
  children: {
    subtitle: "Young Minds",
    icon: <FaSmile />,
    image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=600&q=80"
  },
  education: {
    subtitle: "Grow & Learn",
    icon: <FaGraduationCap />,
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80"
  },
  technology: {
    subtitle: "Future Insights",
    icon: <FaMicrochip />,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
  },
  science: {
    subtitle: "Deep Discoveries",
    icon: <FaAtom />,
    image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80"
  },
  classics: {
    subtitle: "Timeless Reads",
    icon: <FaLandmark />,
    image: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80"
  }
};

const getCategoryMeta = (name) => {
  const normalized = name.toLowerCase().trim();
  return (
    CATEGORY_META[normalized] || {
      subtitle: "Curated Reads",
      icon: <FaLayerGroup />,
      image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=600&q=80"
    }
  );
};

function BrowseCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const res = await API.get("/books");
        const books = res.data?.books || res.data || [];

        const counts = {};
        books.forEach((book) => {
          const name = book?.category?.trim();
          if (!name) return;
          counts[name] = (counts[name] || 0) + 1;
        });

        const list = Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        if (!cancelled) setCategories(list);
      } catch (err) {
        // Fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || categories.length === 0) return null;

  const visible = categories.slice(0, DISPLAY_LIMIT);

  const goToCategory = (name) =>
    navigate(`/library?category=${encodeURIComponent(name)}`);

  return (
    <section className="bc-section">
      <div className="bc-inner-container">
        <div className="bc-header-row">
          <div className="bc-title-col">
            <h2 className="bc-heading">Browse by Categories</h2>
            <p className="bc-subtext">
              Find your next read by genre and topic.
            </p>
          </div>

          <button
            type="button"
            className="bc-viewall-btn"
            onClick={() => navigate("/library")}
            title="View all categories"
            aria-label="View all categories"
          >
            <FaArrowRight size={13} />
          </button>
        </div>

        {/* 6-Column Strip (Desktop) & 2-Column Grid (Mobile) */}
        <div className="bc-grid">
          {visible.map((cat) => {
            const meta = getCategoryMeta(cat.name);
            return (
              <div
                key={cat.name}
                className="bc-card"
                style={{ backgroundImage: `url(${meta.image})` }}
                onClick={() => goToCategory(cat.name)}
                role="button"
                tabIndex={0}
                aria-label={`Browse ${cat.name} books`}
              >
                <div className="bc-overlay"></div>

                <div className="bc-card-content">
                  <div className="bc-icon-badge">
                    {meta.icon}
                  </div>

                  <div className="bc-text-meta">
                    <span className="bc-name">{cat.name}</span>
                    <span className="bc-sub">{meta.subtitle}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default BrowseCategories;