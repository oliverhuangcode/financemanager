"use client";

import { useRef, useState } from "react";

import { type PdfParsedRow } from "@/app/api/import/pdf/route";
import { api } from "@/trpc/react";

export function PdfImport() {
  const utils = api.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<PdfParsedRow[] | null>(null);
  const [statementPeriod, setStatementPeriod] = useState("");
  const [suggestedName, setSuggestedName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setParseError(null);
    setParsedRows(null);
    setImportDone(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setParseError("Please select a PDF file.");
      return;
    }

    setIsParsing(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/import/pdf", { method: "POST", body: form });
      const data = (await res.json()) as {
        rows?: PdfParsedRow[];
        accountName?: string;
        statementPeriod?: string;
        error?: string;
      };

      if (!res.ok || data.error) {
        setParseError(data.error ?? "Failed to parse PDF.");
        return;
      }

      setParsedRows(data.rows ?? []);
      setStatementPeriod(data.statementPeriod ?? "");
      const suggested = data.accountName ?? "ANZ Plus";
      setSuggestedName(suggested);
      // Pre-fill new account name if no accounts exist yet
      if (!manualAccounts?.length) {
        setNewAccountName(suggested);
        setShowNewAccount(true);
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleImport() {
    if (!parsedRows?.length) return;

    let accountId = selectedAccountId;

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
    !!parsedRows?.length &&
    (showNewAccount ? !!newAccountName.trim() : !!selectedAccountId) &&
    !importCsv.isPending &&
    !createAccount.isPending;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Import from PDF Statement</h2>
        <p className="mt-1 text-sm text-gray-500">
          In the ANZ Plus app: Accounts → select account → tap the menu (⋯) →
          <strong> Export statement</strong> → choose a date range → save the PDF,
          then upload it here.
        </p>
      </div>

      {/* File picker */}
      <div>
        <label className="text-sm font-medium text-gray-700">PDF File</label>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFile}
          disabled={isParsing}
          className="mt-1 block text-sm text-gray-600 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:hover:bg-gray-50 disabled:opacity-50"
        />
        {isParsing && (
          <p className="mt-1 text-sm text-gray-500">Reading PDF...</p>
        )}
      </div>

      {parseError && <p className="text-sm text-red-600">{parseError}</p>}

      {parsedRows && parsedRows.length > 0 && (
        <>
          <p className="text-sm text-gray-600">
            Found <span className="font-semibold">{parsedRows.length}</span> transactions
            {statementPeriod ? ` · ${statementPeriod}` : ""}.
          </p>

          {/* Account selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Save to account</label>
            {accountsLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={showNewAccount ? "__new__" : selectedAccountId}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setShowNewAccount(true);
                      setNewAccountName(suggestedName);
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
                    placeholder="Account name"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            )}
          </div>

          {/* Preview */}
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
                {parsedRows.length > 5 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-center text-gray-400">
                      + {parsedRows.length - 5} more transactions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
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
            : parsedRows?.length
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
