"use client";

import { useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import { api } from "@/trpc/react";

import { BudgetEditDialog } from "./BudgetEditDialog";

function currentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

export function BudgetsClient() {
  const [monthYear, setMonthYear] = useState(currentMonthYear);
  const utils = api.useUtils();

  const { data, isLoading } = api.budget.list.useQuery({ monthYear });

  const handleSaved = () => {
    void utils.budget.list.invalidate();
  };

  const [yearStr, monthStr] = monthYear.split("-");
  const monthLabel = new Date(
    Number(yearStr),
    Number(monthStr) - 1,
    1,
  ).toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  const withBudget = data?.filter((b) => b.budgetAmount !== null) ?? [];
  const withSpendNoBudget =
    data?.filter((b) => b.budgetAmount === null && b.actualAmount > 0) ?? [];
  const noActivity =
    data?.filter((b) => b.budgetAmount === null && b.actualAmount === 0) ?? [];

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
          Loading budgets...
        </p>
      )}

      {data && (
        <div className="space-y-4">
          {/* Budgeted categories */}
          {withBudget.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Budgets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {withBudget.map((b) => {
                  const pct =
                    b.budgetAmount! > 0
                      ? Math.min(100, (b.actualAmount / b.budgetAmount!) * 100)
                      : 0;
                  return (
                    <div key={b.category} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span
                            className={`text-sm font-medium ${
                              b.isOverBudget ? "text-red-600" : ""
                            }`}
                          >
                            {b.category}
                          </span>
                          {b.carriedFromMonth && (
                            <span className="ml-2 text-xs text-gray-400">
                              from {b.carriedFromMonth}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm ${
                              b.isOverBudget
                                ? "font-medium text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            {formatCurrency(b.actualAmount)} /{" "}
                            {formatCurrency(b.budgetAmount!)}
                          </span>
                          <BudgetEditDialog
                            category={b.category}
                            monthYear={monthYear}
                            currentBudgetCents={b.budgetCents}
                            onSaved={handleSaved}
                          />
                        </div>
                      </div>
                      <Progress value={pct}>
                        <ProgressTrack>
                          <ProgressIndicator
                            className={b.isOverBudget ? "bg-red-500" : ""}
                          />
                        </ProgressTrack>
                      </Progress>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Unbudgeted categories with spending */}
          {withSpendNoBudget.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Unbudgeted Spending</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {withSpendNoBudget.map((b) => (
                  <div
                    key={b.category}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{b.category}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {formatCurrency(b.actualAmount)} spent
                      </span>
                      <BudgetEditDialog
                        category={b.category}
                        monthYear={monthYear}
                        currentBudgetCents={null}
                        onSaved={handleSaved}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* No-activity categories — collapsed */}
          {noActivity.length > 0 && (
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer select-none text-sm font-medium text-gray-600">
                Other categories ({noActivity.length})
              </summary>
              <div className="mt-3 space-y-2">
                {noActivity.map((b) => (
                  <div
                    key={b.category}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm text-gray-600">{b.category}</span>
                    <BudgetEditDialog
                      category={b.category}
                      monthYear={monthYear}
                      currentBudgetCents={null}
                      onSaved={handleSaved}
                    />
                  </div>
                ))}
              </div>
            </details>
          )}

          {withBudget.length === 0 && withSpendNoBudget.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              No budgets or spending for {monthLabel}. Expand &quot;Other
              categories&quot; to set your first budget.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
