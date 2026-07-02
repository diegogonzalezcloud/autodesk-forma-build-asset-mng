'use strict';

const express = require('express');
const multer = require('multer');
const router = express.Router();
const { getCategories, getStatusStepSets, getHubs, getHubProjects } = require('../services/aps');
const { runImport } = require('../services/import');
const { runExport } = require('../services/export');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function requireAuth(req, res, next) {
  if (!req.session.accessToken || req.session.tokenExpiry <= Date.now()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

function getProjectId(req) {
  return req.query.projectId || req.body.projectId || null;
}

// ── Hubs & Projects (Data Management API) ────────────────────
router.get('/hubs', requireAuth, async (req, res) => {
  try {
    res.json(await getHubs(req.session.accessToken));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/hubs/:hubId/projects', requireAuth, async (req, res) => {
  try {
    res.json(await getHubProjects(req.session.accessToken, req.params.hubId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Asset Categories ──────────────────────────────────────────
router.get('/categories', requireAuth, async (req, res) => {
  const projectId = getProjectId(req);
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  try {
    res.json(await getCategories(req.session.accessToken, projectId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status-step-sets', requireAuth, async (req, res) => {
  const projectId = getProjectId(req);
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  try {
    res.json(await getStatusStepSets(req.session.accessToken, projectId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SSE streaming import
router.post('/categories/import', requireAuth, upload.single('csv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file provided' });
  const projectId = getProjectId(req);
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  const dryRun = req.body.dryRun === 'true';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const emit = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    const csvText = req.file.buffer.toString('utf-8').replace(/^﻿/, '');
    await runImport({ csvText, dryRun, token: req.session.accessToken, projectId, emit });
  } catch (err) {
    emit('error', { message: err.message });
  } finally {
    res.end();
  }
});

// Export as CSV download
router.get('/categories/export', requireAuth, async (req, res) => {
  const projectId = getProjectId(req);
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  const separator = req.query.separator === ',' ? ',' : ';';
  try {
    const { csv } = await runExport({ token: req.session.accessToken, projectId, separator });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="AssetCategories.csv"');
    res.send('﻿' + csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export preview as JSON
router.get('/categories/export/preview', requireAuth, async (req, res) => {
  const projectId = getProjectId(req);
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  try {
    const { rows } = await runExport({ token: req.session.accessToken, projectId, separator: ';' });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
