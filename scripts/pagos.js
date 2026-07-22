(function () {
  'use strict';

  var API_URL =
    'https://script.google.com/macros/s/AKfycby7mLKmo5tYeyah3g75xA9FS48FPDbq6SJMkFDPErFi9dgrNAvlOEeapwTQ2fZTlHZg/exec' +
    '?token=dads-12w1-dd3f-da1g&id=1r56WDn_pgZwoAHiiWmeaadUe1hepXC3Mo4t4PWwwfbQ&hoja=Dinero';

  var stateLoading = document.getElementById('pay-loading');
  var stateError = document.getElementById('pay-error');
  var errorMsg = document.getElementById('pay-error-msg');
  var retryBtn = document.getElementById('pay-retry-btn');
  var content = document.getElementById('pay-content');
  var thead = document.getElementById('pay-thead');
  var tbody = document.getElementById('pay-tbody');
  var footerYear = document.getElementById('pay-footer-year');

  function showState(name) {
    stateLoading.hidden = name !== 'loading';
    stateError.hidden = name !== 'error';
    content.hidden = name !== 'data';
  }

  function toNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return NaN;
    var cleaned = value.replace(/,/g, '').trim();
    if (cleaned === '') return NaN;
    return Number(cleaned);
  }

  function formatMoney(value) {
    var n = toNumber(value);
    if (isNaN(n)) return value === null || value === undefined ? '' : String(value);
    if (Math.floor(n) === n) return n.toLocaleString('es-MX');
    return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function extractColumns(rows) {
    var keySet = Object.create(null);
    rows.forEach(function (row) {
      Object.keys(row || {}).forEach(function (k) { keySet[k] = true; });
    });

    var keys = Object.keys(keySet);
    var nameKey = keys.find(function (k) { return k.toLowerCase() === 'nombre del jugador'; }) || keys[0] || 'Nombre del Jugador';

    var metricKeys = keys.filter(function (k) { return k !== nameKey; });
    var inscripcionKey = metricKeys.find(function (k) { return k.toLowerCase().indexOf('inscrip') !== -1; }) || null;

    var gameKeys = metricKeys.filter(function (k) { return /^juego\s+\d+/i.test(k); });
    gameKeys.sort(function (a, b) {
      var na = parseInt((a.match(/\d+/) || ['0'])[0], 10);
      var nb = parseInt((b.match(/\d+/) || ['0'])[0], 10);
      return na - nb;
    });

    var otherKeys = metricKeys.filter(function (k) {
      return k !== inscripcionKey && gameKeys.indexOf(k) === -1;
    });

    var ordered = [];
    if (inscripcionKey) ordered.push(inscripcionKey);
    return {
      nameKey: nameKey,
      valueKeys: ordered.concat(gameKeys, otherKeys)
    };
  }

  function isSummaryRow(name) {
    var n = (name || '').toString().trim().toLowerCase();
    return n === 'acumulado' || n === 'total' || n === 'restante';
  }

  function renderTable(rows) {
    var columns = extractColumns(rows);
    var nameKey = columns.nameKey;
    var valueKeys = columns.valueKeys;

    var headRow = document.createElement('tr');
    var thName = document.createElement('th');
    thName.textContent = 'Jugador';
    headRow.appendChild(thName);

    valueKeys.forEach(function (key) {
      var th = document.createElement('th');
      th.textContent = key;
      headRow.appendChild(th);
    });

    thead.innerHTML = '';
    thead.appendChild(headRow);

    var fragment = document.createDocumentFragment();
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      var rawName = row && row[nameKey] !== undefined ? row[nameKey] : '';
      if (isSummaryRow(rawName)) tr.classList.add('pay-row--summary');

      var tdName = document.createElement('td');
      tdName.textContent = rawName === null || rawName === undefined ? '' : String(rawName);
      tr.appendChild(tdName);

      valueKeys.forEach(function (key) {
        var td = document.createElement('td');
        td.textContent = formatMoney(row ? row[key] : '');
        tr.appendChild(td);
      });

      fragment.appendChild(tr);
    });

    tbody.innerHTML = '';
    tbody.appendChild(fragment);
  }

  async function fetchAndRender() {
    showState('loading');
    try {
      var resp = await fetch(API_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });

      if (!resp.ok) {
        throw new Error('HTTP ' + resp.status + ' — ' + resp.statusText);
      }

      var json = await resp.json();
      if (!json || !Array.isArray(json.data)) {
        throw new Error('Formato de respuesta inesperado.');
      }

      renderTable(json.data);
      showState('data');
    } catch (err) {
      console.error('[PagosPage] Error:', err);
      errorMsg.textContent = 'Error al cargar los datos de pagos: ' + err.message;
      showState('error');
    }
  }

  retryBtn.addEventListener('click', function () {
    fetchAndRender();
  });

  footerYear.textContent = new Date().getFullYear();
  fetchAndRender();
})();
