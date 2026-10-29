import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Table } from "react-bootstrap";
import { toast } from "react-toastify";
import API from "../api/axios";
import "../styles/AdminRevenue.css";

const RANGES = [
  { key: "3", label: "3 months" },
  { key: "6", label: "6 months" },
  { key: "12", label: "12 months" },
  { key: "all", label: "All time" },
];

const COLOR_BOOK = "#5D4857";
const COLOR_SUB = "#A48794";

const money = (n) =>
  `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const compact = (n) => (n >= 1000 ? `₹${Math.round(n / 100) / 10}k` : `₹${n}`);

function RevenueAnalytics() {
  const [range, setRange] = useState("12");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await API.get("/payments/admin/analytics", { params: { range } });
        if (active) setData(res.data);
      } catch (e) {
        toast.error("Failed to load revenue analytics.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [range]);

  const k = data?.kpis;
  const hasData = k && k.orders > 0;
  const pieData = (data?.byType || []).filter((t) => t.net > 0);
  const maxPlanNet = Math.max(1, ...(data?.byPlan || []).map((p) => p.net));

  const kpiCards = k
    ? [
        { label: "Net revenue", value: money(k.net), sub: `${money(k.gross)} gross` },
        { label: "Paid orders", value: k.orders, sub: `Avg ${money(k.avgOrderValue)} per order` },
        { label: "Refunded", value: money(k.refunded), sub: `${k.refundedOrders} order${k.refundedOrders === 1 ? "" : "s"}` },
        {
          label: "Refund rate",
          value: `${k.refundRateOrders}%`,
          sub: `${k.refundRateAmount}% of revenue refunded`,
          alert: k.refundRateOrders >= 10,
        },
      ]
    : [];

  return (
    <div>
      {/* Range selector */}
      <div className="d-flex gap-2 flex-wrap justify-content-md-end mb-3">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`rev-range ${range === r.key ? "active" : ""}`}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <p className="text-center py-5">Loading analytics...</p>
      ) : !hasData ? (
        <div className="rev-panel text-center py-5">
          <p className="mb-0 text-muted">No paid orders in this period yet.</p>
        </div>
      ) : (
        <div style={{ opacity: loading ? 0.6 : 1 }}>
          {/* KPI cards */}
          <div className="rev-kpis mb-4">
            {kpiCards.map((c) => (
              <div key={c.label} className={`rev-kpi ${c.alert ? "alert" : ""}`}>
                <span className="rev-kpi-label">{c.label}</span>
                <span className="rev-kpi-value">{c.value}</span>
                <span className="rev-kpi-sub">{c.sub}</span>
              </div>
            ))}
          </div>

          {/* Revenue by month */}
          <div className="rev-panel mb-4">
            <h2 className="rev-panel-title">Revenue by month</h2>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={data.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis tickFormatter={compact} fontSize={12} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Legend />
                  <Bar dataKey="book" name="Books" stackId="rev" fill={COLOR_BOOK} />
                  <Bar dataKey="subscription" name="Subscriptions" stackId="rev" fill={COLOR_SUB} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="row g-4 mb-4">
            {/* Books vs subscriptions */}
            <div className="col-lg-5">
              <div className="rev-panel h-100">
                <h2 className="rev-panel-title">Books vs subscriptions</h2>
                {pieData.length > 0 ? (
                  <div style={{ width: "100%", height: 220 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pieData} dataKey="net" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>
                          {pieData.map((t) => (
                            <Cell key={t.type} fill={t.type === "book" ? COLOR_BOOK : COLOR_SUB} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => money(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-muted">No revenue yet.</p>
                )}

                <Table size="sm" className="mb-0 mt-2">
                  <thead>
                    <tr><th></th><th className="text-end">Orders</th><th className="text-end">Net</th><th className="text-end">Share</th></tr>
                  </thead>
                  <tbody>
                    {data.byType.map((t) => (
                      <tr key={t.type}>
                        <td>
                          <span className="rev-dot" style={{ background: t.type === "book" ? COLOR_BOOK : COLOR_SUB }} />
                          {t.label}
                        </td>
                        <td className="text-end">{t.orders}</td>
                        <td className="text-end">{money(t.net)}</td>
                        <td className="text-end">{t.sharePct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>

            {/* Revenue per plan */}
            <div className="col-lg-7">
              <div className="rev-panel h-100">
                <h2 className="rev-panel-title">Revenue per plan</h2>
                <div className="table-responsive">
                  <Table size="sm" className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th className="text-end">Orders</th>
                        <th className="text-end">Refunded</th>
                        <th style={{ minWidth: 140 }}>Net revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byPlan.map((p) => (
                        <tr key={`${p.plan}-${p.cycle}`}>
                          <td className="fw-semibold">{p.label}</td>
                          <td className="text-end">{p.orders}</td>
                          <td className="text-end">{p.refunded > 0 ? money(p.refunded) : "-"}</td>
                          <td>
                            <div className="rev-bar-track">
                              <div className="rev-bar-fill" style={{ width: `${(p.net / maxPlanNet) * 100}%` }} />
                            </div>
                            <div className="small">{money(p.net)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            </div>
          </div>

          {/* Top selling books */}
          <div className="rev-panel">
            <h2 className="rev-panel-title">Top-selling books</h2>
            {data.topBooks.length > 0 ? (
              <div className="table-responsive">
                <Table hover size="sm" className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Book</th>
                      <th className="text-end">Sales</th>
                      <th className="text-end">Refunded</th>
                      <th className="text-end">Net revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topBooks.map((b, i) => (
                      <tr key={b.bookId}>
                        <td>{i + 1}</td>
                        <td>
                          <div className="fw-semibold">{b.title}</div>
                          <div className="text-muted small">{b.author}</div>
                        </td>
                        <td className="text-end">{b.sales}</td>
                        <td className="text-end">{b.refunded > 0 ? money(b.refunded) : "-"}</td>
                        <td className="text-end">{money(b.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <p className="text-muted mb-0">No individual book sales in this period.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RevenueAnalytics;