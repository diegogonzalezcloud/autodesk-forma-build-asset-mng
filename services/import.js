'use strict';

const { getCategories, getStatusStepSets, createCategory, assignStatusSet } = require('./aps');

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const firstLine = text.split(/\r?\n/)[0] || '';
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
    return fields;
  }

  const lines = text.split(/\r?\n/);
  const headers = parseLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, j) => { row[h] = (values[j] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizePath(p) {
  return (p || '').trim().replace(/^\/+|\/+$/g, '')
    .split('/').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'root').join('/');
}
function isProbablyId(v) { return !!v && !v.includes('/') && /^[A-Za-z0-9\-_:.]{12,}$/.test(v); }
function catId(c) { return String(c.id || c.uid || c.categoryId || ''); }
function catName(c) { return String(c.name || c.label || ''); }
function catParent(c) { return String(c.parentId || c.parentCategoryId || ''); }
function ssId(s) { return String(s.id || s.uid || s.statusStepSetId || s.statusSetId || ''); }
function ssName(s) { return String(s.name || s.label || s.title || ''); }

function findRootId(categories) {
  for (const c of categories) {
    const id = catId(c), name = catName(c).toLowerCase(), parent = catParent(c);
    if (id && (name === 'root' || !parent || parent === 'none' || parent === 'null')) return id;
  }
  throw new Error('Could not detect the ROOT category.');
}

function buildPathIndex(categories) {
  const byId = Object.fromEntries(categories.map(c => [catId(c), c]).filter(([id]) => id));
  const rootId = Object.values(byId).find(c => catName(c).toLowerCase() === 'root');
  const rootCatId = rootId ? catId(rootId) : null;
  const cache = {};

  function pathFor(cid) {
    if (cid in cache) return cache[cid];
    const c = byId[cid];
    if (!c) { cache[cid] = null; return null; }
    const name = catName(c).trim(), parent = catParent(c);
    if (name.toLowerCase() === 'root') { cache[cid] = ''; return ''; }
    if (!parent || parent === rootCatId || !byId[parent]) { cache[cid] = name; return name; }
    const pp = pathFor(parent);
    const p = pp ? normalizePath(`${pp}/${name}`) : name;
    cache[cid] = p; return p;
  }

  const idByPath = {};
  for (const cid of Object.keys(byId)) {
    const p = pathFor(cid);
    if (p) idByPath[normalizePath(p)] = cid;
  }
  return idByPath;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function runImport({ csvText, dryRun, token, projectId, emit }) {
  const rawRows = parseCSV(csvText);
  if (!rawRows.length) throw new Error('CSV file is empty.');

  const fields = Object.keys(rawRows[0]);
  if (!fields.includes('name') || !fields.includes('description'))
    throw new Error('CSV must have at least "name" and "description" columns.');
  if (!fields.includes('parentId') && !fields.includes('parentPath'))
    throw new Error('CSV must have "parentId" or "parentPath" column.');

  emit('info', { message: 'Fetching existing categories…' });
  const categories = await getCategories(token, projectId);
  emit('info', { message: 'Fetching status step sets…' });
  const statusSets = await getStatusStepSets(token, projectId);

  const rootId = findRootId(categories);
  const idByPath = buildPathIndex(categories);

  const statusSetByName = {};
  for (const s of statusSets) {
    const sid = ssId(s), sn = ssName(s).trim();
    if (sid && sn) statusSetByName[sn.toLowerCase()] = { id: sid, name: sn };
  }

  // Parse rows
  const rows = [];
  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const name = (r.name || '').trim();
    if (!name) continue;
    rows.push({
      rowNumber: i + 2,
      name,
      description: (r.description || '').trim() || name,
      parentId: (r.parentId || '').trim(),
      parentPath: normalizePath(r.parentPath || ''),
      statusSetName: (r.statusSetName || '').trim(),
    });
  }

  // Build planned path set for validation
  const plannedPaths = new Set(Object.keys(idByPath));
  for (const row of rows) {
    const np = row.parentPath ? normalizePath(`${row.parentPath}/${row.name}`) : row.name;
    plannedPaths.add(np);
  }

  // Validate
  const errors = [], warnings = [];
  for (const row of rows) {
    if (!row.parentId && row.parentPath && !plannedPaths.has(row.parentPath))
      errors.push(`Row ${row.rowNumber}: parentPath '${row.parentPath}' does not exist and won't be created.`);
    if (row.statusSetName) {
      if (!statusSetByName[row.statusSetName.toLowerCase()])
        errors.push(`Row ${row.rowNumber}: statusSetName '${row.statusSetName}' not found in this project.`);
      if (row.parentId || row.parentPath)
        warnings.push(`Row ${row.rowNumber}: '${row.name}' is a child — statusSetName will be ignored.`);
    }
  }

  if (errors.length) {
    for (const e of errors) emit('error', { message: e });
    throw new Error('Validation failed. Fix the CSV and try again.');
  }
  for (const w of warnings) emit('warning', { message: w });

  // Sort by depth
  const sorted = [...rows].sort((a, b) => {
    const da = a.parentPath ? a.parentPath.split('/').length : 0;
    const db = b.parentPath ? b.parentPath.split('/').length : 0;
    return da - db || a.rowNumber - b.rowNumber;
  });

  emit('info', { message: `Root: ${rootId} | Existing: ${categories.length} | To process: ${sorted.length} | Dry run: ${dryRun}` });

  let created = 0, skipped = 0, assigned = 0, ignoredSS = 0;
  const rootSSAssignments = [];

  for (const row of sorted) {
    let resolvedParentId, resolvedParentPath;

    if (row.parentId) {
      if (isProbablyId(row.parentId)) {
        resolvedParentId = row.parentId; resolvedParentPath = '';
      } else {
        resolvedParentPath = normalizePath(row.parentId);
        resolvedParentId = idByPath[resolvedParentPath];
        if (!resolvedParentId) throw new Error(`Row ${row.rowNumber}: Cannot resolve parentId '${row.parentId}'.`);
      }
    } else if (row.parentPath) {
      resolvedParentPath = row.parentPath;
      resolvedParentId = idByPath[row.parentPath];
      if (!resolvedParentId) throw new Error(`Row ${row.rowNumber}: Cannot resolve parentPath '${row.parentPath}'.`);
    } else {
      resolvedParentId = rootId; resolvedParentPath = '';
    }

    const newPath = resolvedParentPath ? normalizePath(`${resolvedParentPath}/${row.name}`) : row.name;
    const existingId = idByPath[newPath];
    let categoryId;

    if (existingId) {
      emit('skip', { message: `SKIP (exists): ${newPath}`, path: newPath, id: existingId });
      categoryId = existingId; skipped++;
    } else if (dryRun) {
      categoryId = `DRY-${created + 1}`;
      emit('dryrun', { message: `DRY RUN: would create '${row.name}' under '${resolvedParentId}' → ${newPath}`, path: newPath });
      idByPath[newPath] = categoryId; created++;
    } else {
      const newCat = await createCategory(token, projectId, { name: row.name, description: row.description, parentId: resolvedParentId });
      categoryId = catId(newCat);
      if (!categoryId) throw new Error(`Row ${row.rowNumber}: category created but ID not readable.`);
      idByPath[newPath] = categoryId;
      emit('created', { message: `CREATED: ${newPath} → ${categoryId}`, path: newPath, id: categoryId });
      created++;
    }

    if (row.statusSetName) {
      if (row.parentId || row.parentPath) { ignoredSS++; continue; }
      const ss = statusSetByName[row.statusSetName.toLowerCase()];
      rootSSAssignments.push({ categoryPath: newPath, categoryId, statusSetName: ss.name, statusSetId: ss.id });
    }
  }

  for (const item of rootSSAssignments) {
    if (dryRun) {
      emit('dryrun', { message: `DRY RUN: would assign '${item.statusSetName}' to '${item.categoryPath}'` });
      assigned++;
    } else {
      await assignStatusSet(token, projectId, item.categoryId, item.statusSetId);
      emit('assigned', { message: `ASSIGNED: '${item.statusSetName}' → '${item.categoryPath}'` });
      assigned++;
    }
  }

  emit('done', {
    message: `Done. Created: ${created} | Skipped: ${skipped} | Status sets assigned: ${assigned} | Ignored: ${ignoredSS}`,
    stats: { created, skipped, assigned, ignoredSS },
  });
}

module.exports = { runImport };
