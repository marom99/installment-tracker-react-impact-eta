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
  const [draft, setDraft] = useState(() => initial || { bank: "", transaction: "", monthlyPayment: "", monthsPaid: 0, totalMonths: "", note: "", startDate: "", firstPaymentDate: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const bankInputRef = React.useRef(null);
  const isEditing = !!initial;

  useEffect(() => {
    if (bankInputRef.current && !isEditing) {
      bankInputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    const newErrors = {};
    if (!draft.bank?.trim()) newErrors.bank = "Bank is required.";
    if (!draft.transaction?.trim()) newErrors.transaction = "Transaction is required.";
    if (parseNumber(draft.monthlyPayment) <= 0) newErrors.monthlyPayment = "Monthly payment must be greater than 0.";
    if (parseNumber(draft.totalMonths) < 1) newErrors.totalMonths = "Total months must be at least 1.";
    if (!draft.startDate) newErrors.startDate = "Start date is required.";
    if (!draft.firstPaymentDate) newErrors.firstPaymentDate = "First payment date is required.";
    setErrors(newErrors);
  }, [draft]);

  useEffect(() => {
    setDraft((d) => {
      const clamped = Math.min(parseNumber(d.monthsPaid), parseNumber(d.totalMonths));
      if (clamped === parseNumber(d.monthsPaid)) return d;
      return { ...d, monthsPaid: clamped };
    });
  }, [draft.totalMonths, draft.monthsPaid]);

  const handleBlur = (event) => {
    const { name } = event.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const isInvalid = Object.keys(errors).length > 0;

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
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-lg max-h-[90vh] overflow-y-auto flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={initial ? "Edit Installment" : "Add Installment"}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{initial ? "Edit Installment" : "Add New Installment"}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {isEditing ? "Update installment details and payment progress" : "Create a new installment record"}
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Section: Transaction Details */}
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-1">Transaction Details</h4>
                <p className="text-sm text-gray-600">Basic information about this installment</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-700">Bank / Institution</span>
                    <input 
                      ref={bankInputRef} 
                      name="bank" 
                      className={`border rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        touched.bank && errors.bank ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      }`} 
                      value={draft.bank} 
                      onChange={(e) => setDraft({ ...draft, bank: e.target.value })} 
                      onBlur={handleBlur} 
                      placeholder="e.g., Mandiri, BCA, Shopee" 
                      disabled={isEditing}
                    />
                    {touched.bank && errors.bank && <div className="text-red-600 text-xs">{errors.bank}</div>}
                  </label>
                  
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-700">Monthly Payment</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">IDR</span>
                      <input 
                        type="number" 
                        name="monthlyPayment" 
                        className={`border rounded-lg pl-12 pr-3 py-2.5 text-sm transition-colors ${
                          touched.monthlyPayment && errors.monthlyPayment ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        }`} 
                        value={draft.monthlyPayment} 
                        onChange={(e) => setDraft({ ...draft, monthlyPayment: e.target.value })} 
                        onBlur={handleBlur}
                        disabled={isEditing}
                      />
                    </div>
                    {touched.monthlyPayment && errors.monthlyPayment && <div className="text-red-600 text-xs">{errors.monthlyPayment}</div>}
                  </label>
                </div>
                
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Transaction Description</span>
                  <input 
                    name="transaction" 
                    className={`border rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      touched.transaction && errors.transaction ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`} 
                    value={draft.transaction} 
                    onChange={(e) => setDraft({ ...draft, transaction: e.target.value })} 
                    onBlur={handleBlur} 
                    placeholder="Describe what this installment is for"
                    disabled={isEditing}
                  />
                  {touched.transaction && errors.transaction && <div className="text-red-600 text-xs">{errors.transaction}</div>}
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-700">Start Date</span>
                    <input 
                      type="date" 
                      name="startDate" 
                      className={`border rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        touched.startDate && errors.startDate ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      }`} 
                      value={draft.startDate} 
                      onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} 
                      onBlur={handleBlur}
                      disabled={isEditing}
                    />
                    {touched.startDate && errors.startDate && <div className="text-red-600 text-xs">{errors.startDate}</div>}
                  </label>
                  
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-700">First Payment Date</span>
                    <input 
                      type="date" 
                      name="firstPaymentDate" 
                      className={`border rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        touched.firstPaymentDate && errors.firstPaymentDate ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      }`} 
                      value={draft.firstPaymentDate} 
                      onChange={(e) => setDraft({ ...draft, firstPaymentDate: e.target.value })} 
                      onBlur={handleBlur}
                      disabled={isEditing}
                    />
                    {touched.firstPaymentDate && errors.firstPaymentDate && <div className="text-red-600 text-xs">{errors.firstPaymentDate}</div>}
                  </label>
                </div>
                
                {isEditing && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-800">Read-only Section</p>
                        <p className="text-xs text-blue-700 mt-1">Transaction details cannot be modified when editing. Only payment progress can be updated.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Section: Installment Management */}
            <div className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-1">Payment Progress</h4>
                <p className="text-sm text-gray-600">Manage installment terms and track payments</p>
              </div>
              
              <div className="bg-green-50 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-700">Total Months</span>
                    <input 
                      type="number" 
                      name="totalMonths" 
                      min={1} 
                      className={`border rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        touched.totalMonths && errors.totalMonths ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200'
                      }`} 
                      value={draft.totalMonths} 
                      onChange={(e) => setDraft({ ...draft, totalMonths: e.target.value })} 
                      onBlur={handleBlur}
                    />
                    {touched.totalMonths && errors.totalMonths && <div className="text-red-600 text-xs">{errors.totalMonths}</div>}
                  </label>
                  
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-700">Months Paid</span>
                    <input
                      type="number"
                      min={0}
                      max={parseNumber(draft.totalMonths) > 0 ? parseNumber(draft.totalMonths) : undefined}
                      className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-colors"
                      value={draft.monthsPaid}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          monthsPaid: Math.min(parseNumber(e.target.value), parseNumber(draft.totalMonths)),
                        })
                      }
                    />
                  </label>
                </div>
                
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Notes & Reminders</span>
                  <textarea 
                    rows={3} 
                    className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-colors resize-none" 
                    value={draft.note || ""} 
                    onChange={(e) => setDraft({ ...draft, note: e.target.value })} 
                    placeholder="Add payment reminders, due dates, account details, etc."
                  />
                </label>
                
                {/* Progress Summary */}
                <div className="bg-white rounded-lg border border-green-200 p-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">Payment Summary</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Months Remaining</span>
                      <span className={`font-semibold ${monthsLeft <= 2 ? 'text-amber-600' : 'text-gray-900'}`}>{monthsLeft}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Outstanding Balance</span>
                      <span className="font-semibold text-gray-900">{formatIDR(restBill)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold text-green-600">{Math.round((parseNumber(draft.monthsPaid) / Math.max(1, parseNumber(draft.totalMonths))) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Impact Analysis Section */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Financial Impact Analysis
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Current Monthly (Others)</div>
                <div className="text-lg font-semibold text-gray-900">{formatIDR(baselineMonthly)}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">This Installment</div>
                <div className="text-lg font-semibold text-blue-600">{formatIDR(draftActiveMonthly)}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">New Total Monthly</div>
                <div className="text-lg font-bold text-gray-900">{formatIDR(withThisMonthly)}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">Additional Burden</div>
                <div className={`text-lg font-bold ${addlMonthly > 0 ? 'text-amber-600' : 'text-green-600'}`}>{formatIDR(addlMonthly)}</div>
              </div>
            </div>
            <div className="mt-4 bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Estimated Completion</span>
                <span className="text-sm font-semibold text-purple-600">{finishLabel}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Based on current payment schedule and remaining months</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 rounded-b-2xl">
          <div className="text-sm text-gray-600">
            {isEditing ? "Update this installment record" : "Create new installment record"}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onCancel} 
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => onSave(draft)} 
              disabled={isInvalid} 
              className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${
                isInvalid 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-200'
              }`}
            >
              {isEditing ? "Update Installment" : "Create Installment"}
            </button>
          </div>
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

function HeaderCell({ children, sortKey, sort, setSort }) {
  const isSorted = sort.key === sortKey;
  const isDesc = isSorted && sort.desc;
  return (
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50" onClick={() => setSort({ key: sortKey, desc: isSorted ? !sort.desc : false })}>
      <div className="flex items-center gap-1">
        {children}
        {isSorted && (
          <svg className={`w-3 h-3 ${isDesc ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </div>
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

  // Helper function to add months to a date (similar to Excel's EDATE)
  const addMonths = (dateString, months) => {
    if (!dateString || months < 0) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    const newDate = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
    return newDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  };

  const enriched = useMemo(() => rows.map((r) => {
    const monthsLeft = Math.max(0, parseNumber(r.totalMonths) - parseNumber(r.monthsPaid));
    const restBill = monthsLeft * parseNumber(r.monthlyPayment);
    const progress = (parseNumber(r.monthsPaid) / Math.max(1, parseNumber(r.totalMonths))) * 100;
    const currentInst = Math.min(parseNumber(r.totalMonths), parseNumber(r.monthsPaid) + 1);
    const isCompleted = monthsLeft === 0;
    
    // Calculate Finish ETA: First Payment Date + (Total Months - Months Already Paid)
    const finishETA = addMonths(r.firstPaymentDate, parseNumber(r.totalMonths) - parseNumber(r.monthsPaid));
    
    return { note: "", ...r, monthsLeft, restBill, progress, currentInst, isCompleted, finishETA };
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
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <HeaderCell sortKey="bank" sort={sort} setSort={setSort}>Bank</HeaderCell>
                    <HeaderCell sortKey="transaction" sort={sort} setSort={setSort}>Transaction</HeaderCell>
                    <HeaderCell sortKey="monthlyPayment" sort={sort} setSort={setSort}>Monthly</HeaderCell>
                    <HeaderCell sortKey="monthsPaid" sort={sort} setSort={setSort}>Paid</HeaderCell>
                    <HeaderCell sortKey="totalMonths" sort={sort} setSort={setSort}>Total</HeaderCell>
                    <HeaderCell sortKey="startDate" sort={sort} setSort={setSort}>Start Date</HeaderCell>
                    <HeaderCell sortKey="firstPaymentDate" sort={sort} setSort={setSort}>First Payment</HeaderCell>
                    <HeaderCell sortKey="finishETA" sort={sort} setSort={setSort}>Finish ETA</HeaderCell>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rest Bill</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="px-4 py-8 text-center">
                        <EmptyState />
                      </td>
                    </tr>
                  ) : (
                    sorted.map((r) => {
                      const isCompleted = r.monthsLeft === 0;
                      const isNearCompletion = r.monthsLeft <= 2 && r.monthsLeft > 0;
                      return (
                        <tr key={r.id} className={`${isCompleted ? "opacity-60" : ""} hover:bg-gray-50`}>
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">{r.bank}</td>
                          <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate" title={r.transaction}>{r.transaction}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{formatIDR(r.monthlyPayment)}</td>
                          <td className="px-4 py-4 text-sm">
                            <span className={isNearCompletion ? "text-amber-600 font-semibold" : "text-gray-900"}>{r.monthsPaid}</span>
                            <span className="text-xs text-gray-500 ml-1">({r.currentInst})</span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{r.totalMonths}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{r.startDate || "-"}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{r.firstPaymentDate || "-"}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{r.finishETA ? monthLabel(new Date(r.finishETA)) : "-"}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Progress value={r.progress} />
                              <span className="text-xs text-gray-600">{Math.round(r.progress)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className={isNearCompletion ? "text-amber-600 font-semibold" : "text-gray-900"}>{formatIDR(r.restBill)}</span>
                            {r.monthsLeft > 0 && (
                              <div className="text-xs text-gray-500">{r.monthsLeft} months left</div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm max-w-xs">
                            {noteEditId === r.id ? (
                              <div className="space-y-2">
                                <textarea rows={2} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} className="w-full border rounded px-2 py-1 text-xs" placeholder="Add notes..." />
                                <div className="flex gap-1">
                                  <button onClick={() => saveNote(r.id)} className="px-2 py-1 text-xs bg-black text-white rounded">Save</button>
                                  <button onClick={() => { setNoteEditId(null); setNoteDraft(""); }} className="px-2 py-1 text-xs border rounded">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="truncate" title={r.note}>{r.note || "-"}</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <RowActions onPay={() => handlePayOne(r.id)} onEdit={() => { setEditRow(r); setShowForm(true); }} onDelete={() => handleDelete(r.id)} onNote={() => openNote(r)} disabled={isCompleted} />
                          </td>
                        </tr>
                      );
                    })
                  )}
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
