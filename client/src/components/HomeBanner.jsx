import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import { FaPlay, FaPlus, FaCheck } from "react-icons/fa";
import API from "../api/axios";
import { getFileUrl, NO_COVER_IMAGE } from "../utils/fileUrl";
import { addToWishlist, removeFromWishlist, getWishlist } from "../api/wishlist";
import { toast } from "react-toastify";

import "swiper/css";
import "swiper/css/effect-fade";
import "../styles/HomeBanner.css";

function HomeBanner() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await API.get("/banner");
        setBooks(response.data.banners || []);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    getWishlist(user._id)
      .then((res) => {
        const list = res.data?.wishlist || [];
        setWishlist(list.map((item) => item?.book?._id).filter(Boolean));
      })
      .catch(() => {});
  }, [user?._id]);

  const toggleWishlist = async (e, bookId) => {
    e.stopPropagation();
    if (!user?._id) {
      toast.warning("Please login to manage your wishlist.");
      return;
    }
    const exists = wishlist.includes(bookId);
    setWishlist((prev) => (exists ? prev.filter((id) => id !== bookId) : [...prev, bookId]));
    try {
      if (exists) await removeFromWishlist(user._id, bookId);
      else await addToWishlist(user._id, bookId);
    } catch {
      setWishlist((prev) => (exists ? [...prev, bookId] : prev.filter((id) => id !== bookId)));
    }
  };

  const getImageUrl = (banner) => {
    if (!banner?.book?.coverImage) return NO_COVER_IMAGE;
    return getFileUrl(banner.book.coverImage);
  };

  return (
    <div className="hb-hero-wrapper">
      {/* Wave background desktop par hi visible rahega */}
      <svg
        className="hb-wave-svg d-none d-md-block"
        viewBox="0 0 1440 600"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="hb-mauve-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#352A32" />
            <stop offset="50%" stopColor="#4A3B47" />
            <stop offset="100%" stopColor="#6E5566" />
          </linearGradient>
        </defs>
        <path
          fill="url(#hb-mauve-gradient)"
          d="M0,40 C380,220 720,0 1440,80 L1440,520 C780,620 380,420 0,550 Z"
        />
      </svg>

      {loading ? (
        <div className="hb-loader">Loading banner...</div>
      ) : books.length > 0 ? (
        <Swiper
  modules={[Autoplay, EffectFade]}
  effect={"fade"}
  fadeEffect={{ crossFade: true }}
  autoplay={{ delay: 4200, disableOnInteraction: false }}
  loop={books.length > 1}
  speed={600}
  className="hb-swiper"
>
          {books.map((banner, index) => {
            const bookId = banner.book?._id;
            const inWishlist = wishlist.includes(bookId);

            return (
              <SwiperSlide key={banner._id || index} className="hb-slide">
                {/* ================= 1. DESKTOP VIEW ================= */}
                <div className="hb-banner-card d-none d-md-flex">
                  <div className="hb-inner-content container d-flex flex-row justify-content-between align-items-center gap-4">
                    <div className="hb-text-box">
                      <span className="badge rounded-pill hb-tag mb-3">
                        {banner.book?.category || "BOOK"}
                      </span>
                      <h1 className="hb-title">{banner.title}</h1>
                      <p className="hb-description">{banner.description}</p>
                      <button
                        className="btn rounded-pill fw-bold px-4 py-2 hb-shop-btn"
                        onClick={() => navigate(`/book/${bookId}`)}
                      >
                        Read Now
                      </button>
                    </div>

                    <div className="hb-image-box">
                      <div className="hb-cover-frame shadow">
                        <img
                          src={getImageUrl(banner)}
                          alt={banner.book?.title}
                          loading="eager"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ================= 2. MOBILE VIEW (NETFLIX STYLE POSTER) ================= */}
                <div className="hb-mobile-poster-card d-md-none">
                  <div className="hb-mobile-poster-wrap">
                    <img
                      src={getImageUrl(banner)}
                      alt={banner.book?.title}
                      className="hb-mobile-img"
                    />

                    {/* Gradient Overlay for bottom details */}
                    <div className="hb-mobile-overlay">
                      <h2 className="hb-mobile-title">{banner.title}</h2>

                      <div className="hb-mobile-tags">
                        <span>{banner.book?.category || "Bestseller"}</span>
                        <span className="dot">•</span>
                        <span>{banner.book?.author || "Trending"}</span>
                        <span className="dot">•</span>
                        <span>eBook</span>
                      </div>

                      <div className="hb-mobile-btn-row">
                        <button
                          type="button"
                          className="hb-btn-play"
                          onClick={() => navigate(`/book/${bookId}`)}
                        >
                          <span>Read Now</span>
                        </button>

                        <button
                          type="button"
                          className="hb-btn-mylist"
                          onClick={(e) => toggleWishlist(e, bookId)}
                        >
                          {inWishlist ? <FaCheck size={14} /> : <FaPlus size={14} />}
                          <span>{inWishlist ? "In List" : "My List"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      ) : null}
    </div>
  );
}

export default HomeBanner;