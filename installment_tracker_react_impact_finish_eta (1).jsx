import React, { useEffect, useMemo, useState } from "react";
import { parseNumber } from "./utils.mjs";

// -----------------------------
// Installment Tracker (Single File)
// Light theme • TailwindCSS
// - Add/Edit/Delete rows
// - Group by Bank, Search & Filter
// - Hide completed, Sort by any column
// - Quick action: Mark 1 month paid
// - LocalStorage persistence
// - Import/Export CSV (bank,transaction,monthlyPayment,monthsPaid,totalMonths,monthsLeft,restBill,note)
// - Notes per row
// - Insights > Snapshot (monthly burden, bank & merchant shares)
// - Insights > Cash‑flow Relief timeline (month‑by‑month burden drop)
// - Current month indicator (global + per row)
// - NEW: Add/Edit form shows impact on monthly payment + finish month/year (ETA)
// -----------------------------

const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatIDR(n) { if (isNaN(n)) return "-"; return IDR.format(Math.round(n)); }

const SAMPLE = [
  // Mandiri
  { id: "1", bank: "Mandiri", transaction: "LOTTE GROSIR TEGAL", monthlyPayment: 15487, monthsPaid: 7, totalMonths: 12, note: "Promo ends Dec" },
  { id: "2", bank: "Mandiri", transaction: "OTTENCOFFEE 1-IPG JAKAR", monthlyPayment: 84291, monthsPaid: 5, totalMonths: 6, note: "Paid via VA" },
  { id: "3", bank: "Mandiri", transaction: "Bidan Nuriti 62,500 + Bunga 7,500", monthlyPayment: 70000, monthsPaid: 4, totalMonths: 24, note: "Cash advance" },
  { id: "4", bank: "Mandiri", transaction: "SHOPEE.CO.ID Jakar", monthlyPayment: 10743, monthsPaid: 9, totalMonths: 12, note: "" },
  { id: "5", bank: "Mandiri", transaction: "PT. GLOBAL DIGITAL NIA", monthlyPayment: 40000, monthsPaid: 3, totalMonths: 12, note: "" },
  { id: "6", bank: "Mandiri", transaction: "SHOPEE Jakar", monthlyPayment: 21114, monthsPaid: 3, totalMonths: 12, note: "" },
  { id: "7", bank: "Mandiri", transaction: "Mobee PT CTXG Indonesia 138,888 + Bunga 25,000", monthlyPayment: 163888, monthsPaid: 7, totalMonths: 36, note: "Check admin fee" },
  { id: "8", bank: "Mandiri", transaction: "Mobee PT CTXG Indonesia", monthlyPayment: 208333, monthsPaid: 9, totalMonths: 12, note: "" },
  { id: "9", bank: "Mandiri", transaction: "PT. GLOBAL DIGITAL NIA", monthlyPayment: 36750, monthsPaid: 4, totalMonths: 12, note: "" },
  { id: "10", bank: "Mandiri", transaction: "SHOPEE Jakar", monthlyPayment: 199599, monthsPaid: 3, totalMonths: 12, note: "" },
  // BRI
  { id: "11", bank: "BRI", transaction: "TOKOPEDIA_CYBS_CCL12", monthlyPayment: 211830, monthsPaid: 7, totalMonths: 12, note: "Due every 3rd" },
  { id: "12", bank: "BRI", transaction: "TOKOPEDIA CYBS CCL12", monthlyPayment: 76492, monthsPaid: 11, totalMonths: 12, note: "Finish next month" },
  { id: "13", bank: "BRI", transaction: "TOKOPEDIA_CYBS_CCL12", monthlyPayment: 232917, monthsPaid: 5, totalMonths: 12, note: "" },
];

const STORAGE_KEY = "installments-v4"; // bump for form impact calc

function useLocalStorageState(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
      const old = localStorage.getItem("installments-v3") || localStorage.getItem("installments-v2") || localStorage.getItem("installments-v1");
      if (old) return JSON.parse(old).map((r) => ({ note: "", ...r }));
      return initial;
    } catch (e) { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {} }, [key, state]);
  return [state, setState];
}

