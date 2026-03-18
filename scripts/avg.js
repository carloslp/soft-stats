/**
 * avg.js — Promedios de Bateo page logic
 *
 * Fetches player batting averages for a selected game (or all games combined)
 * and renders a mobile-friendly, Instagram-shareable ranked list.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Game configuration                                                   */
  /* Update the sheet names below to match your Google Sheets tab names. */
  /* ------------------------------------------------------------------ */
  const BASE_URL =
    'https://script.google.com/macros/s/AKfycby7mLKmo5tYeyah3g75xA9FS48FPDbq6SJMkFDPErFi9dgrNAvlOEeapwTQ2fZTlHZg/exec' +
    '?token=dads-12w1-dd3f-da1g&id=1r56WDn_pgZwoAHiiWmeaadUe1hepXC3Mo4t4PWwwfbQ&hoja=';

  const GAMES = [
    { label: 'Todos los juegos', sheet: 'Group' },
    { label: 'Juego 1',          sheet: 'Juego1' },
    { label: 'Juego 2',          sheet: 'Juego2' },
    { label: 'Juego 3',          sheet: 'Juego3' },
    { label: 'Juego 4',          sheet: 'Juego4' },
    { label: 'Juego 5',          sheet: 'Juego5' },
    { label: 'Juego 6',          sheet: 'Juego6' },
  ];

  /* ------------------------------------------------------------------ */
  /* DOM references                                                       */
  /* ------------------------------------------------------------------ */
  const gameSelect       = document.getElementById('game-select');
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
  let currentSheet = GAMES[0].sheet;

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
  async function fetchAndRender(sheet) {
    showState('loading');
    try {
      const resp = await fetch(BASE_URL + encodeURIComponent(sheet), {
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

      const players = json.data;
      renderTeamStats(players);
      renderPlayers(players);
      showState('data');
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

    const selectedGame = GAMES.find(g => g.sheet === currentSheet);
    teamGameLabel.textContent = selectedGame ? selectedGame.label : '';
    teamAvgValue.textContent  = fmtAvg(avg);
    teamAbValue.textContent   = totAB;
    teamHValue.textContent    = totH;
    teamHrValue.textContent   = totHR;
  }

  function renderPlayers(players) {
    // Sort by AVG descending
    const sorted = players.slice().sort((a, b) => {
      const va = parseFloat(a.AVG) || 0;
      const vb = parseFloat(b.AVG) || 0;
      return vb - va;
    });

    playersCount.textContent = sorted.length;

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
          `<div class="player-name">${esc(p.Nombre)}</div>` +
          `<div class="player-detail">${ab} AB · ${h} H · ${hr} HR · ${k} K</div>` +
        `</div>` +
        `<span class="avg-badge ${avgBadgeClass(p.AVG)}" aria-label="Promedio ${fmtAvg(p.AVG)}">${fmtAvg(p.AVG)}</span>`;

      fragment.appendChild(card);
    });

    playersList.innerHTML = '';
    playersList.appendChild(fragment);
  }

  /* ------------------------------------------------------------------ */
  /* Init: populate game selector                                         */
  /* ------------------------------------------------------------------ */
  GAMES.forEach(function (game) {
    const opt = document.createElement('option');
    opt.value       = game.sheet;
    opt.textContent = game.label;
    gameSelect.appendChild(opt);
  });

  /* ------------------------------------------------------------------ */
  /* Event listeners                                                      */
  /* ------------------------------------------------------------------ */
  gameSelect.addEventListener('change', function () {
    currentSheet = gameSelect.value;
    fetchAndRender(currentSheet);
  });

  retryBtn.addEventListener('click', function () {
    fetchAndRender(currentSheet);
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                                 */
  /* ------------------------------------------------------------------ */
  footerYear.textContent = new Date().getFullYear();
  fetchAndRender(currentSheet);

})();
