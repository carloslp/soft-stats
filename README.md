# Soft Stats 🥎

A responsive web dashboard that displays real-time softball player statistics fetched from a REST API.
Built with vanilla HTML, CSS, and JavaScript — ready to deploy on [Vercel](https://vercel.com).

![Chicago Cubs color theme — navy, red, and gold]

---

## Features

- 📊 **Sortable stats table** — click any column header to sort ascending/descending
- 🔍 **Live search** — filter players by name as you type
- 🎛️ **Multiple filters** — minimum batting average (AVG) and minimum home runs (HR)
- 📈 **Summary cards** — team-wide totals for AB, Hits, HR, K, and batting average
- ⚡ **Loading & error states** — spinner while fetching, error message with retry button
- 📱 **Fully responsive** — works on mobile, tablet, and desktop
- ♿ **Accessible** — ARIA labels, keyboard-navigable sort headers, screen-reader-friendly

---

## Color Palette (Chicago Cubs)

| Token      | Hex       | Usage                  |
|------------|-----------|------------------------|
| Navy       | `#003087` | Primary / header       |
| Red        | `#CC3433` | Secondary / accents    |
| Sky Blue   | `#ACC9E7` | Light accent           |
| Gold       | `#F9C645` | Highlights             |
| White      | `#FFFFFF` | Background / text      |

---

## Data Format

The app expects the API endpoint to return JSON in the following shape:

```json
{
  "status": "success",
  "data": [
    {
      "Nombre": "Abel Juárez",
      "AB": 2,
      "H": 2,
      "HR": 0,
      "K": 0,
      "AVG": 1.0
    }
  ]
}
```

| Field    | Type   | Description            |
|----------|--------|------------------------|
| `Nombre` | string | Player name            |
| `AB`     | number | At-bats                |
| `H`      | number | Hits                   |
| `HR`     | number | Home runs              |
| `K`      | number | Strikeouts (ponches)   |
| `AVG`    | number | Batting average (0–1)  |

---

## Setup & Configuration

### 1 — Configure the API URL

Edit **`scripts/config.js`** and set your Vercel API endpoint:

```js
window.SOFT_STATS_CONFIG = {
  apiUrl: 'https://your-app.vercel.app/api/stats'
};
```

Alternatively, set the `apiUrl` at runtime by injecting a script tag before `config.js`:

```html
<script>window.SOFT_STATS_API_URL = 'https://your-app.vercel.app/api/stats';</script>
```

### 2 — Local development

No build step required — open `index.html` directly in a browser, or use any static server:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js (npx)
npx serve .
```

Then visit <http://localhost:8080>.

### 3 — Deploy to Vercel

```bash
# Install Vercel CLI (one-time)
npm i -g vercel

# Deploy
vercel
```

The included `vercel.json` configures single-page-app rewrites and security headers automatically.

---

## Project Structure

```
soft-stats/
├── index.html          # Main HTML shell
├── styles/
│   └── main.css        # All styles (Chicago Cubs theme, responsive)
├── scripts/
│   ├── config.js       # API URL configuration
│   └── app.js          # Data fetching, filtering, sorting, rendering
├── vercel.json         # Vercel deployment configuration
├── .env.example        # Example environment variable file
└── README.md
```

---

## License

MIT