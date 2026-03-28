"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/react";

const PIE_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
  "#64748b",
];

function currentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AnalyticsClient() {
  const [monthYear, setMonthYear] = useState(currentMonthYear);

  const { data, isLoading } = api.analytics.chartData.useQuery({ monthYear });

  const [yearStr, monthStr] = monthYear.split("-");
  const monthLabel = new Date(
    Number(yearStr),
    Number(monthStr) - 1,
    1,
  ).toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Month:</label>
        <input
          type="month"
          className="rounded border px-3 py-1.5 text-sm"
          value={monthYear}
          onChange={(e) => setMonthYear(e.target.value)}
        />
        <span className="text-sm text-gray-500">{monthLabel}</span>
      </div>

      {isLoading && (
        <p className="py-12 text-center text-sm text-gray-500">
          Loading analytics...
        </p>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Monthly Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Expenses (6 months)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.monthlyTotals.every((m) => m.expenses === 0) ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  No expense data available.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={data.monthlyTotals}
                    margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                  >
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Expenses",
                      ]}
                    />
                    <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Income vs Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Income vs Expenses (6 months)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.monthlyTotals.every(
                (m) => m.expenses === 0 && m.income === 0,
              ) ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  No data available.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={data.monthlyTotals}
                    margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                  >
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "expenses" ? "Expenses" : "Income",
                      ]}
                    />
                    <Legend
                      formatter={(value: string) =>
                        value === "expenses" ? "Expenses" : "Income"
                      }
                    />
                    <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Spending by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Spending by Category — {monthLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.categoryBreakdown.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  No spending data for {monthLabel}.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {data.categoryBreakdown.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name,
                      ]}
                    />
                    <Legend
                      formatter={(value: string) => (
                        <span className="text-xs">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Daily Cumulative Spend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Daily Cumulative Spend — {monthLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.dailyCumulative.every((d) => d.cumulative === 0) ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  No spending data for {monthLabel}.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={data.dailyCumulative}
                    margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11 }}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Cumulative spend",
                      ]}
                      labelFormatter={(label: string) => `Day ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
