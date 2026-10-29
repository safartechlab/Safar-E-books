
import Hero from "../components/Hero";
import NewArrivals from "../components/NewArrivals";
import FreeBooks from "../components/FreeBooks";
import VipBooks from "../components/VipBooks";
import BrowseCategories from "../components/BrowseCategories";
import HomeBanner from "../components/HomeBanner";
import ContinueReading from "../components/ContinueReading";
import CategoryChips from "../components/CategoryChips";
import { getStoredUser } from "../utils/bookAccess";
import "../styles/Home.css";

function Home() {
  const user = getStoredUser();
  const isLoggedIn = Boolean(user?._id);

  return (
    <main className="home-page">
      {isLoggedIn ? (
        <>
        
          {/* Desktop: hero followed by category cards */}
          
          <HomeBanner />

          <div className="home-desktop-category-cards">
            <BrowseCategories />
          </div>

          {/* Mobile: category chips instead of category cards */}
          <div className="home-mobile-category-chips">
            <CategoryChips />
          </div>
        </>
      ) : (
        <>
          <Hero />
          <BrowseCategories />
        </>
      )}

      {/* Reader sections */}
      {isLoggedIn && <ContinueReading />}

      {/* Latest 6 books */}
      <NewArrivals />

      {/* These sections appear after New Arrivals */}
      <FreeBooks />
      <VipBooks />
    </main>
  );
}

export default Home;