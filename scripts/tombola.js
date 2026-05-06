(function () {
  'use strict';

  const API_URL =
    'https://script.google.com/macros/s/AKfycby7mLKmo5tYeyah3g75xA9FS48FPDbq6SJMkFDPErFi9dgrNAvlOEeapwTQ2fZTlHZg/exec' +
    '?token=dads-12w1-dd3f-da1g&id=1r56WDn_pgZwoAHiiWmeaadUe1hepXC3Mo4t4PWwwfbQ&hoja=Data';

  const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'RF', 'CF', 'LF', 'BD', 'DH'];

  const loadingState = document.getElementById('tb-loading');
  const errorState = document.getElementById('tb-error');
  const content = document.getElementById('tb-content');
  const errorMsg = document.getElementById('tb-error-msg');
  const retryBtn = document.getElementById('tb-retry-btn');
  const drawBtn = document.getElementById('tb-draw-btn');
  const playersList = document.getElementById('tb-players-list');
  const positionsList = document.getElementById('tb-positions-list');
  const battingOrder = document.getElementById('tb-batting-order');
  const selectAllBtn = document.getElementById('tb-select-all-btn');
  const clearAllBtn = document.getElementById('tb-clear-all-btn');
  const attendanceCount = document.getElementById('tb-attendance-count');
  const footerYear = document.getElementById('tb-footer-year');

  let statsByPlayer = [];

  function showState(name) {
    loadingState.hidden = name !== 'loading';
    errorState.hidden = name !== 'error';
    content.hidden = name !== 'content';
  }

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildPlayerStats(rows) {
    const map = Object.create(null);

    rows.forEach(function (row) {
      const name = String(row.Jugador || '').trim();
      if (!name) return;

      if (!map[name]) {
        map[name] = { Jugador: name, AB: 0, H: 0, HR: 0, K: 0, AVG: 0 };
      }

      map[name].AB += parseInt(row.AB, 10) || 0;
      map[name].H += parseInt(row.H, 10) || 0;
      map[name].HR += parseInt(row.HR, 10) || 0;
      map[name].K += parseInt(row.K, 10) || 0;
    });

    return Object.keys(map).map(function (name) {
      const p = map[name];
      p.AVG = p.AB > 0 ? p.H / p.AB : 0;
      return p;
    }).sort(function (a, b) {
      return a.Jugador.localeCompare(b.Jugador, 'es', { sensitivity: 'base' });
    });
  }

  function renderPlayers() {
    playersList.innerHTML = '';

    statsByPlayer.forEach(function (p) {
      const id = 'tb-player-' + p.Jugador.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const item = document.createElement('label');
      item.className = 'tb-player-item';
      item.setAttribute('for', id);
      item.innerHTML = '<input type="checkbox" id="' + id + '" data-player="' + esc(p.Jugador) + '" checked />' +
        '<span>' + esc(p.Jugador) + '</span>';
      playersList.appendChild(item);
    });

    updateAttendanceCount();
  }

  function selectedPlayers() {
    const checkboxes = playersList.querySelectorAll('input[type="checkbox"]');
    const selected = [];

    checkboxes.forEach(function (cb) {
      if (cb.checked) {
        const name = cb.dataset.player || '';
        const found = statsByPlayer.find(function (p) { return p.Jugador === name; });
        if (found) selected.push(found);
      }
    });

    return selected;
  }

  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  function renderAssignments(list) {
    positionsList.innerHTML = '';
    const shuffled = shuffle(list).slice(0, POSITIONS.length);

    POSITIONS.forEach(function (pos, idx) {
      const li = document.createElement('li');
      const player = shuffled[idx];
      li.textContent = pos + ': ' + (player ? player.Jugador : '—');
      positionsList.appendChild(li);
    });
  }

  function renderBattingOrder(list) {
    battingOrder.innerHTML = '';

    if (list.length === 0) {
      battingOrder.innerHTML = '<li class="tb-empty">No hay asistentes seleccionados.</li>';
      return;
    }

    const sorted = list.slice().sort(function (a, b) {
      if (b.AVG !== a.AVG) return b.AVG - a.AVG;
      if (b.H !== a.H) return b.H - a.H;
      if (b.HR !== a.HR) return b.HR - a.HR;
      if (a.K !== b.K) return a.K - b.K;
      return a.Jugador.localeCompare(b.Jugador, 'es', { sensitivity: 'base' });
    });

    sorted.forEach(function (p) {
      const li = document.createElement('li');
      li.textContent = p.Jugador + ' — AVG ' + (p.AVG >= 1 ? '1.000' : p.AVG.toFixed(3).replace(/^0/, '')) +
        ' · H ' + p.H + ' · HR ' + p.HR + ' · K ' + p.K;
      battingOrder.appendChild(li);
    });
  }

  function updateAttendanceCount() {
    const count = selectedPlayers().length;
    attendanceCount.textContent = count + ' asistente' + (count === 1 ? '' : 's');
  }

  function runDraw() {
    const selected = selectedPlayers();
    updateAttendanceCount();
    renderAssignments(selected);
    renderBattingOrder(selected);
  }

  async function fetchRoster() {
    showState('loading');
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) throw new Error('HTTP ' + response.status + ' — ' + response.statusText);

      const json = await response.json();
      if (!json || !Array.isArray(json.data)) throw new Error('Formato de respuesta inesperado.');

      statsByPlayer = buildPlayerStats(json.data);
      renderPlayers();
      runDraw();
      showState('content');
    } catch (err) {
      errorMsg.textContent = 'Error al cargar la lista del equipo: ' + err.message;
      showState('error');
    }
  }

  selectAllBtn.addEventListener('click', function () {
    playersList.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = true; });
    runDraw();
  });

  clearAllBtn.addEventListener('click', function () {
    playersList.querySelectorAll('input[type="checkbox"]').forEach(function (cb) { cb.checked = false; });
    runDraw();
  });

  playersList.addEventListener('change', function (e) {
    if (e.target && e.target.matches('input[type="checkbox"]')) {
      runDraw();
    }
  });

  drawBtn.addEventListener('click', runDraw);
  retryBtn.addEventListener('click', fetchRoster);

  footerYear.textContent = new Date().getFullYear();
  fetchRoster();
})();
