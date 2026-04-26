/**
 * avg.js — Promedios de Bateo page logic
 *
 * Fetches all player batting stats from hoja=Group (which returns every game),
 * then renders a mobile-friendly, Instagram-shareable ranked list.
 * The game selector filters the already-loaded data client-side.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* API configuration                                                    */
  /* hoja=Group returns all games in one response.                       */
  /* ------------------------------------------------------------------ */
  const API_URL =
    'https://script.google.com/macros/s/AKfycby7mLKmo5tYeyah3g75xA9FS48FPDbq6SJMkFDPErFi9dgrNAvlOEeapwTQ2fZTlHZg/exec' +
    '?token=dads-12w1-dd3f-da1g&id=1r56WDn_pgZwoAHiiWmeaadUe1hepXC3Mo4t4PWwwfbQ&hoja=Data';

  /* ------------------------------------------------------------------ */
  /* DOM references                                                       */
  /* ------------------------------------------------------------------ */
  const gameSelect       = document.getElementById('game-select');
  const minAbBar         = document.getElementById('min-ab-bar');
  const minAbInput       = document.getElementById('min-ab-input');
  const minAbHint        = document.getElementById('min-ab-hint');
  const stateLoading     = document.getElementById('avg-loading');
  const stateError       = document.getElementById('avg-error');
  const errorMessage     = document.getElementById('avg-error-msg');
  const retryBtn         = document.getElementById('avg-retry-btn');
  const teamSection      = document.getElementById('team-avg-section');
  const teamGameLabel    = document.getElementById('team-game-label');
  const teamAvgValue     = document.getElementById('team-avg-value');
  const teamAbValue      = document.getElementById('team-ab-value');
  const teamHValue       = document.getElementById('team-h-value');
  const teamHrValue      = document.getElementById('team-hr-value');
  const playersSection   = document.getElementById('players-section');
  const playersCount     = document.getElementById('players-count');
  const playersList      = document.getElementById('players-list');
  const footerYear       = document.getElementById('avg-footer-year');

  /* ------------------------------------------------------------------ */
  /* State                                                                */
  /* ------------------------------------------------------------------ */
  /** All raw rows returned by the API (one row per player per game). */
  let allData = [];

  /** juego number to display, or null for all games combined. */
  let currentJuego = null;

  /** Minimum AB required to appear in the player list (all-games view only). */
  let minAB = 10;

  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */

  /** Format a batting average as ".333" or "1.000" */
  function fmtAvg(val) {
    if (val === null || val === undefined || val === '') return '.000';
    const n = parseFloat(val);
    if (isNaN(n)) return '.000';
    if (n >= 1) return '1.000';
    return n.toFixed(3).replace(/^0/, '');
  }

  /** Return CSS class based on AVG value */
  function avgBadgeClass(val) {
    const n = parseFloat(val);
    if (isNaN(n) || n === 0) return 'avg-badge--zero';
    if (n >= 0.500)          return 'avg-badge--high';
    if (n >= 0.250)          return 'avg-badge--mid';
    return 'avg-badge--low';
  }

  /** XSS-safe HTML escape */
  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Show only one state */
  function showState(name) {
    stateLoading.hidden  = name !== 'loading';
    stateError.hidden    = name !== 'error';
    teamSection.hidden   = name !== 'data';
    playersSection.hidden = name !== 'data';
  }

  /* ------------------------------------------------------------------ */
  /* Fetch & render                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Aggregate raw per-game rows by player name.
   * When juegoFilter is null, all games are included.
   * Returns an array of objects: { Jugador, AB, H, HR, K, AVG }.
   */
  function aggregatePlayers(juegoFilter) {
    var rows = juegoFilter === null
      ? allData
      : allData.filter(function (r) { return parseInt(r.Juego, 10) === juegoFilter; });

    var map = Object.create(null);
    rows.forEach(function (r) {
      var name = r.Jugador || '';
      if (!map[name]) {
        map[name] = { Jugador: name, AB: 0, H: 0, HR: 0, K: 0 };
      }
      map[name].AB += parseInt(r.AB, 10) || 0;
      map[name].H  += parseInt(r.H,  10) || 0;
      map[name].HR += parseInt(r.HR, 10) || 0;
      map[name].K  += parseInt(r.K,  10) || 0;
    });

    return Object.keys(map).map(function (name) {
      var p = map[name];
      return {
        Jugador: p.Jugador,
        AB: p.AB,
        H:  p.H,
        HR: p.HR,
        K:  p.K,
        AVG: p.AB > 0 ? p.H / p.AB : 0,
      };
    });
  }

  /** Re-render the view using the current filter. */
  function renderAll() {
    var allPlayers = aggregatePlayers(currentJuego);

    // Team stats always reflect ALL players (no min AB filter)
    renderTeamStats(allPlayers);

    // Player list: apply min AB filter only in all-games view
    var displayPlayers = (currentJuego === null && minAB > 0)
      ? allPlayers.filter(function (p) { return p.AB >= minAB; })
      : allPlayers;

    renderPlayers(displayPlayers, allPlayers.length);
    showState('data');
  }

  async function fetchAndRender() {
    showState('loading');
    try {
      const resp = await fetch(API_URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} — ${resp.statusText}`);
      }

      const json = await resp.json();

      if (!json || !Array.isArray(json.data)) {
        throw new Error('Formato de respuesta inesperado.');
      }

      allData = json.data;
      populateGameSelector();
      renderAll();
    } catch (err) {
      console.error('[AvgPage] Error:', err);
      errorMessage.textContent = `Error al cargar los datos: ${err.message}`;
      showState('error');
    }
  }

  function renderTeamStats(players) {
    const totAB = players.reduce((s, p) => s + (parseInt(p.AB, 10) || 0), 0);
    const totH  = players.reduce((s, p) => s + (parseInt(p.H,  10) || 0), 0);
    const totHR = players.reduce((s, p) => s + (parseInt(p.HR, 10) || 0), 0);
    const avg   = totAB > 0 ? totH / totAB : 0;

    const selectedOption = gameSelect.options[gameSelect.selectedIndex];
    teamGameLabel.textContent = selectedOption ? selectedOption.textContent : '';
    teamAvgValue.textContent  = fmtAvg(avg);
    teamAbValue.textContent   = totAB;
    teamHValue.textContent    = totH;
    teamHrValue.textContent   = totHR;
  }

  function renderPlayers(players, totalCount) {
    // Sort by AVG descending
    const sorted = players.slice().sort((a, b) => {
      const va = parseFloat(a.AVG) || 0;
      const vb = parseFloat(b.AVG) || 0;
      return vb - va;
    });

    playersCount.textContent = sorted.length;

    // Update hint: how many players were filtered out
    if (currentJuego === null && minAB > 0 && typeof totalCount === 'number') {
      const hidden = totalCount - sorted.length;
      minAbHint.textContent = hidden > 0
        ? `(${hidden} jugador${hidden !== 1 ? 'es' : ''} con menos de ${minAB} AB oculto${hidden !== 1 ? 's' : ''})`
        : '';
    } else {
      minAbHint.textContent = '';
    }

    const fragment = document.createDocumentFragment();
    sorted.forEach(function (p, idx) {
      const rank = idx + 1;
      const isTop = rank <= 3;
      const card = document.createElement('div');
      card.className = 'player-card';
      card.setAttribute('role', 'listitem');

      const ab  = parseInt(p.AB, 10) || 0;
      const h   = parseInt(p.H, 10)  || 0;
      const hr  = parseInt(p.HR, 10) || 0;
      const k   = parseInt(p.K, 10)  || 0;

      card.innerHTML =
        `<span class="player-rank${isTop ? ' player-rank--top' : ''}" aria-label="Posición ${rank}">${rank}</span>` +
        `<div class="player-info">` +
          `<div class="player-name">${esc(p.Jugador)}</div>` +
          `<div class="player-detail">${ab} AB · ${h} H · ${hr} HR · ${k} K</div>` +
        `</div>` +
        `<span class="avg-badge ${avgBadgeClass(p.AVG)}" aria-label="Promedio ${fmtAvg(p.AVG)}">${fmtAvg(p.AVG)}</span>`;

      fragment.appendChild(card);
    });

    playersList.innerHTML = '';
    playersList.appendChild(fragment);
  }

  /* ------------------------------------------------------------------ */
  /* Init: populate game selector dynamically from fetched data          */
  /* ------------------------------------------------------------------ */
  function populateGameSelector() {
    // Extract unique Juego values, sorted ascending
    const juegos = Array.from(
      new Set(
        allData
          .map(function (r) { return parseInt(r.Juego, 10); })
          .filter(function (n) { return !isNaN(n); })
      )
    ).sort(function (a, b) { return a - b; });

    // Clear existing options
    gameSelect.innerHTML = '';

    // "All games" option
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'Todos los juegos';
    gameSelect.appendChild(allOpt);

    // One option per unique Juego
    juegos.forEach(function (n) {
      const opt = document.createElement('option');
      opt.value = String(n);
      opt.textContent = 'Juego ' + n;
      gameSelect.appendChild(opt);
    });

    // Restore the current selection if it's still valid; otherwise reset to "all"
    const currentVal = currentJuego === null ? '' : String(currentJuego);
    if (Array.from(gameSelect.options).some(function (o) { return o.value === currentVal; })) {
      gameSelect.value = currentVal;
    } else {
      gameSelect.value = '';
      currentJuego = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Event listeners                                                      */
  /* ------------------------------------------------------------------ */
  gameSelect.addEventListener('change', function () {
    const val = gameSelect.value;
    currentJuego = val === '' ? null : parseInt(val, 10);
    // Show min AB filter only when viewing all games
    minAbBar.hidden = currentJuego !== null;
    if (allData.length > 0) {
      renderAll();
    }
  });

  minAbInput.addEventListener('change', function () {
    const val = parseInt(minAbInput.value, 10);
    minAB = isNaN(val) || val < 0 ? 0 : val;
    minAbInput.value = minAB;
    if (allData.length > 0) {
      renderAll();
    }
  });

  retryBtn.addEventListener('click', function () {
    fetchAndRender();
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                                 */
  /* ------------------------------------------------------------------ */
  footerYear.textContent = new Date().getFullYear();
  // Show min AB bar on initial load (all-games view is the default)
  minAbBar.hidden = false;
  fetchAndRender();

})();
