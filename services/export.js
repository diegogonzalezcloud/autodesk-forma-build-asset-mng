'use strict';

const { getCategories, getStatusStepSets, apsRequest, extractList } = require('./aps');

function catId(c) { return String(c.id || c.uid || c.categoryId || ''); }
function catName(c) { return String(c.name || c.label || ''); }
function catDesc(c) { return String(c.description || ''); }
function catParent(c) { return String(c.parentId || c.parentCategoryId || ''); }
function ssId(s) { return String(s.id || s.uid || s.statusStepSetId || s.statusSetId || ''); }
function ssName(s) { return String(s.name || s.label || s.title || ''); }

function findSSIdDeep(obj) {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of ['statusStepSetId', 'statusSetId', 'status_step_set_id', 'assetStatusStepSetId'])
    if (obj[k]) return String(obj[k]);
  for (const k of ['statusStepSet', 'statusSet', 'status', 'assetStatusStepSet'])
    if (obj[k] && typeof obj[k] === 'object') {
      const sid = ssId(obj[k]) || findSSIdDeep(obj[k]);
      if (sid) return sid;
    }
  return '';
}

function normalizePath(p) {
  return (p || '').trim().replace(/^\/+|\/+$/g, '')
    .split('/').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'root').join('/');
}

async function batchGetCategories(token, projectId, ids) {
  if (!ids.length) return [];
  const results = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    for (const payload of [{ categoryIds: chunk }, { ids: chunk }]) {
      try {
        const data = await apsRequest(token, 'POST', `/projects/${projectId}/categories:batch-get`, { body: payload });
        results.push(...extractList(data));
        break;
      } catch { /* try next */ }
    }
  }
  return results;
}

async function runExport({ token, projectId, separator = ';' }) {
  const categories = await getCategories(token, projectId);
  const statusSets = await getStatusStepSets(token, projectId);

  const ids = categories.map(catId).filter(Boolean);
  const detailed = await batchGetCategories(token, projectId, ids);

  const byId = {};
  for (const c of categories) { const id = catId(c); if (id) byId[id] = c; }
  for (const d of detailed) { const id = catId(d); if (id) byId[id] = { ...byId[id], ...d }; }
  const enriched = Object.values(byId);

  const statusNameById = {};
  for (const s of statusSets) { const sid = ssId(s), sn = ssName(s); if (sid && sn) statusNameById[sid] = sn; }

  const rootCatId = enriched.find(c => catName(c).toLowerCase() === 'root');
  const rootId = rootCatId ? catId(rootCatId) : null;
  const enrichedById = Object.fromEntries(enriched.map(c => [catId(c), c]));

  const cache = {};
  function fullPath(cid) {
    if (cid in cache) return cache[cid];
    const c = enrichedById[cid];
    if (!c) { cache[cid] = ''; return ''; }
    const name = catName(c).trim(), parent = catParent(c);
    if (name.toLowerCase() === 'root') { cache[cid] = ''; return ''; }
    if (!parent || parent === rootId || !enrichedById[parent]) { cache[cid] = name; return name; }
    const pp = fullPath(parent);
    const p = pp ? normalizePath(`${pp}/${name}`) : name;
    cache[cid] = p; return p;
  }

  function parentPath(cid) {
    const c = enrichedById[cid]; if (!c) return '';
    const parent = catParent(c);
    if (!parent || parent === rootId || !enrichedById[parent]) return '';
    const p = enrichedById[parent];
    if (p && catName(p).toLowerCase() === 'root') return '';
    return normalizePath(fullPath(parent));
  }

  const rows = [];
  for (const c of enriched) {
    const cid = catId(c), name = catName(c).trim();
    if (!cid || !name || name.toLowerCase() === 'root') continue;
    const pp = parentPath(cid);
    let statusSetName = '';
    if (pp === '') { const sid = findSSIdDeep(c); if (sid) statusSetName = statusNameById[sid] || ''; }
    rows.push({ name, description: catDesc(c), parentId: '', parentPath: pp, statusSetName, _sort: fullPath(cid) });
  }

  rows.sort((a, b) => a._sort.toLowerCase().localeCompare(b._sort.toLowerCase()));

  const clean = rows.map(({ name, description, parentId, parentPath, statusSetName }) =>
    ({ name, description, parentId, parentPath, statusSetName }));

  const headers = ['name', 'description', 'parentId', 'parentPath', 'statusSetName'];
  const esc = (v) => {
    const s = String(v || '');
    return (s.includes(separator) || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(separator), ...clean.map(r => headers.map(h => esc(r[h])).join(separator))].join('\n');

  return { csv, rows: clean, count: clean.length };
}

module.exports = { runExport };
