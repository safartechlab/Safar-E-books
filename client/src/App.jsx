import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import SessionGuard from "./components/SessionGuard";
 
import MainLayout from "./layouts/MainLayout";
import AdminLayout from "./layouts/AdminLayout";
 
import Home from "./pages/Home";
import About from "./pages/About";

import Library from "./pages/Library";
import BookDetails from "./pages/BookDetails";
 
import AdminDashboard from "./pages/admin/Dashboard";
import ManageBooks from "./pages/admin/ManageBooks";
import EditBook from "./pages/admin/EditBook";
import AdminBanner from "./pages/admin/AdminBanner";
import AdminSettings from "./pages/admin/AdminSettings";
import ManageUsers from "./pages/admin/ManageUsers";
import ContactUs from "./pages/contactUs";
import UserDashboard from "./pages/user/Dashboard";
import ContactMessages from "./pages/admin/ContactMessages";
import Profile from "./pages/Profile";
import Reader from "./pages/Reader";
import Wishlist from "./pages/Wishlist";
import Pricing from "./pages/Pricing";
import UserDetails from "./pages/admin/UserDetails";
import MyPurchases from "./pages/MyPurchases";
import ReadingHistory from "./pages/ReadingHistory";
import FAQ from "./pages/FAQ";
import Reviews from "./pages/Reviews";
import ManageReviews from "./pages/admin/ManageReviews";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import Maintenance from "./pages/Maintenance";
import ManageOptions from "./pages/admin/ManageOptions";
 
import ProtectedRoute from "./components/ProtectedRoute";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminRefunds from "./pages/admin/AdminRefunds";
 
function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <SessionGuard />
      <Routes>
 
        {/* ================= User Website ================= */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          
          <Route path="/library" element={<Library />} />
          <Route path="/contactUs" element={<ContactUs />} />
          <Route path="/book/:id" element={<BookDetails />} />
          <Route path="/about" element={<About />} />
          <Route path="/reader/:id" element={<Reader />} />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute allowedRole="user">
                <Wishlist />
              </ProtectedRoute>
            }
          />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route
    path="/profile"
    element={
      <ProtectedRoute allowedRole="user">
        <Profile />
      </ProtectedRoute>
    }
  />
            <Route
            path="/my-purchases"
            element={
              <ProtectedRoute allowedRole="user">
                <MyPurchases />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reading-history"
            element={
              <ProtectedRoute allowedRole="user">
                <ReadingHistory />
              </ProtectedRoute>
            }
          />
        </Route>
 
        {/* ================= Admin Panel ================= */}
        <Route
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
 
          <Route path="/admin/manage-books" element={<ManageBooks />} />
          <Route path="/admin/categories-languages" element={<ManageOptions />} />
 
          <Route path="/admin/edit-book/:id" element={<EditBook />} />
 
          <Route path="/admin/banner" element={<AdminBanner />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
 
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/reviews" element={<ManageReviews />} />
          <Route path="/admin/contact" element={<ContactMessages />}/>
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/refunds" element={<AdminRefunds />} />
          <Route
  path="/admin/users/:id"
  element={<UserDetails />}
/>
        </Route>
 
        {/* ================= User Dashboard ================= */}
        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute allowedRole="user">
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/maintenance" element={<Maintenance />} />

        {/* ================= 404 ================= */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}
 
export default App;