"use client";

import { useRef, useState } from "react";

import { api } from "@/trpc/react";

interface ParsedRow {
  date: string;
  description: string;
  amount: string;
  isCredit: boolean;
  balance: string;
}

/** Minimal CSV line parser — handles quoted fields containing commas. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/** Parse an ANZ CSV statement export. */
function parseAnzCsv(text: string): ParsedRow[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Find the header row (starts with "Date")
  const headerIdx = lines.findIndex((l) =>
    l.toLowerCase().startsWith("date"),
  );
  if (headerIdx === -1) {
    throw new Error(
      'Could not find a header row starting with "Date". Make sure you exported a CSV from ANZ.',
    );
  }

  const headers = parseCsvLine(lines[headerIdx]!).map((h) =>
    h.toLowerCase().replace(/[^a-z]/g, ""),
  );

  const idx = {
    date: headers.findIndex((h) => h === "date"),
    desc: headers.findIndex((h) => h === "description" || h === "details" || h === "narrative"),
    debit: headers.findIndex((h) => h === "debit" || h === "withdrawal"),
    credit: headers.findIndex((h) => h === "credit" || h === "deposit"),
    balance: headers.findIndex((h) => h === "balance"),
  };

  if (idx.date === -1 || idx.desc === -1) {
    throw new Error("CSV must have at least Date and Description columns.");
  }

  const rows: ParsedRow[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);

    const rawDate = cols[idx.date]?.replace(/"/g, "").trim() ?? "";
    const desc = cols[idx.desc]?.replace(/"/g, "").trim() ?? "";
    if (!rawDate || !desc) continue;

    // Parse DD/MM/YYYY
    const parts = rawDate.split("/");
    if (parts.length !== 3) continue;
    const [day, month, year] = parts;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (isNaN(date.getTime())) continue;

    const rawDebit = idx.debit !== -1 ? (cols[idx.debit]?.replace(/[,$]/g, "").trim() ?? "") : "";
    const rawCredit = idx.credit !== -1 ? (cols[idx.credit]?.replace(/[,$]/g, "").trim() ?? "") : "";
    const rawBalance = idx.balance !== -1 ? (cols[idx.balance]?.replace(/[,$]/g, "").trim() ?? "") : "0";

    const isCredit = !!rawCredit && rawCredit !== "" && Number(rawCredit) !== 0;
    const amount = isCredit ? rawCredit : rawDebit;
    if (!amount || Number(amount) === 0) continue;

    rows.push({
      date: date.toISOString(),
      description: desc,
      amount,
      isCredit,
      balance: rawBalance || "0",
    });
  }

  return rows;
}

export function CsvImport() {
  const utils = api.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [newAccountName, setNewAccountName] = useState("");
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [importDone, setImportDone] = useState<number | null>(null);

  const { data: manualAccounts, isLoading: accountsLoading } =
    api.import.listManualAccounts.useQuery();

  const createAccount = api.import.createManualAccount.useMutation({
    onSuccess: (account) => {
      void utils.import.listManualAccounts.invalidate();
      void utils.account.list.invalidate();
      setSelectedAccountId(account.id);
      setShowNewAccount(false);
      setNewAccountName("");
    },
  });

  const importCsv = api.import.importCsv.useMutation({
    onSuccess: ({ imported }) => {
      void utils.account.list.invalidate();
      void utils.dashboard.summary.invalidate();
      void utils.transaction.list.invalidate();
      setParsedRows(null);
      setImportDone(imported);
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => setImportDone(null), 5000);
    },
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setParseError(null);
    setParsedRows(null);
    setImportDone(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const rows = parseAnzCsv(text);
        if (rows.length === 0) {
          setParseError("No transactions found in the file. Check the format.");
          return;
        }
        setParsedRows(rows);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Failed to parse CSV.");
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!parsedRows || parsedRows.length === 0) return;

    let accountId = selectedAccountId;

    // Create account first if needed
    if (showNewAccount) {
      if (!newAccountName.trim()) return;
      const account = await createAccount.mutateAsync({
        name: newAccountName.trim(),
      });
      accountId = account.id;
    }

    if (!accountId) return;

    importCsv.mutate({ accountId, rows: parsedRows });
  }

  const canImport =
    !!parsedRows &&
    parsedRows.length > 0 &&
    (showNewAccount ? !!newAccountName.trim() : !!selectedAccountId) &&
    !importCsv.isPending &&
    !createAccount.isPending;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Import from CSV</h2>
        <p className="mt-1 text-sm text-gray-500">
          Download your statement from ANZ Internet Banking (Accounts → select account → Download → CSV) and upload it here.
        </p>
      </div>

      {/* Account selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Account</label>
        {accountsLoading ? (
          <p className="text-sm text-gray-500">Loading accounts...</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={showNewAccount ? "__new__" : selectedAccountId}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowNewAccount(true);
                  setSelectedAccountId("");
                } else {
                  setShowNewAccount(false);
                  setSelectedAccountId(e.target.value);
                }
              }}
            >
              <option value="">— Select account —</option>
              {manualAccounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              <option value="__new__">+ Create new account</option>
            </select>

            {showNewAccount && (
              <input
                type="text"
                placeholder="Account name (e.g. ANZ Plus Everyday)"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        )}
      </div>

      {/* File picker */}
      <div>
        <label className="text-sm font-medium text-gray-700">CSV File</label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="mt-1 block text-sm text-gray-600 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:hover:bg-gray-50"
        />
      </div>

      {parseError && (
        <p className="text-sm text-red-600">{parseError}</p>
      )}

      {/* Preview */}
      {parsedRows && parsedRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Found <span className="font-semibold">{parsedRows.length}</span> transactions. Preview (first 5):
          </p>
          <div className="overflow-x-auto rounded-lg border text-xs">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {new Date(row.date).toLocaleDateString("en-AU", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2">{row.description}</td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 text-right font-medium ${
                        row.isCredit ? "text-green-600" : "text-gray-900"
                      }`}
                    >
                      {row.isCredit ? "+" : "-"}${Number(row.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleImport}
          disabled={!canImport}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {importCsv.isPending || createAccount.isPending
            ? "Importing..."
            : parsedRows
              ? `Import ${parsedRows.length} transactions`
              : "Import"}
        </button>
        {importDone !== null && (
          <p className="text-sm text-green-600">
            Imported {importDone} transactions successfully.
          </p>
        )}
      </div>

      {(importCsv.error ?? createAccount.error) && (
        <p className="text-sm text-red-600">
          {importCsv.error?.message ?? createAccount.error?.message}
        </p>
      )}
    </section>
  );
}