function Progress({ value }) {
  return (
    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden" title={`${Math.round(value)}%`}>
      <div className="h-full bg-gray-800" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function SummaryCard({ label, value, sub }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-2xl shadow-sm border bg-white">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-8 text-center text-gray-500 border rounded-2xl">
      No installments yet. Use <span className="font-semibold">Add Installment</span> or <span className="font-semibold">Import CSV</span> to get started.
    </div>
  );
}

function RowActions({ onPay, onEdit, onDelete, onNote, disabled }) {
  return (
    <div className="flex gap-2 justify-end">
      <button onClick={onPay} disabled={disabled} className={`px-2 py-1 text-xs rounded-full border ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"}`}>Pay 1</button>
      <button onClick={onNote} className="px-2 py-1 text-xs rounded-full border hover:bg-gray-50">Note</button>
      <button onClick={onEdit} className="px-2 py-1 text-xs rounded-full border hover:bg-gray-50">Edit</button>
      <button onClick={onDelete} className="px-2 py-1 text-xs rounded-full border hover:bg-red-50">Delete</button>
    </div>
  );
}

function monthLabel(date, opt = { month: "long", year: "numeric" }) {
  return date.toLocaleDateString("en-US", opt);
}
function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function AddEditForm({ initial, onCancel, onSave, allRows, editingId }) {
  const [draft, setDraft] = useState(() => initial || { bank: "", transaction: "", monthlyPayment: 0, monthsPaid: 0, totalMonths: 1, note: "" });
  useEffect(() => {
    setDraft((d) => {
      const clamped = Math.min(parseNumber(d.monthsPaid), parseNumber(d.totalMonths));
      return clamped === d.monthsPaid ? d : { ...d, monthsPaid: clamped };
    });
  }, [draft.totalMonths]);
  const monthsLeft = Math.max(0, parseNumber(draft.totalMonths) - parseNumber(draft.monthsPaid));
  const restBill = monthsLeft * parseNumber(draft.monthlyPayment);

  // --- Impact calculations
  const baselineMonthly = useMemo(() => {
    return (allRows || []).reduce((sum, r) => {
      if (editingId && r.id === editingId) return sum; // exclude the row being edited
      const left = Math.max(0, parseNumber(r.totalMonths) - parseNumber(r.monthsPaid));
      return sum + (left > 0 ? parseNumber(r.monthlyPayment) : 0);
    }, 0);
  }, [allRows, editingId]);

  const draftActiveMonthly = monthsLeft > 0 ? parseNumber(draft.monthlyPayment) : 0;
  const withThisMonthly = baselineMonthly + draftActiveMonthly;
  const addlMonthly = withThisMonthly - baselineMonthly; // could be 0 if completed

  const today = new Date();
  const finishDate = monthsLeft > 0 ? addMonths(today, monthsLeft - 1) : today; // finishes at the end of (monthsLeft-1) months from now
  const finishLabel = monthsLeft > 0 ? monthLabel(finishDate) : "Already finished";

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-20">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{initial ? "Edit Installment" : "Add Installment"}</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-black">✕</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span>Bank</span>
            <input className="border rounded-xl px-3 py-2" value={draft.bank} onChange={(e) => setDraft({ ...draft, bank: e.target.value })} placeholder="e.g., Mandiri" />
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span>Transaction</span>
            <input className="border rounded-xl px-3 py-2" value={draft.transaction} onChange={(e) => setDraft({ ...draft, transaction: e.target.value })} placeholder="Describe the installment" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Monthly Payment (IDR)</span>
            <input type="number" className="border rounded-xl px-3 py-2" value={draft.monthlyPayment} onChange={(e) => setDraft({ ...draft, monthlyPayment: parseNumber(e.target.value) })} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Total Months</span>
            <input type="number" min={1} className="border rounded-xl px-3 py-2" value={draft.totalMonths} onChange={(e) => setDraft({ ...draft, totalMonths: parseNumber(e.target.value) })} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Months Already Paid</span>
            <input
              type="number"
              min={0}
              max={draft.totalMonths}
              className="border rounded-xl px-3 py-2"
              value={draft.monthsPaid}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  monthsPaid: Math.min(parseNumber(e.target.value), parseNumber(draft.totalMonths)),
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span>Note (optional)</span>
            <textarea rows={3} className="border rounded-xl px-3 py-2" value={draft.note || ""} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Add reminders, due day, account number, etc." />
          </label>

          {/* Existing at-a-glance metrics */}
          <div className="rounded-xl border p-3 text-sm bg-gray-50 flex flex-col gap-1 md:col-span-2">
            <div className="flex justify-between"><span>Months Left</span><span className="font-medium">{monthsLeft}</span></div>
            <div className="flex justify-between"><span>Remaining Bill</span><span className="font-medium">{formatIDR(restBill)}</span></div>
          </div>

          {/* NEW: Impact & ETA */}
          <div className="rounded-2xl border p-4 bg-white md:col-span-2">
            <div className="text-sm font-semibold mb-2">Impact if you save this</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between"><span>Current monthly (others)</span><span className="font-medium">{formatIDR(baselineMonthly)}</span></div>
              <div className="flex items-center justify-between"><span>This installment monthly</span><span className="font-medium">{formatIDR(draftActiveMonthly)}</span></div>
              <div className="flex items-center justify-between"><span>New total monthly</span><span className="font-semibold">{formatIDR(withThisMonthly)}</span></div>
              <div className="flex items-center justify-between"><span>Additional per month</span><span className={`font-semibold ${addlMonthly>0? 'text-amber-700':''}`}>{formatIDR(addlMonthly)}</span></div>
            </div>
            <div className="mt-3 text-sm">
              <div className="flex items-center justify-between"><span>Finish month (ETA)</span><span className="font-medium">{finishLabel}</span></div>
              <div className="text-xs text-gray-500 mt-1">ETA assumes this month counts as the next payment; a plan with <em>1 month left</em> finishes this month.</div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border">Cancel</button>
          <button onClick={() => onSave(draft)} className="px-4 py-2 rounded-xl border bg-black text-white">Save</button>
        </div>
      </div>
    </div>
  );
}

