import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import AdminDesktopOnly from "../components/AdminDesktopOnly";
import { isMobileOrTabletDevice } from "../utils/device";

function AdminLayout() {
  // The admin panel is built for a big screen. On a phone or tablet show a
  // short explanation instead of a broken layout.
  if (isMobileOrTabletDevice()) {
    return <AdminDesktopOnly />;
  }

  return (
    <div style={{ display: "flex" }}>
      <AdminSidebar />

      <div
        style={{
          marginLeft: "250px",
          width: "100%",
          minHeight: "100vh",
          background: "#F7EFE7",
          padding: "30px",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
