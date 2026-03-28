/**
 * trend.js — Gráfica de Tendencia (Líneas)
 *
 * Fetches all per-game batting data from hoja=Data, then renders an
 * interactive Chart.js line chart showing a single player's performance
 * across games chronologically.
 *
 *   X-axis: Juego (game number, chronological)
 *   Y-axis: AVG per game (H / AB) OR total Hits per game
 *
 * A dashed reference line marks the player's season average.
 * Points below the season average are highlighted in red to help
 * identify slumps; points above are highlighted in green.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* API — same endpoint as scatter.js (hoja=Data returns per-game rows) */
  /* ------------------------------------------------------------------ */
  const API_URL =
    'https://script.google.com/macros/s/AKfycby7mLKmo5tYeyah3g75xA9FS48FPDbq6SJMkFDPErFi9dgrNAvlOEeapwTQ2fZTlHZg/exec' +
    '?token=dads-12w1-dd3f-da1g&id=1r56WDn_pgZwoAHiiWmeaadUe1hepXC3Mo4t4PWwwfbQ&hoja=Data';

  /* ------------------------------------------------------------------ */
  /* DOM references                                                       */
  /* ------------------------------------------------------------------ */
  const playerSelect   = document.getElementById('trend-player-select');
  const metricSelect   = document.getElementById('trend-metric-select');
  const stateLoading   = document.getElementById('trend-loading');
  const stateError     = document.getElementById('trend-error');
  const errorMsg       = document.getElementById('trend-error-msg');
  const retryBtn       = document.getElementById('trend-retry-btn');
  const chartSection   = document.getElementById('trend-chart-section');
  const trendCanvas    = document.getElementById('trend-canvas');
  const infoBar        = document.getElementById('trend-info');
  const footerYear     = document.getElementById('trend-footer-year');
  const chartTitle     = document.getElementById('trend-chart-title');
  const chartSubtitle  = document.getElementById('trend-chart-subtitle');

  /* Summary stat elements */
  const statGames = document.getElementById('trend-stat-games');
  const statAvg   = document.getElementById('trend-stat-avg');
  const statHits  = document.getElementById('trend-stat-hits');
  const statHr    = document.getElementById('trend-stat-hr');

  /* ------------------------------------------------------------------ */
  /* State                                                                */
  /* ------------------------------------------------------------------ */
  let allData       = [];   // raw per-game rows from the API
  let currentPlayer = null; // currently selected player name
  let currentMetric = 'avg'; // 'avg' or 'hits'
  let chartInstance = null;

  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */

  function showState(name) {
    stateLoading.hidden = name !== 'loading';
    stateError.hidden   = name !== 'error';
    chartSection.hidden = name !== 'data';
  }

  /** Format AVG for display (e.g. .333, 1.000) */
  function fmtAvg(val) {
    if (val >= 1) return '1.000';
    return val.toFixed(3).replace(/^0/, '');
  }

  /* ------------------------------------------------------------------ */
  /* Data aggregation                                                     */
  /* ------------------------------------------------------------------ */

  /** Return sorted list of unique player names */
  function getPlayers() {
    var names = Array.from(
      new Set(
        allData
          .map(function (r) { return r.Jugador || ''; })
          .filter(function (n) { return n !== ''; })
      )
    ).sort(function (a, b) { return a.localeCompare(b, 'es'); });
    return names;
  }

  /**
   * Build per-game data for the selected player, sorted chronologically.
   * Returns an array of objects: { juego, AB, H, HR, K, avg }
   */
  function buildPlayerData(playerName) {
    var rows = allData.filter(function (r) { return r.Jugador === playerName; });

    var gameMap = Object.create(null);
    rows.forEach(function (r) {
      var n = parseInt(r.Juego, 10);
      if (isNaN(n)) return;
      if (!gameMap[n]) {
        gameMap[n] = { juego: n, AB: 0, H: 0, HR: 0, K: 0 };
      }
      gameMap[n].AB += parseInt(r.AB, 10) || 0;
      gameMap[n].H  += parseInt(r.H,  10) || 0;
      gameMap[n].HR += parseInt(r.HR, 10) || 0;
      gameMap[n].K  += parseInt(r.K,  10) || 0;
    });

    return Object.keys(gameMap)
      .map(function (n) {
        var g = gameMap[n];
        g.avg = g.AB > 0 ? g.H / g.AB : 0;
        return g;
      })
      .sort(function (a, b) { return a.juego - b.juego; });
  }

  /* ------------------------------------------------------------------ */
  /* Summary cards                                                        */
  /* ------------------------------------------------------------------ */
  function updateSummary(games) {
    var totalAB   = games.reduce(function (s, g) { return s + g.AB; }, 0);
    var totalH    = games.reduce(function (s, g) { return s + g.H;  }, 0);
    var totalHR   = games.reduce(function (s, g) { return s + g.HR; }, 0);
    var seasonAvg = totalAB > 0 ? totalH / totalAB : 0;

    statGames.textContent = games.length;
    statAvg.textContent   = fmtAvg(seasonAvg);
    statHits.textContent  = totalH;
    statHr.textContent    = totalHR;
  }

  /* ------------------------------------------------------------------ */
  /* Chart rendering                                                      */
  /* ------------------------------------------------------------------ */
  function renderChart(games) {
    var metric = currentMetric;

    /* Season-level reference value */
    var totalAB   = games.reduce(function (s, g) { return s + g.AB; }, 0);
    var totalH    = games.reduce(function (s, g) { return s + g.H;  }, 0);
    var seasonAvg = totalAB > 0 ? totalH / totalAB : 0;
    var seasonHits = totalH / Math.max(games.length, 1); /* avg hits per game */

    var refValue = metric === 'avg' ? seasonAvg : seasonHits;

    /* Labels and values */
    var labels = games.map(function (g) { return 'J' + g.juego; });
    var values = games.map(function (g) { return metric === 'avg' ? g.avg : g.H; });

    /* Per-point colors: green above reference, red below */
    var pointColors = values.map(function (v) {
      if (v > refValue)  return 'rgba(34,197,94,.90)';   /* green */
      if (v < refValue)  return 'rgba(204,52,51,.90)';   /* red   */
      return 'rgba(249,198,69,.90)';                      /* gold  */
    });

    var pointBorders = values.map(function (v) {
      if (v > refValue)  return '#15803d';
      if (v < refValue)  return '#7f1d1d';
      return '#c9920a';
    });

    /* Reference line dataset (constant) */
    var refData = games.map(function () { return refValue; });

    /* Y-axis range */
    var allVals = values.concat([refValue]);
    var minVal  = Math.min.apply(null, allVals);
    var maxVal  = Math.max.apply(null, allVals);
    var pad     = metric === 'avg' ? 0.05 : 1;
    var yMin    = Math.max(0, minVal - pad);
    var yMax    = maxVal + pad;

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    chartInstance = new Chart(trendCanvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: metric === 'avg' ? 'AVG por juego' : 'Hits por juego',
            data: values,
            borderColor: 'rgba(0,48,135,.85)',
            backgroundColor: 'rgba(0,48,135,.08)',
            pointBackgroundColor: pointColors,
            pointBorderColor: pointBorders,
            pointRadius: 7,
            pointHoverRadius: 10,
            pointBorderWidth: 2,
            tension: 0.3,
            fill: true,
            order: 1
          },
          {
            label: metric === 'avg' ? 'AVG temporada' : 'Hits promedio/juego',
            data: refData,
            borderColor: 'rgba(249,198,69,.85)',
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            order: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: window.innerWidth < 560 ? 1 : 1.8,
        animation: { duration: 400 },
        layout: { padding: { top: 10, right: 16, bottom: 10, left: 8 } },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Juego',
              color: '#3a4260',
              font: { family: 'Inter', size: 13, weight: '600' }
            },
            ticks: {
              color: '#7a84a0',
              font: { family: 'Inter', size: 11 },
              maxRotation: 45
            },
            grid: { color: 'rgba(0,0,0,.06)' }
          },
          y: {
            min: yMin,
            max: yMax,
            title: {
              display: true,
              text: metric === 'avg' ? 'AVG (Promedio de Bateo)' : 'Hits',
              color: '#3a4260',
              font: { family: 'Inter', size: 13, weight: '600' }
            },
            ticks: {
              color: '#7a84a0',
              font: { family: 'Inter', size: 11 },
              callback: function (val) {
                if (metric === 'avg') {
                  if (val >= 1) return '1.000';
                  return val.toFixed(3).replace(/^0/, '');
                }
                return Number.isInteger(val) ? val : '';
              }
            },
            grid: { color: 'rgba(0,0,0,.06)' }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { family: 'Inter', size: 12 },
              color: '#3a4260',
              usePointStyle: true,
              pointStyleWidth: 10,
              padding: 16
            }
          },
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
                return 'Juego ' + games[items[0].dataIndex].juego;
              },
              label: function (item) {
                if (item.datasetIndex === 1) return null; /* skip reference line */
                var g = games[item.dataIndex];
                var avgStr = fmtAvg(g.avg);
                return [
                  'AVG: ' + avgStr,
                  'H:   ' + g.H,
                  'AB:  ' + g.AB,
                  'HR:  ' + g.HR,
                  'K:   ' + g.K
                ];
              },
              filter: function (item) { return item.datasetIndex === 0; }
            }
          }
        }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Render all                                                           */
  /* ------------------------------------------------------------------ */
  function renderAll() {
    var name = currentPlayer;
    if (!name) {
      infoBar.textContent = 'Selecciona un jugador para ver su tendencia.';
      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
      showState('data');
      return;
    }

    var games = buildPlayerData(name);

    if (games.length === 0) {
      infoBar.textContent = 'Sin datos para este jugador.';
      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
      showState('data');
      return;
    }

    /* Update chart title/subtitle */
    var metricLabel = currentMetric === 'avg' ? 'Promedio de Bateo (AVG)' : 'Total de Hits';
    chartTitle.textContent    = name + ' — Tendencia por Juego';
    chartSubtitle.textContent = 'Eje X: Juego (cronológico) · Eje Y: ' + metricLabel;

    updateSummary(games);
    renderChart(games);

    infoBar.textContent =
      games.length + ' juego' + (games.length !== 1 ? 's' : '') + ' jugado' +
      (games.length !== 1 ? 's' : '');

    showState('data');
  }

  /* ------------------------------------------------------------------ */
  /* Player selector                                                      */
  /* ------------------------------------------------------------------ */
  function populatePlayerSelector() {
    var players = getPlayers();

    playerSelect.innerHTML = '';

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecciona un jugador…';
    playerSelect.appendChild(placeholder);

    players.forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      playerSelect.appendChild(opt);
    });

    /* Restore previous selection if still available */
    if (currentPlayer && Array.from(playerSelect.options).some(function (o) { return o.value === currentPlayer; })) {
      playerSelect.value = currentPlayer;
    } else {
      playerSelect.value = '';
      currentPlayer = null;
    }
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
      populatePlayerSelector();
      renderAll();
    } catch (err) {
      console.error('[TrendPage] Error:', err);
      errorMsg.textContent = 'Error al cargar los datos: ' + err.message;
      showState('error');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Event listeners                                                      */
  /* ------------------------------------------------------------------ */
  playerSelect.addEventListener('change', function () {
    currentPlayer = playerSelect.value || null;
    if (allData.length > 0) renderAll();
  });

  metricSelect.addEventListener('change', function () {
    currentMetric = metricSelect.value;
    if (allData.length > 0 && currentPlayer) renderAll();
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
