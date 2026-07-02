import { getHubs, getHubProjects } from '../api.js';

const STORAGE_KEY = 'forma-last-project';

function loadLastSelection() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function saveLastSelection(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Renders hub type as a human-readable badge label
function hubTypeBadge(type) {
  if (type.includes('bim360') || type.includes('bim 360')) return 'BIM 360';
  if (type.includes('acc') || type.includes('autodesk.core')) return 'ACC';
  return '';
}

/**
 * Creates a hub + project selector inside `container`.
 * Calls `onSelect({ projectId, projectName, hubId, hubName })` when a project is chosen,
 * or `onSelect(null)` when the selection is cleared.
 * Returns { getProjectId() } for reading current value imperatively.
 */
export function createProjectSelector(container, onSelect) {
  let selectedProject = null;
  let hubsCache = null;

  container.innerHTML = `
    <div class="card">
      <div class="card-title">1. Select Project</div>
      <div class="ps-row">
        <div class="form-group" style="flex:1;margin-bottom:0">
          <label class="form-label" for="ps-hub-select">Hub</label>
          <div class="ps-select-wrap">
            <select id="ps-hub-select" class="form-select" disabled>
              <option value="">Loading hubs…</option>
            </select>
          </div>
        </div>
        <div class="ps-arrow">→</div>
        <div class="form-group" style="flex:1;margin-bottom:0">
          <label class="form-label" for="ps-project-select">Project</label>
          <div class="ps-select-wrap">
            <select id="ps-project-select" class="form-select" disabled>
              <option value="">Select a hub first</option>
            </select>
          </div>
        </div>
      </div>
      <div id="ps-status" class="ps-status hidden"></div>
      <div id="ps-error" class="ps-error hidden"></div>
    </div>
  `;

  const hubSelect = container.querySelector('#ps-hub-select');
  const projectSelect = container.querySelector('#ps-project-select');
  const statusEl = container.querySelector('#ps-status');
  const errorEl = container.querySelector('#ps-error');

  function setError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.toggle('hidden', !msg);
  }

  function setStatus(project) {
    if (project) {
      statusEl.innerHTML = `
        <span class="ps-check">✓</span>
        <span><strong>${escHtml(project.projectName)}</strong></span>
        <span class="ps-project-id">${escHtml(project.projectId)}</span>
      `;
      statusEl.classList.remove('hidden');
    } else {
      statusEl.classList.add('hidden');
    }
  }

  function populateHubs(hubs, preselect = null) {
    hubSelect.innerHTML = '<option value="">— Select hub —</option>';
    for (const hub of hubs) {
      const badge = hubTypeBadge(hub.type);
      const opt = document.createElement('option');
      opt.value = hub.id;
      opt.textContent = badge ? `${hub.name} (${badge})` : hub.name;
      hubSelect.appendChild(opt);
    }
    hubSelect.disabled = false;
    if (preselect) {
      hubSelect.value = preselect;
      if (hubSelect.value !== preselect) hubSelect.value = ''; // not found
    }
  }

  async function loadProjects(hubId, preselectProjectId = null) {
    projectSelect.innerHTML = '<option value="">Loading projects…</option>';
    projectSelect.disabled = true;
    setError('');

    try {
      const projects = await getHubProjects(hubId);
      projectSelect.innerHTML = '<option value="">— Select project —</option>';
      for (const p of projects) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        opt.dataset.name = p.name;
        projectSelect.appendChild(opt);
      }
      projectSelect.disabled = false;

      if (preselectProjectId) {
        projectSelect.value = preselectProjectId;
        if (projectSelect.value === preselectProjectId) {
          // auto-confirm the saved selection
          const name = projectSelect.options[projectSelect.selectedIndex]?.dataset.name || preselectProjectId;
          const hub = hubsCache?.find(h => h.id === hubId);
          confirmSelection(hubId, hub?.name || hubId, preselectProjectId, name);
        }
      }
    } catch (err) {
      projectSelect.innerHTML = '<option value="">Failed to load</option>';
      setError(`Could not load projects: ${err.message}`);
    }
  }

  function confirmSelection(hubId, hubName, projectId, projectName) {
    selectedProject = { hubId, hubName, projectId, projectName };
    saveLastSelection(selectedProject);
    setStatus(selectedProject);
    onSelect(selectedProject);
  }

  function clearSelection() {
    selectedProject = null;
    setStatus(null);
    onSelect(null);
  }

  // Hub change
  hubSelect.addEventListener('change', async () => {
    const hubId = hubSelect.value;
    projectSelect.innerHTML = '<option value="">— Select project —</option>';
    projectSelect.disabled = true;
    clearSelection();
    if (hubId) await loadProjects(hubId);
  });

  // Project change
  projectSelect.addEventListener('change', () => {
    const projectId = projectSelect.value;
    if (!projectId) { clearSelection(); return; }
    const hubId = hubSelect.value;
    const hub = hubsCache?.find(h => h.id === hubId);
    const hubName = hub?.name || hubId;
    const projectName = projectSelect.options[projectSelect.selectedIndex]?.dataset.name || projectId;
    confirmSelection(hubId, hubName, projectId, projectName);
  });

  // Initial load
  (async () => {
    setError('');
    try {
      hubsCache = await getHubs();
      if (!hubsCache.length) {
        hubSelect.innerHTML = '<option value="">No hubs found</option>';
        setError('No accessible hubs found for this account.');
        return;
      }

      const last = loadLastSelection();
      populateHubs(hubsCache, last?.hubId);

      if (last?.hubId && hubSelect.value === last.hubId) {
        await loadProjects(last.hubId, last.projectId);
      }
    } catch (err) {
      hubSelect.innerHTML = '<option value="">Failed to load</option>';
      setError(`Could not load hubs: ${err.message}`);
    }
  })();

  return {
    getProjectId: () => selectedProject?.projectId || null,
    getSelection: () => selectedProject ? { ...selectedProject } : null,
  };
}
