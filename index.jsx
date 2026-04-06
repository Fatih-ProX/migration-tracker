import { useState, useEffect, useCallback } from "react";

// ─── Config ──────────────────────────────────────────────────────────────────
const ADMIN_NTIDS = ["UPO63536", "ADMIN02", "MGRADMIN"]; // Add real admin NTIDs here
const TMOBILE_PLANS = [
  "$25 Essentials", "$35 Go5G", "$45 Go5G Plus", "$55 Go5G Next",
  "$40 Unlimited", "$50 Magenta", "$60 Magenta MAX", "Other"
];
const METRO_PLANS = [
  "$25 Unlimited", "$30 Unlimited", "$40 Unlimited", "$50 Unlimited",
  "$60 Unlimited", "Other"
];
const MIGRATION_STATUS = ["Yes", "No", "In Progress"];

// ─── Utilities ───────────────────────────────────────────────────────────────
const uid = () => `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().split("T")[0];
const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const STATUS_COLOR = {
  "Yes": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "No": "bg-red-100 text-red-700 border-red-200",
  "In Progress": "bg-amber-100 text-amber-700 border-amber-200",
};

const EMPTY_FORM = {
  metroPhone: "", metroAccount: "", metroPIN: "", customerName: "",
  devicesOrdered: "", metroPlan: "", tmobilePlan: "", dateOrdered: today(),
  zipCode: "", orderID: "", tmobileAccount: "", linesMigrated: "",
  migrationCompleted: "In Progress",
};

// ─── Storage helpers (shared across all users) ───────────────────────────────
async function loadRecords() {
  try {
    const r = await window.storage.get("migrations_v1", true);
    return r ? JSON.parse(r.value) : [];
  } catch { return []; }
}
async function saveRecords(recs) {
  try { await window.storage.set("migrations_v1", JSON.stringify(recs), true); } catch {}
}
async function loadAdmins() {
  try {
    const r = await window.storage.get("admins_v1", true);
    return r ? JSON.parse(r.value) : ADMIN_NTIDS;
  } catch { return ADMIN_NTIDS; }
}
async function saveAdmins(list) {
  try { await window.storage.set("admins_v1", JSON.stringify(list), true); } catch {}
}

// ─── Components ──────────────────────────────────────────────────────────────
function Badge({ status }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function Input({ label, required, error, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-magenta-400 bg-white ${error ? "border-red-400" : "border-gray-200"}`}
        style={{"--tw-ring-color": "#e20074"}}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Select({ label, required, options, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2" style={{"--tw-ring-color":"#e20074"}} {...props}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [ntid, setNtid] = useState("");
  const [dealer, setDealer] = useState("");
  const [err, setErr] = useState("");

  const handle = () => {
    if (!ntid.trim()) return setErr("NTID is required.");
    if (!dealer.trim()) return setErr("Dealer/Sales Code is required.");
    setErr("");
    onLogin(ntid.trim().toUpperCase(), dealer.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background: "linear-gradient(135deg,#e20074 0%,#7b0044 100%)"}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{background:"#e20074"}}>
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Migration Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Company X → Company Y</p>
        </div>

        <div className="space-y-4">
          <Input
            label="Employee NTID"
            placeholder="e.g. JSMITH01"
            required
            value={ntid}
            onChange={e => setNtid(e.target.value)}
          />
          <Input
            label="Dealer / Sales Code"
            placeholder="e.g. DLR12345"
            required
            value={dealer}
            onChange={e => setDealer(e.target.value)}
          />
          {err && <p className="text-sm text-red-500">{err}</p>}
          <button
            onClick={handle}
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition hover:opacity-90 active:scale-95"
            style={{background:"#e20074"}}
          >
            Sign In
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Admin? Use your admin NTID to access the admin panel.</p>
      </div>
    </div>
  );
}

