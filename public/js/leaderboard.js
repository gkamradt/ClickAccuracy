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
        
        logger.log('🔄 Fetching leaderboard data...');
        const response = await fetch('/api/leaderboard');
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        logger.log('✅ Leaderboard data loaded:', {
            hallOfFameCount: data.hall_of_fame?.length || 0,
            todaysBestCount: data.todays_best?.length || 0
        });
        
        // Render scatter plot
        renderScatterPlot(data.scatter_data || []);
        
        // Populate leaderboard (sorted by combined score)
        populateLeaderboard(data.hall_of_fame || []);
        
        // Update stats
        updateStats(data);
        
        showContent();
        
    } catch (error) {
        logger.error('❌ Failed to load leaderboard data:', error);
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
        const row = createPlayerRow(player, index + 1);
        hallOfFameTable.appendChild(row);
    });
}

// Create a table row for a player
function createPlayerRow(player, rank) {
    const row = document.createElement('tr');
    row.className = 'table-row transition-colors duration-150';

    // Format date/time for leaderboard
    const dateTime = formatRelativeOrDate(player.created_at);
    
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

// Format leaderboard date: relative time if within 7 days, otherwise full date
function formatRelativeOrDate(dateString) {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays < 7) {
            if (diffMins < 1) return 'Just now';
            if (diffMins === 1) return '1 minute ago';
            if (diffMins < 60) return `${diffMins} minutes ago`;
            if (diffHours === 1) return '1 hour ago';
            if (diffHours < 24) return `${diffHours} hours ago`;
            if (diffDays === 1) return '1 day ago';
            return `${diffDays} days ago`;
        }

        return formatDate(dateString);
    } catch (error) {
        return '-';
    }
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

