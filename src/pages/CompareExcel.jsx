import React, { useState, useEffect, useRef } from 'react';
import { Download, AlertTriangle, FileSpreadsheet, Merge, CheckCircle2, GitCompareArrows } from 'lucide-react';
import { api } from '../services/api';
import { executeExport, errorMessage, comparisonRows, rowsWithIds, sampleRows } from '../utils/helpers';
import { PageIntro, ResultCount, DocumentsBtn } from '../components/UI';
import { DataTable } from '../components/DataTable';

export default function CompareExcel({ notify, askFormat, ask, sharedFile, setSharedFile }) {
  const firstRef = useRef(null), secondRef = useRef(null);
  const [files, setFiles] = useState({ first: null, second: null });
  const [fields, setFields] = useState([]);
  const [field, setField] = useState('');
  const [comparison, setComparison] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
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
  }, [sharedFile, setSharedFile]);

  const [firstHeaders, setFirstHeaders] = useState([]);
  const [secondHeaders, setSecondHeaders] = useState([]);
  const [selectedFirst, setSelectedFirst] = useState([]);
  const [selectedSecond, setSelectedSecond] = useState([]);

  useEffect(() => {
    let active = true;
    if (!usingUploadedFiles) { setFields([]); setField(''); setFirstHeaders([]); setSecondHeaders([]); setSelectedFirst([]); setSelectedSecond([]); return undefined; }
    api.compareFields(files.first.raw, files.second.raw)
      .then(result => { 
        if (active) { 
          setFields(result.shared_columns); 
          let defaultCol = result.shared_columns[0] || '';
          const targetMatch = result.shared_columns.find(c => /id|serial|email|barcode/i.test(c));
          if (targetMatch) defaultCol = targetMatch;
          setField(defaultCol); 
          setFirstHeaders(result.first_columns || []);
          setSecondHeaders(result.second_columns || []);
          setSelectedFirst(result.first_columns || []);
          setSelectedSecond(result.second_columns || []);
        } 
      })
      .catch(error => { 
        if (active) { 
          setFields([]); setField(''); setFirstHeaders([]); setSecondHeaders([]); setSelectedFirst([]); setSelectedSecond([]);
          notify(errorMessage(error, 'Could not read the columns in both files.'), 'warning'); 
        } 
      });
    return () => { active = false; };
  }, [files.first?.raw, files.second?.raw]);

  const useSamples = () => { setFiles({ first: { name: 'Asset_List_August.xlsx', rows: '5,000', raw: null }, second: { name: 'Asset_List_September.xlsx', rows: '5,250', raw: null } }); setComparison(null); setTab('common'); setFirstHeaders(['Serial Number', 'Asset Name', 'Model']); setSecondHeaders(['Serial Number', 'Asset Name', 'Status']); setSelectedFirst(['Serial Number', 'Asset Name', 'Model']); setSelectedSecond(['Serial Number', 'Asset Name', 'Status']); notify('Sample files loaded', 'info'); };
  
  const compare = async () => {
    if (!usingUploadedFiles) { setComparison({ counts: { first: 5000, second: 5250, common: 4900, only_first: 100, only_second: 350, overall: 5350 }, common_records: comparisonRows.common, only_in_first: comparisonRows.first, only_in_second: comparisonRows.second, overall_records: comparisonRows.common }); notify('Comparison complete'); return; }
    if (!field) return notify('Choose a shared column to compare.', 'warning');
    setIsComparing(true);
    try {
      const result = await api.compareExcel(files.first.raw, files.second.raw, field, selectedFirst, selectedSecond);
      setComparison(result); setTab('common'); notify('Comparison complete');
    } catch (error) { notify(errorMessage(error, 'Could not compare these Excel files.'), 'warning'); }
    finally { setIsComparing(false); }
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

  const getTabColumns = () => { if (records[tab]?.length > 0) return null; if (tab === 'first' && usingUploadedFiles) return Array.from(new Set([...selectedFirst, field])); if (tab === 'second' && usingUploadedFiles) return Array.from(new Set([...selectedSecond, field])); return null; };
  
  return (
    <section className="page compare-page">
      <PageIntro eyebrow="COMPARE EXCEL" title="Compare Excel files" text="Find what is new, missing, or common across two files." />
      <div className="compare-card">
        <div className="compare-upload-grid" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <CompareUpload title="First Excel file" file={files.first} inputRef={firstRef} onClick={() => firstRef.current?.click()} onChange={event => event.target.files?.[0] && setFile('first', event.target.files[0])} />
            {firstHeaders.length > 0 && <div className="choice-row" style={{ marginTop: 15, justifyContent: 'center' }}>{firstHeaders.map(h => <label key={h}><input type="checkbox" checked={selectedFirst.includes(h)} onChange={e => e.target.checked ? setSelectedFirst([...selectedFirst, h]) : setSelectedFirst(selectedFirst.filter(c => c !== h))} /> {h}</label>)}</div>}
          </div>
          <div className="vs-badge" style={{ marginTop: 75 }}>VS</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <CompareUpload title="Second Excel file" file={files.second} inputRef={secondRef} onClick={() => secondRef.current?.click()} onChange={event => event.target.files?.[0] && setFile('second', event.target.files[0])} />
            {secondHeaders.length > 0 && <div className="choice-row" style={{ marginTop: 15, justifyContent: 'center' }}>{secondHeaders.map(h => <label key={h}><input type="checkbox" checked={selectedSecond.includes(h)} onChange={e => e.target.checked ? setSelectedSecond([...selectedSecond, h]) : setSelectedSecond(selectedSecond.filter(c => c !== h))} /> {h}</label>)}</div>}
          </div>
        </div>
        
        {bothFiles && <div className="compare-controls"><div><span>Compare records using</span><select value={field || 'Serial Number'} disabled={usingUploadedFiles && !fields.length} onChange={e => setField(e.target.value)}>{usingUploadedFiles ? fields.map(column => <option key={column}>{column}</option>) : <><option>Serial Number</option><option>Asset ID</option><option>Asset Name</option></>}</select></div>{usingUploadedFiles && !fields.length && <div className="comparison-warning"><AlertTriangle size={17} /> These files do not have an exact shared column name.</div>}<button className="button button-primary" disabled={(usingUploadedFiles && !field) || isComparing} onClick={compare}>{isComparing ? <><span className="btn-spinner"></span> Analyzing...</> : <><GitCompareArrows size={18} /> Compare files</>}</button></div>}
      </div>
      {comparison && <div className="comparison-results"><div className="results-head"><div><span className="eyebrow">COMPARISON COMPLETE</span><h2>Here's what we found</h2></div><span className="done-pill"><CheckCircle2 size={16} /> Complete</span></div><div className="result-counts"><ResultCount label="First Excel" count={Number(counts.first).toLocaleString()} /><ResultCount label="Second Excel" count={Number(counts.second).toLocaleString()} /><ResultCount label="Common records" count={Number(counts.common).toLocaleString()} blue /><ResultCount label="Only in first" count={Number(counts.only_first).toLocaleString()} /><ResultCount label="Only in second" count={Number(counts.only_second).toLocaleString()} green /></div><div className="result-tabs">{[['common', 'Common records', counts.common], ['first', 'Only in first', counts.only_first], ['second', 'Only in second', counts.only_second], ['overall', 'Overall data', counts.overall]].map(([key, label, count]) => <button key={key} className={tab === key ? 'selected' : ''} onClick={() => setTab(key)}>{label}<span>{Number(count).toLocaleString()}</span></button>)}</div><div className="result-content"><div className="result-context"><div><h3>{tab === 'common' ? 'Records in both files' : tab === 'first' ? 'Records only in the first file' : tab === 'overall' ? 'Combined Master Data' : 'New records found'}</h3><p>{tab === 'second' ? 'These records are not present in the first Excel file.' : tab === 'overall' ? 'Unified outer join of both datasets.' : 'Review complete records below before taking action.'}</p></div>{tab === 'second' && <button className="button button-secondary" onClick={downloadNew}><Download size={16} /> Extract new records</button>}</div><DataTable rows={rowsWithIds(records[tab])} columns={getTabColumns()} compact /></div></div>}
    </section>
  );
}

export function CompareUpload({ title, file, inputRef, onClick, onChange, type = 'compare' }) { 
  return <div className={`compare-upload ${file ? 'uploaded' : ''}`}><input ref={inputRef} className="hidden-input" type="file" accept=".xlsx,.xls,.csv" onChange={onChange} /><span className="compare-file-icon"><FileSpreadsheet size={23} /></span><span className="compare-label">{title}</span>{file ? <><b>{file.name}</b><small>{file.rows} rows</small><button className="text-button" onClick={onClick}>Change file</button></> : <><p>Choose an Excel or CSV file to {type}.</p>
  <button onClick={onClick} style={{ background: 'transparent', border: 0, padding: 0 }}><DocumentsBtn text="Browse files" /></button>
  </>}</div>; 
}
