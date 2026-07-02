'use strict';

const express = require('express');
const session = require('express-session');
const path = require('path');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'forma-asset-mgr-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 },
}));

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`\nForma Asset Manager`);
  console.log(`Running at:       http://localhost:${PORT}`);
  console.log(`APS callback URL: http://localhost:${PORT}/auth/callback\n`);
});
