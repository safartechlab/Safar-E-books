import { useEffect, useState } from "react";
import API from "../api/axios";

// Only used if the API call fails, so forms never end up with empty
// dropdowns. These match the old hard-coded lists.
const FALLBACK = {
  categories: [
    "Fiction", "Non-Fiction", "Science", "Technology", "History", "Biography",
    "Novel", "Fantasy", "Mystery", "Romance", "Self Help", "Education",
  ],
  languages: ["English", "Hindi", "Gujarati"],
};

// Returns plain arrays of names: { categories, languages, loading }
function useOptions() {
  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await API.get("/options");
        if (cancelled) return;
        setCategories((res.data.categories || []).map((c) => c.name));
        setLanguages((res.data.languages || []).map((l) => l.name));
      } catch (err) {
        if (cancelled) return;
        setCategories(FALLBACK.categories);
        setLanguages(FALLBACK.languages);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, languages, loading };
}

export default useOptions;