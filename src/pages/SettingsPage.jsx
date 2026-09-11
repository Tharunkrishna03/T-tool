import React, { useState } from 'react';
import { ShieldCheck, FolderOpen } from 'lucide-react';
import { PageIntro } from '../components/UI';

export default function SettingsPage({ notify }) { 
  const [checked, setChecked] = useState(true); 
  return (
    <section className="page settings-page">
      <PageIntro eyebrow="SETTINGS" title="Your preferences" text="These settings apply only on this device." />
      <div className="settings-card">
        <div>
          <span className="setting-icon"><ShieldCheck /></span>
          <div>
            <h3>Protect your privacy</h3>
            <p>Clear temporary files when you start a new task or close the app.</p>
          </div>
        </div>
        <button className={`switch ${checked ? 'on' : ''}`} aria-label="Clear files on close" onClick={() => { setChecked(!checked); notify(`Temporary-file cleanup ${!checked ? 'enabled' : 'disabled'}`, 'info'); }}><span /></button>
      </div>
      <div className="settings-card">
        <div>
          <span className="setting-icon"><FolderOpen /></span>
          <div>
            <h3>Download location</h3>
            <p>Each export will ask where you want to save the CSV file.</p>
          </div>
        </div>
        <button className="button button-secondary" onClick={() => notify('Your system will choose the download location', 'info')}>Change</button>
      </div>
    </section>
  ); 
}
