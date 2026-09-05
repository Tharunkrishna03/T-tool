import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, CircleHelp, Download, FileSpreadsheet, Filter,
  FolderOpen, GitCompareArrows, GripVertical, Home, Info, LoaderCircle,
  Merge, MoreHorizontal, PencilLine, Plus, RefreshCw, Search, Settings,
  ShieldCheck, Sparkles, TableProperties, Trash2, Undo2, Upload, X, ZoomIn, ZoomOut, Scissors, Copy, ClipboardPaste, ArrowDownToLine, Eraser, Paintbrush 
} from 'lucide-react';
import { api } from './services/api';

const requiredColumns = [
  'Product', 'Type', 'Make', 'Model', 'Item', 'Serial No', 'Asset Location',
  'Project', 'Unit Price', 'Tax Percent', 'Asset User', 'Asset Tag',
];

const sourceColumns = [
  'Asset Name', 'Category', 'Manufacturer', 'Model No', 'Item Description',
  'Serial Number', 'Location', 'Project Name', 'Price', 'Tax', 'User', 'Asset ID',
];

const defaultMapping = (cols) => cols.map(c => ({ source: c, target: c, included: true }));

const sampleRows = [];

const comparisonRows = {
  common: [],
  first: [],
  second: [],
};


const rowsWithIds = (items = []) => items.map((row, index) => ({ id: index + 1, ...row }));
const errorMessage = (error, fallback = 'The local service could not complete that action.') => error?.response?.data?.detail || error?.message || fallback;

