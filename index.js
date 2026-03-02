// Global state
window.scores = [];      // raw season-by-season rows from JSON
window.mainList = [];    // aggregated per-player totals used on the homepage
window.currentSort = { key: 'points', dir: 'desc' };
window.currentSearch = '';

// Load data and initialize
fetch('newscores.json')
    .then(res => res.json())
    .then(data => {
        window.scores = data;
        window.mainList = buildPlayerTotals(data);
        renderMainPageTable(window.mainList);
    })
    .catch(err => console.error('Failed to load newscores.json', err));

// Build aggregated totals per player. counts seasons where did_not_play === 0
function buildPlayerTotals(data) {
    const players = {};

    data.forEach(row => {
        const id = row.player_id;
        if (!players[id]) {
            players[id] = {
                player_id: id,
                playername: row.playername || row.player || ('#' + id),
                seasons: 0,
                goals: 0,
                assists: 0,
                points: 0
            };
        }

        // If did_not_play field exists, count seasons only when did_not_play === 0
        // If field is missing, assume the row means played and count it.
        const didNotPlay = ('did_not_play' in row) ? Number(row.did_not_play) : 0;
        if (didNotPlay === 0) {
            players[id].seasons += 1;
            players[id].goals += Number(row.goals) || 0;
            players[id].assists += Number(row.assists) || 0;
            players[id].points += Number(row.points) || (Number(row.goals || 0) + Number(row.assists || 0));
        }
    });

    // Convert to array and compute pointsPerSeason
    return Object.values(players).map(p => ({
        ...p,
        pointsPerSeason: p.seasons > 0 ? (p.points / p.seasons) : 0
    }));
}

// Sorting helper for the main list. key is a property name (e.g. 'points', 'seasons', 'playername')
function sortMain(key) {
    if (!window.mainList || !Array.isArray(window.mainList)) return;

    // Toggle direction if same key
    if (window.currentSort.key === key) {
        window.currentSort.dir = (window.currentSort.dir === 'desc') ? 'asc' : 'desc';
    } else {
        window.currentSort.key = key;
        window.currentSort.dir = 'desc';
    }

    const dir = window.currentSort.dir === 'desc' ? -1 : 1;

    window.mainList.sort((a, b) => {
        const va = a[key];
        const vb = b[key];

        // For strings, use localeCompare
        if (typeof va === 'string' || typeof vb === 'string') {
            return dir * String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' });
        }

        // For numbers
        return dir * ((vb || 0) - (va || 0));
    });

    // After sorting, apply search filter if any
    const filtered = applySearchFilter(window.mainList, window.currentSearch);
    renderMainPageTable(filtered);
}

function formatSeason(year){
    return `${year}-${year + 1}`;
} 


function searchPlayer(text) {
    window.currentSearch = text.toLowerCase(); // update global search
    const filtered = applySearchFilter(window.mainList, window.currentSearch);
    renderMainPageTable(filtered);
}

