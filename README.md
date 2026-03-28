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
- 🎯 **Scatter plot** — interactive Contact vs. Power chart with visual quadrants
- 📉 **Trend chart** — line chart showing a player's AVG or Hits evolution across games
- ⚡ **Loading & error states** — spinner while fetching, error message with retry button
- 📱 **Fully responsive** — works on mobile, tablet, and desktop
- ♿ **Accessible** — ARIA labels, keyboard-navigable sort headers, screen-reader-friendly

---

## Pages

| Page | Description |
|------|-------------|
| `index.html` | Main dashboard — sortable stats table + batting lineup card |
| `avg.html` | Batting averages — per-game or cumulative ranked player list |
| `scatter.html` | **Scatter plot** — Contact (AVG) vs. Power (HR) with quadrant analysis |
| `trend.html` | **Trend chart** — Line chart of a player's AVG or Hits evolution across games |

---

## Scatter Plot — Contact vs. Power

The scatter plot (`scatter.html`) visualises every player as a dot on a 2-axis chart:

- **X-axis**: AVG (batting average — measures contact quality)
- **Y-axis**: HR (home runs — measures raw power)

Dashed lines drawn at the team **median** of each axis create four quadrants:

| Quadrant | Position | Profile |
|----------|----------|---------|
| ⭐ **Superestrellas** | Top-right | High contact *and* high power — the most complete hitters |
| 🎯 **Bateadores de Contacto** | Bottom-right | High contact, few home runs |
| 💪 **Poder Puro** | Top-left | Many home runs but low contact / high strikeouts |
| 📊 **Promedio** | Bottom-left | Below the team median in both dimensions |

A **game selector** lets you switch between individual games or view all games combined.
Hover (or tap) any dot to see the player's full stat line.

---

## Trend Chart — Player Performance Over Time

The trend chart (`trend.html`) visualises a single player's batting performance across all games of the season as a line chart:

- **X-axis**: Game number (chronological order)
- **Y-axis**: AVG per game (H / AB) **or** Total Hits per game (selectable)

A **player selector** lets you choose any player on the roster.
A **metric selector** switches between Batting Average (AVG) and Total Hits.

A dashed reference line marks the player's season average, making slumps and hot streaks immediately visible:

| Point colour | Meaning |
|--------------|---------|
| 🟢 Green | Above season average — hot streak |
| 🔴 Red | Below season average — slump |
| 🟡 Gold | Equal to season average |

Summary cards show the player's season totals (Games, AVG, Hits, HR) above the chart.

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

The scatter plot (`scatter.html`) uses the per-game format from `hoja=Data`:

```json
{
  "data": [
    {
      "Juego": 1,
      "Jugador": "Roque Ruiz",
      "AB": 3,
      "H": 1,
      "HR": 0,
      "K": 0
    }
  ]
}
```

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
├── index.html          # Main HTML shell — stats table + lineup card
├── avg.html            # Batting averages page (per-game or cumulative)
├── scatter.html        # Scatter plot: Contact vs. Power
├── trend.html          # Trend chart: player AVG / Hits over time
├── styles/
│   ├── main.css        # Dashboard styles (Chicago Cubs theme, responsive)
│   ├── avg.css         # Batting averages page styles
│   ├── scatter.css     # Scatter plot page styles
│   └── trend.css       # Trend chart page styles
├── scripts/
│   ├── config.js       # API URL configuration
│   ├── app.js          # Main dashboard logic
│   ├── avg.js          # Batting averages page logic
│   ├── scatter.js      # Scatter plot logic (Chart.js)
│   └── trend.js        # Trend chart logic (Chart.js line chart)
├── vercel.json         # Vercel deployment configuration
├── .env.example        # Example environment variable file
└── README.md
```

---

## License

MIT