function Toolbar({ banks, filters, setFilters, onAdd, onImport, onExport, nowLabel }) {
  const uniqueBanks = ["All", ...banks];
  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
      <div className="flex gap-2 items-center w-full md:w-auto">
        <input className="flex-1 md:w-72 border rounded-xl px-3 py-2" placeholder="Search transaction or note..." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <select className="border rounded-xl px-3 py-2" value={filters.bank} onChange={(e) => setFilters({ ...filters, bank: e.target.value })}>
          {uniqueBanks.map((b) => (<option key={b} value={b}>{b}</option>))}
        </select>
        <label className="flex items-center gap-2 text-sm px-3 py-2 border rounded-xl cursor-pointer">
          <input type="checkbox" checked={filters.hideCompleted} onChange={(e) => setFilters({ ...filters, hideCompleted: e.target.checked })} />
          Hide completed
        </label>
      </div>
      <div className="flex gap-2 md:items-center">
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 border rounded-full px-3 py-1 bg-gray-50">
          <span>Current month:</span>
          <span className="font-medium">{nowLabel}</span>
        </div>
        <button onClick={onAdd} className="px-4 py-2 rounded-xl border bg-black text-white">Add Installment</button>
        <label className="px-4 py-2 rounded-xl border cursor-pointer bg-white">Import CSV<input type="file" accept=".csv" onChange={onImport} className="hidden" /></label>
        <button onClick={onExport} className="px-4 py-2 rounded-xl border">Export CSV</button>
      </div>
    </div>
  );
}

function sortBy(items, sort) { const { key, dir } = sort; const sorted = [...items].sort((a, b) => { const av = a[key]; const bv = b[key]; if (typeof av === "number" && typeof bv === "number") return av - bv; return String(av).localeCompare(String(bv)); }); return dir === "asc" ? sorted : sorted.reverse(); }

function HeaderCell({ label, sortKey, sort, setSort }) {
  const active = sort.key === sortKey;
  return (
    <th onClick={() => setSort({ key: sortKey, dir: active && sort.dir === "asc" ? "desc" : "asc" })} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 cursor-pointer select-none">
      <div className="flex items-center gap-1"><span>{label}</span>{active ? <span>{sort.dir === "asc" ? "▲" : "▼"}</span> : <span className="text-gray-300">↕</span>}</div>
    </th>
  );
}

