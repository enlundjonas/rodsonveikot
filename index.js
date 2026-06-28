// Global state
window.rawScores = [];
window.players = [];
window.state = {
  mode: "alltime",        // "alltime" | "season" | "topseasons" | "player"
  season: null,
  selectedPlayerId: null,
  sort: { key: "points", dir: "asc" },
  search: ""
};

// Load JSON and initialize
fetch('newscores.json')
  .then(res => res.json())
  .then(data => {
    window.rawScores = data;
    window.players = groupByPlayer(data);
    populateSeasonDropdown();
    addMobileSortListeners();
    render();
  })
  .catch(err => console.error('Failed to load newscores.json', err));

// Aggregate per-player totals
function groupByPlayer(data) {
  const map = {};
  data.forEach(row => {
    const id = row.player_id;
    if (!map[id]) map[id] = { id, name: row.playername, seasons: [] };
    map[id].seasons.push({
      year: Number(row.season),
      goals: Number(row.goals) || 0,
      assists: Number(row.assists) || 0,
      points: Number(row.points) || (Number(row.goals || 0) + Number(row.assists || 0))
    });
  });
  return Object.values(map);
}

// Populate season dropdown
function populateSeasonDropdown() {
  const select = document.getElementById("seasonDropdown");
  const seasons = [...new Set(window.rawScores.map(s => Number(s.season)))].sort((a, b) => b - a);
  seasons.forEach(season => {
    const option = document.createElement("option");
    option.value = season;
    option.textContent = `${season}-${season + 1}`;
    select.appendChild(option);
  });

  // Listen for season change
  select.addEventListener("change", function () {
    if (!this.value) {
      state.mode = "alltime";
      state.season = null;
    } else {
      state.mode = "season";
      state.season = this.value;
    }
    render();
  });
}

// Unified data builder
function getDisplayData() {
  if (state.mode === "player" && state.selectedPlayerId) {
    const player = window.players.find(p => p.id == state.selectedPlayerId);
    if (!player) return [];
    return player.seasons.map(s => ({
      name: player.name,
      goals: s.goals,
      assists: s.assists,
      points: s.points,
      season: s.year
    })).sort((a, b) => b.points - a.points);
  }

  if (state.mode === "season") {
    return window.rawScores
      .filter(r => Number(r.season) === Number(state.season))
      .map(r => ({
        name: r.playername,
        goals: Number(r.goals) || 0,
        assists: Number(r.assists) || 0,
        points: Number(r.points) || 0,
        season: Number(r.season)
      }))
      .sort((a, b) => b.points - a.points);
  }

  if (state.mode === "topseasons") {
    const seasons = window.players.flatMap(p => p.seasons.map(s => ({
      name: p.name,
      goals: s.goals,
      assists: s.assists,
      points: s.points,
      season: s.year
    })));
    seasons.sort((a, b) => b.points - a.points);
    return seasons.slice(0, 10);
  }

  // All-time
  return window.players.map(player => {
    const totals = player.seasons.reduce((acc, s) => {
      acc.goals += s.goals; acc.assists += s.assists; acc.points += s.points;
      return acc;
    }, { goals: 0, assists: 0, points: 0 });
    return {
      id: player.id,
      name: player.name,
      goals: totals.goals,
      assists: totals.assists,
      points: totals.points,
      seasons: player.seasons.length,
      pointsPerSeason: totals.points / player.seasons.length
    };
  });
}

// Render
function render() {
  let data = getDisplayData();

  // Apply search
  if (state.search) data = data.filter(p => p.name.toLowerCase().includes(state.search));

  // Apply sort
  const dir = state.sort.dir === 'desc' ? -1 : 1;
  data.sort((a, b) => {
    const va = a[state.sort.key], vb = b[state.sort.key];
    if (typeof va === "string") return dir * va.localeCompare(vb);
    return dir * (vb - va);
  });

  renderTable(data);
  updateMobileSortButtons();
}