// Define applySearchFilter
function applySearchFilter(data, searchText) {
    if (!searchText) return data;
    return data.filter(row => row.playername.toLowerCase().includes(searchText));
}
// Render the homepage table (aggregated single-row-per-player view)
function renderMainPageTable(data) {
    const container = document.getElementById('main-table');
    if (!container) return;

    // Compose header with clickable sortable columns
    const header = `
    <div class="bg-white shadow rounded-lg p-6">
      <h1 class="text-2xl font-bold mb-2">All-time Player Totals</h1>
      <p class="text-sm text-gray-500 mb-4">Showing total points per player. Click headers to sort. Use the search box to filter players.</p>
      <div class="overflow-x-auto px-2 sm:px-0">
        <table class="min-w-full table-auto">
          <thead class="bg-gray-100">
            <tr>
             <th class="px-2 sm:px-4 py-2 text-left">#</th>
              <th class="px-2 sm:px-4 py-2 text-left cursor-pointer" onclick="sortMain('playername')">Player ${sortIndicator('playername')}</th>
              <th class="px-2 sm:px-4 py-2 text-right cursor-pointer" onclick="sortMain('goals')">Goals${sortIndicator('goals')}</th>
              <th class="px-2 sm:px-4 py-2 text-right cursor-pointer" onclick="sortMain('assists')">Assists ${sortIndicator('assists')}</th>
              <th class="px-2 sm:px-4 py-2 text-right cursor-pointer" onclick="sortMain('points')">Points ${sortIndicator('points')}</th>
              <th class="px-2 sm:px-4 py-2 text-right cursor-pointer" onclick="sortMain('seasons')">Seasons ${sortIndicator('seasons')}</th>
              <th class="px-2 sm:px-4 py-2 text-right cursor-pointer" onclick="sortMain('pointsPerSeason')">PTS/S ${sortIndicator('pointsPerSeason')}</th>
            </tr>
          </thead>
          <tbody id="main-table-body">
  `;

    const rows = data.map((p,index) => `
            <tr class="hover:bg-gray-50 border-b">
                <td class="px-2 sm:px-4 py-3">${index + 1}</td> 
              <td class="px-2 sm:px-4 py-3">${escapeHtml(p.playername)}</td>
              <td class="px-2 sm:px-4 py-3 text-right">${p.goals}</td>
              <td class="px-2 sm:px-4 py-3 text-right">${p.assists}</td>
              <td class="px-2 sm:px-4 py-3 text-right font-semibold">${p.points}</td>
              <td class="px-2 sm:px-4 py-3 text-right">${p.seasons}</td>
              <td class="px-2 sm:px-4 py-3 text-right">${Number(p.pointsPerSeason).toFixed(2)}</td>
            </tr>
  `).join('');

    const footer = `
          </tbody>
        </table>
      </div>
    </div>
  `;

    container.innerHTML = header + rows + footer;
}

// Small helper to return an arrow indicator for the current sort
function sortIndicator(key) {
    if (!window.currentSort || window.currentSort.key !== key) return '';
    return window.currentSort.dir === 'desc' ? '▼' : '▲';
}

// Escape HTML to avoid injection if player names are not sanitized
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function showBestIndividualSeasons(limit = 10) {
    if (!window.scores || !Array.isArray(window.scores)) return;

    // Filter out seasons where player did not play (did_not_play === 1)
    const playedSeasons = window.scores.filter(row => !row.did_not_play || Number(row.did_not_play) === 0);

    // Sort descending by points
    playedSeasons.sort((a, b) => (Number(b.points || (b.goals + b.assists)) - Number(a.points || (a.goals + a.assists))));

    // Take top N
    const topSeasons = playedSeasons.slice(0, limit);

    // Render table (reuse your render function or make a simple one)
    renderTopSeasonsTable(topSeasons);
}

function renderTopSeasonsTable(seasons) {
    const container = document.getElementById('main-table');
    if (!container) return;

    const rows = seasons.map((p, index) => `
        <tr class="hover:bg-gray-50 border-b">
            <td class="px-4 py-3">${index+1}</td>
            <td class="px-4 py-3">${escapeHtml(p.playername)}</td>
            <td class="px-4 py-3 text-right">${formatSeason(p.year)}</td>
            <td class="px-4 py-3 text-right">${p.goals}</td>
            <td class="px-4 py-3 text-right">${p.assists}</td>
            <td class="px-4 py-3 text-right font-semibold">${p.points || (p.goals + p.assists)}</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="bg-white shadow rounded-lg p-6">
            <h1 class="text-2xl font-bold mb-2">Top 10 Individual Seasons</h1>
            <div class="overflow-x-auto px-2 sm:px-0">
                <table class="min-w-full table-auto">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-4 py-2 text-left">#</th>
                            <th class="px-4 py-2 text-left">Player</th>
                            <th class="px-4 py-2 text-right">Season</th>
                            <th class="px-4 py-2 text-right">Goals</th>
                            <th class="px-4 py-2 text-right">Assists</th>
                            <th class="px-4 py-2 text-right">Points</th>
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


/*
Optional helpers you can hook up to UI controls:
- filterByYears(yearArray)
- showPlayerHistory(playerId)

They are left out to keep this file focused on the main homepage. If you want them, I can add them.
*/

// Expose some functions to the global scope so HTML onclick/oninput can call them
window.sortMain = sortMain;
window.searchMain = searchMain;

// End of file
