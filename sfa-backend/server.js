const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'passaggi.json');

app.use(cors());
app.use(express.json());

// ── Anti-spam: Rate limiting ──────────────────────────────────────────────────
// Mappa IP → { count, resetAt }
const rateLimitMap = new Map();
const RATE_LIMIT = 5;          // max richieste POST per IP
const RATE_WINDOW = 60 * 60 * 1000; // finestra: 1 ora
const MIN_FORM_TIME = 3000;    // ms minimi per compilare il form (timing check)

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Pulisce la mappa ogni ora per evitare memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, RATE_WINDOW);

// ── Mailer ────────────────────────────────────────────────────────────────────

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const MAIL_ENABLED = !!(GMAIL_USER && GMAIL_PASS);
const CONTACT_EMAIL = 'osservatorio@ocio-venezia.it';

const transporter = MAIL_ENABLED
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    })
  : null;

async function sendMail({ to, subject, html }) {
  if (!MAIL_ENABLED) {
    console.log(`[MAIL DISABILITATA] A: ${to} | Oggetto: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"Social Forum dell'Abitare" <${GMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`[MAIL] Inviata a ${to}: ${subject}`);
  } catch (err) {
    console.error(`[MAIL] Errore invio a ${to}:`, err.message);
  }
}

const GIORNO_LABEL = {
  venerdi: 'Venerdì 10 Aprile',
  sabato: 'Sabato 11 Aprile',
  entrambi: 'Entrambi i giorni (10 e 11 Aprile)'
};

// Footer comune a tutte le mail
const mailFooter = `
  <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e0d8f5;font-size:0.82rem;color:#888;line-height:1.6;">
    <p>Per i dettagli del passaggio (orari, punto di ritrovo, ecc.) mettetevi direttamente in contatto tra di voi.</p>
    <p>Per qualsiasi altro problema contatta: <a href="mailto:${CONTACT_EMAIL}" style="color:#3a8c7e;">${CONTACT_EMAIL}</a></p>
    <p style="margin-top:8px;opacity:0.6;">Social Forum dell'Abitare · Venezia, 10–11 Aprile 2026</p>
  </div>`;

const mailHeader = `
  <div style="background:#f5c842;padding:24px 32px;border-radius:12px 12px 0 0">
    <h1 style="margin:0;font-size:1.3rem;color:#1a1525">Social Forum dell'Abitare</h1>
    <p style="margin:4px 0 0;opacity:0.7;font-size:0.9rem">Venezia, 10–11 Aprile 2026</p>
  </div>`;

function wrapMail(content) {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#2d2540">
    ${mailHeader}
    <div style="background:#fdfcf8;padding:28px 32px;border:2px solid #f5c842;border-top:none;border-radius:0 0 12px 12px">
      ${content}
      ${mailFooter}
    </div>
  </div>`;
}

function mailConfermaPassaggio(p) {
  return sendMail({
    to: p.email,
    subject: "✅ Passaggio registrato – Social Forum dell'Abitare",
    html: wrapMail(`
      <p>Ciao <strong>${p.nome}</strong>,</p>
      <p>il tuo passaggio è stato registrato. Riceverai una mail ogni volta che qualcuno prenota un posto.</p>
      <div style="background:#c9baee;border-radius:10px;padding:16px 20px;margin:20px 0">
        <p style="margin:0 0 8px;font-weight:700">Riepilogo</p>
        <p style="margin:4px 0">📍 <strong>Partenza:</strong> ${p.partenza}</p>
        <p style="margin:4px 0">🗓 <strong>Giorno:</strong> ${GIORNO_LABEL[p.giorno] || p.giorno}</p>
        <p style="margin:4px 0">💺 <strong>Posti:</strong> ${p.posti_totali}</p>
        ${p.note ? `<p style="margin:4px 0">📝 <strong>Note:</strong> ${p.note}</p>` : ''}
      </div>`)
  });
}

function mailNuovaPrenotazione(passaggio, passeggero) {
  return sendMail({
    to: passaggio.email,
    subject: `🚗 Nuova prenotazione da ${passeggero.nome} – Social Forum dell'Abitare`,
    html: wrapMail(`
      <p>Ciao <strong>${passaggio.nome}</strong>,</p>
      <p><strong>${passeggero.nome}</strong> ha prenotato un posto nel tuo passaggio da <strong>${passaggio.partenza}</strong>.</p>
      <div style="background:#c9baee;border-radius:10px;padding:16px 20px;margin:20px 0">
        <p style="margin:0 0 8px;font-weight:700">Contatti del passeggero</p>
        <p style="margin:4px 0">👤 <strong>Nome:</strong> ${passeggero.nome}</p>
        <p style="margin:4px 0">✉️ <strong>Email:</strong> <a href="mailto:${passeggero.email}" style="color:#3a8c7e">${passeggero.email}</a></p>
        ${passeggero.telefono ? `<p style="margin:4px 0">📞 <strong>Telefono:</strong> ${passeggero.telefono}</p>` : ''}
      </div>
      <div style="background:#e8f6f3;border-radius:10px;padding:16px 20px;margin:20px 0">
        <p style="margin:0 0 8px;font-weight:700">Stato del passaggio</p>
        <p style="margin:4px 0">💺 Posti rimasti: <strong>${passaggio.posti_liberi}</strong> su ${passaggio.posti_totali}</p>
        ${passaggio.passeggeri.length > 0 ? `<p style="margin:4px 0">👥 Passeggeri: ${passaggio.passeggeri.map(p => p.nome).join(', ')}</p>` : ''}
      </div>`)
  });
}

function mailConfermaPrenotazione(passaggio, passeggero) {
  return sendMail({
    to: passeggero.email,
    subject: `✅ Prenotazione confermata – Social Forum dell'Abitare`,
    html: wrapMail(`
      <p>Ciao <strong>${passeggero.nome}</strong>,</p>
      <p>la tua prenotazione è confermata! Hai un posto nel passaggio da <strong>${passaggio.partenza}</strong>.</p>
      <div style="background:#c9baee;border-radius:10px;padding:16px 20px;margin:20px 0">
        <p style="margin:0 0 8px;font-weight:700">Dettagli del passaggio</p>
        <p style="margin:4px 0">🗓 <strong>Giorno:</strong> ${GIORNO_LABEL[passaggio.giorno] || passaggio.giorno}</p>
        <p style="margin:4px 0">📍 <strong>Partenza:</strong> ${passaggio.partenza}</p>
        ${passaggio.note ? `<p style="margin:4px 0">📝 <strong>Note:</strong> ${passaggio.note}</p>` : ''}
      </div>
      <div style="background:#e8f6f3;border-radius:10px;padding:16px 20px;margin:20px 0">
        <p style="margin:0 0 8px;font-weight:700">Contatti del guidatore</p>
        <p style="margin:4px 0">👤 <strong>Nome:</strong> ${passaggio.nome}</p>
        <p style="margin:4px 0">✉️ <strong>Email:</strong> <a href="mailto:${passaggio.email}" style="color:#3a8c7e">${passaggio.email}</a></p>
        ${passaggio.telefono ? `<p style="margin:4px 0">📞 <strong>Telefono:</strong> ${passaggio.telefono}</p>` : ''}
      </div>`)
  });
}

// ── Storage ───────────────────────────────────────────────────────────────────

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

function readPassaggi() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writePassaggi(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── API ───────────────────────────────────────────────────────────────────────

app.get('/api/passaggi', (req, res) => {
  const passaggi = readPassaggi();
  const sanitized = passaggi.map(({ email, passeggeri, ...rest }) => ({
    ...rest,
    passeggeri: passeggeri.map(({ email: _, ...p }) => p)
  }));
  res.json(sanitized);
});

app.post('/api/passaggi', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

  // Rate limit
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Troppe richieste. Riprova tra un\'ora.' });
  }

  const { nome, email, telefono, partenza, giorno, posti, note, _tempo_compilazione, _campo_extra } = req.body;

  // Honeypot: _campo_extra deve essere vuoto
  if (_campo_extra) {
    return res.status(400).json({ error: 'Richiesta non valida.' });
  }

  // Timing check: almeno 3 secondi per compilare il form
  if (!_tempo_compilazione || Date.now() - _tempo_compilazione < MIN_FORM_TIME) {
    return res.status(400).json({ error: 'Richiesta non valida.' });
  }

  if (!nome || !email || !partenza || !giorno || !posti) {
    return res.status(400).json({ error: 'Campi obbligatori mancanti: nome, email, partenza, giorno, posti' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Indirizzo email non valido' });
  }

  if (posti < 1 || posti > 8) {
    return res.status(400).json({ error: 'Il numero di posti deve essere tra 1 e 8' });
  }

  const passaggio = {
    id: uuidv4(),
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    telefono: telefono ? telefono.trim() : null,
    partenza: partenza.trim(),
    giorno,
    posti_totali: parseInt(posti),
    posti_liberi: parseInt(posti),
    note: note ? note.trim() : null,
    passeggeri: [],
    creato_il: new Date().toISOString()
  };

  const passaggi = readPassaggi();
  passaggi.push(passaggio);
  writePassaggi(passaggi);

  mailConfermaPassaggio(passaggio).catch(() => {});

  const { email: _, ...risposta } = passaggio;
  res.status(201).json(risposta);
});

app.post('/api/passaggi/:id/prenota', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Troppe richieste. Riprova tra un\'ora.' });
  }

  const { nome, email, telefono, _tempo_compilazione, _campo_extra } = req.body;

  // Honeypot
  if (_campo_extra) {
    return res.status(400).json({ error: 'Richiesta non valida.' });
  }

  // Timing check
  if (!_tempo_compilazione || Date.now() - _tempo_compilazione < MIN_FORM_TIME) {
    return res.status(400).json({ error: 'Richiesta non valida.' });
  }

  if (!nome || !email) {
    return res.status(400).json({ error: 'Nome e email sono obbligatori' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Indirizzo email non valido' });
  }

  const passaggi = readPassaggi();
  const idx = passaggi.findIndex(p => p.id === req.params.id);

  if (idx === -1) return res.status(404).json({ error: 'Passaggio non trovato' });

  const passaggio = passaggi[idx];

  if (passaggio.posti_liberi <= 0) {
    return res.status(409).json({ error: 'Nessun posto libero disponibile' });
  }

  const passeggero = {
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    telefono: telefono ? telefono.trim() : null,
    prenotato_il: new Date().toISOString()
  };

  passaggio.passeggeri.push(passeggero);
  passaggio.posti_liberi -= 1;
  writePassaggi(passaggi);

  mailNuovaPrenotazione(passaggio, passeggero).catch(() => {});
  mailConfermaPrenotazione(passaggio, passeggero).catch(() => {});

  const { email: _e, passeggeri, ...rest } = passaggio;
  res.json({
    ...rest,
    passeggeri: passeggeri.map(({ email: _, ...p }) => p)
  });
});

app.delete('/api/passaggi/:id', (req, res) => {
  const passaggi = readPassaggi();
  const nuovi = passaggi.filter(p => p.id !== req.params.id);
  if (nuovi.length === passaggi.length) {
    return res.status(404).json({ error: 'Passaggio non trovato' });
  }
  writePassaggi(nuovi);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`SFA backend in ascolto su porta ${PORT}`);
  console.log(`Invio mail: ${MAIL_ENABLED ? `✅ Gmail (${GMAIL_USER})` : '⚠️  disabilitato (GMAIL_USER/GMAIL_PASS non configurati)'}`);
});
