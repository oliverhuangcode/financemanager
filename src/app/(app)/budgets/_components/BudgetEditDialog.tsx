"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";

interface BudgetEditDialogProps {
  category: string;
  monthYear: string;
  currentBudgetCents: number | null;
  onSaved: () => void;
}

export function BudgetEditDialog({
  category,
  monthYear,
  currentBudgetCents,
  onSaved,
}: BudgetEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [amountStr, setAmountStr] = useState(
    currentBudgetCents !== null
      ? (currentBudgetCents / 100).toFixed(2)
      : "",
  );

  const upsert = api.budget.upsert.useMutation({
    onSuccess: () => {
      setOpen(false);
      onSaved();
    },
  });

  function handleSave() {
    const dollars = parseFloat(amountStr);
    if (isNaN(dollars) || dollars < 0) return;
    // Math.round avoids float precision issues (e.g. 9.99 * 100 = 998.9999...)
    const amountCents = Math.round(dollars * 100);
    upsert.mutate({ category, monthYear, amountCents });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            {currentBudgetCents !== null ? "Edit" : "Set budget"}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-sm font-medium">
            Monthly budget (AUD)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded border px-3 py-1.5 text-sm"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          {upsert.error && (
            <p className="text-xs text-red-600">{upsert.error.message}</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
