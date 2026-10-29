import { useEffect, useState } from "react";
import API from "../../api/axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";
import {
  FaBook,
  FaUsers,
  FaLayerGroup,
  FaGlasses,
  FaRupeeSign,
  FaShoppingBag,
  FaCrown,
  FaCalendarAlt,
  FaFire,
  FaAward,
  FaChartLine,
} from "react-icons/fa";
import "../../styles/AdminDashboard.css";

function AdminDashboard() {
  const [totalBooks, setTotalBooks] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);

  const [recentBooks, setRecentBooks] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [userData, setUserData] = useState([]);
  const [totalReads, setTotalReads] = useState(0);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [bookSalesCount, setBookSalesCount] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [activeSubscribers, setActiveSubscribers] = useState(0);
  const [subscriptionByTier, setSubscriptionByTier] = useState([]);
  const [subscriptionByCycle, setSubscriptionByCycle] = useState([]);
  const [subscriptionByPlan, setSubscriptionByPlan] = useState([]);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [topBooks, setTopBooks] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await API.get("/dashboard");

      setTotalBooks(res.data.totalBooks || 0);
      setTotalUsers(res.data.totalUsers || 0);
      setTotalCategories(res.data.totalCategories || 0);

      setRecentBooks(res.data.recentBooks || []);
      setTotalReads(res.data.totalReads || 0);

      setCategoryData(
        (res.data.booksPerCategory || []).map((item) => ({
          category: item.category,
          reads: item.count,
        }))
      );

      setUserData(res.data.userStatistics || []);

      setTotalRevenue(res.data.totalRevenue || 0);
      setTotalOrders(res.data.totalOrders || 0);
      setBookSalesCount(res.data.bookSalesCount || 0);
      setSubscriptionCount(res.data.subscriptionCount || 0);
      setActiveSubscribers(res.data.activeSubscribers || 0);
      setSubscriptionByTier(res.data.subscriptionByTier || []);
      setSubscriptionByCycle(res.data.subscriptionByCycle || []);
      setSubscriptionByPlan(res.data.subscriptionByPlan || []);
      setRevenueByMonth(res.data.revenueByMonth || []);
      setTopBooks(res.data.topBooks || []);
    } catch (error) {
      console.error("Dashboard data load error:", error);
    }
  };

  const COLORS = ["#5D4857", "#8F6E80", "#B99BA7", "#DCC6C6", "#4A3B47"];

  return (
    <div className="admin-dashboard-container">
      {/* 1. Clean Simple Top Header */}
      <div className="admin-simple-header">
        <div>
          <h1 className="admin-welcome-h1">Welcome Back, Admin </h1>
          <p className="admin-welcome-sub">
            Manage your SAFAR E-BOOKS eBook Library
          </p>
        </div>
        <div className="admin-date-pill">
          <FaCalendarAlt size={13} />
          <span>
            {new Date().toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* 2. Primary Metrics Stat Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-icon-bubble">
            <FaBook />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-label">Total Books</span>
            <h3 className="stat-value">{totalBooks}</h3>
            <span className="stat-sub">All time</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon-bubble">
            <FaUsers />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-label">Total Users</span>
            <h3 className="stat-value">{totalUsers}</h3>
            <span className="stat-sub">All time</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon-bubble">
            <FaLayerGroup />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-label">Categories</span>
            <h3 className="stat-value">{totalCategories}</h3>
            <span className="stat-sub">Across all genres</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon-bubble">
            <FaGlasses />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-label">Total Reads</span>
            <h3 className="stat-value">{totalReads}</h3>
            <span className="stat-sub">All time</span>
          </div>
        </div>
      </div>

      {/* 3. Secondary Financial Metrics Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-icon-bubble">
            <FaRupeeSign />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-label">Total Revenue</span>
            <h3 className="stat-value">₹{totalRevenue}</h3>
            <span className="stat-trend">Lifetime Earnings</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon-bubble">
            <FaShoppingBag />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-label">Total Orders</span>
            <h3 className="stat-value">{totalOrders}</h3>
            <span className="stat-sub">Books & Plans</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon-bubble">
            <FaBook />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-label">Book Sales</span>
            <h3 className="stat-value">{bookSalesCount}</h3>
            <span className="stat-sub">Direct title purchases</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon-bubble">
            <FaCrown />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-label">Subscribers</span>
            <h3 className="stat-value">{activeSubscribers}</h3>
            <span className="stat-trend">Active VIP members</span>
          </div>
        </div>
      </div>

      {/* 4. Analytics Grid (Without Quote Card) */}
      <div className="admin-dashboard-content">
        {/* Left Column */}
        <div className="admin-dash-col">
          {/* Books Overview Bar Chart */}
          <div className="admin-dash-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">📈 Books Added Overview</h3>
              <span className="card-badge">By Genre</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData}>
                <XAxis dataKey="category" stroke="#8F6E80" />
                <YAxis stroke="#8F6E80" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FAF6F6",
                    borderColor: "#C9AEB5",
                    borderRadius: "12px",
                    color: "#4A3B47",
                    boxShadow: "0 6px 16px rgba(74, 59, 71, 0.1)",
                  }}
                />
                <Bar dataKey="reads" fill="#5D4857" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Line Chart */}
          <div className="admin-dash-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">💰 Revenue (Last 6 Months)</h3>
              <span className="card-badge">Razorpay Track</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueByMonth}>
                <XAxis dataKey="month" stroke="#8F6E80" />
                <YAxis stroke="#8F6E80" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FAF6F6",
                    borderColor: "#C9AEB5",
                    borderRadius: "12px",
                    color: "#4A3B47",
                    boxShadow: "0 6px 16px rgba(74, 59, 71, 0.1)",
                  }}
                  formatter={(value) => [`₹${value}`, "Revenue"]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#5D4857"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#5D4857", strokeWidth: 2, stroke: "#FAF6F6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Recently Added Books */}
          <div className="admin-dash-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">📚 Recently Added Books</h3>
            </div>
            <div className="table-responsive">
              <table className="admin-book-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBooks.length > 0 ? (
                    recentBooks.map((book) => (
                      <tr className="admin-table-row" key={book._id}>
                        <td className="fw-semibold">{book.title}</td>
                        <td className="text-muted">{book.author}</td>
                        <td>
                          <span className="table-category-badge">
                            {book.category}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-muted">
                        No Books Available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="admin-dash-col">
          {/* User Statistics Pie */}
          <div className="admin-dash-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">👥 User Statistics</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={userData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {userData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FAF6F6",
                    borderColor: "#C9AEB5",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Subscribers by Plan */}
          <div className="admin-dash-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">💳 Subscribers by Plan</h3>
            </div>
            {activeSubscribers === 0 ? (
              <p className="text-center text-muted py-4 mb-0">
                No active subscribers yet.
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={subscriptionByTier}>
                    <XAxis dataKey="label" stroke="#8F6E80" />
                    <YAxis stroke="#8F6E80" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FAF6F6",
                        borderColor: "#C9AEB5",
                        borderRadius: "12px",
                      }}
                      formatter={(value) => [value, "Subscribers"]}
                    />
                    <Bar dataKey="count" fill="#8F6E80" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="sub-breakdown-row mt-3">
                  <table className="admin-book-table mb-0">
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Subscribers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptionByPlan
                        .filter((row) => row.count > 0)
                        .map((row) => (
                          <tr className="admin-table-row" key={`${row.tier}-${row.cycle}`}>
                            <td>{row.label}</td>
                            <td className="fw-bold">{row.count}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Top Selling Books */}
          <div className="admin-dash-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">🏆 Top Selling Books</h3>
            </div>
            <div className="table-responsive">
              <table className="admin-book-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Sales</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topBooks.length > 0 ? (
                    topBooks.map((book, index) => (
                      <tr className="admin-table-row" key={index}>
                        <td className="fw-semibold">{book.title}</td>
                        <td>{book.sales}</td>
                        <td className="fw-bold">₹{book.revenue}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-muted">
                        No sales yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Achievement Bottom Strip */}
      <div className="admin-bottom-strip">
        <div className="strip-item">
          <FaFire className="strip-icon" />
          <span>Keep curating high-quality ebooks for your audience.</span>
        </div>
        <div className="strip-item d-none d-md-flex">
          <FaAward className="strip-icon" />
          <span>99.8% System Uptime & Auto Synchronization.</span>
        </div>
        <div className="strip-item d-none d-lg-flex">
          <FaChartLine className="strip-icon" />
          <span>Platform growth trending upward!</span>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;