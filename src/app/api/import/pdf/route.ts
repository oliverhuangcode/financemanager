import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/server/auth";

export interface PdfParsedRow {
  date: string;      // ISO string
  description: string;
  amount: string;    // positive decimal string
  isCredit: boolean;
  balance: string;
}

interface ParseResult {
  rows: PdfParsedRow[];
  accountName: string;
  statementPeriod: string;
}

const MONTH_NAMES = [
  "jan","feb","mar","apr","may","jun",
  "jul","aug","sep","oct","nov","dec",
];

/**
 * Returns true for lines that are structural noise — page headers, footers,
 * column headers, section titles, and disclaimer text that pdf-parse emits
 * between transaction rows when concatenating all pages.
 *
 * Called BEFORE any transaction parsing so these lines are never appended to
 * a transaction's description or used to update balanceStr.
 */
function isNoiseLine(line: string): boolean {
  // Effective date continuation (inside a transaction but not data)
  if (/^Effective Date\b/i.test(line)) return true;

  // ANZ page footer (appears at bottom of EVERY page)
  if (/Australia and New Zealand Banking Group/i.test(line)) return true;
  if (/^AFSL \d+/i.test(line)) return true;

  // Page header that repeats on pages 2–13
  if (/^ANZ Plus Everyday$/i.test(line)) return true;
  if (/^Account Statement$/i.test(line)) return true;

  // Statement period line "31 January 2026 - 27 February 2026"
  // (full month names, not "DD Mon" abbreviations — won't match DATE_PREFIX anyway,
  //  but explicitly skip so it isn't added to a description)
  if (/^\d{1,2}\s+[A-Za-z]{4,}\s+\d{4}\s*[–\-]/.test(line)) return true;

  // Column header row present on every page (pdf-parse may omit spaces between columns)
  if (/^Date\s*Description/i.test(line)) return true;

  // Page 1 structure labels
  if (/^Transactions$/i.test(line)) return true;
  if (/^Account Name$/i.test(line)) return true;
  if (/^Branch Number/i.test(line)) return true;

  // Opening / Closing balance labels as standalone lines
  if (/^Opening Balance$/i.test(line)) return true;
  if (/^Closing Balance$/i.test(line)) return true;

  // Last-page disclaimer text
  if (/^Please check your statement/i.test(line)) return true;
  if (/^If you notice any errors/i.test(line)) return true;
  if (/^For information about/i.test(line)) return true;
  if (/^If an issue has not/i.test(line)) return true;
  if (/www\.afca\.org\.au/i.test(line)) return true;

  return false;
}

/**
 * Given a line of text, extract:
 *  - desc: the part before the first dollar amount
 *  - amounts: all dollar amounts found (e.g. ["4.99", "1,830.93"])
 *
 * The LAST amount in the list is always the running balance for that row.
 */
function extractAmountsAndDesc(line: string): { desc: string; amounts: string[] } {
  const amounts: string[] = [];
  let descEnd = line.length;
  // Must reset lastIndex because AMOUNT_RE is a module-level regex with /g
  const re = /\$?([\d,]+\.\d{2})/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    if (amounts.length === 0) descEnd = match.index;
    amounts.push(match[1]!);
  }
  return { desc: line.slice(0, descEnd).trim(), amounts };
}

/**
 * Parse the full text extracted from an ANZ Plus PDF statement.
 *
 * Algorithm:
 * 1. Scan all lines for statement period + opening balance (before transaction loop).
 * 2. Walk lines: skip noise, start a new entry on "DD Mon" lines, accumulate
 *    description continuation lines, always updating balanceStr to the last amount seen.
 * 3. Once all entries are collected (newest-first), reverse to oldest-first and
 *    compute credit/debit from balance delta against the opening balance.
 */
