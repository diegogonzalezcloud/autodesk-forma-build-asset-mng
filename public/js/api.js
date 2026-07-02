// HTTP client for backend API calls

export async function authStatus() {
  const r = await fetch('/auth/status');
  return r.json();
}

export async function saveConfig(clientId, clientSecret) {
  const r = await fetch('/auth/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!r.ok) throw new Error((await r.json()).error);
  return r.json();
}

export async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
}

// ── Hubs & Projects ───────────────────────────────────────────
export async function getHubs() {
  const r = await fetch('/api/hubs');
  if (!r.ok) throw new Error((await r.json()).error);
  return r.json();
}

export async function getHubProjects(hubId) {
  const r = await fetch(`/api/hubs/${encodeURIComponent(hubId)}/projects`);
  if (!r.ok) throw new Error((await r.json()).error);
  return r.json();
}

// ── Asset Categories ──────────────────────────────────────────
export async function getExportPreview(projectId) {
  const r = await fetch(`/api/categories/export/preview?projectId=${encodeURIComponent(projectId)}`);
  if (!r.ok) throw new Error((await r.json()).error);
  return r.json();
}

export async function downloadExport(projectId, separator = ';') {
  const r = await fetch(
    `/api/categories/export?projectId=${encodeURIComponent(projectId)}&separator=${encodeURIComponent(separator)}`
  );
  if (!r.ok) throw new Error((await r.json()).error);
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'AssetCategories.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// Streaming import — calls onEvent(event) for each SSE event
export async function streamImport(file, dryRun, projectId, onEvent) {
  const formData = new FormData();
  formData.append('csv', file);
  formData.append('dryRun', String(dryRun));
  formData.append('projectId', projectId);

  const r = await fetch('/api/categories/import', { method: 'POST', body: formData });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
    throw new Error(err.error);
  }

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { onEvent(JSON.parse(line.slice(6))); } catch {}
      }
    }
  }
}
