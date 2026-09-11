import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, GitCompareArrows, Merge, TableProperties, CheckCircle2, ArrowRight, Info } from 'lucide-react';
import { ActionCard } from '../components/UI';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <section className="page dashboard-page">
      <div className="action-grid">
        <ActionCard variant="blue" icon={<FileSpreadsheet />} title="Edit Excel" text="Review and standardize one Excel file, step by step." action="Start Editing" onClick={() => navigate('/clean')} />
        <ActionCard variant="white" icon={<GitCompareArrows />} title="Compare Excel Files" text="Find records that are new, missing or common across two files." action="Compare Files" onClick={() => navigate('/compare')} />
        <ActionCard variant="white" icon={<Merge />} title="Merge Excel Files" text="Combine two standalone Excel files safely and easily." action="Merge Files" onClick={() => navigate('/merge')} />
        <ActionCard variant="white" icon={<TableProperties />} title="Arrange Data" text="Reorder and map columns dynamically, then pass to another tool." action="Arrange Data" onClick={() => navigate('/arrange')} />
      </div>
      <section className="how-it-works">
        <div className="section-heading"><div><span className="eyebrow muted">A GUIDED PROCESS</span><h2>How it works</h2></div><span className="easy-badge"><CheckCircle2 size={16} /> No technical steps</span></div>
        <div className="journey">
          {[['01', 'Upload', 'Choose your Excel file'], ['02', 'Review', 'Check your data'], ['03', 'Clean', 'Fix only what you approve'], ['04', 'Validate', 'Review before export'], ['05', 'Export', 'Download your CSV']].map((item, i) => <div className="journey-item" key={item[1]}><div className="journey-number">{item[0]}</div><div><b>{item[1]}</b><span>{item[2]}</span></div>{i < 4 && <ArrowRight className="journey-arrow" size={18} />}</div>)}
        </div>
      </section>
      <div className="dashboard-footnote"><Info size={16} /> Nothing is changed automatically. You review every important change before it is applied.</div>
    </section>
  );
}