// Table rendering (desktop)
function renderTable(data) {
  const tableWrapper = document.getElementById('table-wrapper');
  if (!tableWrapper) return;

  const isPlayerView = state.mode === 'player';
  if (!data.length) {
    tableWrapper.classList.add('hidden');
    return;
  }
  tableWrapper.classList.remove('hidden');

  const rows = data.map((p, i) => `
    <tr class="border-b hover:bg-gray-50">
      <td class="px-2 py-2">
${isPlayerView ? p.season + '-' + (p.season + 1) : i + 1}
</td>
      <td class="px-2 py-2 truncate max-w-[140px] ${state.mode === 'alltime' ? 'cursor-pointer hover:underline' : ''}"
${state.mode === 'alltime' ? `onclick="showPlayerSeasons('${p.id}')"` : ''}>
${p.name}
</td>
      <td class="px-2 py-2 text-right">${p.goals}</td>
      <td class="px-2 py-2 text-right">${p.assists}</td>
      <td class="px-2 py-2 text-right font-semibold">${p.points}</td>
      <td class="px-2 py-2 text-right hidden md:table-cell">${p.seasons ?? '-'}</td>
      <td class="px-2 py-2 text-right hidden md:table-cell">${p.pointsPerSeason ? p.pointsPerSeason.toFixed(2) : '-'}</td>
    </tr>
  `).join('');

  tableWrapper.innerHTML = `
    <div class="bg-white shadow rounded-lg p-2 overflow-x-auto">
      <table class="min-w-full text-sm table-auto">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-2 py-2 ${isPlayerView ? 'cursor-pointer' : ''}"
    ${isPlayerView ? `onclick="sortBy('season')"` : ''}>
  ${isPlayerView ? 'Kausi' : '#'}
</th>
            <th class="px-2 py-2 cursor-pointer" onclick="sortBy('name')">Pelaaja</th>
            <th class="px-2 py-2 text-right cursor-pointer" onclick="sortBy('goals')">Maalit</th>
            <th class="px-2 py-2 text-right cursor-pointer" onclick="sortBy('assists')">Syötöt</th>
            <th class="px-2 py-2 text-right cursor-pointer" onclick="sortBy('points')">Pisteet</th>
            <th class="px-2 py-2 text-right hidden md:table-cell" onclick="sortBy('seasons')">Kaudet</th>
            <th class="px-2 py-2 text-right hidden md:table-cell" onclick="sortBy('pointsPerSeason')">P/kausi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}



// Sorting
function sortBy(key) {
  if (state.sort.key === key) state.sort.dir = state.sort.dir === 'desc' ? 'asc' : 'desc';
  else { state.sort.key = key; state.sort.dir = 'desc'; }
  render();
}
window.sortBy = sortBy;

// Search
function handleSearch(text) { state.search = text.toLowerCase(); render(); }
window.handleSearch = handleSearch;

// Show top seasons
function showTopSeasons() { state.mode = 'topseasons'; render(); }
window.showTopSeasons = showTopSeasons;

// Player view
function showPlayerSeasons(playerId) { state.mode = 'player'; state.selectedPlayerId = playerId; render(); }
window.showPlayerSeasons = showPlayerSeasons;

// Mobile sort buttons
function addMobileSortListeners() {
  const container = document.getElementById('mobile-sort');
  if (!container) return;
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      if (state.sort.key === key) state.sort.dir = state.sort.dir === 'desc' ? 'asc' : 'desc';
      else { state.sort.key = key; state.sort.dir = 'desc'; }
      render();
    });
  });
}

// Highlight active mobile sort button
function updateMobileSortButtons() {
  const container = document.getElementById('mobile-sort');
  if (!container) return;
  container.querySelectorAll('button').forEach(btn => {
    const label = btn.dataset.label || btn.textContent;

    if (btn.dataset.key === state.sort.key) {
      btn.classList.add('bg-blue-600', 'text-white');
      btn.classList.remove('bg-gray-200', 'text-black');
      btn.textContent = label + (state.sort.dir === 'desc' ? ' ↓' : ' ↑');
    } else {
      btn.classList.remove('bg-blue-600', 'text-white');
      btn.classList.add('bg-gray-200', 'text-black');
      btn.textContent = label;
    }
  });
}

// Capitalize helper
function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

//back button function
function goBack() {
  state.mode = "alltime";
  state.selectedPlayerId = null;
  render();
}
window.goBack = goBack;
