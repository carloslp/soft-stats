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
  var filterUnpaid = document.getElementById('pay-filter-unpaid');
  var copyBtn = document.getElementById('pay-copy-btn');
  var copyFeedback = document.getElementById('pay-copy-feedback');

  var allRows = [];
  var currentColumns = { nameKey: '', valueKeys: [] };

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

  function isUnpaid(row, valueKeys) {
    return valueKeys.some(function (key) {
      var n = toNumber(row ? row[key] : '');
      return !isNaN(n) && n === 0;
    });
  }

  function getUnpaidKeys(row, valueKeys) {
    return valueKeys.filter(function (key) {
      var n = toNumber(row ? row[key] : '');
      return !isNaN(n) && n === 0;
    });
  }

  function renderRows(rows) {
    var nameKey = currentColumns.nameKey;
    var valueKeys = currentColumns.valueKeys;
    var onlyUnpaid = filterUnpaid.checked;

    var fragment = document.createDocumentFragment();
    rows.forEach(function (row) {
      var rawName = row && row[nameKey] !== undefined ? row[nameKey] : '';
      if (isSummaryRow(rawName)) return;
      if (onlyUnpaid && !isUnpaid(row, valueKeys)) return;

      var tr = document.createElement('tr');
      var tdName = document.createElement('td');
      tdName.textContent = rawName === null || rawName === undefined ? '' : String(rawName);
      tr.appendChild(tdName);

      valueKeys.forEach(function (key) {
        var td = document.createElement('td');
        var val = row ? row[key] : '';
        var n = toNumber(val);
        td.textContent = formatMoney(val);
        if (!isNaN(n) && n === 0) td.classList.add('pay-cell--unpaid');
        tr.appendChild(td);
      });

      fragment.appendChild(tr);
    });

    tbody.innerHTML = '';
    tbody.appendChild(fragment);
  }

  function renderTable(rows) {
    currentColumns = extractColumns(rows);
    allRows = rows;

    var nameKey = currentColumns.nameKey;
    var valueKeys = currentColumns.valueKeys;

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

    renderRows(rows);
  }

  function buildWhatsAppText() {
    var nameKey = currentColumns.nameKey;
    var valueKeys = currentColumns.valueKeys;
    var lines = [];

    allRows.forEach(function (row) {
      var rawName = row && row[nameKey] !== undefined ? row[nameKey] : '';
      if (isSummaryRow(rawName)) return;
      if (!isUnpaid(row, valueKeys)) return;

      var unpaidKeys = getUnpaidKeys(row, valueKeys);
      var name = rawName === null || rawName === undefined ? '' : String(rawName);
      if (unpaidKeys.length > 0) {
        var desglose = unpaidKeys.map(function (k) { return k + ': $0'; }).join(', ');
        lines.push('*' + name + '*' + ' — ' + desglose);
      }
    });

    if (lines.length === 0) return 'No hay jugadores sin pagar.';
    return '*⚾ Jugadores sin pagar:*\n' + lines.join('\n');
  }

  filterUnpaid.addEventListener('change', function () {
    renderRows(allRows);
  });

  copyBtn.addEventListener('click', function () {
    var text = buildWhatsAppText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showCopyFeedback();
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  });

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
    showCopyFeedback();
  }

  function showCopyFeedback() {
    copyFeedback.hidden = false;
    setTimeout(function () { copyFeedback.hidden = true; }, 2000);
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
