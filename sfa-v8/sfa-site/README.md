# Social Forum dell'Abitare – Sito Web
**Venezia, 10–11 Aprile 2026**

## Struttura del sito

```
sfa-site/
├── index.html          # Homepage
├── programma.html      # Programma completo (con tab per i due giorni)
├── workshop.html       # Lista di tutti i laboratori
├── indicazioni.html    # Luoghi e mappa
├── pages/
│   ├── lab-venerdì-1.html   # Accesso alle informazioni
│   ├── lab-venerdì-2.html   # Abitare universitario
│   ├── lab-venerdì-3.html   # Mappare le città dal basso
│   ├── lab-venerdì-4.html   # Vuoti abitativi
│   ├── lab-bambini.html     # Lab per bambini
│   ├── lab-sabato-1.html    # Mappare le LTB
│   ├── lab-sabato-2.html    # Regolamentare si può
│   ├── lab-sabato-3.html    # Valutare le regolamentazioni
│   └── lab-sabato-4.html    # Incidenza LTB sul mercato
├── css/style.css       # Stili globali
├── js/main.js          # Script condiviso
├── Dockerfile
├── nginx.conf
└── README.md
```

## Avviare in locale (senza Docker)

Apri `index.html` direttamente nel browser oppure avvia un server locale:

```bash
# Python 3
python3 -m http.server 8080

# oppure Node.js
npx serve .
```

Poi visita: http://localhost:8080

## Build e run con Docker

```bash
# Build dell'immagine
docker build -t sfa-venezia-2026 .

# Run del container
docker run -d -p 8080:80 --name sfa-site sfa-venezia-2026

# Visita il sito su
http://localhost:8080
```

## Aggiornare i contenuti

Tutti i contenuti sono in HTML puro — modifica i file `.html` direttamente.  
Il CSS è in `css/style.css` con variabili colore definite in `:root`.

### Colori del tema
```css
--lavender:     #b8a9e0   /* viola chiaro – sfondo principale */
--yellow:       #f5c842   /* giallo – accenti, CTA */
--teal:         #3a8c7e   /* verde acqua – etichette, bottoni primari */
--dark:         #1a1525   /* quasi nero – testo, sfondi scuri */
```
