import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronDown, Scissors, Copy, ClipboardPaste, ArrowDownToLine, 
  Trash2, Eraser, Paintbrush, SearchX, ChevronLeft, ChevronRight 
} from 'lucide-react';

export const DataTable = React.memo(function DataTable({ rows, search = '', changes = [], onEdit, onTableAction, compact = false, zoom = 1, columns = null }) {
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
  const headers = columns || Object.keys(rows[0] || {}).filter(key => key !== 'id');
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
  return <div style={{ display: 'flex', flexDirection: 'column' }}><div className={`table-wrap ${compact ? 'compact-table' : ''}`} style={{ zoom }}><table><thead><tr><th className="row-number">#</th>{headers.map(header => <th key={header}><button onClick={() => setSort(sort === header ? '__desc' : header)}>{header}<ChevronDown size={13} /></button></th>)}</tr></thead><tbody>{paginatedRows.map((row, index) => <tr key={row.id}>{<td className="row-number">{(page - 1) * pageSize + index + 1}</td>}{headers.map(column => { const key = `${row.id}-${column}`; const isEditing = editing?.id === row.id && editing?.column === column; return <td key={column} title={row[column] ? String(row[column]) : ''} className={`${changed.has(key) ? 'was-edited' : ''} ${String(row[column]).match(/E\+\d+/) ? 'number-alert' : ''}`} onDoubleClick={() => onEdit && setEditing({ id: row.id, column, value: row[column] })} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, id: row.id, column, value: row[column] }); }}>{isEditing ? <input autoFocus value={editing.value} onChange={e => setEditing({ ...editing, value: e.target.value })} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(null); }} /> : <><span>{row[column] || <em className="empty-cell">Empty</em>}</span>{changed.has(key) && <small>Modified</small>}</>}</td>; })}</tr>)}</tbody></table>{tableRows.length === 0 && <div className="empty-table" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)', color: '#8fa6b9' }}><SearchX size={44} strokeWidth={1} style={{ marginBottom: 'var(--space-3)', color: '#a0b9ce' }} /><span>No matching records found.</span></div>}
  {contextMenu && (
    <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
      <div className="context-menu-item" onClick={() => handleContextAction('cut')}><Scissors /> Cut</div>
      <div className="context-menu-item" onClick={() => handleContextAction('copy')}><Copy /> Copy</div>
      <div className="context-menu-item" onClick={() => handleContextAction('paste')}><ClipboardPaste /> Paste / Paste Special</div>
      <div className="context-menu-divider" />
      <div className="context-menu-item" onClick={() => handleContextAction('insert')}><ArrowDownToLine /> Insert</div>
      <div className="context-menu-item danger" onClick={() => handleContextAction('delete')}><Trash2 /> Delete</div>
      <div className="context-menu-item danger" onClick={() => handleContextAction('clear')}><Eraser /> Clear Contents</div>
      <div className="context-menu-divider" />
      <div className="context-menu-item" onClick={() => handleContextAction('format')}><Paintbrush /> Format Cells</div>
    </div>
  )}
  </div><div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', alignItems: 'center', alignSelf: 'flex-end', marginTop: '12px', fontSize: '13px', color: '#62839e' }}><div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><span>Rows:</span><select className="toolbar-button" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: '0 8px', height: '28px', color: 'inherit' }}><option value={50}>50</option><option value={100}>100</option><option value={500}>500</option><option value={rows.length}>All</option></select></div><div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><button className="toolbar-button" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /> Prev</button><span style={{ whiteSpace: 'nowrap' }}>{page} / {totalPages}</span><button className="toolbar-button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={16} /></button></div></div></div>;
});
