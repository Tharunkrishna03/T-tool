import React, { useState } from 'react';
import { Download, CheckCircle2, AlertTriangle, Info, X, ArrowRight } from 'lucide-react';

export function FormatDialog({ onConfirm, onClose }) {
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

export function Toast({ message, type, onClose }) { 
  const Icon = type === 'success' ? CheckCircle2 : type === 'warning' ? AlertTriangle : Info; 
  return <div className={`toast ${type}`}><Icon size={18} /><span>{message}</span><button onClick={onClose}><X size={16} /></button></div>; 
}

export function ConfirmDialog({ title, message, confirm = 'Continue', onConfirm, onClose }) { 
  const run = () => { onConfirm?.(); onClose(); }; 
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <span className="confirm-icon"><AlertTriangle size={24} /></span>
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div>
          <button className="button button-secondary" onClick={onClose}>Cancel</button>
          <button className="button button-primary" onClick={run}>{confirm}</button>
        </div>
      </div>
    </div>
  ); 
}

export function PageIntro({ eyebrow, title, text, children }) {
  return (
    <div className="page-intro">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {children}
    </div>
  );
}

export const ResultCount = React.memo(function ResultCount({ label, count, blue, green }) { 
  return <div className={`result-count ${blue ? 'blue' : ''} ${green ? 'green' : ''}`}><span>{label}</span><b>{count}</b></div>; 
});

export const ActionCard = React.memo(function ActionCard({ variant, icon, title, text, action, onClick }) {
  return (
    <article className={`action-card ${variant}`}>
      <div className="card-icon">{icon}</div>
      <div className="action-content"><h2>{title}</h2><p>{text}</p></div>
      <button className={`button ${variant === 'blue' ? 'button-white' : 'button-primary'}`} onClick={onClick}>{action}<ArrowRight size={18} /></button>
      <div className="card-pattern" />
    </article>
  );
});

export const ToolCard = React.memo(function ToolCard({ icon, tone, title, count, description, action, onClick }) { 
  return (
    <article className="tool-card">
      <div className={`tool-icon ${tone}`}>{icon}</div>
      <div><h3>{title}</h3><strong>{count} <span>{description}</span></strong></div>
      <button className="text-button" onClick={onClick}>{action} <ArrowRight size={15} /></button>
    </article>
  ); 
});

export function DocumentsBtn({ text = "Browse files" }) {
  return (
    <span className="Documents-btn">
      <span className="folderContainer">
        <svg className="fileBack" viewBox="0 0 146 113" fill="#1b6bbb"><path d="M0 16C0 7.163 7.163 0 16 0h40l20 20h54c8.837 0 16 7.163 16 16v77H0z" /></svg>
        <svg className="filePage" viewBox="0 0 100 120" fill="white"><rect x="0" y="0" width="100" height="120" rx="8" /><path d="M20 30h60M20 50h60M20 70h40" stroke="#1b6bbb" strokeWidth="6" strokeLinecap="round" /></svg>
        <svg className="fileFront" viewBox="0 0 146 80" fill="#3D9BFC"><path d="M0 0h146v64c0 8.837-7.163 16-16 16H16c-8.837 0-16-7.163-16-16z" /></svg>
      </span>
      <span className="text">{text}</span>
    </span>
  );
}