// ─── MIGRATION FORM ───────────────────────────────────────────────────────────
function MigrationForm({ ntid, dealerCode, onSaved, editRecord, onCancel }) {
  const [form, setForm] = useState(editRecord ? { ...editRecord } : { ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.metroPhone.match(/^\d{10}$/)) e.metroPhone = "Must be 10 digits";
    if (!form.metroAccount.match(/^\d+$/)) e.metroAccount = "Must be numeric";
    if (!form.metroPIN.match(/^\d{4,8}$/)) e.metroPIN = "Must be 4–8 digits";
    if (!form.customerName.trim()) e.customerName = "Required";
    if (!form.zipCode.match(/^\d{5}$/)) e.zipCode = "Must be 5 digits";
    if (!form.orderID.trim()) e.orderID = "Required";
    if (!form.tmobileAccount.match(/^\d+$/)) e.tmobileAccount = "Must be numeric";
    if (!form.linesMigrated || isNaN(form.linesMigrated)) e.linesMigrated = "Must be a number";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const recs = await loadRecords();
    if (editRecord) {
      const idx = recs.findIndex(r => r.id === editRecord.id);
      if (idx !== -1) recs[idx] = { ...editRecord, ...form, updatedAt: new Date().toISOString() };
    } else {
      recs.push({ ...form, id: uid(), ntid, dealerCode, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    await saveRecords(recs);
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onSaved(); }, 1200);
  };

  const F = form;
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">{editRecord ? "Edit Migration Record" : "New Migration Record"}</h2>
        {onCancel && <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600">✕ Cancel</button>}
      </div>

      {/* Read-only context */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
        <div><p className="text-xs text-gray-400 font-medium">NTID</p><p className="text-sm font-bold text-gray-700">{ntid}</p></div>
        <div><p className="text-xs text-gray-400 font-medium">Dealer / Sales Code</p><p className="text-sm font-bold text-gray-700">{dealerCode}</p></div>
      </div>

      {/* Section: Customer */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Customer Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Customer Name" placeholder="Last, First" required value={F.customerName} onChange={e=>set("customerName",e.target.value)} error={errors.customerName} />
          <Input label="Metro Phone Number" placeholder="10 digits" required value={F.metroPhone} onChange={e=>set("metroPhone",e.target.value)} error={errors.metroPhone} />
          <Input label="Metro Account Number" placeholder="Numeric" required value={F.metroAccount} onChange={e=>set("metroAccount",e.target.value)} error={errors.metroAccount} />
          <Input label="Metro / T-Mobile PIN" placeholder="4–8 digits" required value={F.metroPIN} onChange={e=>set("metroPIN",e.target.value)} error={errors.metroPIN} />
          <Input label="Zip Code" placeholder="5 digits" required value={F.zipCode} onChange={e=>set("zipCode",e.target.value)} error={errors.zipCode} />
        </div>
      </div>

      {/* Section: Order */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Order Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Order ID" placeholder="Alphanumeric" required value={F.orderID} onChange={e=>set("orderID",e.target.value)} error={errors.orderID} />
          <Input label="Devices Ordered" placeholder='e.g. iPhone 15 x2' value={F.devicesOrdered} onChange={e=>set("devicesOrdered",e.target.value)} />
          <Input label="Date Ordered" type="date" required value={F.dateOrdered} onChange={e=>set("dateOrdered",e.target.value)} />
          <Input label="Lines Migrated" type="number" min="1" required value={F.linesMigrated} onChange={e=>set("linesMigrated",e.target.value)} error={errors.linesMigrated} />
        </div>
      </div>

      {/* Section: Plans */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Plan Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Metro Monthly Plan" options={METRO_PLANS} value={F.metroPlan} onChange={e=>set("metroPlan",e.target.value)} />
          <Select label="T-Mobile Monthly Plan" options={TMOBILE_PLANS} value={F.tmobilePlan} onChange={e=>set("tmobilePlan",e.target.value)} />
          <Input label="T-Mobile Account Number" placeholder="Numeric" required value={F.tmobileAccount} onChange={e=>set("tmobileAccount",e.target.value)} error={errors.tmobileAccount} />
        </div>
      </div>

      {/* Status */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Migration Status</p>
        <div className="flex gap-3">
          {MIGRATION_STATUS.map(s => (
            <button key={s} onClick={() => set("migrationCompleted", s)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition ${F.migrationCompleted === s ? STATUS_COLOR[s] + " border-current" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving || saved}
        className="w-full py-3 rounded-xl text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-60"
        style={{background: saved ? "#10b981" : "#e20074"}}
      >
        {saved ? "✓ Saved!" : saving ? "Saving…" : editRecord ? "Update Record" : "Submit Migration"}
      </button>
    </div>
  );
}

// ─── RECORDS TABLE ─────────────────────────────────────────────────────────────
function RecordsTable({ records, onEdit, isAdmin }) {
  const cols = ["Customer", "Phone", "Order ID", "Lines", "Metro Plan", "T-Mobile Plan", "Date", "Status"];
  if (!records.length) return <p className="text-center text-gray-400 text-sm py-12">No records found.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50">
            {isAdmin && <th className="px-4 py-3">NTID</th>}
            {isAdmin && <th className="px-4 py-3">Store</th>}
            {cols.map(c => <th key={c} className="px-4 py-3 whitespace-nowrap">{c}</th>)}
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {records.map(r => (
            <tr key={r.id} className="hover:bg-gray-50 transition">
              {isAdmin && <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.ntid}</td>}
              {isAdmin && <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.dealerCode}</td>}
              <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{r.customerName || "—"}</td>
              <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-600">{r.metroPhone}</td>
              <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-600">{r.orderID}</td>
              <td className="px-4 py-3 text-center font-bold" style={{color:"#e20074"}}>{r.linesMigrated}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{r.metroPlan}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{r.tmobilePlan}</td>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(r.dateOrdered)}</td>
              <td className="px-4 py-3"><Badge status={r.migrationCompleted} /></td>
              <td className="px-4 py-3">
                {onEdit && <button onClick={() => onEdit(r)} className="text-xs text-blue-500 hover:underline">Edit</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── STATS CARD ───────────────────────────────────────────────────────────────
function StatsRow({ records }) {
  const total = records.length;
  const done = records.filter(r => r.migrationCompleted === "Yes").length;
  const inprog = records.filter(r => r.migrationCompleted === "In Progress").length;
  const failed = records.filter(r => r.migrationCompleted === "No").length;
  const lines = records.reduce((a, r) => a + (parseInt(r.linesMigrated) || 0), 0);
  const stats = [
    { label: "Total Records", value: total, color: "#e20074" },
    { label: "Completed", value: done, color: "#10b981" },
    { label: "In Progress", value: inprog, color: "#f59e0b" },
    { label: "Not Completed", value: failed, color: "#ef4444" },
    { label: "Lines Migrated", value: lines, color: "#6366f1" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
          <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ currentNtid, records, onBack, onRefresh }) {
  const [filterNtid, setFilterNtid] = useState("");
  const [filterStore, setFilterStore] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [editRecord, setEditRecord] = useState(null);
  const [tab, setTab] = useState("records"); // records | admins
  const [admins, setAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState("");

  useEffect(() => { loadAdmins().then(setAdmins); }, []);

  const filtered = records.filter(r =>
    (!filterNtid || r.ntid.includes(filterNtid.toUpperCase())) &&
    (!filterStore || r.dealerCode.includes(filterStore.toUpperCase())) &&
    (filterStatus === "All" || r.migrationCompleted === filterStatus)
  );

  // Unique stores/employees for summary
  const stores = [...new Set(records.map(r => r.dealerCode))];
  const emps = [...new Set(records.map(r => r.ntid))];

  const addAdmin = async () => {
    const n = newAdmin.trim().toUpperCase();
    if (!n || admins.includes(n)) return;
    const updated = [...admins, n];
    setAdmins(updated);
    await saveAdmins(updated);
    setNewAdmin("");
  };
  const removeAdmin = async (a) => {
    if (a === currentNtid) return;
    const updated = admins.filter(x => x !== a);
    setAdmins(updated);
    await saveAdmins(updated);
  };

  if (editRecord) return (
    <div className="max-w-3xl mx-auto p-4">
      <MigrationForm
        ntid={editRecord.ntid}
        dealerCode={editRecord.dealerCode}
        editRecord={editRecord}
        onSaved={() => { setEditRecord(null); onRefresh(); }}
        onCancel={() => setEditRecord(null)}
      />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">{stores.length} stores · {emps.length} employees · {records.length} records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">↻ Refresh</button>
          <button onClick={onBack} className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50">Sign Out</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {["records","admins"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 transition ${tab===t ? "border-pink-600 text-pink-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
            {t === "records" ? "Migration Records" : "Manage Admins"}
          </button>
        ))}
      </div>

      {tab === "records" && <>
        <StatsRow records={filtered} />
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Filter by NTID</label>
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Employee NTID" value={filterNtid} onChange={e=>setFilterNtid(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Filter by Store</label>
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Dealer Code" value={filterStore} onChange={e=>setFilterStore(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option>All</option>
              {MIGRATION_STATUS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={()=>{setFilterNtid("");setFilterStore("");setFilterStatus("All");}} className="px-4 py-2 rounded-lg text-sm text-gray-500 bg-gray-100 hover:bg-gray-200">Clear</button>
        </div>
        {/* Showing */}
        <p className="text-xs text-gray-400">Showing {filtered.length} of {records.length} records</p>
        <RecordsTable records={filtered} onEdit={setEditRecord} isAdmin />
      </>}

      {tab === "admins" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-md space-y-4">
          <h3 className="font-bold text-gray-700">Admin NTIDs</h3>
          <ul className="space-y-2">
            {admins.map(a => (
              <li key={a} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                <span className="font-mono text-sm font-semibold text-gray-700">{a}</span>
                {a !== currentNtid && (
                  <button onClick={()=>removeAdmin(a)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                )}
                {a === currentNtid && <span className="text-xs text-gray-400">(you)</span>}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1" placeholder="New Admin NTID" value={newAdmin} onChange={e=>setNewAdmin(e.target.value)} />
            <button onClick={addAdmin} className="px-4 py-2 rounded-lg text-sm text-white font-bold" style={{background:"#e20074"}}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EMPLOYEE VIEW ────────────────────────────────────────────────────────────
function EmployeeView({ ntid, dealerCode, onLogout }) {
  const [records, setRecords] = useState([]);
  const [view, setView] = useState("list"); // list | new | edit
  const [editRecord, setEditRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const all = await loadRecords();
    setRecords(all.filter(r => r.ntid === ntid));
    setLoading(false);
  }, [ntid]);

  useEffect(() => { refresh(); }, [refresh]);

  const myStats = {
    total: records.length,
    done: records.filter(r=>r.migrationCompleted==="Yes").length,
    inprog: records.filter(r=>r.migrationCompleted==="In Progress").length,
    lines: records.reduce((a,r)=>a+(parseInt(r.linesMigrated)||0),0),
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-800">My Migrations</h1>
          <p className="text-xs text-gray-500 font-mono">NTID: <b className="text-gray-700">{ntid}</b> · Store: <b className="text-gray-700">{dealerCode}</b></p>
        </div>
        <div className="flex gap-2">
          {view === "list" && (
            <button onClick={()=>setView("new")} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:"#e20074"}}>
              + New Migration
            </button>
          )}
          <button onClick={onLogout} className="px-4 py-2 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50">Sign Out</button>
        </div>
      </div>

      {view === "list" && <>
        {/* Mini stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {l:"My Records", v:myStats.total, c:"#e20074"},
            {l:"Completed", v:myStats.done, c:"#10b981"},
            {l:"In Progress", v:myStats.inprog, c:"#f59e0b"},
            {l:"Lines Done", v:myStats.lines, c:"#6366f1"},
          ].map(s=>(
            <div key={s.l} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
              <p className="text-2xl font-black" style={{color:s.c}}>{s.v}</p>
              <p className="text-xs text-gray-400 mt-1">{s.l}</p>
            </div>
          ))}
        </div>
        {loading ? <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
          : <RecordsTable records={records} onEdit={r=>{setEditRecord(r);setView("edit");}} isAdmin={false} />}
      </>}

      {view === "new" && (
        <MigrationForm
          ntid={ntid}
          dealerCode={dealerCode}
          onSaved={()=>{setView("list");refresh();}}
          onCancel={()=>setView("list")}
        />
      )}

      {view === "edit" && editRecord && (
        <MigrationForm
          ntid={ntid}
          dealerCode={dealerCode}
          editRecord={editRecord}
          onSaved={()=>{setView("list");setEditRecord(null);refresh();}}
          onCancel={()=>{setView("list");setEditRecord(null);}}
        />
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null); // { ntid, dealerCode, isAdmin }
  const [allRecords, setAllRecords] = useState([]);

  const refreshAll = async () => {
    const r = await loadRecords();
    setAllRecords(r);
  };

  const handleLogin = async (ntid, dealerCode) => {
    const admins = await loadAdmins();
    const isAdmin = admins.includes(ntid);
    setUser({ ntid, dealerCode, isAdmin });
    if (isAdmin) refreshAll();
  };

  const handleLogout = () => setUser(null);

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  if (user.isAdmin) return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-1 w-full" style={{background:"linear-gradient(90deg,#e20074,#7b0044)"}} />
      <AdminPanel
        currentNtid={user.ntid}
        records={allRecords}
        onBack={handleLogout}
        onRefresh={refreshAll}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-1 w-full" style={{background:"linear-gradient(90deg,#e20074,#7b0044)"}} />
      <EmployeeView ntid={user.ntid} dealerCode={user.dealerCode} onLogout={handleLogout} />
    </div>
  );
}
