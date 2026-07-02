import { streamImport } from '../api.js';
import { showToast } from '../app.js';
import { createProjectSelector } from '../components/project-selector.js';

// ── Client-side CSV preview parser ────────────────────────────
function parseCSVPreview(text, maxRows = 20) {
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [], total: 0 };

  const firstLine = lines[0];
  const delimiter = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';

  function parseLine(line) {
    const fields = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === delimiter && !inQ) { fields.push(cur); cur = ''; }
      else cur += ch;
    }
    fields.push(cur);
    return fields.map(f => f.trim());
  }

  const headers = parseLine(lines[0]);
  const rows = [];
  const limit = Math.min(lines.length - 1, maxRows);
  for (let i = 1; i <= limit; i++) {
    const vals = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, j) => { row[h] = vals[j] || ''; });
    rows.push(row);
  }
  return { headers, rows, total: lines.length - 1 };
}

// ── Log helpers ───────────────────────────────────────────────
const LOG_ICONS = { info: '·', created: '✓', skip: '–', dryrun: '◌', assigned: '★', warning: '⚠', error: '✗', done: '✓' };

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function appendLog(logEl, event) {
  const type = event.type || 'info';
  const line = document.createElement('div');
  line.className = `log-line type-${type}`;
  line.innerHTML = `<span class="log-prefix">${LOG_ICONS[type] || '·'}</span><span>${escHtml(event.message || '')}</span>`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function renderStatsChips(stats) {
  return `
    <div class="stats-row">
      <span class="stat-chip created">✓ Created: ${stats.created}</span>
      <span class="stat-chip skipped">– Skipped: ${stats.skipped}</span>
      <span class="stat-chip assigned">★ Status sets: ${stats.assigned}</span>
      ${stats.ignoredSS ? `<span class="stat-chip ignored">⚠ SS ignored: ${stats.ignoredSS}</span>` : ''}
    </div>
  `;
}

// ── Render ────────────────────────────────────────────────────
export function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Import Asset Categories</h1>
      <p>Upload a CSV file to create or update Asset Categories in your Forma/ACC project.</p>
    </div>

    <!-- Project selector -->
    <div id="ps-container"></div>

    <!-- Upload card -->
    <div id="import-body">
      <div class="card">
        <div class="card-title">2. Select CSV File</div>

        <div id="dropzone" class="dropzone">
          <div class="dz-icon">📄</div>
          <div class="dz-title">Drop CSV file here or click to browse</div>
          <div class="dz-subtitle">Columns: name, description, parentId, parentPath, statusSetName</div>
        </div>
        <input id="file-input" type="file" accept=".csv,text/csv" style="display:none" />

        <div id="file-info" class="hidden" style="margin-top:12px"></div>
      </div>

      <!-- Preview card -->
      <div id="preview-card" class="card hidden">
        <div class="card-title">
          <span>3. Preview</span>
          <span id="preview-count" class="row-count-badge"></span>
        </div>
        <div id="preview-table-wrap" class="table-wrap"></div>
        <div id="preview-more" class="text-muted" style="font-size:12px;margin-top:8px;"></div>
      </div>

      <!-- Import options card -->
      <div class="card">
        <div class="card-title">4. Import Options</div>

        <div class="toggle-wrap">
          <label class="toggle" for="dry-run-toggle">
            <input type="checkbox" id="dry-run-toggle" checked />
            <span class="toggle-slider"></span>
          </label>
          <label class="toggle-label" for="dry-run-toggle">Dry Run</label>
          <span id="dry-run-badge" class="toggle-badge">DRY RUN</span>
        </div>
        <p class="form-hint" style="margin-top:4px">When enabled, simulates the import without making changes to your project.</p>

        <div class="btn-group" style="margin-top:16px">
          <button id="import-btn" class="btn btn-primary" disabled>
            <span id="import-btn-label">Import</span>
          </button>
          <button id="clear-btn" class="btn btn-secondary hidden">Clear &amp; Reset</button>
        </div>
      </div>

      <!-- Log card -->
      <div class="card">
        <div class="card-title">5. Import Log</div>
        <div id="log-viewer" class="log-viewer"></div>
        <div id="stats-container"></div>
      </div>
    </div>
  `;

  // ── Project selector ───────────────────────────────────────
  let projectId = null;
  const psContainer = container.querySelector('#ps-container');
  const importBody = container.querySelector('#import-body');

  const selector = createProjectSelector(psContainer, (selection) => {
    projectId = selection?.projectId || null;
    // Re-evaluate import button state
    const hasFile = !!selectedFile;
    importBtn.disabled = !projectId || !hasFile;
  });

  // ── State ──────────────────────────────────────────────────
  let selectedFile = null;
  let isImporting = false;

  const dropzone = container.querySelector('#dropzone');
  const fileInput = container.querySelector('#file-input');
  const fileInfoEl = container.querySelector('#file-info');
  const previewCard = container.querySelector('#preview-card');
  const previewTableWrap = container.querySelector('#preview-table-wrap');
  const previewCountEl = container.querySelector('#preview-count');
  const previewMoreEl = container.querySelector('#preview-more');
  const importBtn = container.querySelector('#import-btn');
  const importBtnLabel = container.querySelector('#import-btn-label');
  const clearBtn = container.querySelector('#clear-btn');
  const dryRunToggle = container.querySelector('#dry-run-toggle');
  const dryRunBadge = container.querySelector('#dry-run-badge');
  const logViewer = container.querySelector('#log-viewer');
  const statsContainer = container.querySelector('#stats-container');

  // ── Dry run toggle ─────────────────────────────────────────
  dryRunToggle.addEventListener('change', () => {
    if (dryRunToggle.checked) {
      dryRunBadge.textContent = 'DRY RUN';
      dryRunBadge.classList.remove('live');
    } else {
      dryRunBadge.textContent = 'LIVE';
      dryRunBadge.classList.add('live');
    }
  });

  // ── File handling ──────────────────────────────────────────
  function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv') && file.type && !file.type.includes('csv')) {
      showToast('Please select a CSV file.', 'warning');
      return;
    }

    selectedFile = file;
    const sizeStr = file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`;

    dropzone.classList.add('has-file');
    dropzone.querySelector('.dz-icon').textContent = '✅';
    dropzone.querySelector('.dz-title').textContent = file.name;
    dropzone.querySelector('.dz-subtitle').textContent = sizeStr;

    fileInfoEl.innerHTML = `
      <div class="file-info">
        <span style="font-size:18px">📄</span>
        <span class="file-name">${escHtml(file.name)}</span>
        <span class="file-size">${escHtml(sizeStr)}</span>
      </div>
    `;
    fileInfoEl.classList.remove('hidden');

    importBtn.disabled = !projectId;
    clearBtn.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const { headers, rows, total } = parseCSVPreview(text, 20);
      if (!headers.length) { previewCard.classList.add('hidden'); return; }

      previewCountEl.textContent = `${total} row${total !== 1 ? 's' : ''}`;
      const headerHtml = headers.map(h => `<th>${escHtml(h)}</th>`).join('');
      const bodyHtml = rows.map(row =>
        `<tr>${headers.map(h => `<td>${escHtml(row[h] || '')}</td>`).join('')}</tr>`
      ).join('');

      previewTableWrap.innerHTML = `
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${bodyHtml || `<tr><td colspan="${headers.length}" class="table-empty">No data rows</td></tr>`}</tbody>
        </table>
      `;
      previewMoreEl.textContent = total > 20 ? `Showing first 20 of ${total} rows` : '';
      previewCard.classList.remove('hidden');
    };
    reader.readAsText(file, 'utf-8');
  }

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', (e) => { e.preventDefault(); dropzone.classList.remove('drag-over'); handleFile(e.dataTransfer.files[0]); });

  clearBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    dropzone.classList.remove('has-file', 'drag-over');
    dropzone.querySelector('.dz-icon').textContent = '📄';
    dropzone.querySelector('.dz-title').textContent = 'Drop CSV file here or click to browse';
    dropzone.querySelector('.dz-subtitle').textContent = 'Columns: name, description, parentId, parentPath, statusSetName';
    fileInfoEl.classList.add('hidden');
    previewCard.classList.add('hidden');
    importBtn.disabled = true;
    clearBtn.classList.add('hidden');
    logViewer.innerHTML = '';
    statsContainer.innerHTML = '';
  });

  // ── Import ─────────────────────────────────────────────────
  importBtn.addEventListener('click', async () => {
    if (!selectedFile || isImporting || !projectId) return;

    const dryRun = dryRunToggle.checked;
    isImporting = true;
    importBtn.disabled = true;
    importBtnLabel.innerHTML = '<span class="btn-spinner"></span> Importing…';
    logViewer.innerHTML = '';
    statsContainer.innerHTML = '';

    let lastStats = null;
    let hadError = false;

    try {
      await streamImport(selectedFile, dryRun, projectId, (event) => {
        appendLog(logViewer, event);
        if (event.type === 'done' && event.stats) lastStats = event.stats;
        if (event.type === 'error') hadError = true;
      });

      if (lastStats) statsContainer.innerHTML = renderStatsChips(lastStats);

      if (!hadError) {
        showToast(dryRun ? 'Dry run completed successfully.' : 'Import completed!', 'success');
      } else {
        showToast('Import finished with errors. Review the log.', 'warning');
      }
    } catch (err) {
      appendLog(logViewer, { type: 'error', message: err.message });
      showToast(`Import failed: ${err.message}`, 'error');
    } finally {
      isImporting = false;
      importBtn.disabled = !projectId;
      importBtnLabel.textContent = 'Import';
    }
  });
}
