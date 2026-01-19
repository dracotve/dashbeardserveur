const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

try {
  require('dotenv').config();
} catch (_) {
  // dotenv is optional
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const USERS_FILE = path.join(__dirname, 'user.json');

const PTERO_BASE_URL = process.env.PTERO_BASE_URL || 'http://185.249.227.253';
const PTERO_SERVER_ID = process.env.PTERO_SERVER_ID || 'aa94d70e';
const PTERO_API_KEY = process.env.PTERO_API_KEY || '';

async function getFetch() {
  if (typeof fetch === 'function') return fetch;
  const mod = await import('node-fetch');
  return mod.default;
}

function readUsersFile() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function writeUsersFile(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

app.get('/users', (req, res) => {
  res.json(readUsersFile());
});

// Overwrite user.json with the full users array sent by the panel
app.post('/users/save', (req, res) => {
  const users = req.body;
  if (!Array.isArray(users)) {
    return res.status(400).json({ error: 'Body must be an array of users' });
  }
  writeUsersFile(users);
  res.json({ ok: true, count: users.length });
});

function requirePteroKey(req, res, next) {
  if (!PTERO_API_KEY) {
    return res.status(500).json({ error: 'PTERO_API_KEY is not configured on the backend' });
  }
  next();
}

async function pteroFetch(apiPath, options = {}) {
  const url = `${PTERO_BASE_URL}${apiPath}`;
  const doFetch = await getFetch();
  const headers = {
    'Accept': 'Application/vnd.pterodactyl.v1+json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${PTERO_API_KEY}`,
    ...(options.headers || {})
  };

  const res = await doFetch(url, {
    ...options,
    headers
  });

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_) {
    body = text;
  }

  if (!res.ok) {
    return { ok: false, status: res.status, body };
  }

  return { ok: true, status: res.status, body };
}

app.get('/ptero/resources', requirePteroKey, async (req, res) => {
  try {
    const out = await pteroFetch(`/api/client/servers/${encodeURIComponent(PTERO_SERVER_ID)}/resources`, {
      method: 'GET'
    });
    res.status(out.ok ? 200 : out.status).json(out.body);
  } catch (e) {
    res.status(500).json({ error: 'Failed to contact Pterodactyl', details: String(e?.message || e) });
  }
});

app.post('/ptero/power', requirePteroKey, async (req, res) => {
  try {
    const signal = String(req.body?.signal || '').toLowerCase();
    const allowed = new Set(['start', 'stop', 'restart', 'kill']);
    if (!allowed.has(signal)) {
      return res.status(400).json({ error: 'Invalid signal', allowed: Array.from(allowed) });
    }

    const out = await pteroFetch(`/api/client/servers/${encodeURIComponent(PTERO_SERVER_ID)}/power`, {
      method: 'POST',
      body: JSON.stringify({ signal })
    });

    res.status(out.ok ? 200 : out.status).json(out.body || { ok: out.ok });
  } catch (e) {
    res.status(500).json({ error: 'Failed to contact Pterodactyl', details: String(e?.message || e) });
  }
});

app.get('/ptero/files/list', requirePteroKey, async (req, res) => {
  try {
    const dir = typeof req.query?.dir === 'string' ? req.query.dir : '/';
    const out = await pteroFetch(
      `/api/client/servers/${encodeURIComponent(PTERO_SERVER_ID)}/files/list?directory=${encodeURIComponent(dir)}`,
      { method: 'GET' }
    );
    res.status(out.ok ? 200 : out.status).json(out.body);
  } catch (e) {
    res.status(500).json({ error: 'Failed to contact Pterodactyl', details: String(e?.message || e) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`User API listening on http://localhost:${PORT}`);
  console.log(`Serving ${USERS_FILE}`);
});
