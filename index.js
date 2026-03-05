// Global state
window.rawScores = [];      // raw season-by-season rows from JSON
window.players = [];    // aggregated per-player totals used on the homepage
window.currentSort = { key: 'points', dir: 'desc' };
window.currentSearch = '';

// Load data and initialize
fetch('newscores.json')
    .then(res => res.json())
    .then(data => {
        window.rawScores = data;
        window.players = groupByPlayer(data);
        renderAllTimeTable();
    })
    .catch(err => console.error('Failed to load newscores.json', err));

// Build aggregated totals per player. counts seasons where did_not_play === 0
function groupByPlayer(data) {
    const map = {};

    data.forEach(row => {
        const id = row.player_id;

        if (!map[id]) {
            map[id] = {
                id: id,
                name: row.playername,
                seasons: []
            };
        }

        map[id].seasons.push({
            year: Number(row.season),
            goals: Number(row.goals) || 0,
            assists: Number(row.assists) || 0,
            points: Number(row.points) || (Number(row.goals || 0)+ Number(row.assists || 0))
        });
    });

    return Object.values(map);
}

function buildAllTimeList() {
  return window.players.map(player => {

    const totals = player.seasons.reduce((acc, season) => {
      acc.goals += season.goals;
      acc.assists += season.assists;
      acc.points += season.points;
      return acc;
    }, { goals: 0, assists: 0, points: 0 });

    return {
      id: player.id,
      name: player.name,
      seasons: player.seasons.length,
      goals: totals.goals,
      assists: totals.assists,
      points: totals.points,
      pointsPerSeason: player.seasons.length
        ? totals.points / player.seasons.length
        : 0
    };
  });
}

function renderAllTimeTable() {
  let list = buildAllTimeList();

  // Search filter
  if (window.currentSearch) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(window.currentSearch)
    );
  }

  // Sort
  const dir = window.currentSort.dir === 'desc' ? -1 : 1;
  list.sort((a, b) => {
    const va = a[window.currentSort.key];
    const vb = b[window.currentSort.key];

    if (typeof va === 'string') {
      return dir * va.localeCompare(vb);
    }

    return dir * (vb - va);
  });

  renderTableHTML(list);
}

function showTopSeasons(limit = 10) {
  const allSeasons = window.players.flatMap(player =>
    player.seasons.map(season => ({
      name: player.name,
      ...season
    }))
  );

  allSeasons.sort((a, b) => b.points - a.points);

  renderTopSeasonHTML(allSeasons.slice(0, limit));
}

function buildCumulativeList(yearLimit) {
  return window.players.map(player => {

    const seasonsUpToYear = player.seasons.filter(s => s.year <= yearLimit);

    const totals = seasonsUpToYear.reduce((acc, s) => {
      acc.points += s.points;
      return acc;
    }, { points: 0 });

    return {
      name: player.name,
      points: totals.points
    };
  });
}


function renderAllTimeTable() {
  let list = buildAllTimeList();

  // Search filter
  if (window.currentSearch) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(window.currentSearch)
    );
  }

  // Sort
  const dir = window.currentSort.dir === 'desc' ? -1 : 1;

  list.sort((a, b) => {
    const va = a[window.currentSort.key];
    const vb = b[window.currentSort.key];

    if (typeof va === 'string') {
      return dir * va.localeCompare(vb);
    }

    return dir * (vb - va);
  });

  renderTableHTML(list);
}

function renderTableHTML(data) {
  const container = document.getElementById('table-container');

  const rows = data.map((p, index) => `
    <tr class="border-b hover:bg-gray-50">
      <td class="px-4 py-2">${index + 1}</td>
      <td class="px-4 py-2">${p.name}</td>
      <td class="px-4 py-2 text-right">${p.goals}</td>
      <td class="px-4 py-2 text-right">${p.assists}</td>
      <td class="px-4 py-2 text-right font-semibold">${p.points}</td>
      <td class="px-4 py-2 text-right">${p.seasons}</td>
      <td class="px-4 py-2 text-right">${p.pointsPerSeason.toFixed(2)}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="bg-white shadow rounded-lg p-6">
      <div class="overflow-x-auto">
        <table class="min-w-full table-auto">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2">#</th>
              <th class="px-4 py-2 cursor-pointer" onclick="sortBy('name')">Player</th>
              <th class="px-4 py-2 text-right cursor-pointer" onclick="sortBy('goals')">Goals</th>
              <th class="px-4 py-2 text-right cursor-pointer" onclick="sortBy('assists')">Assists</th>
              <th class="px-4 py-2 text-right cursor-pointer" onclick="sortBy('points')">Points</th>
              <th class="px-4 py-2 text-right cursor-pointer" onclick="sortBy('seasons')">Seasons</th>
              <th class="px-4 py-2 text-right cursor-pointer" onclick="sortBy('pointsPerSeason')">PTS/S</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function sortBy(key) {
  if (window.currentSort.key === key) {
    window.currentSort.dir =
      window.currentSort.dir === 'desc' ? 'asc' : 'desc';
  } else {
    window.currentSort.key = key;
    window.currentSort.dir = 'desc';
  }

  renderAllTimeTable();
}

window.sortBy = sortBy;

function handleSearch(text) {
  window.currentSearch = text.toLowerCase();
  renderAllTimeTable();
}

window.handleSearch = handleSearch;

function showTopSeasons(limit = 10) {
  const allSeasons = window.players.flatMap(player =>
    player.seasons.map(season => ({
      name: player.name,
      ...season
    }))
  );

  allSeasons.sort((a, b) => b.points - a.points);

  renderTopSeasons(allSeasons.slice(0, limit));
}

window.showTopSeasons = showTopSeasons;

function renderTopSeasons(data) {
  const container = document.getElementById('table-container');

  const rows = data.map((s, index) => `
    <tr class="border-b hover:bg-gray-50">
      <td class="px-4 py-2">${index + 1}</td>
      <td class="px-4 py-2">${s.name}</td>
      <td class="px-4 py-2 text-right">${s.year}-${s.year + 1}</td>
      <td class="px-4 py-2 text-right">${s.goals}</td>
      <td class="px-4 py-2 text-right">${s.assists}</td>
      <td class="px-4 py-2 text-right font-semibold">${s.points}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="bg-white shadow rounded-lg p-6">
      <h2 class="text-xl font-bold mb-4">10 parasta yksilökautta</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full table-auto">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-2">#</th>
              <th class="px-4 py-2">Pelaaja</th>
              <th class="px-4 py-2 text-right">Kausi</th>
              <th class="px-4 py-2 text-right">Maalit</th>
              <th class="px-4 py-2 text-right">Syötöt</th>
              <th class="px-4 py-2 text-right">Pisteet</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}



