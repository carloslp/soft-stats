/**
 * scatter.js — Gráfico de Dispersión: Contacto vs Poder
 *
 * Fetches all per-game batting data from hoja=Data, aggregates per player,
 * then renders an interactive Chart.js scatter plot:
 *   X-axis: AVG  (Hits / At-Bats  — measures contact)
 *   Y-axis: HR   (total Home Runs — measures power)
 *
 * Four quadrants are drawn using the team-median of each axis:
 *   Top-right:    ⭐ Superestrellas (high contact + high power)
 *   Bottom-right: 🎯 Bateadores de Contacto (high contact, low power)
 *   Top-left:     💪 Bateadores de Poder  (low contact, high power)
 *   Bottom-left:  📊 Promedio            (below median in both)
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* API — same endpoint as avg.js (hoja=Data returns per-game rows)    */
  /* ------------------------------------------------------------------ */
  const API_URL =
    'https://script.google.com/macros/s/AKfycby7mLKmo5tYeyah3g75xA9FS48FPDbq6SJMkFDPErFi9dgrNAvlOEeapwTQ2fZTlHZg/exec' +
    '?token=dads-12w1-dd3f-da1g&id=1r56WDn_pgZwoAHiiWmeaadUe1hepXC3Mo4t4PWwwfbQ&hoja=Data';

  /* Minimum At-Bats a player must have to appear in the chart           */
  const MIN_AB = 3;

  /* ------------------------------------------------------------------ */
  /* DOM references                                                       */
  /* ------------------------------------------------------------------ */
  const gameSelect    = document.getElementById('sc-game-select');
  const stateLoading  = document.getElementById('sc-loading');
  const stateError    = document.getElementById('sc-error');
  const errorMsg      = document.getElementById('sc-error-msg');
  const retryBtn      = document.getElementById('sc-retry-btn');
  const chartSection  = document.getElementById('sc-chart-section');
  const scatterCanvas = document.getElementById('scatter-canvas');
  const infoBar       = document.getElementById('sc-info');
  const footerYear    = document.getElementById('sc-footer-year');

  /* ------------------------------------------------------------------ */
  /* State                                                                */
  /* ------------------------------------------------------------------ */
  let allData      = [];   // raw per-game rows from the API
  let currentJuego = null; // null = all games
  let chartInstance = null;

  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */

  function showState(name) {
    stateLoading.hidden  = name !== 'loading';
    stateError.hidden    = name !== 'error';
    chartSection.hidden  = name !== 'data';
  }

  /** Compute the median of a numeric array. Returns 0 for empty arrays. */
  function median(arr) {
    if (!arr.length) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
  }

  /** XSS-safe string escape */
  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------------ */
  /* Data aggregation                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Aggregate raw rows by player.
   * Optionally filter by game number.
   * Returns only players with AB >= MIN_AB.
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
      map[name].AB += parseInt(r.AB,  10) || 0;
      map[name].H  += parseInt(r.H,   10) || 0;
      map[name].HR += parseInt(r.HR,  10) || 0;
      map[name].K  += parseInt(r.K,   10) || 0;
    });

    return Object.keys(map)
      .map(function (name) {
        var p = map[name];
        var avg = p.AB > 0 ? p.H / p.AB : 0;
        return { Jugador: p.Jugador, AB: p.AB, H: p.H, HR: p.HR, K: p.K, AVG: avg };
      })
      .filter(function (p) { return p.AB >= MIN_AB; });
  }

  /* ------------------------------------------------------------------ */
  /* Chart rendering                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Assign a quadrant color based on player position relative to medians.
   */
  function quadrantColor(avgVal, hrVal, medAvg, medHr) {
    const highContact = avgVal >= medAvg;
    const highPower   = hrVal  >= medHr;

    if (highContact && highPower)  return { bg: 'rgba(249,198,69,.85)',  border: '#c9920a' }; // gold  — Superestrellas
    if (highContact && !highPower) return { bg: 'rgba(34,197,94,.80)',   border: '#15803d' }; // green — Contacto
    if (!highContact && highPower) return { bg: 'rgba(204,52,51,.80)',   border: '#7f1d1d' }; // red   — Poder
    return                                { bg: 'rgba(122,132,160,.70)', border: '#3a4260' }; // gray  — Promedio
  }

  function renderChart(players) {
    const avgValues = players.map(function (p) { return p.AVG; });
    const hrValues  = players.map(function (p) { return p.HR;  });

    const medAvg = median(avgValues);
    const medHr  = median(hrValues);

    // Build per-player datasets so each point can have its own color
    const points = players.map(function (p) {
      var col = quadrantColor(p.AVG, p.HR, medAvg, medHr);
      return {
        x: p.AVG,
        y: p.HR,
        label: p.Jugador,
        ab: p.AB,
        h: p.H,
        k: p.K,
        backgroundColor: col.bg,
        borderColor: col.border
      };
    });

    // Chart.js wants individual datasets OR a single dataset with per-point styling.
    // We use a single dataset with pointBackgroundColor / pointBorderColor arrays.
    const data = {
      datasets: [{
        label: 'Jugadores',
        data: points.map(function (pt) { return { x: pt.x, y: pt.y }; }),
        pointBackgroundColor: points.map(function (pt) { return pt.backgroundColor; }),
        pointBorderColor:     points.map(function (pt) { return pt.borderColor;     }),
        pointRadius:          9,
        pointHoverRadius:     12,
        pointBorderWidth:     2,
      }]
    };

    // X-axis padding
    const xPad = 0.05;
    const xMin = Math.max(0, Math.min(...avgValues) - xPad);
    const xMax = Math.min(1, Math.max(...avgValues) + xPad);

    // Y-axis padding
    const yPad = 0.5;
    const yMin = Math.max(0, Math.min(...hrValues) - yPad);
    const yMax = Math.max(...hrValues) + yPad;

    /* Destroy previous instance if it exists */
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    chartInstance = new Chart(scatterCanvas, {
      type: 'scatter',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: window.innerWidth < 560 ? 1 : 1.6,
        animation: { duration: 400 },
        layout: { padding: { top: 10, right: 16, bottom: 10, left: 8 } },

        scales: {
          x: {
            type: 'linear',
            min: xMin,
            max: xMax,
            title: {
              display: true,
              text: 'AVG (Contacto)',
              color: '#3a4260',
              font: { family: 'Inter', size: 13, weight: '600' }
            },
            ticks: {
              color: '#7a84a0',
              font: { family: 'Inter', size: 11 },
              callback: function (val) {
                if (val >= 1) return '1.000';
                return val.toFixed(3).replace(/^0/, '');
              }
            },
            grid: { color: 'rgba(0,0,0,.06)' }
          },
          y: {
            type: 'linear',
            min: yMin,
            max: yMax,
            title: {
              display: true,
              text: 'HR (Poder)',
              color: '#3a4260',
              font: { family: 'Inter', size: 13, weight: '600' }
            },
            ticks: {
              color: '#7a84a0',
              font: { family: 'Inter', size: 11 },
              stepSize: 1
            },
            grid: { color: 'rgba(0,0,0,.06)' }
          }
        },

        plugins: {
          legend: { display: false },

          tooltip: {
            backgroundColor: 'rgba(0,48,135,.93)',
            titleColor: '#ACC9E7',
            bodyColor: '#ffffff',
            padding: 12,
            cornerRadius: 8,
            titleFont: { family: 'Inter', size: 13, weight: '700' },
            bodyFont:  { family: 'Inter', size: 12 },
            callbacks: {
              title: function (items) {
                var idx = items[0].dataIndex;
                return esc(points[idx].label);
              },
              label: function (item) {
                var idx = item.dataIndex;
                var pt  = points[idx];
                var avgStr = pt.x >= 1
                  ? '1.000'
                  : pt.x.toFixed(3).replace(/^0/, '');
                return [
                  'AVG: ' + avgStr,
                  'HR:  ' + pt.y,
                  'AB:  ' + pt.ab,
                  'H:   ' + pt.h,
                  'K:   ' + pt.k
                ];
              }
            }
          },

          /* Quadrant line plugin — drawn as annotations via afterDraw */
          quadrantLines: {
            medAvg: medAvg,
            medHr:  medHr
          }
        }
      },

      plugins: [{
        id: 'quadrantLines',
        afterDraw: function (chart) {
          var ctx  = chart.ctx;
          var xScale = chart.scales.x;
          var yScale = chart.scales.y;
          var opts   = chart.options.plugins.quadrantLines;

          var medAvgPx = xScale.getPixelForValue(opts.medAvg);
          var medHrPx  = yScale.getPixelForValue(opts.medHr);

          var left   = xScale.left;
          var right  = xScale.right;
          var top    = yScale.top;
          var bottom = yScale.bottom;

          ctx.save();
          ctx.setLineDash([6, 4]);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(0,48,135,.25)';

          /* Vertical median line */
          ctx.beginPath();
          ctx.moveTo(medAvgPx, top);
          ctx.lineTo(medAvgPx, bottom);
          ctx.stroke();

          /* Horizontal median line */
          ctx.beginPath();
          ctx.moveTo(left, medHrPx);
          ctx.lineTo(right, medHrPx);
          ctx.stroke();

          ctx.restore();

          /* Quadrant labels */
          ctx.save();
          ctx.font = '600 11px Inter, system-ui, sans-serif';
          ctx.fillStyle = 'rgba(58,66,96,.45)';

          var pad = 8;

          /* Top-right: Superestrellas */
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          ctx.fillText('⭐ Superestrellas', right - pad, top + pad);

          /* Top-left: Poder puro */
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText('💪 Poder Puro', left + pad, top + pad);

          /* Bottom-right: Contacto */
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText('🎯 Bateadores de Contacto', right - pad, bottom - pad);

          /* Bottom-left: Promedio */
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText('📊 Promedio', left + pad, bottom - pad);

          ctx.restore();
        }
      }]
    });

    /* Info bar */
    infoBar.textContent =
      players.length + ' jugador' + (players.length !== 1 ? 'es' : '') +
      ' mostrado' + (players.length !== 1 ? 's' : '') +
      ' (mínimo ' + MIN_AB + ' AB)';
  }

  /* ------------------------------------------------------------------ */
  /* Game selector                                                        */
  /* ------------------------------------------------------------------ */
  function populateGameSelector() {
    var juegos = Array.from(
      new Set(
        allData
          .map(function (r) { return parseInt(r.Juego, 10); })
          .filter(function (n) { return !isNaN(n); })
      )
    ).sort(function (a, b) { return a - b; });

    gameSelect.innerHTML = '';

    var allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'Todos los juegos';
    gameSelect.appendChild(allOpt);

    juegos.forEach(function (n) {
      var opt = document.createElement('option');
      opt.value = String(n);
      opt.textContent = 'Juego ' + n;
      gameSelect.appendChild(opt);
    });

    var currentVal = currentJuego === null ? '' : String(currentJuego);
    if (Array.from(gameSelect.options).some(function (o) { return o.value === currentVal; })) {
      gameSelect.value = currentVal;
    } else {
      gameSelect.value = '';
      currentJuego = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Render all                                                           */
  /* ------------------------------------------------------------------ */
  function renderAll() {
    var players = aggregatePlayers(currentJuego);
    if (players.length === 0) {
      infoBar.textContent = 'Sin datos suficientes para el gráfico.';
      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
      showState('data');
      return;
    }
    renderChart(players);
    showState('data');
  }

  /* ------------------------------------------------------------------ */
  /* Fetch                                                                */
  /* ------------------------------------------------------------------ */
  async function fetchAndRender() {
    showState('loading');
    try {
      const resp = await fetch(API_URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!resp.ok) {
        throw new Error('HTTP ' + resp.status + ' — ' + resp.statusText);
      }

      const json = await resp.json();

      if (!json || !Array.isArray(json.data)) {
        throw new Error('Formato de respuesta inesperado.');
      }

      allData = json.data;
      populateGameSelector();
      renderAll();
    } catch (err) {
      console.error('[ScatterPage] Error:', err);
      errorMsg.textContent = 'Error al cargar los datos: ' + err.message;
      showState('error');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Event listeners                                                      */
  /* ------------------------------------------------------------------ */
  gameSelect.addEventListener('change', function () {
    var val = gameSelect.value;
    currentJuego = val === '' ? null : parseInt(val, 10);
    if (allData.length > 0) renderAll();
  });

  retryBtn.addEventListener('click', function () {
    fetchAndRender();
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                                 */
  /* ------------------------------------------------------------------ */
  footerYear.textContent = new Date().getFullYear();
  fetchAndRender();

})();