// Render scatter plot for leaderboard page
function renderScatterPlot(scatterData) {
    const svg = document.getElementById('leaderboard-scatter-plot');
    if (!svg || !scatterData) return;
    
    svg.innerHTML = ''; // Clear previous content
    
    // Chart configuration
    const config = {
        width: 700,
        height: 300,
        margin: { top: 20, right: 30, bottom: 60, left: 70 },
        maxSpeed: 100,
        maxPerformance: 100
    };
    
    const chartWidth = config.width - config.margin.left - config.margin.right;
    const chartHeight = config.height - config.margin.top - config.margin.bottom;
    
    // Create main group with margins
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${config.margin.left}, ${config.margin.top})`);
    svg.appendChild(g);
    
    // Create scales
    function scaleX(value) {
        return (value / config.maxSpeed) * chartWidth;
    }
    
    function scaleY(value) {
        return chartHeight - (value / config.maxPerformance) * chartHeight;
    }
    
    // Draw grid lines
    for (let i = 0; i <= 10; i++) {
        // Vertical grid lines
        const x = (i / 10) * chartWidth;
        const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vLine.setAttribute('x1', x);
        vLine.setAttribute('y1', 0);
        vLine.setAttribute('x2', x);
        vLine.setAttribute('y2', chartHeight);
        vLine.setAttribute('stroke', '#e5e7eb');
        vLine.setAttribute('stroke-width', 1);
        g.appendChild(vLine);
        
        // Horizontal grid lines
        const y = (i / 10) * chartHeight;
        const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        hLine.setAttribute('x1', 0);
        hLine.setAttribute('y1', y);
        hLine.setAttribute('x2', chartWidth);
        hLine.setAttribute('y2', y);
        hLine.setAttribute('stroke', '#e5e7eb');
        hLine.setAttribute('stroke-width', 1);
        g.appendChild(hLine);
    }
    
    // Draw axes
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', 0);
    xAxis.setAttribute('y1', chartHeight);
    xAxis.setAttribute('x2', chartWidth);
    xAxis.setAttribute('y2', chartHeight);
    xAxis.setAttribute('stroke', '#374151');
    xAxis.setAttribute('stroke-width', 2);
    g.appendChild(xAxis);
    
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', 0);
    yAxis.setAttribute('y1', 0);
    yAxis.setAttribute('x2', 0);
    yAxis.setAttribute('y2', chartHeight);
    yAxis.setAttribute('stroke', '#374151');
    yAxis.setAttribute('stroke-width', 2);
    g.appendChild(yAxis);
    
    // Add axis labels
    for (let i = 0; i <= 10; i++) {
        // X-axis labels
        const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xLabel.setAttribute('x', (i / 10) * chartWidth);
        xLabel.setAttribute('y', chartHeight + 15);
        xLabel.setAttribute('text-anchor', 'middle');
        xLabel.setAttribute('font-size', '12px');
        xLabel.setAttribute('fill', '#6b7280');
        xLabel.textContent = (i * 10).toString();
        g.appendChild(xLabel);
        
        // Y-axis labels
        const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        yLabel.setAttribute('x', -10);
        yLabel.setAttribute('y', chartHeight - (i / 10) * chartHeight + 4);
        yLabel.setAttribute('text-anchor', 'end');
        yLabel.setAttribute('font-size', '12px');
        yLabel.setAttribute('fill', '#6b7280');
        yLabel.textContent = (i * 10).toString();
        g.appendChild(yLabel);
    }
    
    // X-axis title
    const xTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xTitle.setAttribute('x', chartWidth / 2);
    xTitle.setAttribute('y', chartHeight + 45);
    xTitle.setAttribute('text-anchor', 'middle');
    xTitle.setAttribute('font-size', '14px');
    xTitle.setAttribute('font-weight', 'bold');
    xTitle.setAttribute('fill', '#374151');
    xTitle.textContent = 'Speed Score →';
    g.appendChild(xTitle);
    
    // Y-axis title
    const yTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yTitle.setAttribute('x', -45);
    yTitle.setAttribute('y', chartHeight / 2);
    yTitle.setAttribute('text-anchor', 'middle');
    yTitle.setAttribute('transform', `rotate(-90, -45, ${chartHeight / 2})`);
    yTitle.setAttribute('font-size', '14px');
    yTitle.setAttribute('font-weight', 'bold');
    yTitle.setAttribute('fill', '#374151');
    yTitle.textContent = 'Performance Score →';
    g.appendChild(yTitle);
    
    // Process the data to categorize players
    const processedData = [];
    scatterData.forEach(point => {
        const processedPoint = { ...point };
        
        if (point.type === 'human') {
            if (point.username && 
                point.username !== null && 
                point.username.trim() !== '' &&
                point.username.trim().toLowerCase() !== 'anonymous') {
                processedPoint.type = 'named';
                processedPoint.username = point.username.trim();
            } else {
                processedPoint.type = 'anonymous';
                processedPoint.username = 'Anonymous';
            }
        }
        
        processedData.push(processedPoint);
    });
    
    // Draw data points with advanced tooltips
    processedData.forEach((point, index) => {
        const cx = scaleX(point.x);
        const cy = scaleY(point.y);
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        
        let tooltipData = null;
        let originalStroke = '';
        let originalStrokeWidth = '';
        
        if (point.type === 'ai') {
            circle.setAttribute('r', 5);
            circle.setAttribute('fill', '#ef4444');
            circle.setAttribute('stroke', '#dc2626');
            circle.setAttribute('stroke-width', 1);
            circle.setAttribute('opacity', 0.8);
            originalStroke = '#dc2626';
            originalStrokeWidth = '1';
            tooltipData = {
                title: point.model || point.username || 'AI',
                speed: point.x.toFixed(1),
                performance: point.y.toFixed(1),
                bgColor: '#dc2626'
            };
        } else if (point.type === 'named') {
            circle.setAttribute('r', 4);
            circle.setAttribute('fill', '#3b82f6');
            circle.setAttribute('stroke', '#2563eb');
            circle.setAttribute('stroke-width', 1);
            circle.setAttribute('opacity', 0.7);
            originalStroke = '#2563eb';
            originalStrokeWidth = '1';
            tooltipData = {
                title: point.username,
                speed: point.x.toFixed(1),
                performance: point.y.toFixed(1),
                bgColor: '#2563eb'
            };
        } else { // anonymous
            circle.setAttribute('r', 4);
            circle.setAttribute('fill', '#8b5cf6');
            circle.setAttribute('stroke', '#7c3aed');
            circle.setAttribute('stroke-width', 1);
            circle.setAttribute('opacity', 0.7);
            originalStroke = '#7c3aed';
            originalStrokeWidth = '1';
            tooltipData = {
                title: 'Anonymous',
                speed: point.x.toFixed(1),
                performance: point.y.toFixed(1),
                bgColor: '#7c3aed'
            };
        }
        
        circle.setAttribute('class', 'scatter-point cursor-pointer');
        
        // Create advanced tooltip
        const tooltip = createLeaderboardTooltip(cx, cy, tooltipData, index, g);
        g.appendChild(tooltip);
        
        // Create larger invisible hover zone for easier targeting
        const hoverZone = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hoverZone.setAttribute('cx', cx);
        hoverZone.setAttribute('cy', cy);
        hoverZone.setAttribute('r', 15); // Much larger hover area
        hoverZone.setAttribute('fill', 'transparent');
        hoverZone.setAttribute('stroke', 'none');
        hoverZone.setAttribute('cursor', 'pointer');
        
        // Hover event handlers
        const showTooltip = () => {
            tooltip.classList.add('visible');
            circle.setAttribute('stroke-width', '3');
            circle.setAttribute('stroke', '#000');
        };
        
        const hideTooltip = () => {
            tooltip.classList.remove('visible');
            circle.setAttribute('stroke-width', originalStrokeWidth);
            circle.setAttribute('stroke', originalStroke);
        };
        
        // Add hover event listeners to both the zone and the actual circle
        hoverZone.addEventListener('mouseenter', showTooltip);
        hoverZone.addEventListener('mouseleave', hideTooltip);
        circle.addEventListener('mouseenter', showTooltip);
        circle.addEventListener('mouseleave', hideTooltip);
        
        g.appendChild(hoverZone);
        g.appendChild(circle);
    });
}

// Create custom tooltip for leaderboard scatter plot
function createLeaderboardTooltip(cx, cy, data, id, parentGroup) {
    const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    tooltip.setAttribute('class', 'custom-tooltip');
    tooltip.setAttribute('id', `leaderboard-tooltip-${id}`);
    
    // Add CSS for visibility toggle
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
        .custom-tooltip { opacity: 0; transition: opacity 0.2s; }
        .custom-tooltip.visible { opacity: 1; }
    `;
    if (!document.querySelector('#leaderboard-scatter-tooltip-styles')) {
        style.setAttribute('id', 'leaderboard-scatter-tooltip-styles');
        parentGroup.appendChild(style);
    }
    
    // Position tooltip above the dot to avoid clipping
    const tooltipY = cy - 60;
    const tooltipWidth = 90;
    const tooltipHeight = 48;
    
    // Adjust position if tooltip would go off-screen
    const adjustedTooltipY = tooltipY < 0 ? cy + 12 : tooltipY;
    
    // Create background rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', cx - tooltipWidth/2);
    rect.setAttribute('y', adjustedTooltipY);
    rect.setAttribute('width', tooltipWidth);
    rect.setAttribute('height', tooltipHeight);
    rect.setAttribute('rx', 6);
    rect.setAttribute('ry', 6);
    rect.setAttribute('fill', data.bgColor);
    rect.setAttribute('opacity', 0.95);
    tooltip.appendChild(rect);
    
    // Create white border
    const border = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    border.setAttribute('x', cx - tooltipWidth/2);
    border.setAttribute('y', adjustedTooltipY);
    border.setAttribute('width', tooltipWidth);
    border.setAttribute('height', tooltipHeight);
    border.setAttribute('rx', 6);
    border.setAttribute('ry', 6);
    border.setAttribute('fill', 'none');
    border.setAttribute('stroke', 'white');
    border.setAttribute('stroke-width', 1.5);
    tooltip.appendChild(border);
    
    // Create title text
    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleText.setAttribute('x', cx);
    titleText.setAttribute('y', adjustedTooltipY + 12);
    titleText.setAttribute('text-anchor', 'middle');
    titleText.setAttribute('font-size', '10px');
    titleText.setAttribute('font-weight', 'bold');
    titleText.setAttribute('fill', 'white');
    titleText.textContent = data.title.length > 14 ? data.title.substring(0, 14) + '...' : data.title;
    tooltip.appendChild(titleText);
    
    // Create speed label text
    const speedText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    speedText.setAttribute('x', cx);
    speedText.setAttribute('y', adjustedTooltipY + 26);
    speedText.setAttribute('text-anchor', 'middle');
    speedText.setAttribute('font-size', '9px');
    speedText.setAttribute('fill', 'white');
    speedText.setAttribute('opacity', 0.95);
    speedText.textContent = `Speed: ${data.speed}`;
    tooltip.appendChild(speedText);
    
    // Create performance label text
    const performanceText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    performanceText.setAttribute('x', cx);
    performanceText.setAttribute('y', adjustedTooltipY + 38);
    performanceText.setAttribute('text-anchor', 'middle');
    performanceText.setAttribute('font-size', '9px');
    performanceText.setAttribute('fill', 'white');
    performanceText.setAttribute('opacity', 0.95);
    performanceText.textContent = `Performance: ${data.performance}`;
    tooltip.appendChild(performanceText);
    
    return tooltip;
}

// Global function for retry button
window.loadLeaderboardData = loadLeaderboardData;