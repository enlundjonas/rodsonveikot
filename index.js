// Global state
window.rawScores = [];    // raw JSON rows
window.players = [];      // aggregated per-player totals
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

    //season selecter
    document.getElementById("seasonDropdown")
      .addEventListener("change", function () {
        if (!this.value) {
          state.mode = "alltime";
          state.season = null;
        } else {
          state.mode = "season";
          state.season = this.value;
        }
        render();
      });

    render();
  })
  .catch(err => console.error('Failed to load newscores.json', err));

// Aggregate per-player totals
function groupByPlayer(data) {
  const map = {};
  data.forEach(row => {
    const id = row.player_id;
    if (!map[id]) {
      map[id] = { id, name: row.playername, seasons: [] };
    }
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


  // Get unique seasons
  const seasons = [...new Set(window.rawScores.map(s => Number(s.season)))]
    .sort((a, b) => b - a);

  seasons.forEach(season => {
    const option = document.createElement("option");
    option.value = season;
    option.textContent = `${season}-${season + 1}`;
    select.appendChild(option);
  });
}

// Unified data builder
function getDisplayData() {
  if (state.mode === "player" && state.selectedPlayerId !== null) {
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
    const seasons = window.players.flatMap(p =>
      p.seasons.map(s => ({
        name: p.name,
        goals: s.goals,
        assists: s.assists,
        points: s.points,
        season: s.year
      }))
    );
    seasons.sort((a, b) => b.points - a.points);
    return seasons.slice(0, 10); // top 10 seasons
  }

  // All-time
  return window.players.map(player => {
    const totals = player.seasons.reduce((acc, s) => {
      acc.goals += s.goals;
      acc.assists += s.assists;
      acc.points += s.points;
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

// Unified render function
function render() {
  let data = getDisplayData();

  // Apply search filter
  if (state.search) {
    data = data.filter(p =>
      p.name.toLowerCase().includes(state.search)
    );
  }

  // Apply sort
  const dir = state.sort.dir === "desc" ? -1 : 1;
  data.sort((a, b) => {
    const va = a[state.sort.key];
    const vb = b[state.sort.key];
    if (typeof va === "string") return dir * va.localeCompare(vb);
    return dir * (vb - va);
  });

  renderTableHTML(data);
}

// Render HTML table
function renderTableHTML(data) {
  const tableContainer = document.getElementById('table-wrapper');
  const cardContainer = document.getElementById('card-wrapper');

  const isTopSeasons = state.mode === "topseasons";
  const isPlayerView = state.mode === "player";

  // ---------------- TABLE HTML (Desktop/Tablet) ----------------
  const rows = data.map((p, index) => {
    if (isTopSeasons || isPlayerView) {
      return `
        <tr class="border-b hover:bg-gray-50">
          <td class="px-4 py-2">${index + 1}</td>
          <td class="px-4 py-2">${p.name}</td>
          <td class="px-4 py-2 text-right">${p.season}-${p.season + 1}</td>
          <td class="px-4 py-2 text-right">${p.goals}</td>
          <td class="px-4 py-2 text-right">${p.assists}</td>
          <td class="px-4 py-2 text-right font-semibold">${p.points}</td>
        </tr>
      `;
    } else {
      return `
        <tr class="border-b hover:bg-gray-50">
          <td class="px-4 py-2">${index + 1}</td>
          <td class="px-4 py-2 player-name" data-player-id="${p.id}">${p.name}</td>
          <td class="px-4 py-2 text-right">${p.goals}</td>
          <td class="px-4 py-2 text-right">${p.assists}</td>
          <td class="px-4 py-2 text-right font-semibold">${p.points}</td>
          <td class="px-4 py-2 text-right hidden md:table-cell">${p.seasons ?? "-"}</td>
          <td class="px-4 py-2 text-right hidden md:table-cell">${p.pointsPerSeason ? p.pointsPerSeason.toFixed(2) : "-"}</td>
        </tr>
      `;
    }
  }).join('');

  tableContainer.innerHTML = `
    <div class="overflow-x-auto shadow-md rounded-lg">
      <table class="min-w-full table-auto border-collapse">
        <thead class="bg-gray-100 sticky top-0">
          <tr>
            <th class="px-4 py-2">#</th>
            <th class="px-4 py-2 ${isTopSeasons || isPlayerView ? '' : 'cursor-pointer'}" ${isTopSeasons || isPlayerView ? '' : 'onclick="sortBy(\'name\')"'}>Pelaaja</th>
            ${isTopSeasons || isPlayerView
      ? '<th class="px-4 py-2 text-right">Kausi</th><th class="px-4 py-2 text-right">Maalit</th><th class="px-4 py-2 text-right">Syötöt</th><th class="px-4 py-2 text-right">Pisteet</th>'
      : '<th class="px-4 py-2 text-right cursor-pointer" onclick="sortBy(\'goals\')">Maalit</th><th class="px-4 py-2 text-right cursor-pointer" onclick="sortBy(\'assists\')">Syötöt</th><th class="px-4 py-2 text-right cursor-pointer" onclick="sortBy(\'points\')">Pisteet</th><th class="px-4 py-2 text-right cursor-pointer hidden md:table-cell" onclick="sortBy(\'seasons\')">Kaudet</th><th class="px-4 py-2 text-right cursor-pointer hidden md:table-cell" onclick="sortBy(\'pointsPerSeason\')">P/kausi</th>'}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  // ---------------- CARDS HTML (Mobile) ----------------
  const cards = data.map(p => `
    <div class="bg-white shadow rounded-lg p-4 mb-4">
      <div class="flex justify-between items-center">
        <span class="font-semibold">${p.name}</span>
        <span class="text-blue-600 font-semibold">${p.points} pts</span>
      </div>
      <div class="flex justify-between text-sm text-gray-500 mt-1">
        <span>Goals: ${p.goals}</span>
        <span>Assists: ${p.assists}</span>
        <span>Seasons: ${p.seasons ?? "-"}</span>
      </div>
    </div>
  `).join('');

  cardContainer.innerHTML = cards;

  // ---------------- ATTACH CLICK LISTENER ----------------
  // Table only (desktop)
  if (!isTopSeasons && !isPlayerView) {
    document.querySelectorAll('.player-name').forEach(td => {
      td.style.cursor = 'pointer';
      td.addEventListener('click', () => {
        const playerId = td.dataset.playerId;
        showPlayerSeasons(playerId);
      });
    });
  }
}


// Sorting function
function sortBy(key) {
  if (state.sort.key === key) {
    state.sort.dir = state.sort.dir === "desc" ? "asc" : "desc";
  } else {
    state.sort.key = key;
    state.sort.dir = "desc";
  }
  render();
}
window.sortBy = sortBy;

// Search function
function handleSearch(text) {
  state.search = text.toLowerCase();
  render();
}
window.handleSearch = handleSearch;

// Top seasons function
function showTopSeasons() {
  state.mode = "topseasons";
  render();
}
window.showTopSeasons = showTopSeasons;

//Player view
function showPlayerSeasons(playerId) {
  state.mode = "player";
  state.selectedPlayerId = playerId;
  render();
}
window.showPlayerSeasons = showPlayerSeasons;

// Mobile sort buttons
const mobileSortContainer = document.getElementById('mobile-sort');
mobileSortContainer.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.key;

    // Toggle sort direction if same key clicked
    if (state.sort.key === key) {
      state.sort.dir = state.sort.dir === 'desc' ? 'asc' : 'desc';
    } else {
      state.sort.key = key;
      state.sort.dir = 'desc';
    }

    render();
  });
});