/**
 * app.js — Soft Stats main application logic
 *
 * Fetches player statistics from the configured API endpoint and renders
 * them in a sortable, filterable table with summary cards.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Config                                                               */
  /* ------------------------------------------------------------------ */
  const API_URL = 'https://script.google.com/macros/s/AKfycby7mLKmo5tYeyah3g75xA9FS48FPDbq6SJMkFDPErFi9dgrNAvlOEeapwTQ2fZTlHZg/exec?token=dads-12w1-dd3f-da1g&id=1r56WDn_pgZwoAHiiWmeaadUe1hepXC3Mo4t4PWwwfbQ&hoja=Group';

  const CUADRO_URL = 'https://script.google.com/macros/s/AKfycby7mLKmo5tYeyah3g75xA9FS48FPDbq6SJMkFDPErFi9dgrNAvlOEeapwTQ2fZTlHZg/exec?token=dads-12w1-dd3f-da1g&id=1r56WDn_pgZwoAHiiWmeaadUe1hepXC3Mo4t4PWwwfbQ&hoja=Cuadro';
  const ORDEN_URL  = 'https://script.google.com/macros/s/AKfycby7mLKmo5tYeyah3g75xA9FS48FPDbq6SJMkFDPErFi9dgrNAvlOEeapwTQ2fZTlHZg/exec?token=dads-12w1-dd3f-da1g&id=1r56WDn_pgZwoAHiiWmeaadUe1hepXC3Mo4t4PWwwfbQ&hoja=Orden';

  /* ------------------------------------------------------------------ */
  /* State                                                                */
  /* ------------------------------------------------------------------ */
  let allPlayers  = [];   // raw data from API
  let sortCol     = 'AVG';
  let sortDir     = 'desc'; // 'asc' | 'desc'
  let searchTerm  = '';
  let minAvg      = 0;
  let minHr       = 0;

  /* ------------------------------------------------------------------ */
  /* DOM references                                                       */
  /* ------------------------------------------------------------------ */
  const stateLoading  = document.getElementById('state-loading');
  const stateError    = document.getElementById('state-error');
  const stateEmpty    = document.getElementById('state-empty');
  const tableWrapper  = document.getElementById('table-wrapper');
  const tableBody     = document.getElementById('table-body');
  const tableFoot     = document.getElementById('table-foot');
  const tableMeta     = document.getElementById('table-meta');
  const errorMessage  = document.getElementById('error-message');
  const retryBtn      = document.getElementById('retry-btn');
  const searchInput   = document.getElementById('search-input');
  const minAvgSelect  = document.getElementById('min-avg');
  const minHrSelect   = document.getElementById('min-hr');
  const resetBtn      = document.getElementById('reset-filters');
  const footerYear    = document.getElementById('footer-year');

  const statPlayers   = document.getElementById('stat-players');
  const statAvg       = document.getElementById('stat-avg');
  const statHits      = document.getElementById('stat-hits');
  const statHr        = document.getElementById('stat-hr');
  const statK         = document.getElementById('stat-k');

  /* Lineup card DOM references */
  const lineupLoading  = document.getElementById('lineup-loading');
  const lineupError    = document.getElementById('lineup-error');
  const lineupErrorMsg = document.getElementById('lineup-error-msg');
  const lineupCard     = document.getElementById('lineup-card');
  const lineupRetryBtn = document.getElementById('lineup-retry-btn');
  const battingList    = document.getElementById('batting-order-list');
  const benchGrid      = document.getElementById('bench-grid');

  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */

  /** Format a batting average as a 3-decimal string e.g. ".333" */
  function fmtAvg(val) {
    if (val === null || val === undefined || val === '') return '.000';
    const n = parseFloat(val);
    if (isNaN(n)) return '.000';
    if (n >= 1) return '1.000';
    return n.toFixed(3).replace(/^0/, '');   // ".333"
  }

  /** Return CSS class based on AVG value */
  function avgClass(val) {
    const n = parseFloat(val);
    if (isNaN(n) || n === 0) return 'avg--zero';
    if (n >= 0.500)          return 'avg--high';
    if (n >= 0.250)          return 'avg--mid';
    return 'avg--low';
  }

  /** Show one state panel, hide the others */
  function showState(name) {
    stateLoading.hidden = name !== 'loading';
    stateError.hidden   = name !== 'error';
    stateEmpty.hidden   = name !== 'empty';
    tableWrapper.hidden = name !== 'table';
  }

  /* ------------------------------------------------------------------ */
  /* Lineup card: data fetching & rendering                              */
  /* ------------------------------------------------------------------ */

  function showLineupState(name) {
    lineupLoading.hidden = name !== 'loading';
    lineupError.hidden   = name !== 'error';
    lineupCard.hidden    = name !== 'card';
  }

  async function fetchLineup() {
    showLineupState('loading');
    try {
      const [cuadroResult, ordenResult] = await Promise.allSettled([
        fetch(CUADRO_URL, { method: 'GET', headers: { 'Accept': 'application/json' } }),
        fetch(ORDEN_URL,  { method: 'GET', headers: { 'Accept': 'application/json' } })
      ]);

      const fetchErrors = [];
      if (cuadroResult.status === 'rejected') fetchErrors.push(`Cuadro: ${cuadroResult.reason.message}`);
      if (ordenResult.status === 'rejected')  fetchErrors.push(`Orden: ${ordenResult.reason.message}`);
      if (fetchErrors.length > 0) throw new Error(fetchErrors.join('; '));

      const cuadroRes = cuadroResult.value;
      const ordenRes  = ordenResult.value;

      if (!cuadroRes.ok) throw new Error(`Cuadro HTTP ${cuadroRes.status} — ${cuadroRes.statusText}`);
      if (!ordenRes.ok)  throw new Error(`Orden HTTP ${ordenRes.status} — ${ordenRes.statusText}`);

      const cuadroJson = await cuadroRes.json();
      const ordenJson  = await ordenRes.json();

      if (!Array.isArray(cuadroJson.data)) throw new Error('Formato de cuadro inesperado.');
      if (!Array.isArray(ordenJson.data))  throw new Error('Formato de orden inesperado.');

      renderLineup(cuadroJson.data, ordenJson.data);
    } catch (err) {
      console.error('[SoftStats] Error al obtener cuadro:', err);
      lineupErrorMsg.textContent = `Error al cargar el cuadro: ${err.message}`;
      showLineupState('error');
    }
  }

  function renderLineup(cuadro, orden) {
    // Build position → player map from cuadro; collect bench entries separately
    const posMap = {};
    const bench  = [];

    cuadro.forEach(function (entry) {
      const pos = String(entry.Posiciones || '').trim().toUpperCase();
      if (pos === 'BANCA') {
        bench.push(String(entry.Jugador || '').trim());
      } else if (pos) {
        posMap[pos] = String(entry.Jugador || '').trim();
      }
    });

    // Fill field position name boxes
    ['CF', 'LF', 'RF', 'SS', '2B', '3B', 'P', '1B', 'C', 'BC', 'DH'].forEach(function (pos) {
      const el = document.getElementById('fname-' + pos);
      if (!el) return;
      const name = posMap[pos] || '';
      el.textContent = name;
      el.title = name;
    });

    // Batting order list
    battingList.innerHTML = '';
    orden.forEach(function (entry) {
      const li = document.createElement('li');
      li.className = 'batting-order__item';
      const nameEl = document.createElement('span');
      nameEl.className = 'batting-order__name';
      const name = String(entry.Jugador || '').trim();
      nameEl.textContent = name;
      nameEl.title = name;
      li.appendChild(nameEl);
      battingList.appendChild(li);
    });

    // Bench slots
    benchGrid.innerHTML = '';
    bench.forEach(function (name) {
      const slot = document.createElement('div');
      slot.className = 'bench__slot';
      slot.textContent = name;
      slot.title = name;
      benchGrid.appendChild(slot);
    });

    showLineupState('card');
  }

  /* ------------------------------------------------------------------ */
  /* Data fetching                                                        */
  /* ------------------------------------------------------------------ */
  async function fetchStats() {
    showState('loading');
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} — ${response.statusText}`);
      }

      const json = await response.json();

      if (!json || !Array.isArray(json.data)) {
        throw new Error('Formato de respuesta inesperado.');
      }

      allPlayers = json.data;
      render();
    } catch (err) {
      console.error('[SoftStats] Error al obtener datos:', err);
      errorMessage.textContent = `Error al cargar los datos: ${err.message}`;
      showState('error');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Filtering & sorting                                                  */
  /* ------------------------------------------------------------------ */
  function getFilteredSorted() {
    let list = allPlayers.slice();

    // text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p => p.Nombre && p.Nombre.toLowerCase().includes(term));
    }

    // min AVG
    if (minAvg > 0) {
      list = list.filter(p => parseFloat(p.AVG) >= minAvg);
    }

    // min HR
    if (minHr > 0) {
      list = list.filter(p => parseInt(p.HR, 10) >= minHr);
    }

    // sort
    list.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'string' || typeof vb === 'string') {
        va = (va ?? '').toString().toLowerCase(); vb = (vb ?? '').toString().toLowerCase();
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ?  1 : -1;
        return 0;
      }
      va = parseFloat(va); vb = parseFloat(vb);
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    return list;
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                            */
  /* ------------------------------------------------------------------ */
  function render() {
    const players = getFilteredSorted();

    if (players.length === 0) {
      updateSummaryCards([]);
      showState('empty');
      return;
    }

    renderTable(players);
    updateSummaryCards(players);
    showState('table');
  }

  function renderTable(players) {
    // body rows
    const fragment = document.createDocumentFragment();
    players.forEach((p) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td--name">${escapeHtml(p.Nombre)}</td>
        <td class="td--num">${p.AB ?? '—'}</td>
        <td class="td--num">${p.H ?? '—'}</td>
        <td class="td--num">${p.HR ?? '—'}</td>
        <td class="td--num">${p.K ?? '—'}</td>
        <td class="td--num td--avg ${avgClass(p.AVG)}">${fmtAvg(p.AVG)}</td>
      `;
      fragment.appendChild(tr);
    });
    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);

    // totals / averages footer row
    const totAB = players.reduce((s, p) => s + (parseInt(p.AB, 10) || 0), 0);
    const totH  = players.reduce((s, p) => s + (parseInt(p.H,  10) || 0), 0);
    const totHR = players.reduce((s, p) => s + (parseInt(p.HR, 10) || 0), 0);
    const totK  = players.reduce((s, p) => s + (parseInt(p.K,  10) || 0), 0);
    const teamAvg = totAB > 0 ? totH / totAB : 0;

    tableFoot.innerHTML = `
      <tr>
        <td>Totales / Promedio</td>
        <td class="td--num">${totAB}</td>
        <td class="td--num">${totH}</td>
        <td class="td--num">${totHR}</td>
        <td class="td--num">${totK}</td>
        <td class="td--num td--avg ${avgClass(teamAvg)}">${fmtAvg(teamAvg)}</td>
      </tr>
    `;

    tableMeta.textContent = `Mostrando ${players.length} de ${allPlayers.length} jugadores`;

    // update sort aria attributes
    document.querySelectorAll('.th-sortable').forEach(th => {
      const col = th.dataset.col;
      if (col === sortCol) {
        th.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending' : 'descending');
      } else {
        th.setAttribute('aria-sort', 'none');
      }
    });
  }

  function updateSummaryCards(players) {
    const count = players.length;
    const totAB = players.reduce((s, p) => s + (parseInt(p.AB, 10) || 0), 0);
    const totH  = players.reduce((s, p) => s + (parseInt(p.H,  10) || 0), 0);
    const totHR = players.reduce((s, p) => s + (parseInt(p.HR, 10) || 0), 0);
    const totK  = players.reduce((s, p) => s + (parseInt(p.K,  10) || 0), 0);
    const avg   = totAB > 0 ? totH / totAB : 0;

    statPlayers.textContent = count || '—';
    statAvg.textContent     = count ? fmtAvg(avg)  : '—';
    statHits.textContent    = count ? totH           : '—';
    statHr.textContent      = count ? totHR          : '—';
    statK.textContent       = count ? totK           : '—';
  }

  /* ------------------------------------------------------------------ */
  /* XSS safety                                                           */
  /* ------------------------------------------------------------------ */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------------ */
  /* Event listeners                                                      */
  /* ------------------------------------------------------------------ */

  // Sort on column header click or Enter/Space keyboard
  document.querySelectorAll('.th-sortable').forEach(th => {
    th.addEventListener('click', () => handleSort(th));
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSort(th);
      }
    });
  });

  function handleSort(th) {
    const col = th.dataset.col;
    if (sortCol === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortCol = col;
      sortDir = th.dataset.type === 'string' ? 'asc' : 'desc';
    }
    render();
  }

  // Live search
  searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value.trim();
    render();
  });

  // AVG filter
  minAvgSelect.addEventListener('change', () => {
    minAvg = parseFloat(minAvgSelect.value) || 0;
    render();
  });

  // HR filter
  minHrSelect.addEventListener('change', () => {
    minHr = parseInt(minHrSelect.value, 10) || 0;
    render();
  });

  // Reset filters
  resetBtn.addEventListener('click', () => {
    searchInput.value     = '';
    minAvgSelect.value    = '0';
    minHrSelect.value     = '0';
    searchTerm = '';
    minAvg = 0;
    minHr  = 0;
    render();
  });

  // Retry on error
  retryBtn.addEventListener('click', fetchStats);

  // Lineup retry
  lineupRetryBtn.addEventListener('click', fetchLineup);

  /* ------------------------------------------------------------------ */
  /* Init                                                                 */
  /* ------------------------------------------------------------------ */
  footerYear.textContent = new Date().getFullYear();
  fetchLineup();
  fetchStats();

})();
