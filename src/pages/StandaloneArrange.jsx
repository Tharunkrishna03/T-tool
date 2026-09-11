import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { executeExport, defaultMapping, sourceColumns, sampleRows } from '../utils/helpers';
import { PageIntro } from '../components/UI';
import { UploadStep, ArrangeStep, StepFooter } from './CleanExcel';

export default function StandaloneArrange({ notify, askFormat, setSharedFile }) {
  const navigate = useNavigate();
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
    navigate(`/${targetModule}`);
  };

  return (
    <section className="page workflow-page">
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
              <option value="clean">Edit Excel</option>
              <option value="compare">Compare Excel (Primary)</option>
              <option value="merge">Merge Excel (Primary)</option>
            </select>
          </div>
        </>}
      </div>
    </section>
  );
}
