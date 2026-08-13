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
  var currentColumns = { nameKey: '', deudaKey: '', concepts: [] };

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

  // Returns an array of concept objects: { label, cuotaKey, pagadoKey }
  // for keys that follow the "[prefix] - Cuota" / "[prefix] - Pagado" pattern.
  function extractColumns(rows) {
    var keySet = Object.create(null);
    rows.forEach(function (row) {
      Object.keys(row || {}).forEach(function (k) { keySet[k] = true; });
    });

    var keys = Object.keys(keySet);
    var nameKey = keys.find(function (k) { return k.toLowerCase() === 'nombre del jugador'; }) || keys[0] || 'Nombre del Jugador';
    var deudaKey = keys.find(function (k) { return k.toLowerCase() === 'deuda total'; }) || '';

    // Collect concept prefixes from keys ending in " - Cuota"
    var conceptMap = Object.create(null);
    keys.forEach(function (k) {
      var m = k.match(/^(.+)\s+-\s+Cuota$/);
      if (m) {
        var prefix = m[1];
        conceptMap[prefix] = { label: prefix, cuotaKey: k, pagadoKey: prefix + ' - Pagado' };
      }
    });

    // Sort concepts by their leading numeric prefix (e.g. "01", "02", ...)
    var concepts = Object.values(conceptMap);
    concepts.sort(function (a, b) {
      var na = parseInt((a.label.match(/^\d+/) || ['0'])[0], 10);
      var nb = parseInt((b.label.match(/^\d+/) || ['0'])[0], 10);
      return na - nb;
    });

    // Fallback: if no Cuota/Pagado pattern found, treat all non-name/non-deuda keys as legacy value keys
    if (concepts.length === 0) {
      var metricKeys = keys.filter(function (k) { return k !== nameKey && k !== deudaKey; });
      metricKeys.forEach(function (k) {
        concepts.push({ label: k, cuotaKey: k, pagadoKey: null });
      });
    }

    return { nameKey: nameKey, deudaKey: deudaKey, concepts: concepts };
  }

  function isSummaryRow(name) {
    var n = (name || '').toString().trim().toLowerCase();
    return n === 'acumulado' || n === 'total' || n === 'restante';
  }

  // A row has pending debt if any concept has pagado < cuota
  function isUnpaid(row, concepts) {
    return concepts.some(function (c) {
      if (!c.pagadoKey) {
        var n = toNumber(row ? row[c.cuotaKey] : '');
        return !isNaN(n) && n === 0;
      }
      var pagado = toNumber(row ? row[c.pagadoKey] : '');
      var cuota = toNumber(row ? row[c.cuotaKey] : '');
      return !isNaN(pagado) && !isNaN(cuota) && pagado < cuota;
    });
  }

  // Returns concepts where pagado < cuota
  function getUnpaidConcepts(row, concepts) {
    return concepts.filter(function (c) {
      if (!c.pagadoKey) {
        var n = toNumber(row ? row[c.cuotaKey] : '');
        return !isNaN(n) && n === 0;
      }
      var pagado = toNumber(row ? row[c.pagadoKey] : '');
      var cuota = toNumber(row ? row[c.cuotaKey] : '');
      return !isNaN(pagado) && !isNaN(cuota) && pagado < cuota;
    });
  }

  function renderRows(rows) {
    var nameKey = currentColumns.nameKey;
    var deudaKey = currentColumns.deudaKey;
    var concepts = currentColumns.concepts;
    var onlyUnpaid = filterUnpaid.checked;

    var fragment = document.createDocumentFragment();
    rows.forEach(function (row) {
      var rawName = row && row[nameKey] !== undefined ? row[nameKey] : '';
      if (isSummaryRow(rawName)) return;
      if (onlyUnpaid && !isUnpaid(row, concepts)) return;

      var tr = document.createElement('tr');
      var tdName = document.createElement('td');
      tdName.textContent = rawName === null || rawName === undefined ? '' : String(rawName);
      tr.appendChild(tdName);

      concepts.forEach(function (c) {
        var td = document.createElement('td');
        if (c.pagadoKey) {
          var pagado = row ? row[c.pagadoKey] : '';
          var cuota = row ? row[c.cuotaKey] : '';
          var pagadoN = toNumber(pagado);
          var cuotaN = toNumber(cuota);
          td.textContent = formatMoney(pagado) + ' / ' + formatMoney(cuota);
          if (!isNaN(pagadoN) && !isNaN(cuotaN) && pagadoN < cuotaN) {
            td.classList.add('pay-cell--unpaid');
          }
        } else {
          var val = row ? row[c.cuotaKey] : '';
          var n = toNumber(val);
          td.textContent = formatMoney(val);
          if (!isNaN(n) && n === 0) td.classList.add('pay-cell--unpaid');
        }
        tr.appendChild(td);
      });

      if (deudaKey) {
        var tdDeuda = document.createElement('td');
        var deudaVal = row ? row[deudaKey] : '';
        var deudaN = toNumber(deudaVal);
        tdDeuda.textContent = formatMoney(deudaVal);
        if (!isNaN(deudaN) && deudaN > 0) tdDeuda.classList.add('pay-cell--unpaid');
        tr.appendChild(tdDeuda);
      }

      fragment.appendChild(tr);
    });

    tbody.innerHTML = '';
    tbody.appendChild(fragment);
  }

  function renderTable(rows) {
    currentColumns = extractColumns(rows);
    allRows = rows;

    var nameKey = currentColumns.nameKey;
    var deudaKey = currentColumns.deudaKey;
    var concepts = currentColumns.concepts;

    var headRow = document.createElement('tr');
    var thName = document.createElement('th');
    thName.textContent = 'Jugador';
    headRow.appendChild(thName);

    concepts.forEach(function (c) {
      var th = document.createElement('th');
      th.textContent = c.pagadoKey ? c.label + ' (Pagado / Cuota)' : c.label;
      headRow.appendChild(th);
    });

    if (deudaKey) {
      var thDeuda = document.createElement('th');
      thDeuda.textContent = deudaKey;
      headRow.appendChild(thDeuda);
    }

    thead.innerHTML = '';
    thead.appendChild(headRow);

    renderRows(rows);
  }

  function buildWhatsAppText() {
    var nameKey = currentColumns.nameKey;
    var deudaKey = currentColumns.deudaKey;
    var concepts = currentColumns.concepts;
    var lines = [];

    allRows.forEach(function (row) {
      var rawName = row && row[nameKey] !== undefined ? row[nameKey] : '';
      if (isSummaryRow(rawName)) return;
      if (!isUnpaid(row, concepts)) return;

      var unpaidConcepts = getUnpaidConcepts(row, concepts);
      var name = rawName === null || rawName === undefined ? '' : String(rawName);
      if (unpaidConcepts.length > 0) {
        var desglose = unpaidConcepts.map(function (c) {
          if (c.pagadoKey) {
            var pagado = toNumber(row ? row[c.pagadoKey] : '');
            var cuota = toNumber(row ? row[c.cuotaKey] : '');
            var restante = !isNaN(cuota) && !isNaN(pagado) ? cuota - pagado : '';
            return c.label + ': $' + formatMoney(restante);
          }
          return c.label + ': $0';
        }).join(', ');

        var deudaStr = '';
        if (deudaKey && row[deudaKey] !== undefined) {
          deudaStr = ' | Deuda Total: $' + formatMoney(row[deudaKey]);
        }
        lines.push('*' + name + '*' + ' — ' + desglose + deudaStr);
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
