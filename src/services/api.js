import axios from 'axios';

// In Electron and local testing, use the local Python FastAPI process
// On web (Vercel), automatically point to the deployed Render backend
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const defaultBaseUrl = isLocal ? 'http://127.0.0.1:8000/api' : 'https://t-tool.onrender.com/api';
const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl, timeout: 30000 });

export const api = {
  uploadExcel: async (file) => {
    const body = new FormData();
    body.append('file', file);
    return (await client.post('/upload', body)).data;
  },
  sheets: async () => (await client.get('/sheets')).data,
  selectSheet: async (sheet) => (await client.post('/sheet/select', { sheet })).data,
  mergeSheets: async (sheets) => (await client.post('/merge', sheets)).data,
  updateCell: async (row, column, value) => (await client.post('/cells/update', { row, column, value })).data,
  detectDuplicates: async (column) => (await client.post('/duplicates/detect', null, { params: { column } })).data,
  applyDuplicates: async (payload) => (await client.post('/duplicates/apply', payload)).data,
  detectNumberErrors: async () => (await client.post('/number-errors/detect')).data,
  applyNumberErrors: async ({ column, confirmed = true } = {}) => (await client.post('/number-errors/apply', null, { params: { column, confirmed } })).data,
  autoMap: async () => (await client.post('/mapping/auto')).data,
  applyMapping: async (mapping) => (await client.post('/mapping/apply', { columns: mapping })).data,
  emptyFields: async () => (await client.post('/empty-fields/detect')).data,
  applyEmptyField: async (column, value, confirmed = true) => (await client.post('/empty-fields/apply', { column, value, confirmed })).data,
  validate: async () => (await client.post('/validate')).data,
  preview: async () => (await client.post('/preview')).data,
  exportCsv: async () => (await client.post('/export-csv', null, { responseType: 'blob' })).data,
  exportXl: async () => (await client.post('/export-xl', null, { responseType: 'blob' })).data,
  compareFields: async (first, second) => {
    const body = new FormData();
    body.append('first', first); body.append('second', second);
    return (await client.post('/compare/fields', body)).data;
  },
  compareExcel: async (first, second, field) => {
    const body = new FormData();
    body.append('first', first); body.append('second', second); body.append('field', field);
    return (await client.post('/compare', body)).data;
  },
  mergeFiles: async (first, second) => {
    const body = new FormData();
    body.append('first', first); body.append('second', second);
    return (await client.post('/merge-files', body)).data;
  },
  reset: async () => (await client.post('/reset')).data,
};

export default client;
