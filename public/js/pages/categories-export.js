import { getExportPreview, downloadExport } from '../api.js';
import { showToast } from '../app.js';
import { createProjectSelector } from '../components/project-selector.js';

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const COLUMNS = ['name', 'description', 'parentId', 'parentPath', 'statusSetName'];
const COLUMN_LABELS = {
  name: 'Name', description: 'Description', parentId: 'Parent ID',
  parentPath: 'Parent Path', statusSetName: 'Status Set Name',
};

function renderTable(rows) {
  if (!rows || !rows.length) {
    return `<div class="table-empty">No categories found in this project.</div>`;
  }
  const headerHtml = COLUMNS.map(col => `<th>${escHtml(COLUMN_LABELS[col])}</th>`).join('');
  const bodyHtml = rows.map(row => `
    <tr>${COLUMNS.map(col => `<td>${escHtml(row[col] || '')}</td>`).join('')}</tr>
  `).join('');
  return `
    <table>
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  `;
}

export function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Export Asset Categories</h1>
      <p>Preview and download your project's Asset Categories as a CSV file.</p>
    </div>

    <!-- Project selector -->
    <div id="ps-container"></div>

    <!-- Options card -->
    <div class="card">
      <div class="card-title">2. Export Options</div>

      <div class="form-group">
        <label class="form-label">CSV Delimiter</label>
        <div class="radio-group">
          <label class="radio-item">
            <input type="radio" name="separator" value=";" checked />
            Semicolon <span class="text-muted" style="font-family:var(--font-mono);font-size:11px;margin-left:4px">( ; )</span>
          </label>
          <label class="radio-item">
            <input type="radio" name="separator" value="," />
            Comma <span class="text-muted" style="font-family:var(--font-mono);font-size:11px;margin-left:4px">( , )</span>
          </label>
        </div>
        <div class="form-hint">Semicolon is recommended for Excel compatibility in most locales.</div>
      </div>

      <div class="btn-group" style="margin-top:8px">
        <button id="preview-btn" class="btn btn-secondary" disabled>
          <span id="preview-btn-label">Preview</span>
        </button>
        <button id="download-btn" class="btn btn-primary" disabled>
          <span id="download-btn-label">&#8595; Export &amp; Download</span>
        </button>
      </div>
    </div>

    <!-- Preview card -->
    <div id="preview-card" class="card hidden">
      <div class="card-title">
        <span>Preview</span>
        <span id="row-count" class="row-count-badge"></span>
      </div>
      <div id="table-container" class="table-wrap"></div>
    </div>
  `;

  let projectId = null;

  const previewBtn = container.querySelector('#preview-btn');
  const previewBtnLabel = container.querySelector('#preview-btn-label');
  const downloadBtn = container.querySelector('#download-btn');
  const downloadBtnLabel = container.querySelector('#download-btn-label');
  const previewCard = container.querySelector('#preview-card');
  const tableContainer = container.querySelector('#table-container');
  const rowCountEl = container.querySelector('#row-count');

  // ── Project selector ───────────────────────────────────────
  const psContainer = container.querySelector('#ps-container');
  createProjectSelector(psContainer, (selection) => {
    projectId = selection?.projectId || null;
    previewBtn.disabled = !projectId;
    downloadBtn.disabled = !projectId;
    if (!projectId) previewCard.classList.add('hidden');
  });

  function getSeparator() {
    return container.querySelector('input[name="separator"]:checked')?.value || ';';
  }

  // ── Preview ────────────────────────────────────────────────
  previewBtn.addEventListener('click', async () => {
    if (!projectId) return;
    previewBtn.disabled = true;
    previewBtnLabel.innerHTML = '<span class="btn-spinner"></span> Loading…';

    try {
      const rows = await getExportPreview(projectId);
      rowCountEl.textContent = `${rows.length} row${rows.length !== 1 ? 's' : ''}`;
      tableContainer.innerHTML = renderTable(rows);
      previewCard.classList.remove('hidden');
      showToast(rows.length ? `Loaded ${rows.length} categories.` : 'No categories found.', rows.length ? 'success' : 'info');
    } catch (err) {
      showToast(`Preview failed: ${err.message}`, 'error');
    } finally {
      previewBtn.disabled = !projectId;
      previewBtnLabel.textContent = 'Preview';
    }
  });

  // ── Download ───────────────────────────────────────────────
  downloadBtn.addEventListener('click', async () => {
    if (!projectId) return;
    const separator = getSeparator();
    downloadBtn.disabled = true;
    downloadBtnLabel.innerHTML = '<span class="btn-spinner"></span> Exporting…';

    try {
      await downloadExport(projectId, separator);
      showToast('Export downloaded as AssetCategories.csv', 'success');
    } catch (err) {
      showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      downloadBtn.disabled = !projectId;
      downloadBtnLabel.innerHTML = '&#8595; Export &amp; Download';
    }
  });
}
