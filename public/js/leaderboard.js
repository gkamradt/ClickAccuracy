// Leaderboard Page JavaScript

// DOM Elements
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const leaderboardContent = document.getElementById('leaderboard-content');
const hallOfFameTable = document.getElementById('hall-of-fame-table');
// Removed todaysBestTable - no longer needed

// Stats elements
const totalPlayersElement = document.getElementById('total-players');
const todaysPlayersElement = document.getElementById('todays-players');
const lastUpdatedElement = document.getElementById('last-updated');

// Load leaderboard data on page load
document.addEventListener('DOMContentLoaded', loadLeaderboardData);

// Main function to fetch and display leaderboard data
async function loadLeaderboardData() {
    try {
        showLoading();
        
        console.log('🔄 Fetching leaderboard data...');
        const response = await fetch('/api/leaderboard');
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Leaderboard data loaded:', {
            hallOfFameCount: data.hall_of_fame?.length || 0,
            todaysBestCount: data.todays_best?.length || 0
        });
        
        // Populate leaderboard (sorted by combined score)
        populateLeaderboard(data.hall_of_fame || []);
        
        // Update stats
        updateStats(data);
        
        showContent();
        
    } catch (error) {
        console.error('❌ Failed to load leaderboard data:', error);
        showError();
    }
}

// Show loading state
function showLoading() {
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    leaderboardContent.classList.add('hidden');
}

// Show error state
function showError() {
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
    leaderboardContent.classList.add('hidden');
}

// Show main content
function showContent() {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    leaderboardContent.classList.remove('hidden');
}

// Populate main leaderboard table (sorted by combined score)
function populateLeaderboard(players) {
    hallOfFameTable.innerHTML = '';
    
    if (players.length === 0) {
        hallOfFameTable.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    No players yet. Be the first to set a record!
                </td>
            </tr>
        `;
        return;
    }
    
    // Calculate combined score for each player and sort
    const playersWithCombinedScore = players.map(player => ({
        ...player,
        combined_score: (player.performance_score + player.speed_score) / 2
    })).sort((a, b) => b.combined_score - a.combined_score);
    
    playersWithCombinedScore.forEach((player, index) => {
        const row = createPlayerRow(player, index + 1, 'leaderboard');
        hallOfFameTable.appendChild(row);
    });
}

// Create a table row for a player
function createPlayerRow(player, rank, tableType) {
    const row = document.createElement('tr');
    row.className = 'table-row transition-colors duration-150';
    
    // Format date/time based on table type
    const dateTime = tableType === 'hall-of-fame' 
        ? formatDate(player.created_at)
        : formatTime(player.created_at);
    
    // Create rank badge
    const rankBadge = getRankBadge(rank);
    
    // Create player type badge
    const typeBadge = player.is_ai 
        ? `<span class="ai-badge text-white text-xs font-medium px-2 py-1 rounded-full">AI</span>`
        : `<span class="human-badge text-white text-xs font-medium px-2 py-1 rounded-full">Human</span>`;
    
    // Display name or "Anonymous"
    const displayName = player.username || 'Anonymous';
    
    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm">
            ${rankBadge}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">${displayName}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">
            ${typeBadge}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
            ${formatScore(player.combined_score)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            ${formatScore(player.performance_score)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            ${formatScore(player.speed_score)}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${dateTime}
        </td>
    `;
    
    return row;
}

// Get rank badge with different styling for top positions
function getRankBadge(rank) {
    if (rank === 1) {
        return `<span class="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-sm font-bold rounded-full">🥇</span>`;
    } else if (rank === 2) {
        return `<span class="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-gray-300 to-gray-500 text-white text-sm font-bold rounded-full">🥈</span>`;
    } else if (rank === 3) {
        return `<span class="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-orange-400 to-orange-600 text-white text-sm font-bold rounded-full">🥉</span>`;
    } else {
        return `<span class="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">${rank}</span>`;
    }
}

// Format score with appropriate decimal places
function formatScore(score) {
    if (score === null || score === undefined) return '-';
    return Number(score).toFixed(1);
}

// Format date for hall of fame (e.g., "Jan 15, 2024")
function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (error) {
        return '-';
    }
}

// Format time for today's best (e.g., "2:34 PM")
function formatTime(dateString) {
    if (!dateString) return '-';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        return '-';
    }
}

// Update statistics summary
function updateStats(data) {
    // Calculate total unique players from hall of fame
    const totalPlayers = data.total_entries?.hall_of_fame || data.hall_of_fame?.length || 0;
    totalPlayersElement.textContent = totalPlayers.toLocaleString();
    
    // Today's players count
    const todaysPlayers = data.total_entries?.todays_best || data.todays_best?.length || 0;
    todaysPlayersElement.textContent = todaysPlayers.toLocaleString();
    
    // Last updated timestamp
    const lastUpdated = data.cache_timestamp || new Date().toISOString();
    lastUpdatedElement.textContent = formatLastUpdated(lastUpdated);
}

// Format last updated time (e.g., "2 minutes ago")
function formatLastUpdated(timestamp) {
    if (!timestamp) return 'Just now';
    
    try {
        const now = new Date();
        const updated = new Date(timestamp);
        const diffMs = now - updated;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        
        if (diffMins < 1) return 'Just now';
        if (diffMins === 1) return '1 minute ago';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours === 1) return '1 hour ago';
        if (diffHours < 24) return `${diffHours} hours ago`;
        
        return formatDate(timestamp);
    } catch (error) {
        return 'Recently';
    }
}

// Global function for retry button
window.loadLeaderboardData = loadLeaderboardData;