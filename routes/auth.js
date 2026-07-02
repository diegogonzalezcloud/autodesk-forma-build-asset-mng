'use strict';

const express = require('express');
const router = express.Router();
const { exchangeCodeForToken } = require('../services/aps');

const AUTH_URL = 'https://developer.api.autodesk.com/authentication/v2/authorize';
const SCOPES = 'data:read data:write account:read';

function callbackUrl(req) {
  return `${req.protocol}://${req.get('host')}/auth/callback`;
}

router.post('/config', (req, res) => {
  const { clientId, clientSecret } = req.body;
  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'clientId and clientSecret are required' });
  }
  req.session.clientId = clientId.trim();
  req.session.clientSecret = clientSecret.trim();
  req.session.accessToken = undefined;
  req.session.tokenExpiry = undefined;
  res.json({ ok: true });
});

router.get('/login', (req, res) => {
  if (!req.session.clientId) return res.redirect('/?error=not_configured');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: req.session.clientId,
    redirect_uri: callbackUrl(req),
    scope: SCOPES,
  });
  res.redirect(`${AUTH_URL}?${params}`);
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.redirect(`/?error=${encodeURIComponent(error)}`);
  if (!code) return res.redirect('/?error=no_code');
  try {
    const token = await exchangeCodeForToken({
      clientId: req.session.clientId,
      clientSecret: req.session.clientSecret,
      code,
      redirectUri: callbackUrl(req),
    });
    req.session.accessToken = token.access_token;
    req.session.tokenExpiry = Date.now() + token.expires_in * 1000;
    res.redirect('/?auth=success');
  } catch (err) {
    console.error('Token exchange failed:', err.message);
    res.redirect(`/?error=auth_failed`);
  }
});

router.get('/status', (req, res) => {
  res.json({
    authenticated: !!(req.session.accessToken && req.session.tokenExpiry > Date.now()),
    hasConfig: !!(req.session.clientId && req.session.clientSecret),
    tokenExpiry: req.session.tokenExpiry || null,
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
