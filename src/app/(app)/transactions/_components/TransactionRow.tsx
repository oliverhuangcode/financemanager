"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/server/api/routers/transaction";
import { api, type RouterOutputs } from "@/trpc/react";

type TransactionItem =
  RouterOutputs["transaction"]["list"]["items"][number];

interface TransactionRowProps {
  tx: TransactionItem;
}

export function TransactionRow({ tx }: TransactionRowProps) {
  const utils = api.useUtils();
  const effectiveCategory: string =
    tx.userCategory ?? tx.basiqCategory ?? "Uncategorised";
  const isOverridden = !!tx.userCategory;

  const updateCategory = api.transaction.updateCategory.useMutation({
    onSuccess: () => {
      void utils.transaction.list.invalidate();
    },
  });

  const formattedDate = new Date(tx.date).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const formattedAmount = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: tx.currency ?? "AUD",
  }).format(Math.abs(Number(tx.amount)));

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
        {formattedDate}
      </td>
      <td className="max-w-xs truncate px-4 py-3 text-sm">{tx.description}</td>
      <td
        className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium ${
          tx.isCredit ? "text-green-600" : "text-gray-900"
        }`}
      >
        {tx.isCredit ? "+" : "-"}
        {formattedAmount}
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-1">
          <Select
            value={effectiveCategory}
            onValueChange={(val) => {
              if (val !== null) {
                updateCategory.mutate({ transactionId: tx.id, category: val });
              }
            }}
            disabled={updateCategory.isPending}
          >
            <SelectTrigger className="h-7 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOverridden && (
            <span className="text-xs text-blue-500">edited</span>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
        {tx.account.name}
      </td>
    </tr>
  );
}