function useSnapshot(enriched) {
  return useMemo(() => {
    const active = enriched.filter((r) => r.monthsLeft > 0);
    const monthlyTotal = active.reduce((s, r) => s + parseNumber(r.monthlyPayment), 0);
    const outstanding = active.reduce((s, r) => s + r.restBill, 0);

    const byBankMap = new Map();
    active.forEach((r) => { const cur = byBankMap.get(r.bank) || 0; byBankMap.set(r.bank, cur + parseNumber(r.monthlyPayment)); });
    const byBank = Array.from(byBankMap.entries()).map(([bank, amt]) => ({ bank, amt, pct: monthlyTotal ? (amt / monthlyTotal) * 100 : 0 })).sort((a, b) => b.amt - a.amt);

    const merchantOf = (tx) => { const t = String(tx).toUpperCase(); if (t.includes("TOKOPEDIA")) return "Tokopedia"; if (t.includes("SHOPEE")) return "Shopee"; if (t.includes("MOBEE")) return "Mobee"; if (t.includes("OTTENCOFFEE")) return "Ottencoffee"; if (t.includes("LOTTE")) return "Lotte"; if (t.includes("GLOBAL DIGITAL NIA")) return "Global Digital NIA"; return String(tx).split(/\s|,/)[0].slice(0, 14) || "Other"; };
    const byMerchMap = new Map();
    active.forEach((r) => { const m = merchantOf(r.transaction); const cur = byMerchMap.get(m) || 0; byMerchMap.set(m, cur + parseNumber(r.monthlyPayment)); });
    const byMerchantAll = Array.from(byMerchMap.entries()).map(([merchant, amt]) => ({ merchant, amt, pct: monthlyTotal ? (amt / monthlyTotal) * 100 : 0 })).sort((a, b) => b.amt - a.amt);

    const topMerchants = byMerchantAll.slice(0, 3);
    const othersAmt = byMerchantAll.slice(3).reduce((s, x) => s + x.amt, 0);
    const snapshotLines = [];
    snapshotLines.push(`Monthly burden: ${formatIDR(monthlyTotal)} across ${active.length} lines | Outstanding: ${formatIDR(outstanding)}.`);
    if (byBank.length) { const parts = byBank.map((x) => `${x.bank} ${formatIDR(x.amt)} (${Math.round(x.pct)}%)`); const bankLine = parts.length === 2 ? `${parts[0]} vs ${parts[1]}` : parts.join(", "); snapshotLines.push(`By bank (monthly share): ${bankLine}.`); }
    if (topMerchants.length) { const mParts = topMerchants.map((x) => `${x.merchant} ${formatIDR(x.amt)} (${Math.round(x.pct)}%)`); if (othersAmt > 0) { const pct = monthlyTotal ? Math.round((othersAmt / monthlyTotal) * 100) : 0; mParts.push(`others ${formatIDR(othersAmt)} (${pct}%)`); } snapshotLines.push(`By merchant (monthly share): ${mParts.join(", ")}.`); }

    return { monthlyTotal, outstanding, byBank, topMerchants, othersAmt, lines: snapshotLines };
  }, [enriched]);
}

// --- Cash‑flow Relief computation ---
function addMonthsRelief(date, n) { const d = new Date(date.getFullYear(), date.getMonth() + n, 1); return d; }
function monthLabelRelief(date) { return date.toLocaleDateString("en-US", { month: "short", year: "numeric" }); }

function useRelief(enriched) {
  return useMemo(() => {
    const active = enriched.filter((r) => r.monthsLeft > 0);
    if (active.length === 0) return { rows: [], bullets: [], startMonthly: 0 };

    const startMonthly = active.reduce((s, r) => s + parseNumber(r.monthlyPayment), 0);
    const maxMonths = active.reduce((m, r) => Math.max(m, r.monthsLeft), 0);

    const reliefAt = Array.from({ length: maxMonths + 1 }, () => 0);
    active.forEach((r) => { reliefAt[r.monthsLeft] += parseNumber(r.monthlyPayment); });

    const today = new Date();
    let cumulativeRelief = 0;
    const rows = [];
    for (let m = 1; m <= maxMonths; m++) {
      const date = addMonthsRelief(today, m);
      const relief = reliefAt[m];
      const activeCount = active.filter((r) => r.monthsLeft >= m).length;
      const monthlyDuring = active.reduce((s, r) => s + (r.monthsLeft >= m ? parseNumber(r.monthlyPayment) : 0), 0);
      cumulativeRelief += relief;
      const monthlyAfter = startMonthly - cumulativeRelief;
      rows.push({ m, date, label: monthLabelRelief(date), activeCount, monthlyDuring, relief, monthlyAfter });
    }

    const bullets = rows.slice(0, 6).filter(x => x.relief > 0).map((x) => `In ${x.label}: relief ${formatIDR(x.relief)} (${x.m} mo${x.m>1?"s":""}), monthly drops to ${formatIDR(x.monthlyAfter)}.`);
    return { rows, bullets, startMonthly };
  }, [enriched]);
}

