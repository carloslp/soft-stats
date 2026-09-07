(function () {
  'use strict';

  var API_URL = 'https://script.google.com/macros/s/AKfycby7mLKmo5tYeyah3g75xA9FS48FPDbq6SJMkFDPErFi9dgrNAvlOEeapwTQ2fZTlHZg/exec?token=dads-12w1-dd3f-da1g&id=1r56WDn_pgZwoAHiiWmeaadUe1hepXC3Mo4t4PWwwfbQ&hoja=Stands';
  var EXP = 1.83;

  var allGames = [];
  var currentSeason = null;

  var seasonSelect = document.getElementById('season-select');
  var loadingState = document.getElementById('state-loading');
  var errorState = document.getElementById('state-error');
  var emptyState = document.getElementById('state-empty');
  var tableWrapper = document.getElementById('table-wrapper');
  var summarySection = document.getElementById('league-summary');
  var errorMessage = document.getElementById('error-message');
  var retryBtn = document.getElementById('retry-btn');
  var tableBody = document.getElementById('standings-body');
  var parityValue = document.getElementById('parity-value');
  var offenseValue = document.getElementById('offense-value');
  var offenseTag = document.getElementById('offense-tag');

  function showState(name) {
    loadingState.hidden = name !== 'loading';
    errorState.hidden = name !== 'error';
    emptyState.hidden = name !== 'empty';
    tableWrapper.hidden = name !== 'table';
    summarySection.hidden = name !== 'table';
  }

  function getSeason(row) {
    if (!row || typeof row !== 'object') return '';
    if (row.temporada !== undefined && row.temporada !== null) return String(row.temporada).trim();
    if (row.Temporada !== undefined && row.Temporada !== null) return String(row.Temporada).trim();
    return '';
  }

  function parseRuns(v) {
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  function fmtPct(v) {
    if (!isFinite(v) || v <= 0) return '.000';
    if (v >= 1) return '1.000';
    return v.toFixed(3).replace(/^0/, '');
  }

  function fmtGb(v) {
    if (v === 0) return '-';
    return Number(v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)).toString();
  }

  function getFinalGamesBySeason() {
    return allGames.filter(function (g) {
      return getSeason(g) === currentSeason && String(g.estatus || '').trim().toUpperCase() === 'FINALIZADO';
    });
  }

  function initTeam(map, name) {
    if (map[name]) return;
    map[name] = {
      equipo: name,
      jj: 0,
      g: 0,
      p: 0,
      ca: 0,
      cp: 0,
      homeW: 0,
      homeL: 0,
      awayW: 0,
      awayL: 0,
      oneRunW: 0,
      oneRunL: 0,
      sho: 0,
      history: []
    };
  }

  function addGameResult(team, didWin, isHome, scored, allowed, isOneRun, order) {
    team.jj += 1;
    if (didWin) team.g += 1; else team.p += 1;
    team.ca += scored;
    team.cp += allowed;
    if (isHome) {
      if (didWin) team.homeW += 1; else team.homeL += 1;
    } else {
      if (didWin) team.awayW += 1; else team.awayL += 1;
    }
    if (isOneRun) {
      if (didWin) team.oneRunW += 1; else team.oneRunL += 1;
    }
    if (allowed === 0) team.sho += 1;
    team.history.push({ win: didWin, order: order });
  }

  function computeStreak(history) {
    if (!history.length) return '-';
    var sorted = history.slice().sort(function (a, b) { return a.order - b.order; });
    var last = sorted[sorted.length - 1].win;
    var count = 0;
    for (var i = sorted.length - 1; i >= 0; i -= 1) {
      if (sorted[i].win === last) count += 1;
      else break;
    }
    return (last ? 'W' : 'L') + count;
  }

  function computeWindowRecord(history, size) {
    if (!history.length) return '0-0';
    var sorted = history.slice().sort(function (a, b) { return a.order - b.order; });
    var recent = sorted.slice(-size);
    var wins = recent.filter(function (x) { return x.win; }).length;
    return wins + '-' + (recent.length - wins);
  }

  function buildStandings() {
    var finals = getFinalGamesBySeason();
    var teams = Object.create(null);

    finals.forEach(function (g) {
      var home = String(g.equipo_local_id || '').trim();
      var away = String(g.equipo_visitante_id || '').trim();
      var homeRuns = parseRuns(g.carreras_local);
      var awayRuns = parseRuns(g.carreras_visitante);
      if (!home || !away || homeRuns === null || awayRuns === null) return;

      initTeam(teams, home);
      initTeam(teams, away);

      var homeWin = homeRuns > awayRuns;
      var isOneRun = Math.abs(homeRuns - awayRuns) === 1;
      var order = parseInt(g.id, 10) || parseInt(g.num_jornada, 10) || 0;

      addGameResult(teams[home], homeWin, true, homeRuns, awayRuns, isOneRun, order);
      addGameResult(teams[away], !homeWin, false, awayRuns, homeRuns, isOneRun, order);
    });

    var rows = Object.keys(teams).map(function (name) {
      var t = teams[name];
      var pct = t.jj > 0 ? t.g / t.jj : 0;
      var expPct = (t.ca === 0 && t.cp === 0)
        ? 0
        : Math.pow(t.ca, EXP) / (Math.pow(t.ca, EXP) + Math.pow(t.cp, EXP));
      return {
        equipo: t.equipo,
        jj: t.jj,
        g: t.g,
        p: t.p,
        pct: pct,
        ca: t.ca,
        cp: t.cp,
        dif: t.ca - t.cp,
        rpg: t.jj > 0 ? t.ca / t.jj : 0,
        rapg: t.jj > 0 ? t.cp / t.jj : 0,
        loc: t.homeW + '-' + t.homeL,
        vis: t.awayW + '-' + t.awayL,
        oneRun: t.oneRunW + '-' + t.oneRunL,
        sho: t.sho,
        expPct: expPct,
        strk: computeStreak(t.history),
        l10: computeWindowRecord(t.history, 10),
        u5: computeWindowRecord(t.history, 5)
      };
    });

    rows.sort(function (a, b) {
      if (b.pct !== a.pct) return b.pct - a.pct;
      if (b.g !== a.g) return b.g - a.g;
      if (a.p !== b.p) return a.p - b.p;
      if (b.dif !== a.dif) return b.dif - a.dif;
      return a.equipo.localeCompare(b.equipo);
    });

    var leader = rows[0];
    rows.forEach(function (r) {
      r.gb = !leader ? 0 : ((leader.g - r.g) + (r.p - leader.p)) / 2;
    });

    return { rows: rows, finals: finals };
  }

  function renderSummary(finalGames) {
    if (!finalGames.length) {
      parityValue.textContent = '—';
      offenseValue.textContent = '—';
      offenseTag.textContent = '—';
      return;
    }

    var margins = 0;
    var totalRuns = 0;

    finalGames.forEach(function (g) {
      var homeRuns = parseRuns(g.carreras_local);
      var awayRuns = parseRuns(g.carreras_visitante);
      if (homeRuns === null || awayRuns === null) return;
      margins += Math.abs(homeRuns - awayRuns);
      totalRuns += homeRuns + awayRuns;
    });

    var avgMargin = margins / finalGames.length;
    var leagueOffense = totalRuns / finalGames.length;

    var tag;
    if (leagueOffense < 10) tag = 'Dominio de pitcheo';
    else if (leagueOffense > 14) tag = 'Alto bateo';
    else tag = 'Balanceado';

    parityValue.textContent = avgMargin.toFixed(2) + ' carreras/juego';
    offenseValue.textContent = leagueOffense.toFixed(2) + ' carreras/juego';
    offenseTag.textContent = tag;
  }

  function renderTable(rows) {
    tableBody.innerHTML = '';
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(r.equipo) + '</td>' +
        '<td>' + r.jj + '</td>' +
        '<td class="up">' + r.g + '</td>' +
        '<td class="down">' + r.p + '</td>' +
        '<td>' + fmtPct(r.pct) + '</td>' +
        '<td>' + fmtGb(r.gb) + '</td>' +
        '<td>' + r.ca + '</td>' +
        '<td>' + r.cp + '</td>' +
        '<td>' + (r.dif > 0 ? '+' + r.dif : r.dif) + '</td>' +
        '<td>' + r.rpg.toFixed(2) + '</td>' +
        '<td>' + r.rapg.toFixed(2) + '</td>' +
        '<td>' + r.loc + '</td>' +
        '<td>' + r.vis + '</td>' +
        '<td>' + r.oneRun + '</td>' +
        '<td>' + r.sho + '</td>' +
        '<td>' + fmtPct(r.expPct) + '</td>' +
        '<td>' + r.strk + '</td>' +
        '<td>' + r.l10 + '</td>' +
        '<td>' + r.u5 + '</td>';
      tableBody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function populateSeasonSelector() {
    var seasons = Array.from(new Set(allGames.map(getSeason).filter(function (s) { return s; })));
    seasonSelect.innerHTML = '';

    seasons.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      seasonSelect.appendChild(opt);
    });

    var defaultSeason = allGames.length > 0 ? getSeason(allGames[allGames.length - 1]) : null;
    if (defaultSeason && seasons.indexOf(defaultSeason) !== -1) {
      currentSeason = defaultSeason;
    } else {
      currentSeason = seasons.length ? seasons[seasons.length - 1] : null;
    }

    seasonSelect.value = currentSeason || '';
  }

  function renderAll() {
    var result = buildStandings();
    if (!result.rows.length) {
      renderSummary([]);
      showState('empty');
      return;
    }
    renderTable(result.rows);
    renderSummary(result.finals);
    showState('table');
  }

  async function fetchData() {
    showState('loading');
    try {
      var resp = await fetch(API_URL, { method: 'GET', headers: { Accept: 'application/json' } });
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' — ' + resp.statusText);
      var json = await resp.json();
      if (!json || !Array.isArray(json.data)) throw new Error('Formato de respuesta inesperado.');
      allGames = json.data;
      populateSeasonSelector();
      renderAll();
    } catch (err) {
      errorMessage.textContent = 'Error al cargar los datos: ' + err.message;
      showState('error');
    }
  }

  seasonSelect.addEventListener('change', function () {
    currentSeason = seasonSelect.value || null;
    renderAll();
  });

  retryBtn.addEventListener('click', fetchData);

  fetchData();
})();
