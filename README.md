# Social Forum dell'Abitare – Venezia 2026

Sito web per il convegno **Social Forum dell'Abitare**, Venezia 10–11 Aprile 2026, organizzato in collaborazione con H-City/IUAV.

---

## Struttura della repository

```
sfa-venezia/
├── sfa-site/                   # Frontend statico (nginx)
│   ├── index.html              # Homepage con banner ferroviario
│   ├── programma.html          # Programma (tab venerdì/sabato)
│   ├── workshop.html           # Griglia dei 9 laboratori
│   ├── relatori.html           # Lista relatori con filtro per giorno
│   ├── indicazioni.html        # Mappa OpenStreetMap + 3 sedi
│   ├── passaggi.html           # Passaggi in auto (frontend)
│   ├── logo.png
│   ├── css/style.css           # Design system globale
│   ├── js/main.js              # Nav, hamburger, tab switching, banner
│   ├── pages/                  # Pagine dei singoli laboratori
│   │   ├── lab-venerdì-1.html  # Accesso alle informazioni
│   │   ├── lab-venerdì-2.html  # Abitare universitario
│   │   ├── lab-venerdì-3.html  # Mappare le città dal basso
│   │   ├── lab-venerdì-4.html  # Vuoti abitativi
│   │   ├── lab-bambini.html    # Lab per bambini (We Are Here Venice)
│   │   ├── lab-sabato-1.html   # Mappare le LTB
│   │   ├── lab-sabato-2.html   # Regolamentare si può
│   │   ├── lab-sabato-3.html   # Valutare le regolamentazioni
│   │   └── lab-sabato-4.html   # Incidenza LTB sul mercato immobiliare
│   ├── relatori/               # 22 pagine individuali relatori
│   ├── nginx.conf              # Proxy /api/ → backend:3001
│   └── Dockerfile
│
├── sfa-backend/                # Backend Node.js (API passaggi + mail)
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml          # Orchestrazione frontend + backend
└── README.md
```

---

## Avvio con Docker (consigliato)

### 1. Prerequisiti

- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/) installati

### 2. Configurare le variabili d'ambiente

Apri `docker-compose.yml` e sostituisci le credenziali Gmail nella sezione `backend`:

```yaml
environment:
  GMAIL_USER: "tua@gmail.com"
  GMAIL_PASS: "xxxx xxxx xxxx xxxx"  # App Password Gmail (non la password normale)
```

> **Come ottenere un'App Password Gmail:**
> 1. Vai su [myaccount.google.com](https://myaccount.google.com) → Sicurezza
> 2. Attiva la verifica in due passaggi (se non è già attiva)
> 3. Cerca "App password", creane una per "Mail"
> 4. Copia la password di 16 caratteri generata

Se non configuri le credenziali, il sito funziona normalmente ma le mail non vengono inviate (vengono solo loggate in console).

### 3. Avviare

```bash
docker compose up -d
```

Il sito sarà disponibile su **http://localhost:8080**

### 4. Fermare

```bash
docker compose down
```

I dati dei passaggi sono persistiti in un volume Docker (`passaggi-data`) e sopravvivono ai restart.

---

## Avvio in locale senza Docker

Il frontend è HTML/CSS/JS puro e funziona aprendo `index.html` direttamente nel browser, oppure con un server locale:

```bash
cd sfa-site

# Python 3
python3 -m http.server 8080

# oppure Node.js
npx serve .
```

> Senza il backend, la pagina **Passaggi** non funzionerà (le API non saranno disponibili). Tutte le altre pagine funzionano normalmente.

Per avviare anche il backend in locale:

```bash
cd sfa-backend
npm install
GMAIL_USER=tua@gmail.com GMAIL_PASS="xxxx xxxx xxxx xxxx" node server.js
```

---

## Backend – API passaggi

Il backend espone un'API REST sulla porta `3001`, accessibile dall'esterno tramite il proxy nginx su `/api/`.

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/passaggi` | Lista tutti i passaggi disponibili |
| `POST` | `/api/passaggi` | Registra un nuovo passaggio |
| `POST` | `/api/passaggi/:id/prenota` | Prenota un posto in un passaggio |
| `DELETE` | `/api/passaggi/:id` | Rimuove un passaggio |

### Campi POST `/api/passaggi`

| Campo | Tipo | Obbligatorio |
|-------|------|:---:|
| `nome` | string | ✓ |
| `email` | string | ✓ |
| `partenza` | string | ✓ |
| `giorno` | `venerdi` / `sabato` / `entrambi` | ✓ |
| `posti` | number (1–8) | ✓ |
| `telefono` | string | |
| `note` | string | |

### Mail automatiche

Ogni azione sulla pagina Passaggi genera mail automatiche:

- **Offerta passaggio** → conferma al guidatore con riepilogo
- **Prenotazione** → notifica al guidatore con i contatti del passeggero + conferma al passeggero con i contatti del guidatore

Le email non sono mai esposte nella lista pubblica dei passaggi.

### Anti-spam

Il backend implementa tre livelli di protezione senza servizi esterni:

- **Honeypot** – campo nascosto nel form: se compilato (solo i bot lo fanno), la richiesta viene scartata
- **Timing check** – richieste inviate in meno di 3 secondi dall'apertura del form vengono rifiutate
- **Rate limiting** – massimo 5 richieste POST per IP nell'arco di un'ora

---

## Design system

Font: **Syne** (titoli) + **Space Grotesk** (corpo)

```css
--lavender:      #b8a9e0   /* viola chiaro – sfondo hero, accenti */
--lavender-dark: #7c6ab5   /* viola scuro – testi su lavender */
--yellow:        #f5c842   /* giallo – CTA, navbar, accenti */
--teal:          #3a8c7e   /* verde acqua – bottoni primari, link */
--dark:          #1a1525   /* quasi nero – testo, sfondi */
--white:         #fdfcf8   /* bianco caldo – sfondo pagina */
```

---

## Sedi

| Sede | Indirizzo | Quando |
|------|-----------|--------|
| IUAV Ex Cotonificio | Santa Marta, Sestiere Dorsoduro, Venezia | Venerdì 14:00–17:45 |
| IUAV Palazzo Badoer – Aula Tafuri | Sestiere Santa Croce, Venezia | Sabato 9:00–13:00 |
| Laboratorio Climatico Pandora | Via Antonio da Mestre 12, Mestre | Venerdì 19:30 |

---

## Contatti

Per problemi tecnici o segnalazioni: [osservatorio@ocio-venezia.it](mailto:osservatorio@ocio-venezia.it)