export default function InstallmentTrackerApp() {
  const [rows, setRows] = useLocalStorageState(STORAGE_KEY, SAMPLE);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [filters, setFilters] = useState({ q: "", bank: "All", hideCompleted: true });
  const [sort, setSort] = useState({ key: "bank", dir: "asc" });
  const [noteEditId, setNoteEditId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [tab, setTab] = useState("table");
  const [insightsTab, setInsightsTab] = useState("snapshot");

  const nowLabel = useMemo(() => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }), []);

  const banks = useMemo(() => Array.from(new Set(rows.map((r) => r.bank))).sort(), [rows]);

  const enriched = useMemo(() => rows.map((r) => {
    const monthsLeft = Math.max(0, parseNumber(r.totalMonths) - parseNumber(r.monthsPaid));
    const restBill = monthsLeft * parseNumber(r.monthlyPayment);
    const progress = (parseNumber(r.monthsPaid) / Math.max(1, parseNumber(r.totalMonths))) * 100;
    const currentInst = Math.min(parseNumber(r.totalMonths), parseNumber(r.monthsPaid) + 1);
    const isCompleted = monthsLeft === 0;
    return { note: "", ...r, monthsLeft, restBill, progress, currentInst, isCompleted };
  }), [rows]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      if (filters.bank !== "All" && r.bank !== filters.bank) return false;
      if (filters.hideCompleted && r.monthsLeft === 0) return false;
      const q = filters.q.trim().toLowerCase();
      if (!q) return true;
      return (r.transaction.toLowerCase().includes(q) || r.bank.toLowerCase().includes(q) || (r.note || "").toLowerCase().includes(q));
    });
  }, [enriched, filters]);

  const sorted = useMemo(() => sortBy(filtered, sort), [filtered, sort]);

  const totals = useMemo(() => {
    const active = enriched.filter((r) => r.monthsLeft > 0);
    const totalMonthly = active.reduce((s, r) => s + parseNumber(r.monthlyPayment), 0);
    const totalRemaining = active.reduce((s, r) => s + r.restBill, 0);
    const totalMonthsLeft = active.reduce((s, r) => s + r.monthsLeft, 0);
    return { totalMonthly, totalRemaining, totalMonthsLeft, activeCount: active.length };
  }, [enriched]);

  const snapshot = useSnapshot(enriched);
  const relief = useRelief(enriched);

  function handleSave(draft) {
    const normalized = {
      ...draft,
      monthsPaid: Math.min(parseNumber(draft.monthsPaid), parseNumber(draft.totalMonths)),
    };
    if (editRow) {
      setRows((prev) => prev.map((r) => (r.id === editRow.id ? { ...editRow, ...normalized } : r)));
    } else {
      const id = `${Date.now()}`;
      setRows((prev) => [...prev, { id, ...normalized }]);
    }
    setShowForm(false);
    setEditRow(null);
  }
  function handleDelete(id) { setRows((prev) => prev.filter((r) => r.id !== id)); }
  function handlePayOne(id) { setRows((prev) => prev.map((r) => (r.id === id ? { ...r, monthsPaid: Math.min(parseNumber(r.totalMonths), parseNumber(r.monthsPaid) + 1) } : r))); }

  function handleExportCSV() {
    const header = ["bank","transaction","monthlyPayment","monthsPaid","totalMonths","monthsLeft","restBill","note"];
    const lines = [header.join(",")];
    enriched.forEach((r) => { const safeTx = `"${String(r.transaction).replaceAll('"', '""')}"`; const safeNote = `"${String(r.note || "").replaceAll('"', '""')}"`; lines.push([r.bank, safeTx, r.monthlyPayment, r.monthsPaid, r.totalMonths, r.monthsLeft, r.restBill, safeNote].join(",")); });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "installments.csv"; a.click(); URL.revokeObjectURL(url);
  }

  function handleImportCSV(e) {
    const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const [head, ...rowsText] = text.split(/\r?\n/).filter(Boolean);
      const cols = head.split(",").map((s) => s.trim());
      const idx = { bank: cols.indexOf("bank"), transaction: cols.indexOf("transaction"), monthlyPayment: cols.indexOf("monthlyPayment"), monthsPaid: cols.indexOf("monthsPaid"), totalMonths: cols.indexOf("totalMonths"), note: cols.indexOf("note") };
      const parsed = rowsText.map((line, i) => { const parts = []; let cur = ""; let inQ = false; for (let ch of line) { if (ch === '"') { inQ = !inQ; continue; } if (ch === "," && !inQ) { parts.push(cur); cur = ""; } else { cur += ch; } } parts.push(cur); return { id: `${Date.now()}-${i}`, bank: (parts[idx.bank] || "").trim(), transaction: (parts[idx.transaction] || "").trim(), monthlyPayment: parseNumber(parts[idx.monthlyPayment]), monthsPaid: parseNumber(parts[idx.monthsPaid]), totalMonths: parseNumber(parts[idx.totalMonths] || 1), note: (idx.note >= 0 ? parts[idx.note] : "").trim(), }; }).filter((r) => r.bank && r.transaction);
      if (parsed.length) setRows(parsed);
    };
    reader.readAsText(file); e.target.value = "";
  }

  function openNote(r) { setNoteEditId(r.id); setNoteDraft(r.note || ""); }
  function saveNote(id) { setRows((prev) => prev.map((r) => (r.id === id ? { ...r, note: noteDraft } : r))); setNoteEditId(null); setNoteDraft(""); }

  const grouped = useMemo(() => { const map = new Map(); sorted.forEach((r) => { if (!map.has(r.bank)) map.set(r.bank, []); map.get(r.bank).push(r); }); return Array.from(map.entries()); }, [sorted]);

  function copySnapshot() { const text = snapshot.lines.join("\n\n"); navigator.clipboard?.writeText(text); }
  function copyRelief() { const lines = relief.bullets.length ? relief.bullets : ["No relief events in the next 6 months."]; navigator.clipboard?.writeText(lines.join("\n")); }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Installment Tracker</h1>
            <p className="text-gray-600">Stay on top of your cicilan: payments, progress, notes, and insights.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 border rounded-full px-3 py-1 bg-gray-50">
            <span>Current month:</span>
            <span className="font-medium">{nowLabel}</span>
          </div>
        </header>

        {/* Primary Tabs */}
        <div className="flex gap-2">
          {[{ id: "table", label: "Installments" }, { id: "insights", label: "Insights" }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-xl border ${tab === t.id ? "bg-black text-white" : "bg-white"}`}>{t.label}</button>
          ))}
        </div>

        {/* Installments (Table) */}
        {tab === "table" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard label="Monthly Commitment (Active)" value={formatIDR(totals.totalMonthly)} sub={`${totals.activeCount} active installments`} />
              <SummaryCard label="Total Remaining Bill" value={formatIDR(totals.totalRemaining)} />
              <SummaryCard label="Months Left (All Active)" value={`${totals.totalMonthsLeft} months`} />
            </div>
            <Toolbar banks={banks} filters={filters} setFilters={setFilters} onAdd={() => { setEditRow(null); setShowForm(true); }} onImport={handleImportCSV} onExport={handleExportCSV} nowLabel={nowLabel} />
            <div className="border rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <HeaderCell label="Bank" sortKey="bank" sort={sort} setSort={setSort} />
                    <HeaderCell label="Transaction" sortKey="transaction" sort={sort} setSort={setSort} />
                    <HeaderCell label="Monthly Payment" sortKey="monthlyPayment" sort={sort} setSort={setSort} />
                    <HeaderCell label="Months Paid" sortKey="monthsPaid" sort={sort} setSort={setSort} />
                    <HeaderCell label="Total Months" sortKey="totalMonths" sort={sort} setSort={setSort} />
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Months Left</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Remaining Bill</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Note</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.length === 0 && (<tr><td colSpan={9} className="p-6"><EmptyState /></td></tr>)}
                  {grouped.map(([bank, items]) => (
                    <React.Fragment key={bank}>
                      <tr className="bg-gray-50 border-t"><td colSpan={9} className="px-3 py-2 text-xs uppercase tracking-wider text-gray-500">{bank}</td></tr>
                      {items.map((r) => (
                        <React.Fragment key={r.id}>
                          <tr className="border-t hover:bg-gray-50/60">
                            <td className="px-3 py-3 align-top">{r.bank}</td>
                            <td className="px-3 py-3 align-top">
                              <div className="font-medium text-gray-900">{r.transaction}</div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500"><Progress value={r.progress} /><span>{Math.round(r.progress)}%</span></div>
                              <div className="mt-1 text-xs text-gray-600">
                                {r.isCompleted ? (
                                  <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />Completed</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />Current month: <span className="font-medium tabular-nums">{r.currentInst}/{r.totalMonths}</span></span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top">{formatIDR(r.monthlyPayment)}</td>
                            <td className="px-3 py-3 align-top">{r.monthsPaid}</td>
                            <td className="px-3 py-3 align-top">{r.totalMonths}</td>
                            <td className={`px-3 py-3 align-top ${r.monthsLeft <= 2 ? "text-amber-600 font-semibold" : ""}`}>{r.monthsLeft}</td>
                            <td className="px-3 py-3 align-top">{formatIDR(r.restBill)}</td>
                            <td className="px-3 py-3 align-top">{r.note ? (<div className="text-gray-700"><span className="inline-block max-w-[18rem] truncate align-bottom">{r.note}</span></div>) : (<span className="text-gray-400">—</span>)}</td>
                            <td className="px-3 py-3 align-top text-right"><RowActions disabled={r.monthsLeft === 0} onPay={() => handlePayOne(r.id)} onEdit={() => { setEditRow(r); setShowForm(true); }} onDelete={() => handleDelete(r.id)} onNote={() => openNote(r)} /></td>
                          </tr>
                          {noteEditId === r.id && (
                            <tr className="bg-gray-50/60 border-t"><td colSpan={9} className="px-3 py-3"><div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-3"><textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} className="w-full md:flex-1 border rounded-xl px-3 py-2" placeholder="Add notes for this transaction (due dates, how to pay, reminders, etc.)" /><div className="flex gap-2 md:flex-col"><button onClick={() => saveNote(r.id)} className="px-3 py-2 rounded-xl border bg-black text-white">Save Note</button><button onClick={() => { setNoteEditId(null); setNoteDraft(""); }} className="px-3 py-2 rounded-xl border">Cancel</button></div></div></td></tr>
                          )}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-500">Tips: The gray badge shows the <em>current month number</em> for each active line (today is {nowLabel}). Use <em>Pay 1</em> after you complete that month.</div>
          </>
        )}

        {/* Insights */}
        {tab === "insights" && (
          <>
            <div className="flex gap-2">
              <button onClick={() => setInsightsTab("snapshot")} className={`px-4 py-2 rounded-xl border ${insightsTab === "snapshot" ? "bg-black text-white" : "bg-white"}`}>Snapshot</button>
              <button onClick={() => setInsightsTab("relief")} className={`px-4 py-2 rounded-xl border ${insightsTab === "relief" ? "bg-black text-white" : "bg-white"}`}>Cash‑flow Relief</button>
            </div>

            {insightsTab === "snapshot" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <SummaryCard label="Monthly Burden" value={formatIDR(snapshot.monthlyTotal)} sub={`${enriched.filter(r=>r.monthsLeft>0).length} active lines`} />
                  <SummaryCard label="Outstanding" value={formatIDR(snapshot.outstanding)} />
                  <SummaryCard label="Top Merchant" value={snapshot.topMerchants[0] ? `${snapshot.topMerchants[0].merchant} ${formatIDR(snapshot.topMerchants[0].amt)}` : '—'} sub={snapshot.topMerchants[0] ? `${Math.round(snapshot.topMerchants[0].pct)}% share` : ''} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border bg-white"><div className="text-sm font-semibold mb-2">By bank (monthly share)</div><ul className="text-sm space-y-1">{snapshot.byBank.map((x) => (<li key={x.bank} className="flex items-center justify-between"><span>{x.bank}</span><span className="tabular-nums">{formatIDR(x.amt)} ({Math.round(x.pct)}%)</span></li>))}{snapshot.byBank.length === 0 && <li className="text-gray-500">No active data.</li>}</ul></div>
                  <div className="p-4 rounded-2xl border bg-white"><div className="text-sm font-semibold mb-2">By merchant (monthly share)</div><ul className="text-sm space-y-1">{snapshot.topMerchants.map((x) => (<li key={x.merchant} className="flex items-center justify-between"><span>{x.merchant}</span><span className="tabular-nums">{formatIDR(x.amt)} ({Math.round(x.pct)}%)</span></li>))}{snapshot.othersAmt > 0 && (<li className="flex items-center justify-between text-gray-600"><span>Others</span><span className="tabular-nums">{formatIDR(snapshot.othersAmt)} ({snapshot.monthlyTotal ? Math.round((snapshot.othersAmt / snapshot.monthlyTotal) * 100) : 0}%)</span></li>)}{snapshot.topMerchants.length === 0 && <li className="text-gray-500">No active data.</li>}</ul></div>
                </div>
                <div className="p-4 rounded-2xl border bg-white space-y-2"><div className="text-sm font-semibold">Copy-ready snapshot</div><pre className="text-sm whitespace-pre-wrap leading-relaxed">{snapshot.lines.join("\n\n")}</pre><div className="flex justify-end"><button onClick={copySnapshot} className="px-4 py-2 rounded-xl border">Copy</button></div></div>
              </>
            )}

            {insightsTab === "relief" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <SummaryCard label="Current Monthly" value={formatIDR(relief.startMonthly)} sub="before any finishes" />
                  <SummaryCard label="Next Relief Month" value={relief.rows.find(r=>r.relief>0)?.label || '—'} sub={relief.rows.find(r=>r.relief>0)?`Relief ${formatIDR(relief.rows.find(r=>r.relief>0).relief)}`:'No change soon'} />
                  <SummaryCard label="All Months Covered" value={`${relief.rows.length}`} sub="until everything ends" />
                </div>

                <div className="p-4 rounded-2xl border bg-white">
                  <div className="text-sm font-semibold mb-2">Cash‑flow relief timeline</div>
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="text-left py-2">Month</th>
                        <th className="text-right py-2">Active lines</th>
                        <th className="text-right py-2">Monthly during</th>
                        <th className="text-right py-2">Relief this month</th>
                        <th className="text-right py-2">Monthly after</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relief.rows.map((r) => (
                        <tr key={r.m} className="border-t">
                          <td className="py-2 pr-2">{r.label}{r.m===1 && <span className="ml-2 text-xs text-gray-500">(current)</span>}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{r.activeCount}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{formatIDR(r.monthlyDuring)}</td>
                          <td className={`py-2 pr-2 text-right tabular-nums ${r.relief? 'text-emerald-700 font-semibold':'text-gray-500'}`}>{r.relief?`- ${formatIDR(r.relief)}`: '—'}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{formatIDR(r.monthlyAfter)}</td>
                        </tr>
                      ))}
                      {relief.rows.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-center text-gray-500">No active installments — nothing to project.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 rounded-2xl border bg-white space-y-2">
                  <div className="text-sm font-semibold">Copy‑ready summary (next 6 months)</div>
                  <pre className="text-sm whitespace-pre-wrap leading-relaxed">{(relief.bullets.length? relief.bullets : ["No relief events in the next 6 months."]).join("\n")}</pre>
                  <div className="flex justify-end"><button onClick={copyRelief} className="px-4 py-2 rounded-xl border">Copy</button></div>
                </div>

                <p className="text-xs text-gray-500">Definition: "Relief this month" is the amount that finishes after paying that month. "Monthly after" shows the new commitment starting the next month.</p>
              </>
            )}
          </>
        )}
      </div>

      {showForm && (
        <AddEditForm
          initial={editRow}
          onCancel={() => { setShowForm(false); setEditRow(null); }}
          onSave={handleSave}
          allRows={rows}
          editingId={editRow?.id}
        />
      )}
    </div>
  );
}
