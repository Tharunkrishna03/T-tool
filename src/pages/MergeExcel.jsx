import React, { useState, useEffect, useRef } from 'react';
import { Merge, CheckCircle2, Download } from 'lucide-react';
import { api } from '../services/api';
import { executeExport, errorMessage, sampleRows } from '../utils/helpers';
import { PageIntro, ResultCount } from '../components/UI';
import { CompareUpload } from './CompareExcel';

export default function MergeExcel({ notify, askFormat, sharedFile, setSharedFile }) {
  const firstRef = useRef(null), secondRef = useRef(null);
  const [files, setFiles] = useState({ first: null, second: null });
  const [mergedData, setMergedData] = useState(null);
  const [isMerging, setIsMerging] = useState(false);
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
  }, [sharedFile, setSharedFile]);
  
  const useSamples = () => { setFiles({ first: { name: 'Dataset_One.xlsx', rows: '5,000', raw: null }, second: { name: 'Dataset_Two.xlsx', rows: '4,100', raw: null } }); setMergedData(null); notify('Sample files loaded', 'info'); };
  
  const mergeFiles = async () => {
    setIsMerging(true);
    if (files.first?.raw && files.second?.raw) {
      try {
        const result = await api.mergeFiles(files.first.raw, files.second.raw);
        setMergedData(result.rows);
        notify('Merge operation complete');
      } catch (error) {
        notify(errorMessage(error, 'Could not merge these files.'), 'warning');
      } finally {
        setIsMerging(false);
      }
    } else {
      setTimeout(() => {
        setMergedData([...sampleRows, ...sampleRows.map(r => ({ ...r, id: r.id + 100 }))]);
        notify('Merge operation complete');
        setIsMerging(false);
      }, 500);
    }
  };
  
  const downloadNew = () => {
    const dataToExport = mergedData || sampleRows;
    askFormat((format) => executeExport(dataToExport, 'Merged_Data', notify, format));
  };

  return (
    <section className="page compare-page">
      <PageIntro eyebrow="MERGE EXCEL" title="Merge Data" text="Seamlessly append the records of two different datasets." />
      <div className="compare-card" style={{ minHeight: 'auto', paddingBottom: '35px' }}>
        <div className="compare-upload-grid">
          <CompareUpload title="Primary Excel file" file={files.first} inputRef={firstRef} onClick={() => firstRef.current?.click()} onChange={event => event.target.files?.[0] && setFile('first', event.target.files[0])} type="merge" />
          <div className="vs-badge">+</div>
          <CompareUpload title="Secondary Excel file" file={files.second} inputRef={secondRef} onClick={() => secondRef.current?.click()} onChange={event => event.target.files?.[0] && setFile('second', event.target.files[0])} type="merge" />
        </div>
        
        {bothFiles && <div className="compare-controls"><div></div><button className="button button-primary" onClick={mergeFiles} disabled={isMerging}>{isMerging ? <><span className="btn-spinner"></span> Merging...</> : <><Merge size={18} /> Merge files</>}</button></div>}
      </div>
      {mergedData && <div className="comparison-results"><div className="results-head"><div><span className="eyebrow">MERGE COMPLETE</span><h2>Files merged successfully</h2></div><span className="done-pill"><CheckCircle2 size={16} /> Complete</span></div><div className="result-counts"><ResultCount label="Primary Excel" count={files.first?.raw ? 'Uploaded' : '5,000'} /><ResultCount label="Secondary Excel" count={files.second?.raw ? 'Uploaded' : '4,100'} /><ResultCount label="Total merged records" count={mergedData.length.toLocaleString()} blue /></div><div className="result-content"><div className="result-context" style={{ marginTop: '20px' }}><div><h3>Ready for download</h3><p>Rows have been securely compiled and processed.</p></div><button className="button button-primary button-large" onClick={downloadNew}><Download size={16} /> Export Merged Data</button></div></div></div>}
    </section>
  );
}
