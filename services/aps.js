'use strict';

const BASE_URL = 'https://developer.api.autodesk.com/construction/assets/v1';
const DM_BASE_URL = 'https://developer.api.autodesk.com/project/v1';
const TOKEN_URL = 'https://developer.api.autodesk.com/authentication/v2/token';

async function exchangeCodeForToken({ clientId, clientSecret, code, redirectUri }) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  });
  if (!resp.ok) throw new Error(`Token exchange: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function apsRequest(token, method, path, { params, body } = {}) {
  const url = new URL(BASE_URL + path);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const resp = await fetch(url.toString(), {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) throw new Error(`APS ${resp.status} ${method} ${path}: ${await resp.text()}`);
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const key of ['results', 'data', 'items', 'categories', 'statusStepSets', 'values']) {
      if (Array.isArray(data[key])) return data[key];
    }
    return [data];
  }
  return [];
}

async function getCategories(token, projectId) {
  return extractList(await apsRequest(token, 'GET', `/projects/${projectId}/categories`, { params: { includeUid: 'true' } }));
}

async function getStatusStepSets(token, projectId) {
  return extractList(await apsRequest(token, 'GET', `/projects/${projectId}/status-step-sets`));
}

async function createCategory(token, projectId, { name, description, parentId }) {
  return apsRequest(token, 'POST', `/projects/${projectId}/categories`, {
    body: { name, description: description || name, parentId },
  });
}

async function assignStatusSet(token, projectId, categoryId, statusStepSetId) {
  return apsRequest(token, 'PUT', `/projects/${projectId}/categories/${categoryId}/status-step-set/${statusStepSetId}`);
}

async function dmRequest(token, path) {
  const resp = await fetch(`${DM_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!resp.ok) throw new Error(`DM API ${resp.status} GET ${path}: ${await resp.text()}`);
  return resp.json();
}

async function getHubs(token) {
  const data = await dmRequest(token, '/hubs');
  return (data.data || []).map(h => ({
    id: h.id,
    name: h.attributes?.name || h.id,
    type: h.attributes?.extension?.type || '',
  }));
}

async function getHubProjects(token, hubId) {
  const data = await dmRequest(token, `/hubs/${hubId}/projects`);
  return (data.data || []).map(p => ({
    id: p.id,
    name: p.attributes?.name || p.id,
    type: p.attributes?.extension?.type || '',
  }));
}

module.exports = {
  exchangeCodeForToken, apsRequest, extractList,
  getCategories, getStatusStepSets, createCategory, assignStatusSet,
  getHubs, getHubProjects,
};