function downloadRows(rows, fileName) {
  const fields = Object.keys(rows[0] || {});
  if (!fields.length) return false;
  const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = `\ufeff${fields.join(',')}\n${rows.map(row => fields.map(field => escape(row[field])).join(',')).join('\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a'); link.href = url; link.download = fileName; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

export function executeExport(rows, fileNameBase, notify, format) {
  if (!format) return;
  if (!rows || !rows.length) return;
  
  if (format.toLowerCase() === 'xl' || format.toLowerCase() === 'xlsx') {
    const fields = Object.keys(rows[0] || {});
    let html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" /></head><body><table>';
    html += '<tr>' + fields.map(f => `<th>${f}</th>`).join('') + '</tr>';
    rows.forEach(row => { html += '<tr>' + fields.map(f => `<td>${row[f] ?? ''}</td>`).join('') + '</tr>'; });
    html += '</table></body></html>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `${fileNameBase}.xls`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    if (notify) notify(`${fileNameBase} XL download started`);
  } else {
    downloadRows(rows, `${fileNameBase}.csv`);
    if (notify) notify(`${fileNameBase} CSV download started`);
  }
}

function FormatDialog({ onConfirm, onClose }) {
  const [format, setFormat] = useState('csv');
  const run = () => { onConfirm?.(format); onClose(); };
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="confirm-dialog" role="dialog" aria-modal="true" style={{ width: '400px' }}>
        <span className="confirm-icon" style={{ background: '#ecfdf5', color: '#10b981' }}><Download size={24} /></span>
        <h2>Choose file format</h2>
        <p>Select the preferred file type before downloading your data.</p>
        <div className="choice-row" style={{ justifyContent: 'center', marginTop: '20px', marginBottom: '20px', gap: '30px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="radio" checked={format === 'csv'} onChange={() => setFormat('csv')} />CSV (.csv)</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="radio" checked={format === 'xl'} onChange={() => setFormat('xl')} />Excel (.xlsx)</label>
        </div>
        <div>
          <button className="button button-secondary" onClick={onClose}>Cancel</button>
          <button className="button button-primary" onClick={run}>Download</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [formatTask, setFormatTask] = useState(null);
  const [sharedFile, setSharedFile] = useState(null);

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    window.clearTimeout(window.__cleanerToast);
    window.__cleanerToast = window.setTimeout(() => setToast(null), 3600);
  };

  const askFormat = (callback) => {
    setFormatTask(() => callback);
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} />
      <main className="main-panel">
        {page === 'dashboard' && <Dashboard setPage={setPage} />}
        {page === 'clean' && <CleanExcel notify={notify} ask={setModal} askFormat={askFormat} sharedFile={sharedFile} setSharedFile={setSharedFile} />}
        {page === 'compare' && <CompareExcel notify={notify} ask={setModal} askFormat={askFormat} sharedFile={sharedFile} setSharedFile={setSharedFile} />}
        {page === 'merge' && <MergeExcel notify={notify} ask={setModal} askFormat={askFormat} sharedFile={sharedFile} setSharedFile={setSharedFile} />}
        {page === 'arrange' && <StandaloneArrange notify={notify} askFormat={askFormat} setSharedFile={setSharedFile} setPage={setPage} />}
        {page === 'settings' && <SettingsPage notify={notify} />}
      </main>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {modal && <ConfirmDialog {...modal} onClose={() => setModal(null)} />}
      {formatTask && <FormatDialog onConfirm={formatTask} onClose={() => setFormatTask(null)} />}
    </div>
  );
}

function Sidebar({ page, setPage }) {
  const items = [
    ['dashboard', Home, 'Dashboard'],
    ['clean', FileSpreadsheet, 'Clean Excel'],
    ['compare', GitCompareArrows, 'Compare Excel'],
    ['merge', Merge, 'Merge Excel'],
    ['arrange', TableProperties, 'Arrange Data'],
  ];
  return <aside className="sidebar">
    <div className="brand"><span className="brand-icon"><img src="/logo.png" alt="Company Logo" style={{ width: '40px', height: '40px', objectFit: 'fit' }} /></span><span>T<br />Tool</span></div>
    <nav className="nav-list">
      <p className="nav-label">WORKSPACE</p>
      {items.map(([key, Icon, label]) => <button key={key} className={`nav-item ${page === key ? 'active' : ''}`} onClick={() => setPage(key)}><Icon size={19} />{label}</button>)}
      <div className="nav-rule" />
      <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}><Settings size={19} />Settings</button>
    </nav>
    <div className="privacy-card" onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}><RefreshCw size={20} /><div><b>Refresh Page</b><span>Click to reload application</span></div></div>
  </aside>;
}

function TopBar() {
  return <header className="topbar"><div className="topbar-note"><span className="online-dot" />Ready to work locally</div><div className="window-controls"><span /><span /><span /></div></header>;
}

function Dashboard({ setPage }) {
  return <section className="page dashboard-page">
    <div className="action-grid">
      <ActionCard variant="blue" icon={<FileSpreadsheet />} title="Clean Excel" text="Review and standardize one Excel file, step by step." action="Start Cleaning" onClick={() => setPage('clean')} />
      <ActionCard variant="white" icon={<GitCompareArrows />} title="Compare Excel Files" text="Find records that are new, missing or common across two files." action="Compare Files" onClick={() => setPage('compare')} />
      <ActionCard variant="white" icon={<Merge />} title="Merge Excel Files" text="Combine two standalone Excel files safely and easily." action="Merge Files" onClick={() => setPage('merge')} />
      <ActionCard variant="white" icon={<TableProperties />} title="Arrange Data" text="Reorder and map columns dynamically, then pass to another tool." action="Arrange Data" onClick={() => setPage('arrange')} />
    </div>
    <section className="how-it-works">
      <div className="section-heading"><div><span className="eyebrow muted">A GUIDED PROCESS</span><h2>How it works</h2></div><span className="easy-badge"><CheckCircle2 size={16} /> No technical steps</span></div>
      <div className="journey">
        {[['01', 'Upload', 'Choose your Excel file'], ['02', 'Review', 'Check your data'], ['03', 'Clean', 'Fix only what you approve'], ['04', 'Validate', 'Review before export'], ['05', 'Export', 'Download your CSV']].map((item, i) => <div className="journey-item" key={item[1]}><div className="journey-number">{item[0]}</div><div><b>{item[1]}</b><span>{item[2]}</span></div>{i < 4 && <ArrowRight className="journey-arrow" size={18} />}</div>)}
      </div>
    </section>
    <div className="dashboard-footnote"><Info size={16} /> Nothing is changed automatically. You review every important change before it is applied.</div>
  </section>;
}

function ActionCard({ variant, icon, title, text, action, onClick }) {
  return <article className={`action-card ${variant}`}><div className="card-icon">{icon}</div><div className="action-content"><h2>{title}</h2><p>{text}</p></div><button className={`button ${variant === 'blue' ? 'button-white' : 'button-primary'}`} onClick={onClick}>{action}<ArrowRight size={18} /></button><div className="card-pattern" /></article>;
}

function CleanExcel({ notify, ask, askFormat, sharedFile, setSharedFile }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [sheet, setSheet] = useState('Asset Data');
  const [rows, setRows] = useState(sampleRows);
  const [columns, setColumns] = useState(sourceColumns);
  const [sheets, setSheets] = useState(['Asset Data', 'Laptop Data', 'Monitor Data']);
  const [recordCount, setRecordCount] = useState(0);
  const [serverSession, setServerSession] = useState(false);
  const [changes, setChanges] = useState([]);
  const [activeTool, setActiveTool] = useState(null);
  const [mapping, setMapping] = useState(() => defaultMapping(sourceColumns));
  const [mappingConfidence, setMappingConfidence] = useState({});
  const [issues, setIssues] = useState(null);
  const [search, setSearch] = useState('');
  const [finalReady, setFinalReady] = useState(false);

  useEffect(() => {
    if (sharedFile) {
      const f = sharedFile;
      setSharedFile(null);
      uploadDone(f);
    }
  }, [sharedFile]);

  const updateFromSummary = (summary) => {
    const preview = summary.preview || summary.rows || [];
    setRows(rowsWithIds(preview));
    const nextColumns = Array.isArray(summary.columns) ? summary.columns : Object.keys(preview[0] || {});
    if (nextColumns.length) setColumns(nextColumns);
    if (typeof summary.rows === 'number') setRecordCount(summary.rows);
    if (typeof summary.total_rows === 'number') setRecordCount(summary.total_rows);
  };

  const refreshPreview = async () => {
    if (!serverSession) return;
    const preview = await api.preview();
    updateFromSummary(preview);
  };

  const refreshIssues = async () => {
    if (!serverSession) return;
    const duplicateColumn = columns.find(column => /serial|asset.?id|asset.?tag/i.test(column)) || columns[0];
    try {
      const [duplicates, numbers, empty] = await Promise.all([
        duplicateColumn ? api.detectDuplicates(duplicateColumn) : Promise.resolve({ count: 0, rows: [] }),
        api.detectNumberErrors(), api.emptyFields(),
      ]);
      setIssues({ duplicates, numbers: numbers.errors, empty: empty.fields, emptyTotal: empty.total_empty_cells });
    } catch (error) {
      notify(errorMessage(error, 'Could not scan the uploaded data.'), 'warning');
    }
  };

  const uploadDone = async (uploaded) => {
    if (!uploaded) {
      setServerSession(false); setRows(sampleRows); setColumns(sourceColumns); setSheets(['Asset Data', 'Laptop Data', 'Monitor Data']);
      setSheet('Asset Data'); setRecordCount(0); setMapping(defaultMapping(sourceColumns)); setMappingConfidence({}); setIssues(null);
      setFile(null);
      return;
    }
    let details;
    try {
      details = await api.uploadExcel(uploaded);
    } catch (error) {
      notify(errorMessage(error, 'Could not upload this Excel file.'), 'warning');
      return;
    }
    setServerSession(true); updateFromSummary(details); setSheet(details.active_sheet); setSheets(details.sheets || []);
    const preview = details.preview || details.rows || [];
    const nextCols = Array.isArray(details.columns) ? details.columns : Object.keys(preview[0] || {});
    setMapping(defaultMapping(nextCols)); setMappingConfidence({}); setChanges([]); setIssues(null); setFinalReady(false);
    setFile({
      name: details.file_name || uploaded.name,
      size: uploaded ? `${(uploaded.size / 1024).toFixed(0)} KB` : '1.8 MB',
      rows: details.rows,
      columns: details.columns,
      sheets: details.sheets?.length || 1,
    });
    notify('Excel uploaded successfully');
  };
  const selectSheet = async (nextSheet) => {
    if (!serverSession) { setSheet(nextSheet); return; }
    try {
      const details = await api.selectSheet(nextSheet);
      setSheet(details.active_sheet); updateFromSummary(details); setChanges([]); setIssues(null);
    } catch (error) { notify(errorMessage(error, 'Could not load that sheet.'), 'warning'); }
  };
  const mergeSheets = async () => {
    if (!serverSession || sheets.length < 2) return;
    try {
      const details = await api.mergeSheets(sheets);
      setSheet('Merged data'); updateFromSummary(details); setChanges([]); setIssues(null);
      notify('Sheets merged successfully');
    } catch (error) { notify(errorMessage(error, 'Could not merge these sheets.'), 'warning'); }
  };
  const commitCell = async (id, col, value) => {
    const before = rows.find((row) => row.id === id)?.[col];
    try {
      if (serverSession) await api.updateCell(id - 1, col, value);
    } catch (error) { notify(errorMessage(error, 'Could not update that cell.'), 'warning'); return; }
    setRows(old => old.map(row => row.id === id ? { ...row, [col]: value } : row));
    setChanges(old => [...old, { id, col, before }]);
    notify('Cell updated');
  };
  const handleTableAction = async (action, payload) => {
    if (action === 'DELETE_ROW') {
      setRows(old => old.filter(row => row.id !== payload.id));
      notify('Row deleted');
    } else if (action === 'INSERT_ROW') {
      setRows(old => {
        const index = old.findIndex(r => r.id === payload.afterId);
        const newRow = { id: Date.now() };
        columns.forEach(c => newRow[c] = '');
        const copy = [...old];
        copy.splice(index + 1, 0, newRow);
        return copy;
      });
      notify('Row inserted');
    }
  };
  const undo = async () => {
    const last = changes.at(-1);
    if (!last) return notify('There is no change to undo', 'info');
    try {
      if (serverSession) await api.updateCell(last.id - 1, last.col, last.before);
    } catch (error) { notify(errorMessage(error, 'Could not undo that change.'), 'warning'); return; }
    setRows(old => old.map(row => row.id === last.id ? { ...row, [last.col]: last.before } : row));
    setChanges(old => old.slice(0, -1));
    notify('Last change undone', 'info');
  };
  const applyMapping = async () => {
    if (!serverSession) { setStep(5); return; }
    try {
      const details = await api.applyMapping(mapping);
      updateFromSummary(details); setStep(5);
    } catch (error) { notify(errorMessage(error, 'Could not arrange the selected columns.'), 'warning'); }
  };
  const restart = async () => {
    try { if (serverSession) await api.reset(); } catch { /* The UI can still clear its local session. */ }
    setStep(1); setFile(null); setServerSession(false); setFinalReady(false); setRows(sampleRows); setColumns(sourceColumns);
    setSheets(['Asset Data', 'Laptop Data', 'Monitor Data']); setSheet('Asset Data'); setRecordCount(0); setMapping(defaultMapping(sourceColumns)); setIssues(null); setChanges([]);
  };
  const continueStep = () => setStep(current => Math.min(current + 1, 6));
  const showConfirm = (props) => ask({ ...props, onConfirm: () => { props.onConfirm?.(); } });

  return <section className="page workflow-page">
    <Stepper current={step} onSelect={(target) => target <= step && setStep(target)} />
    <div className="workflow-card">
      {step === 1 && <UploadStep file={file} onUpload={uploadDone} onContinue={continueStep} />}
      {step === 2 && <ReviewStep rows={rows} sheet={sheet} sheets={sheets} rowCount={recordCount} columns={columns} search={search} setSearch={setSearch} onSheetChange={selectSheet} onMerge={mergeSheets} onEdit={commitCell} onTableAction={handleTableAction} changes={changes} onUndo={undo} onBack={() => setStep(1)} onContinue={async () => { await refreshIssues(); setStep(3); }} />}
      {step === 3 && <CleanStep rows={rows} columns={columns} issues={issues} serverSession={serverSession} activeTool={activeTool} setActiveTool={setActiveTool} notify={notify} ask={showConfirm} onDataChanged={refreshPreview} onRefreshIssues={refreshIssues} onBack={() => setStep(2)} onContinue={continueStep} />}
      {step === 4 && <ArrangeStep mapping={mapping} setMapping={setMapping} file={file} columns={columns} confidence={mappingConfidence} setConfidence={setMappingConfidence} serverSession={serverSession} notify={notify} onBack={() => setStep(3)} onContinue={applyMapping} />}
      {step === 5 && <ValidateStep rows={rows} recordCount={recordCount} serverSession={serverSession} finalReady={finalReady} setFinalReady={setFinalReady} notify={notify} onBack={() => setStep(4)} onContinue={continueStep} />}
      {step === 6 && <ExportStep rows={rows} columns={columns} serverSession={serverSession} notify={notify} askFormat={askFormat} onRestart={restart} />}
    </div>
  </section>;
}

function PageIntro({ eyebrow, title, text, children }) {
  return <div className="page-intro"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{text}</p></div>{children}</div>;
}

function Stepper({ current, onSelect }) {
  const steps = ['Upload', 'Review', 'Clean', 'Arrange', 'Validate', 'Export'];
  return <div className="stepper">{steps.map((name, index) => { const n = index + 1; return <button key={name} className={`step ${current === n ? 'current' : ''} ${current > n ? 'done' : ''}`} onClick={() => onSelect(n)} disabled={n > current}><span>{current > n ? <Check size={14} /> : `0${n}`}</span><b>{name}</b>{n < 6 && <i />}</button>; })}</div>;
}

function UploadStep({ file, onUpload, onContinue }) {
  const fileInput = useRef(null);
  const handleFile = e => e.target.files?.[0] && onUpload(e.target.files[0]);
  return <div className="step-content upload-step"><div className="step-title"><span className="step-kicker">STEP 01</span><h2>Upload your Excel file</h2><p>Select an Excel file to start cleaning your data.</p></div>
    {!file ? <>
      <button className="upload-zone" onClick={() => fileInput.current?.click()}>
        <span className="upload-icon"><Upload size={29} /></span>
        <b>Drop your Excel file here</b><span>or</span>
        <span className="Documents-btn">
          <span className="folderContainer">
            <svg className="fileBack" viewBox="0 0 146 113" fill="#1b6bbb">
              <path d="M0 16C0 7.163 7.163 0 16 0h40l20 20h54c8.837 0 16 7.163 16 16v77H0z" />
            </svg>
            <svg className="filePage" viewBox="0 0 100 120" fill="white">
              <rect x="0" y="0" width="100" height="120" rx="8" />
              <path d="M20 30h60M20 50h60M20 70h40" stroke="#1b6bbb" strokeWidth="6" strokeLinecap="round" />
            </svg>
            <svg className="fileFront" viewBox="0 0 146 80" fill="#3D9BFC">
              <path d="M0 0h146v64c0 8.837-7.163 16-16 16H16c-8.837 0-16-7.163-16-16z" />
            </svg>
          </span>
          <span className="text">Browse files</span>
        </span>
        <small>.xlsx, .xls and .csv supported</small>
      </button>
      <input ref={fileInput} className="hidden-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
    </> : <div className="file-ready"><div className="file-ready-icon"><FileSpreadsheet size={28} /></div><div className="file-info"><span><CheckCircle2 size={17} /> File uploaded successfully</span><h3>{file.name}</h3><p>{Number(file.rows).toLocaleString()} rows <i /> {file.columns} columns <i /> {file.sheets} sheets</p></div><button className="icon-button" title="Choose a different file" onClick={() => fileInput.current?.click()}><RefreshCw size={18} /></button><input ref={fileInput} className="hidden-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} /></div>}
    <StepFooter canContinue={!!file} onContinue={onContinue} />
  </div>;
}

function ReviewStep({ rows, sheet, sheets, rowCount, columns, search, setSearch, onSheetChange, onMerge, onEdit, onTableAction, changes, onUndo, onBack, onContinue }) {
  const [zoom, setZoom] = useState(1);
  return <div className="step-content review-step"><div className="split-step-heading"><div className="step-title"><span className="step-kicker">STEP 02</span><h2>Review your data</h2><p>Double-click a cell to make a quick correction.</p></div><div className="sheet-select"><span>Select sheet</span><label><TableProperties size={16} /><select value={sheet} onChange={e => onSheetChange(e.target.value)}>{sheets.map(name => <option key={name}>{name}</option>)}</select><ChevronDown size={15} /></label></div></div>
    <div className="review-toolbar"><div className="search-box"><Search size={18} /><input aria-label="Search data" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search data..." /></div><button className="toolbar-button" onClick={() => setZoom(z => z + 0.1)}><ZoomIn size={16} /> Zoom In</button><button className="toolbar-button" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}><ZoomOut size={16} /> Zoom Out</button><button className="toolbar-button"><Filter size={16} /> Filter</button><span className="data-stat">Rows: {Number(rowCount).toLocaleString()} <i /> Columns: {columns.length}</span><button className="undo-button" onClick={onUndo} disabled={!changes.length}><Undo2 size={16} /> Undo last change</button></div>
    <div className="sheet-detail"><b>{sheet}</b><span>{Number(rowCount).toLocaleString()} rows</span><button onClick={onMerge} disabled={sheets.length < 2}><Merge size={15} /> Merge sheets</button></div>
    <DataTable zoom={zoom} rows={rows} search={search} changes={changes} onEdit={onEdit} onTableAction={onTableAction} />
    <StepFooter onBack={onBack} onContinue={onContinue} />
  </div>;
}

function DataTable({ rows, search = '', changes = [], onEdit, onTableAction, compact = false, zoom = 1 }) {
  const [editing, setEditing] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [sort, setSort] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleContextAction = async (action) => {
    if (!contextMenu) return;
    const { id, column, value } = contextMenu;
    const cellValue = String(value || '');
    
    try {
      switch (action) {
        case 'copy':
          await navigator.clipboard.writeText(cellValue);
          break;
        case 'cut':
          await navigator.clipboard.writeText(cellValue);
          onEdit?.(id, column, '');
          break;
        case 'paste':
          const text = await navigator.clipboard.readText();
          onEdit?.(id, column, text);
          break;
        case 'clear':
          onEdit?.(id, column, '');
          break;
        case 'insert':
          onTableAction?.('INSERT_ROW', { afterId: id });
          break;
        case 'delete':
          onTableAction?.('DELETE_ROW', { id });
          break;
        case 'format':
          setEditing({ id, column, value });
          break;
      }
    } catch(err) {
       console.error("Context Action failed:", err);
    }
  };
  const headers = Object.keys(rows[0] || {}).filter(key => key !== 'id');
  const changed = new Set(changes.map(change => `${change.id}-${change.col}`));
  const tableRows = useMemo(() => {
    let next = rows.filter(row => Object.values(row).join(' ').toLowerCase().includes(search.toLowerCase()));
    if (sort) next = [...next].sort((a, b) => String(a[sort]).localeCompare(String(b[sort])) * (sort === '__desc' ? -1 : 1));
    return next;
  }, [rows, search, sort]);
  useEffect(() => setPage(1), [search, sort]);
  const totalPages = Math.ceil(tableRows.length / pageSize) || 1;
  const paginatedRows = tableRows.slice((page - 1) * pageSize, page * pageSize);
  const save = async () => { if (!editing) return; const change = editing; setEditing(null); await onEdit?.(change.id, change.column, change.value); };
  return <div style={{ display: 'flex', flexDirection: 'column' }}><div className={`table-wrap ${compact ? 'compact-table' : ''}`} style={{ zoom }}><table><thead><tr><th className="row-number">#</th>{headers.map(header => <th key={header}><button onClick={() => setSort(sort === header ? '__desc' : header)}>{header}<ChevronDown size={13} /></button></th>)}</tr></thead><tbody>{paginatedRows.map((row, index) => <tr key={row.id}>{<td className="row-number">{(page - 1) * pageSize + index + 1}</td>}{headers.map(column => { const key = `${row.id}-${column}`; const isEditing = editing?.id === row.id && editing?.column === column; return <td key={column} title={row[column] ? String(row[column]) : ''} className={`${changed.has(key) ? 'was-edited' : ''} ${String(row[column]).match(/E\+\d+/) ? 'number-alert' : ''}`} onDoubleClick={() => onEdit && setEditing({ id: row.id, column, value: row[column] })} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, id: row.id, column, value: row[column] }); }}>{isEditing ? <input autoFocus value={editing.value} onChange={e => setEditing({ ...editing, value: e.target.value })} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(null); }} /> : <><span>{row[column] || <em className="empty-cell">Empty</em>}</span>{changed.has(key) && <small>Modified</small>}</>}</td>; })}</tr>)}</tbody></table>{tableRows.length === 0 && <div className="empty-table">No matching data found.</div>}
  {contextMenu && (
    <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
      <div className="context-menu-item" onClick={() => handleContextAction('cut')}><Scissors /> Cut</div>
      <div className="context-menu-item" onClick={() => handleContextAction('copy')}><Copy /> Copy</div>
      <div className="context-menu-item" onClick={() => handleContextAction('paste')}><ClipboardPaste /> Paste / Paste Special</div>
      <div className="context-menu-divider" />
      <div className="context-menu-item" onClick={() => handleContextAction('insert')}><ArrowDownToLine /> Insert</div>
      <div className="context-menu-item" onClick={() => handleContextAction('delete')}><Trash2 /> Delete</div>
      <div className="context-menu-item" onClick={() => handleContextAction('clear')}><Eraser /> Clear Contents</div>
      <div className="context-menu-divider" />
      <div className="context-menu-item" onClick={() => handleContextAction('format')}><Paintbrush /> Format Cells</div>
    </div>
  )}
  </div><div style={{ display: 'flex', gap: '16px', alignItems: 'center', alignSelf: 'flex-end', marginTop: '12px', fontSize: '13px', color: '#62839e' }}><div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><span>Rows:</span><select className="toolbar-button" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: '0 8px', height: '28px', color: 'inherit' }}><option value={50}>50</option><option value={100}>100</option><option value={500}>500</option><option value={rows.length}>All</option></select></div><div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><button className="toolbar-button" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /> Prev</button><span>Page {page} of {totalPages}</span><button className="toolbar-button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={16} /></button></div></div></div>;
}

function CleanStep({ rows, columns, issues, serverSession, activeTool, setActiveTool, notify, ask, onDataChanged, onRefreshIssues, onBack, onContinue }) {
  const tool = activeTool;
  const duplicateRows = rows.filter(row => row['Serial Number'] === 'DL-4X92-001');
  const duplicateCount = serverSession ? (issues?.duplicates?.count ?? '—') : 25;
  const numberCount = serverSession ? (issues?.numbers?.length ?? '—') : 35;
  const emptyCount = serverSession ? (issues?.emptyTotal ?? '—') : 180;
  return <div className="step-content clean-step"><div className="step-title"><span className="step-kicker">STEP 03</span><h2>Clean your data</h2><p>Choose one area to review. Nothing is changed until you approve it.</p></div>
    {!tool ? <div className="clean-grid">
      <ToolCard icon={<RefreshCw />} tone="blue" title="Duplicate records" count={duplicateCount} description="records may be repeated" action="Review duplicates" onClick={() => setActiveTool('duplicates')} />
      <ToolCard icon={<AlertTriangle />} tone="orange" title="Number format errors" count={numberCount} description="values need verification" action="Review errors" onClick={() => setActiveTool('numbers')} />
      <ToolCard icon={<MoreHorizontal />} tone="purple" title="Empty fields" count={emptyCount} description="cells need your decision" action="Handle empty fields" onClick={() => setActiveTool('empty')} />
    </div> : <ToolPanel tool={activeTool} rows={duplicateRows} columns={columns} issues={issues} serverSession={serverSession} back={() => setActiveTool(null)} notify={notify} ask={ask} onDataChanged={onDataChanged} onRefreshIssues={onRefreshIssues} />}
    <StepFooter onBack={onBack} onContinue={onContinue} />
  </div>;
}

function ToolCard({ icon, tone, title, count, description, action, onClick }) { return <article className="tool-card"><div className={`tool-icon ${tone}`}>{icon}</div><div><h3>{title}</h3><strong>{count} <span>{description}</span></strong></div><button className="text-button" onClick={onClick}>{action} <ArrowRight size={15} /></button></article>; }

function ToolPanel({ tool, rows, columns, issues, serverSession, back, notify, ask, onDataChanged, onRefreshIssues }) {
  const [duplicateOption, setDuplicateOption] = useState('Keep First');
  const duplicateColumns = columns.filter(column => /serial|asset.?id|asset.?tag|barcode|imei/i.test(column));
  const [duplicateColumn, setDuplicateColumn] = useState(duplicateColumns[0] || columns[0] || '');
  const [duplicateRows, setDuplicateRows] = useState(rows);
  const [numberErrors, setNumberErrors] = useState(issues?.numbers || []);
  const [emptyChoices, setEmptyChoices] = useState({});
  const [emptyValues, setEmptyValues] = useState({});

  useEffect(() => {
    if (!duplicateColumns.includes(duplicateColumn)) setDuplicateColumn(duplicateColumns[0] || columns[0] || '');
  }, [columns, duplicateColumn, duplicateColumns]);
  useEffect(() => {
    let active = true;
    if (tool === 'duplicates') {
      if (!serverSession) { setDuplicateRows(rows); return undefined; }
      if (!duplicateColumn) { setDuplicateRows([]); return undefined; }
      api.detectDuplicates(duplicateColumn).then(result => active && setDuplicateRows(rowsWithIds(result.rows))).catch(error => active && notify(errorMessage(error, 'Could not check duplicates.'), 'warning'));
    }
    if (tool === 'numbers') {
      if (!serverSession) { setNumberErrors([{ row: 25, field: 'Serial Number', current_value: '1.23456E+12', possible_value: '1234560000000' }, { row: 78, field: 'Serial Number', current_value: '9.87654E+13', possible_value: '98765400000000' }]); return undefined; }
      api.detectNumberErrors().then(result => active && setNumberErrors(result.errors)).catch(error => active && notify(errorMessage(error, 'Could not check number formats.'), 'warning'));
    }
    return () => { active = false; };
  }, [tool, serverSession, duplicateColumn]);

  const applyDuplicates = () => {
    const actions = { 'Keep First': 'keep_first', 'Keep Last': 'keep_last', 'Remove All Duplicates': 'remove_all', 'Highlight Duplicates Only': 'highlight' };
    const action = actions[duplicateOption];
    const title = action === 'highlight' ? 'Highlight duplicate records?' : 'Apply duplicate-record action?';
    ask({ title, message: `${duplicateRows.length} duplicate records will be ${action === 'highlight' ? 'kept for review' : 'changed'} using ${duplicateColumn}.`, confirm: action === 'highlight' ? 'Highlight records' : 'Apply action', onConfirm: async () => {
      try {
        if (serverSession) {
          const result = await api.applyDuplicates({ column: duplicateColumn, action, confirmed: true });
          await onDataChanged(); await onRefreshIssues();
          notify(result.removed ? `${result.removed} duplicate records removed` : result.message);
        } else notify('Duplicate-record action applied');
        back();
      } catch (error) { notify(errorMessage(error, 'Could not apply the duplicate-record action.'), 'warning'); }
    } });
  };
  const applyNumbers = () => ask({ title: 'Apply correction to all?', message: `${numberErrors.length} number-format values will be changed. Always verify values that Excel may have rounded.`, confirm: 'Apply corrections', onConfirm: async () => {
    try {
      if (serverSession) { const result = await api.applyNumberErrors(); await onDataChanged(); await onRefreshIssues(); notify(`${result.changed} number corrections applied`); }
      else notify('Number corrections applied');
      back();
    } catch (error) { notify(errorMessage(error, 'Could not apply number corrections.'), 'warning'); }
  } });
  const emptyFields = serverSession ? (issues?.empty || []) : [{ column: 'Model', empty_cells: 125 }, { column: 'Project', empty_cells: 20 }, { column: 'Asset User', empty_cells: 35 }];
  const applyEmpty = async (field) => {
    const choice = emptyChoices[field.column] || 'Leave Empty';
    if (choice === 'Edit Individually') return notify(`Edit ${field.column} directly in the review table.`, 'info');
    try {
      if (choice === 'Fill with Default Value') {
        const value = emptyValues[field.column]?.trim();
        if (!value) return notify('Enter a default value before applying it.', 'warning');
        if (serverSession) await api.applyEmptyField(field.column, value);
      }
      if (serverSession && choice === 'Fill with Default Value') { await onDataChanged(); await onRefreshIssues(); }
      notify(choice === 'Leave Empty' ? `${field.column} will remain empty` : `${field.column} empty cells updated`);
    } catch (error) { notify(errorMessage(error, 'Could not update empty cells.'), 'warning'); }
  };

  if (tool === 'duplicates') return <div className="tool-panel"><PanelTop back={back} icon={<RefreshCw />} title="Duplicate records" text={`${duplicateRows.length} duplicate records were found using ${duplicateColumn || 'the selected field'}.`} /><div className="inline-select"><span>Check duplicates using</span><select value={duplicateColumn} onChange={e => setDuplicateColumn(e.target.value)}>{(duplicateColumns.length ? duplicateColumns : columns).map(column => <option key={column}>{column}</option>)}</select></div><div className="choice-row">{['Keep First', 'Keep Last', 'Remove All Duplicates', 'Highlight Duplicates Only'].map(option => <label key={option}><input type="radio" checked={duplicateOption === option} onChange={() => setDuplicateOption(option)} />{option}</label>)}</div><DataTable rows={duplicateRows} compact /><div className="panel-actions"><button className="button button-secondary" onClick={back}>Done reviewing</button><button className="button button-danger" disabled={!duplicateColumn || !duplicateRows.length} onClick={applyDuplicates}><Trash2 size={16} /> Apply selected action</button></div></div>;
  if (tool === 'numbers') return <div className="tool-panel"><PanelTop back={back} icon={<AlertTriangle />} title="Number format errors" text={`${numberErrors.length} identifier values need verification.`} /><div className="warning-box"><AlertTriangle size={19} /><div><b>Verification recommended</b><span>Excel may have rounded a long number. Please verify the value before applying a correction.</span></div></div><div className="error-table"><div className="error-head"><b>Row</b><b>Field</b><b>Current value</b><b>Possible value</b><span /></div>{numberErrors.map(item => <div className="error-row" key={`${item.row}-${item.field}`}><span>{item.row}</span><span>{item.field}</span><code>{item.current_value}</code><code>{item.possible_value || 'Verify manually'}</code><button className="text-button" onClick={() => notify(`Review row ${item.row} in the data table`, 'info')}>Review</button></div>)}</div><div className="panel-actions"><button className="button button-secondary" onClick={back}>Leave unchanged</button><button className="button button-primary" disabled={!numberErrors.length} onClick={applyNumbers}>Apply corrections</button></div></div>;
  return <div className="tool-panel"><PanelTop back={back} icon={<MoreHorizontal />} title="Empty fields" text={`${emptyFields.reduce((total, field) => total + field.empty_cells, 0)} empty cells were found. Decide field by field.`} /><div className="empty-field-list">{emptyFields.map(field => { const choice = emptyChoices[field.column] || 'Leave Empty'; return <div className="empty-field" key={field.column}><div><b>{field.column}</b><span>{field.empty_cells} empty cells found</span></div><div className="field-choice"><select value={choice} onChange={e => setEmptyChoices(old => ({ ...old, [field.column]: e.target.value }))}><option>Leave Empty</option><option>Fill with Default Value</option><option>Edit Individually</option></select>{choice === 'Fill with Default Value' && <input placeholder="Enter default value" value={emptyValues[field.column] || ''} onChange={e => setEmptyValues(old => ({ ...old, [field.column]: e.target.value }))} />}</div><button className="button button-small button-secondary" onClick={() => applyEmpty(field)}>Apply</button></div>; })}</div><div className="panel-actions"><button className="button button-secondary" onClick={back}>Done</button></div></div>;
}

function PanelTop({ back, icon, title, text }) { return <div className="panel-top"><button className="back-link" onClick={back}><ChevronLeft size={17} /> All cleaning tools</button><div className="panel-heading"><span>{icon}</span><div><h3>{title}</h3><p>{text}</p></div></div></div>; }

function ArrangeStep({ mapping, setMapping, file, columns, confidence, setConfidence, serverSession, notify, onBack, onContinue }) {
  const [autoMapped, setAutoMapped] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  const autoMap = async () => {
    try {
      if (serverSession) {
        const result = await api.autoMap();
        setMapping(result.mapping); setConfidence(result.confidence || {}); setAutoMapped(true);
      } else { setMapping(defaultMapping(columns)); setConfidence({}); setAutoMapped(true); }
      notify('Columns reset to defaults');
    } catch (error) { notify(errorMessage(error, 'Could not map the uploaded columns.'), 'warning'); }
  };
  const updateMappingTarget = (source, target) => setMapping(m => m.map(item => item.source === source ? { ...item, target } : item));
  const toggleMappingIncluded = (source) => setMapping(m => m.map(item => item.source === source ? { ...item, included: !item.included } : item));
  const updateAdditionalProps = (source, props) => setMapping(m => m.map(item => item.source === source ? { ...item, ...props } : item));
  
  const handleSort = () => {
    if (draggedItem === null || dragOverItem === null || draggedItem === dragOverItem) { setDraggedItem(null); setDragOverItem(null); return; }
    let _mapping = [...mapping];
    const draggedItemContent = _mapping.splice(draggedItem, 1)[0];
    _mapping.splice(dragOverItem, 0, draggedItemContent);
    setMapping(_mapping);
    setDraggedItem(null); setDragOverItem(null);
  };

  const addCustomColumn = () => {
    setMapping([...mapping, { 
      source: `Custom_Column_${mapping.length + 1}_${Date.now()}`, 
      target: '', 
      included: true, 
      isCustom: true, 
      defaultValue: '', 
      fillOption: 'Leave Empty'
    }]);
  };
  const removeColumn = (source) => setMapping(m => m.filter(item => item.source !== source));

  return <div className="step-content arrange-step">
    <div className="split-step-heading"><div className="step-title"><span className="step-kicker">STEP 04</span><h2>Arrange your columns</h2><p>Your final export will contain these selected fields for <b>{file?.name || 'your dataset'}</b>.</p></div><button className="button button-primary" onClick={autoMap}><Sparkles size={17} /> Reset columns</button></div>
    <div className="mapping-head" style={{ gridTemplateColumns: '50px 1.2fr 1.6fr 100px' }}><span>SOURCE COLUMN</span><span>TARGET NAME</span><span>STATUS</span></div>
    <div className="mapping-list">
      {mapping.map((item, index) => <div 
          key={item.source} 
          className="mapping-container" 
          style={{ marginBottom: '14px', borderRadius: '8px', border: '1px solid #edf3f8', background: dragOverItem === index ? '#f2f8fc' : '#fff', transition: 'background 0.2s', opacity: item.included ? 1 : 0.4 }}
          draggable 
          onDragStart={() => setDraggedItem(index)}
          onDragEnter={() => setDragOverItem(index)}
          onDragEnd={handleSort}
          onDragOver={(e) => e.preventDefault()}
        >
        <div className="mapping-row" style={{ gridTemplateColumns: '50px 1.2fr 1.6fr 100px', border: 0, background: 'transparent' }}>
          <span className="mapping-index" title="Drag to reorder" style={{ cursor: 'grab', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <GripVertical size={13} style={{ color: '#b0c4d6' }} />
            {String(index + 1).padStart(2, '0')}
          </span>
          <b>{item.isCustom ? <span style={{ color: '#829caf', fontStyle: 'italic', fontWeight: 500 }}>New Custom Column</span> : item.source}</b>
          <input value={item.target} onChange={e => updateMappingTarget(item.source, e.target.value)} disabled={!item.included} placeholder="Target column name" />
          <label className="map-status"><input type="checkbox" checked={item.included} onChange={() => toggleMappingIncluded(item.source)} /> Include</label>
        </div>
        <div className="mapping-actions" style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '10px 15px 10px 50px', background: '#fcfdfd', borderTop: '1px dashed #e8f0f6', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
           <select style={{ padding: '6px 8px', borderRadius: '5px', border: '1px solid #dce9f3', fontSize: '11px', color: '#456a88' }} value={item.fillOption || 'Leave Empty'} onChange={e => updateAdditionalProps(item.source, { fillOption: e.target.value })}>
             <option>Leave Empty</option>
             <option>Fill with Default Value</option>
           </select>
           {item.fillOption === 'Fill with Default Value' && 
             <input placeholder="Default value" style={{ padding: '5px 9px', borderRadius: '5px', border: '1px solid #dce9f3', fontSize: '11px', width: '200px' }} value={item.defaultValue || ''} onChange={e => updateAdditionalProps(item.source, { defaultValue: e.target.value })} />
           }
           <button style={{ marginLeft: 'auto', background: 'transparent', border: 0, color: '#d56767', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }} onClick={() => removeColumn(item.source)}>
             <Trash2 size={13} /> Remove
           </button>
        </div>
      </div>)}
      <button className="button button-secondary" style={{ width: '100%', marginTop: '6px', justifyContent: 'center' }} onClick={addCustomColumn}><Plus size={16} /> Add custom column</button>
    </div>
    <div className="mapping-note" style={{ marginTop: '20px' }}><Info size={17} /> You can rename any column for your final export. Uncheck a column to omit it entirely. Drag the handle to reorder columns.</div>
    <StepFooter onBack={onBack} onContinue={onContinue} />
  </div>;
}



function ValidateStep({ rows, recordCount, serverSession, finalReady, setFinalReady, notify, onBack, onContinue }) {
  const [validation, setValidation] = useState(null);
  useEffect(() => {
    let active = true;
    if (!serverSession) { setValidation(null); return undefined; }
    api.validate()
      .then(result => { if (active) setValidation(result); })
      .catch(error => { if (active) notify(errorMessage(error, 'Could not validate the final data.'), 'warning'); });
    return () => { active = false; };
  }, [serverSession]);

  const checks = validation ? [
    ['Columns kept', validation.columns_kept.passed ? `Exporting ${validation.columns_kept.count} columns` : `No columns selected for export`, validation.columns_kept.passed],
    ['Empty values', validation.empty_cells.count ? `${validation.empty_cells.count} empty cells across dataset` : 'No empty cells found', validation.empty_cells.passed],
    ['Number format', validation.scientific_notation.count ? `${validation.scientific_notation.count} values use scientific notation` : 'No scientific-notation identifiers found', validation.scientific_notation.passed],
  ] : [['Validation', serverSession ? 'Checking the uploaded data…' : 'Sample data is ready to export', true]];
  const ready = serverSession ? Boolean(validation) : true;
  const continueToExport = () => { setFinalReady(true); onContinue(); };

  return <div className="step-content validate-step">
    <div className="step-title"><span className="step-kicker">STEP 05</span><h2>Validate before export</h2><p>A final check helps you export with confidence.</p></div>
    <div className="validation-list">{checks.map(([name, text, passed]) => <div className="validation-item" key={name}>
      <span className={passed ? 'valid' : 'needs-review'}>{passed ? <Check size={16} /> : <AlertTriangle size={16} />}</span>
      <div><b>{name}</b><small>{text}</small></div><span className={passed ? 'result good' : 'result caution'}>{passed ? 'Passed' : 'Needs review'}</span>
    </div>)}</div>
    <div className="final-preview-intro"><div><span className="eyebrow muted">FINAL DATA PREVIEW</span><h3>Ready when you are</h3><p>{Number(recordCount).toLocaleString()} records · {validation?.columns_kept?.count || 12} columns</p></div><button className="uiverse-continue-btn" disabled={!ready} onClick={continueToExport}><div className="btn-arrow-bg"><ArrowRight size={17} color="white" /></div><p className="btn-text-content">Continue to export</p></button></div>
    {finalReady && <DataTable rows={rows.slice(0, 4)} compact />}
    <StepFooter onBack={onBack} canContinue={ready} onContinue={continueToExport} />
  </div>;
}

function ExportStep({ rows, columns, serverSession, notify, askFormat, onRestart }) {
  const download = async () => {
    askFormat(async (format) => {
      if (serverSession) {
        try {
          const isXl = format.toLowerCase() === 'xl' || format.toLowerCase() === 'xlsx';
          const data = isXl ? await api.exportXl() : await api.exportCsv();
          const extension = isXl ? 'xlsx' : 'csv';
          const url = URL.createObjectURL(data); const link = document.createElement('a'); link.href = url; link.download = `Cleaned_Asset_Data.${extension}`; link.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 0);
          notify(`Your ${extension.toUpperCase()} download has started`);
        } catch (error) { notify(errorMessage(error, 'Could not export the cleaned data.'), 'warning'); }
        return;
      }
      
      // Using sample data
      executeExport(rows, 'Cleaned_Data', notify, format);
    });
  };
  return <div className="step-content export-step"><div className="export-hero"><span className="export-check"><Check size={34} /></span><span className="step-kicker">STEP 06 · ALL SET</span><h2>Your data is ready</h2><p>Your cleaned file is prepared with exactly the selected columns.</p><div className="export-stats"><div><b>{rows.length.toLocaleString()}</b><span>records shown</span></div><div><b>{columns.length}</b><span>columns</span></div><div><b>0</b><span>unresolved critical errors</span></div></div><button className="button button-primary button-large" onClick={download}><Download size={20} /> Download Data</button><small>Ready to save to your device safely</small></div><div className="export-bottom"><Info size={17} /> Your data is processed locally. Start a new task when you are done to clear this session.<button className="text-button" onClick={onRestart}>Start new task <ArrowRight size={15} /></button></div></div>;
}

function StepFooter({ onBack, onContinue, canContinue = true }) { return <div className="step-footer">{onBack ? <button className="button button-secondary" onClick={onBack}><ArrowLeft size={17} /> Back</button> : <span /> }<button className="uiverse-continue-btn" disabled={!canContinue} onClick={onContinue}><div className="btn-arrow-bg"><ArrowRight size={17} color="white" /></div><p className="btn-text-content">Continue</p></button></div>; }

function LegacyCompareExcel({ notify, ask, askFormat }) {
  const firstRef = useRef(null), secondRef = useRef(null);
  const [files, setFiles] = useState({ first: null, second: null });
  const [compared, setCompared] = useState(false);
  const [tab, setTab] = useState('common');
  const setFile = (side, item) => { setFiles(old => ({ ...old, [side]: { name: item?.name || (side === 'first' ? 'Asset_List_August.xlsx' : 'Asset_List_September.xlsx'), rows: side === 'first' ? '5,000' : '5,250' } })); notify(`${side === 'first' ? 'First' : 'Second'} Excel file uploaded`); };
  const bothFiles = files.first && files.second;
  const compare = () => { setCompared(true); notify('Comparison complete'); };
  const downloadNew = () => { 
    const mockRows = [{ 'Asset Name': 'MacBook Pro', 'Serial Number': '9.87654E+13', 'Asset ID': 'AST-1007' }, { 'Asset Name': 'Conference Table', 'Serial Number': 'GD-CT-912', 'Asset ID': 'AST-1008' }]; 
    askFormat((format) => executeExport(mockRows, 'New_Records', notify, format)); 
  };
  return <section className="page compare-page"><PageIntro eyebrow="COMPARE EXCEL" title="Compare Excel files" text="Find what is new, missing, or common across two files." />
    <div className="compare-card">
      <div className="compare-upload-grid"><CompareUpload title="First Excel file" file={files.first} inputRef={firstRef} onClick={() => firstRef.current?.click()} onChange={event => event.target.files?.[0] && setFile('first', event.target.files[0])} /><div className="vs-badge">VS</div><CompareUpload title="Second Excel file" file={files.second} inputRef={secondRef} onClick={() => secondRef.current?.click()} onChange={event => event.target.files?.[0] && setFile('second', event.target.files[0])} /></div>
      
      {bothFiles && <div className="compare-controls"><div><span>Compare records using</span><select><option>Serial Number</option><option>Asset ID</option><option>Asset Name</option></select></div><div className="comparison-warning"><AlertTriangle size={17} /> Serial Number has 18 duplicate values. <button onClick={() => notify('Duplicate values highlighted below', 'warning')}>View duplicates</button></div><button className="button button-primary" onClick={compare}><GitCompareArrows size={18} /> Compare files</button></div>}
    </div>
    {compared && <div className="comparison-results"><div className="results-head"><div><span className="eyebrow">COMPARISON COMPLETE</span><h2>Here’s what we found</h2></div><span className="done-pill"><CheckCircle2 size={16} /> Complete</span></div><div className="result-counts"><ResultCount label="First Excel" count="5,000" /><ResultCount label="Second Excel" count="5,250" /><ResultCount label="Common records" count="4,900" blue /><ResultCount label="Only in first" count="100" /><ResultCount label="Only in second" count="350" green /></div><div className="result-tabs">{[['common', 'Common records'], ['first', 'Only in first'], ['second', 'Only in second']].map(([key, label]) => <button key={key} className={tab === key ? 'selected' : ''} onClick={() => setTab(key)}>{label}<span>{key === 'common' ? '4,900' : key === 'first' ? '100' : '350'}</span></button>)}</div><div className="result-content"><div className="result-context"><div><h3>{tab === 'common' ? 'Records in both files' : tab === 'first' ? 'Records only in the first file' : 'New records found'}</h3><p>{tab === 'second' ? 'These records are not present in the first Excel file.' : 'Review complete records below before taking action.'}</p></div>{tab === 'second' && <div><button className="button button-secondary" onClick={downloadNew}><Download size={16} /> Extract new records</button><button className="button button-primary" onClick={() => ask({ title: 'Merge new records into the first file?', message: 'First Excel: 5,000 records. New records: 350. The final file will have 5,350 records.', confirm: 'Merge records', onConfirm: () => notify('350 records merged into the first file') } )}><Merge size={16} /> Merge into first</button></div>}</div><DataTable rows={comparisonRows[tab]} compact /></div></div>}
  </section>;
}

function CompareExcel({ notify, askFormat, sharedFile, setSharedFile }) {
  const firstRef = useRef(null), secondRef = useRef(null);
  const [files, setFiles] = useState({ first: null, second: null });
  const [fields, setFields] = useState([]);
  const [field, setField] = useState('');
  const [comparison, setComparison] = useState(null);
  const [tab, setTab] = useState('common');
  const bothFiles = files.first && files.second;
  const usingUploadedFiles = Boolean(files.first?.raw && files.second?.raw);

  const setFile = (side, item) => {
    setFiles(old => ({ ...old, [side]: item ? { name: item.name, rows: 'Ready to compare', raw: item } : { name: side === 'first' ? 'Asset_List_August.xlsx' : 'Asset_List_September.xlsx', rows: side === 'first' ? '5,000' : '5,250', raw: null } }));
    setComparison(null); setTab('common');
    notify(`${side === 'first' ? 'First' : 'Second'} Excel file selected`);
  };

  useEffect(() => {
    if (sharedFile) {
      setFile('first', sharedFile);
      setSharedFile(null);
    }
  }, [sharedFile]);

  const [firstHeaders, setFirstHeaders] = useState([]);
  const [secondHeaders, setSecondHeaders] = useState([]);

  useEffect(() => {
    let active = true;
    if (!usingUploadedFiles) { setFields([]); setField(''); setFirstHeaders([]); setSecondHeaders([]); return undefined; }
    api.compareFields(files.first.raw, files.second.raw)
      .then(result => { 
        if (active) { 
          setFields(result.shared_columns); 
          setField(result.shared_columns[0] || ''); 
          setFirstHeaders(result.first_columns || []);
          setSecondHeaders(result.second_columns || []);
        } 
      })
      .catch(error => { 
        if (active) { 
          setFields([]); setField(''); setFirstHeaders([]); setSecondHeaders([]);
          notify(errorMessage(error, 'Could not read the columns in both files.'), 'warning'); 
        } 
      });
    return () => { active = false; };
  }, [files.first?.raw, files.second?.raw]);

  const useSamples = () => { setFiles({ first: { name: 'Asset_List_August.xlsx', rows: '5,000', raw: null }, second: { name: 'Asset_List_September.xlsx', rows: '5,250', raw: null } }); setComparison(null); setTab('common'); setFirstHeaders(['Serial Number', 'Asset Name', 'Model']); setSecondHeaders(['Serial Number', 'Asset Name', 'Status']); notify('Sample files loaded', 'info'); };
  const compare = async () => {
    if (!usingUploadedFiles) { setComparison({ counts: { first: 5000, second: 5250, common: 4900, only_first: 100, only_second: 350, overall: 5350 }, common_records: comparisonRows.common, only_in_first: comparisonRows.first, only_in_second: comparisonRows.second, overall_records: comparisonRows.common }); notify('Comparison complete'); return; }
    if (!field) return notify('Choose a shared column to compare.', 'warning');
    try {
      const result = await api.compareExcel(files.first.raw, files.second.raw, field);
      setComparison(result); setTab('common'); notify('Comparison complete');
    } catch (error) { notify(errorMessage(error, 'Could not compare these Excel files.'), 'warning'); }
  };
  const counts = comparison?.counts || { first: 0, second: 0, common: 0, only_first: 0, only_second: 0, overall: 0 };
  const records = {
    common: comparison?.common_records || [],
    first: comparison?.only_in_first || [],
    second: comparison?.only_in_second || [],
    overall: comparison?.overall_records || [],
  };
  const downloadNew = () => {
    const exportRows = records.second.map(({ id, ...row }) => row);
    if (exportRows.length > 0) askFormat((format) => executeExport(exportRows, 'New_Records', notify, format));
    else notify('There are no new records to export.', 'info');
  };

  return <section className="page compare-page"><PageIntro eyebrow="COMPARE EXCEL" title="Compare Excel files" text="Find what is new, missing, or common across two files." />
    <div className="compare-card">
      <div className="compare-upload-grid" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <CompareUpload title="First Excel file" file={files.first} inputRef={firstRef} onClick={() => firstRef.current?.click()} onChange={event => event.target.files?.[0] && setFile('first', event.target.files[0])} />
          {firstHeaders.length > 0 && <div className="choice-row" style={{ marginTop: 15, justifyContent: 'center', maxHeight: 110, overflowY: 'auto' }}>{firstHeaders.map(h => <label key={h}><input type="checkbox" checked readOnly /> {h}</label>)}</div>}
        </div>
        <div className="vs-badge" style={{ marginTop: 75 }}>VS</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <CompareUpload title="Second Excel file" file={files.second} inputRef={secondRef} onClick={() => secondRef.current?.click()} onChange={event => event.target.files?.[0] && setFile('second', event.target.files[0])} />
          {secondHeaders.length > 0 && <div className="choice-row" style={{ marginTop: 15, justifyContent: 'center', maxHeight: 110, overflowY: 'auto' }}>{secondHeaders.map(h => <label key={h}><input type="checkbox" checked readOnly /> {h}</label>)}</div>}
        </div>
      </div>
      
      {bothFiles && <div className="compare-controls"><div><span>Compare records using</span><select value={usingUploadedFiles ? field : 'Serial Number'} disabled={usingUploadedFiles && !fields.length} onChange={e => setField(e.target.value)}>{usingUploadedFiles ? fields.map(column => <option key={column}>{column}</option>) : <><option>Serial Number</option><option>Asset ID</option><option>Asset Name</option></>}</select></div>{usingUploadedFiles && !fields.length && <div className="comparison-warning"><AlertTriangle size={17} /> These files do not have an exact shared column name.</div>}<button className="button button-primary" disabled={usingUploadedFiles && !field} onClick={compare}><GitCompareArrows size={18} /> Compare files</button></div>}
    </div>
    {comparison && <div className="comparison-results"><div className="results-head"><div><span className="eyebrow">COMPARISON COMPLETE</span><h2>Here's what we found</h2></div><span className="done-pill"><CheckCircle2 size={16} /> Complete</span></div><div className="result-counts"><ResultCount label="First Excel" count={Number(counts.first).toLocaleString()} /><ResultCount label="Second Excel" count={Number(counts.second).toLocaleString()} /><ResultCount label="Common records" count={Number(counts.common).toLocaleString()} blue /><ResultCount label="Only in first" count={Number(counts.only_first).toLocaleString()} /><ResultCount label="Only in second" count={Number(counts.only_second).toLocaleString()} green /></div><div className="result-tabs">{[['common', 'Common records', counts.common], ['first', 'Only in first', counts.only_first], ['second', 'Only in second', counts.only_second], ['overall', 'Overall data', counts.overall]].map(([key, label, count]) => <button key={key} className={tab === key ? 'selected' : ''} onClick={() => setTab(key)}>{label}<span>{Number(count).toLocaleString()}</span></button>)}</div><div className="result-content"><div className="result-context"><div><h3>{tab === 'common' ? 'Records in both files' : tab === 'first' ? 'Records only in the first file' : tab === 'overall' ? 'Combined Master Data' : 'New records found'}</h3><p>{tab === 'second' ? 'These records are not present in the first Excel file.' : tab === 'overall' ? 'Unified outer join of both datasets.' : 'Review complete records below before taking action.'}</p></div>{tab === 'second' && <button className="button button-secondary" onClick={downloadNew}><Download size={16} /> Extract new records</button>}</div><DataTable rows={rowsWithIds(records[tab])} compact /></div></div>}
  </section>;
}

function CompareUpload({ title, file, inputRef, onClick, onChange }) { return <div className={`compare-upload ${file ? 'uploaded' : ''}`}><input ref={inputRef} className="hidden-input" type="file" accept=".xlsx,.xls,.csv" onChange={onChange} /><span className="compare-file-icon"><FileSpreadsheet size={23} /></span><span className="compare-label">{title}</span>{file ? <><b>{file.name}</b><small>{file.rows} rows</small><button className="text-button" onClick={onClick}>Change file</button></> : <><p>Choose an Excel or CSV file to compare.</p><button className="uiverse-upload-btn" onClick={onClick}><Upload size={16} /> Upload File</button></>}</div>; }
function ResultCount({ label, count, blue, green }) { return <div className={`result-count ${blue ? 'blue' : ''} ${green ? 'green' : ''}`}><span>{label}</span><b>{count}</b></div>; }

function SettingsPage({ notify }) { const [checked, setChecked] = useState(true); return <section className="page settings-page"><PageIntro eyebrow="SETTINGS" title="Your preferences" text="These settings apply only on this device." /><div className="settings-card"><div><span className="setting-icon"><ShieldCheck /></span><div><h3>Protect your privacy</h3><p>Clear temporary files when you start a new task or close the app.</p></div></div><button className={`switch ${checked ? 'on' : ''}`} aria-label="Clear files on close" onClick={() => { setChecked(!checked); notify(`Temporary-file cleanup ${!checked ? 'enabled' : 'disabled'}`, 'info'); }}><span /></button></div><div className="settings-card"><div><span className="setting-icon"><FolderOpen /></span><div><h3>Download location</h3><p>Each export will ask where you want to save the CSV file.</p></div></div><button className="button button-secondary" onClick={() => notify('Your system will choose the download location', 'info')}>Change</button></div></section>; }

function Toast({ message, type, onClose }) { const Icon = type === 'success' ? CheckCircle2 : type === 'warning' ? AlertTriangle : Info; return <div className={`toast ${type}`}><Icon size={18} /><span>{message}</span><button onClick={onClose}><X size={16} /></button></div>; }

function ConfirmDialog({ title, message, confirm = 'Continue', onConfirm, onClose }) { const run = () => { onConfirm?.(); onClose(); }; return <div className="modal-backdrop" role="presentation"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><span className="confirm-icon"><AlertTriangle size={24} /></span><h2 id="confirm-title">{title}</h2><p>{message}</p><div><button className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={run}>{confirm}</button></div></div></div>; }

function MergeExcel({ notify, askFormat, sharedFile, setSharedFile }) {
  const firstRef = useRef(null), secondRef = useRef(null);
  const [files, setFiles] = useState({ first: null, second: null });
  const [mergedData, setMergedData] = useState(null);
  const bothFiles = files.first && files.second;

  const setFile = (side, item) => {
    setFiles(old => ({ ...old, [side]: item ? { name: item.name, rows: 'Ready to merge', raw: item } : { name: side === 'first' ? 'Dataset_One.xlsx' : 'Dataset_Two.xlsx', rows: side === 'first' ? '5,000' : '4,100', raw: null } }));
    setMergedData(null);
    notify(`${side === 'first' ? 'First' : 'Second'} Excel file selected`);
  };

  useEffect(() => {
    if (sharedFile) {
      setFile('first', sharedFile);
      setSharedFile(null);
    }
  }, [sharedFile]);
  const useSamples = () => { setFiles({ first: { name: 'Dataset_One.xlsx', rows: '5,000', raw: null }, second: { name: 'Dataset_Two.xlsx', rows: '4,100', raw: null } }); setMergedData(null); notify('Sample files loaded', 'info'); };
  const mergeFiles = async () => {
    if (files.first?.raw && files.second?.raw) {
      try {
        const result = await api.mergeFiles(files.first.raw, files.second.raw);
        setMergedData(result.rows);
        notify('Merge operation complete');
      } catch (error) {
        notify(errorMessage(error, 'Could not merge these files.'), 'warning');
      }
    } else {
      setMergedData([...sampleRows, ...sampleRows.map(r => ({ ...r, id: r.id + 100 }))]);
      notify('Merge operation complete');
    }
  };
  const downloadNew = () => {
    const dataToExport = mergedData || sampleRows;
    askFormat((format) => executeExport(dataToExport, 'Merged_Data', notify, format));
  };

  return <section className="page compare-page"><PageIntro eyebrow="MERGE EXCEL" title="Merge Data" text="Seamlessly append the records of two different datasets." />
    <div className="compare-card"><div className="compare-upload-grid"><CompareUpload title="Primary Excel file" file={files.first} inputRef={firstRef} onClick={() => firstRef.current?.click()} onChange={event => event.target.files?.[0] && setFile('first', event.target.files[0])} /><div className="vs-badge">+</div><CompareUpload title="Secondary Excel file" file={files.second} inputRef={secondRef} onClick={() => secondRef.current?.click()} onChange={event => event.target.files?.[0] && setFile('second', event.target.files[0])} /></div>
      
      {bothFiles && <div className="compare-controls"><div></div><button className="button button-primary" onClick={mergeFiles}><Merge size={18} /> Merge files</button></div>}
    </div>
    {mergedData && <div className="comparison-results"><div className="results-head"><div><span className="eyebrow">MERGE COMPLETE</span><h2>Files merged successfully</h2></div><span className="done-pill"><CheckCircle2 size={16} /> Complete</span></div><div className="result-counts"><ResultCount label="Primary Excel" count={files.first?.raw ? 'Uploaded' : '5,000'} /><ResultCount label="Secondary Excel" count={files.second?.raw ? 'Uploaded' : '4,100'} /><ResultCount label="Total merged records" count={mergedData.length.toLocaleString()} blue /></div><div className="result-content"><div className="result-context" style={{ marginTop: '20px' }}><div><h3>Ready for download</h3><p>Rows have been securely compiled and processed.</p></div><button className="button button-primary button-large" onClick={downloadNew}><Download size={16} /> Export Merged Data</button></div></div></div>}
  </section>;
}

function StandaloneArrange({ notify, askFormat, setSharedFile, setPage }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [mapping, setMapping] = useState([]);
  const [columns, setColumns] = useState(sourceColumns);
  const [confidence, setConfidence] = useState({});

  const uploadDone = (uploaded) => {
    if (!uploaded) {
       setFile({ name: 'Sample_Asset_Data.xlsx', size: '1.8 MB', rows: 5000, columns: 12, sheets: 3 });
       setMapping(defaultMapping(sourceColumns));
       notify('Sample data loaded for arrangement', 'info');
       return;
    }
    setFile({ name: uploaded.name, raw: uploaded, size: `${(uploaded.size / 1024).toFixed(0)} KB`, rows: 'Processing', columns: 12, sheets: 1 });
    setMapping(defaultMapping(sourceColumns));
    notify('Excel loaded for arrangement');
  };

  const triggerDownload = () => {
    askFormat((format) => executeExport(sampleRows, 'Arranged_Data', notify, format));
  };

  const passFileTo = (targetModule) => {
    const outputFileName = `Arranged_${file?.name || 'Data.xlsx'}`;
    const blob = new Blob(['Mock data structure...'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const outboundFile = new File([blob], outputFileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    setSharedFile(outboundFile);
    notify(`Arranged file successfully passed to ${targetModule}!`, 'success');
    setPage(targetModule);
  };

  return <section className="page workflow-page">
    <PageIntro eyebrow="ARRANGE EXCEL" title="Arrange Data" text="Reorder and map columns dynamically manually." />
    <div className="workflow-card">
      {step === 1 && <UploadStep file={file} onUpload={uploadDone} onContinue={() => setStep(2)} />}
      {step === 2 && <>
        <ArrangeStep mapping={mapping} setMapping={setMapping} file={file} columns={columns} confidence={confidence} setConfidence={setConfidence} serverSession={false} notify={notify} onBack={() => { setStep(1); setFile(null); }} onContinue={triggerDownload} />
        <div className="step-footer" style={{ borderTop: 0, paddingTop: 0, justifyContent: 'flex-start', paddingLeft: '40px', paddingRight: '40px', gap: '8px' }}>
          <button className="button button-secondary" onClick={triggerDownload}><Download size={16} /> Download Data</button>
          <span style={{ margin: '0 auto' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#456a88' }}>Pass processed file to:</span>
          <select style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #dce9f3', background: 'white' }} value="" onChange={(e) => { if (e.target.value) passFileTo(e.target.value); }}>
            <option value="">Select module...</option>
            <option value="clean">Clean Excel</option>
            <option value="compare">Compare Excel (Primary)</option>
            <option value="merge">Merge Excel (Primary)</option>
          </select>
        </div>
      </>}
    </div>
  </section>;
}

export default App;
