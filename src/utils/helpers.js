export const requiredColumns = [
  'Product', 'Type', 'Make', 'Model', 'Item', 'Serial No', 'Asset Location',
  'Project', 'Unit Price', 'Tax Percent', 'Asset User', 'Asset Tag',
];

export const sourceColumns = [
  'Asset Name', 'Category', 'Manufacturer', 'Model No', 'Item Description',
  'Serial Number', 'Location', 'Project Name', 'Price', 'Tax', 'User', 'Asset ID',
];

export const defaultMapping = (cols) => cols.map(c => ({ source: c, target: c, included: true }));

export const sampleRows = [];

export const comparisonRows = {
  common: [],
  first: [],
  second: [],
};

export const rowsWithIds = (items = []) => items.map((row, index) => ({ id: index + 1, ...row }));

export const errorMessage = (error, fallback = 'The local service could not complete that action.') => 
  error?.response?.data?.detail || error?.message || fallback;

export function downloadRows(rows, fileName) {
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