function parseAnzPlusText(text: string): ParseResult {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // ── 1. Statement period & years ───────────────────────────────────────────
  let statementPeriod = "";
  let startYear = new Date().getFullYear();
  let endYear = startYear;
  let endMonth = 11; // 0-indexed; used for cross-year year assignment

  for (const line of lines) {
    // "31 January 2026 - 27 February 2026"  or  "31 Jan 2026 – 28 Feb 2026"
    const m =
      /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*[–\-]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i.exec(
        line,
      );
    if (m) {
      startYear = parseInt(m[3]!);
      endYear = parseInt(m[6]!);
      endMonth = MONTH_NAMES.indexOf(m[5]!.toLowerCase().slice(0, 3));
      statementPeriod = line;
      break;
    }
  }

  // ── 2. Opening balance ────────────────────────────────────────────────────
  let openingBalance: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    // "Opening Balance $1,286.17"  (same line — last page table row)
    const m = /opening\s+balance[:\s]+\$?([\d,]+\.\d{2})/i.exec(line);
    if (m?.[1]) {
      openingBalance = parseFloat(m[1].replace(/,/g, ""));
      break;
    }
    // "Opening Balance" on its own line, dollar amount on the very next line
    if (/^opening\s+balance$/i.test(line) && i + 1 < lines.length) {
      const next = lines[i + 1]!;
      const nm = /^\$?([\d,]+\.\d{2})$/.exec(next.trim());
      if (nm?.[1]) {
        openingBalance = parseFloat(nm[1].replace(/,/g, ""));
        break;
      }
    }
    // "Branch Number (BSB)Account NumberOpening BalanceClosing Balance"
    // followed by "014 111163 992 948$1,286.17$1,830.93" — first amount is opening balance
    if (/Opening\s*Balance.*Closing\s*Balance/i.test(line) && i + 1 < lines.length) {
      const next = lines[i + 1]!;
      const nm = /\$?([\d,]+\.\d{2})/.exec(next);
      if (nm?.[1]) {
        openingBalance = parseFloat(nm[1].replace(/,/g, ""));
        break;
      }
    }
  }

  // ── 3. Account name ───────────────────────────────────────────────────────
  let accountName = "ANZ Plus Everyday";
  for (const line of lines) {
    if (/ANZ Plus Everyday/i.test(line)) {
      accountName = "ANZ Plus Everyday";
      break;
    }
  }

  // ── 4. Transaction entry collection ──────────────────────────────────────
  // Date prefix: "26 Feb", "09 Feb", etc. — 3-letter abbreviated month
  // pdf-parse concatenates date + description without a space, e.g. "26 FebPAYMENT TO..."
  // so we cannot rely on a word boundary (\b) after the month abbreviation.
  const DATE_PREFIX =
    /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;

  interface RawEntry {
    dayStr: string;
    monStr: string; // 3-letter lowercase
    descParts: string[];
    balanceStr: string;
  }

  const entries: RawEntry[] = [];
  let current: RawEntry | null = null;

  for (const line of lines) {
    // Always skip structural noise
    if (isNoiseLine(line)) continue;

    const dateMatch = DATE_PREFIX.exec(line);
    if (dateMatch) {
      // Push the previous entry before starting a new one
      if (current) entries.push(current);

      const rest = line.slice(dateMatch[0].length).trim();
      const { desc, amounts } = extractAmountsAndDesc(rest);

      current = {
        dayStr: dateMatch[1]!,
        monStr: dateMatch[2]!.toLowerCase().slice(0, 3),
        descParts: desc ? [desc] : [],
        // Take last amount on this line as the (possibly preliminary) balance
        balanceStr: amounts.length > 0 ? amounts[amounts.length - 1]! : "",
      };
    } else if (current) {
      // Continuation line — may carry the balance if the date row had none
      const { desc, amounts } = extractAmountsAndDesc(line);
      if (desc) current.descParts.push(desc);
      if (amounts.length > 0) {
        // Always update: the last continuation line with amounts wins
        current.balanceStr = amounts[amounts.length - 1]!;
      }
    }
    // Lines before the first date entry are ignored (header content)
  }
  if (current) entries.push(current);

  // ── 5. Build ParsedRows via balance delta (oldest-first) ─────────────────
  // Statement is newest-first, so reverse to process oldest → newest.
  const reversed = [...entries].reverse();
  let prevBalance = openingBalance ?? 0;
  const rows: PdfParsedRow[] = [];

  for (const entry of reversed) {
    if (!entry.balanceStr) continue;

    const balance = parseFloat(entry.balanceStr.replace(/,/g, ""));
    if (isNaN(balance)) continue;

    const diff = balance - prevBalance;
    // Ignore zero-diff lines (shouldn't exist in a real statement)
    if (Math.abs(diff) < 0.005) {
      prevBalance = balance;
      continue;
    }

    const isCredit = diff > 0;
    const amount = Math.abs(diff).toFixed(2);

    // Assign year: use endYear by default.
    // For cross-year statements (e.g. Dec–Jan), months later in the year than
    // endMonth belong to startYear (one year earlier).
    const monthIdx = MONTH_NAMES.indexOf(entry.monStr);
    const year = monthIdx > endMonth ? startYear : endYear;
    const date = new Date(year, monthIdx, parseInt(entry.dayStr));

    if (isNaN(date.getTime())) {
      prevBalance = balance;
      continue;
    }

    const description = entry.descParts
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    rows.push({
      date: date.toISOString(),
      description: description || "(no description)",
      amount,
      isCredit,
      balance: balance.toFixed(2),
    });

    prevBalance = balance;
  }

  // Return newest-first (matching the statement's visual order)
  return { rows: rows.reverse(), accountName, statementPeriod };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large (max 20MB)" },
      { status: 413 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let text: string;
  try {
    // Use the internal path to avoid pdf-parse v1 loading test fixtures on import
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
      buf: Buffer,
    ) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    text = result.text;
  } catch (err) {
    console.error("[pdf-import] parse error:", err);
    return NextResponse.json(
      {
        error:
          "Failed to read PDF. Make sure it is a valid ANZ Plus account statement.",
      },
      { status: 422 },
    );
  }

  const { rows, accountName, statementPeriod } = parseAnzPlusText(text);

  if (rows.length === 0) {
    return NextResponse.json(
      {
        error:
          "No transactions found. Ensure this is an ANZ Plus Everyday statement PDF. " +
          "The parser needs an Opening Balance on the statement.",
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ rows, accountName, statementPeriod });
}
