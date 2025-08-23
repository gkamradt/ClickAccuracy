// Click Accuracy Game - Analytics and Visualization

import { formatPercentage, formatTime } from './game-logic.js';

// Import scoring utilities (will be loaded as ES modules in the browser)
let scoringUtils = null;

// Leaderboard data cache
let leaderboardDataCache = {
    data: null,
    timestamp: 0,
    isLoading: false
};

// Dynamic import for scoring utilities - now uses centralized API endpoint
async function loadScoringUtils() {
    if (!scoringUtils) {
        try {
            // Use centralized scoring from the API by creating a scoring helper
            scoringUtils = {
                calculateSpeedScore: (durationMs, totalHits) => {
                    if (totalHits === 0) return 0;
                    const avgTimePerHit = durationMs / totalHits / 1000;
                    
                    // Perfect speed gets 100
                    if (avgTimePerHit <= 0.1) return 100;
                    
                    // Exponential decay: score = 100 * e^(-t/3.5)  
                    // This gives roughly: 0.1s=97%, 1s=75%, 2s=57%, 3s=42%, 5s=24%
                    const score = 100 * Math.exp(-avgTimePerHit / 3.5);
                    
                    return Math.max(0, Math.round(score * 10) / 10);
                },
                calculatePerformanceScore: (avgAccuracy, totalHits) => {
                    if (totalHits === 0) return 0;
                    const distanceMultiplier = Math.min(1.0, totalHits / 20);
                    const score = avgAccuracy * distanceMultiplier * 100;
                    return Math.round(score * 10) / 10;
                },
                formatScore: (score) => {
                    return score % 1 === 0 ? score.toString() : score.toFixed(1);
                }
            };
        } catch (error) {
            console.warn('Could not load scoring utilities:', error);
            // Fallback scoring
            scoringUtils = {
                calculateSpeedScore: () => 0,
                calculatePerformanceScore: (avgAccuracy) => avgAccuracy * 100,
                formatScore: (score) => score.toFixed(1)
            };
        }
    }
    return scoringUtils;
}

// Create shooting range visualization
export function createShootingRangeVisualization(runState, shootingRange) {
    // Clear previous visualization
    shootingRange.innerHTML = '';
    
    // Set up coordinate system (600x600 visualization area)
    const vizSize = 600;
    const centerX = vizSize / 2;
    const centerY = vizSize / 2;
    
    // Find the maximum extent we need to show (either click distance or target radius)
    let maxExtent = 0;
    runState.logs.forEach(log => {
        const clickDistance = Math.hypot(log.cx - log.tx, log.cy - log.ty);
        const targetRadius = log.r;
        // Consider both how far the click is from center AND the target radius
        maxExtent = Math.max(maxExtent, clickDistance + targetRadius, targetRadius);
    });
    
    // Scale factor to fit everything in visualization (with some padding)
    const scale = maxExtent > 0 ? (vizSize * 0.35) / maxExtent : 1;
    
    // Draw each click
    runState.logs.forEach((log, index) => {
        // Calculate relative position (click relative to target center)
        const relativeX = log.cx - log.tx;
        const relativeY = log.cy - log.ty;
        
        // Scale to visualization coordinates
        const vizX = centerX + (relativeX * scale);
        const vizY = centerY + (relativeY * scale);
        
        // Draw target circle for this click
        const targetCircle = document.createElement('div');
        targetCircle.style.position = 'absolute';
        targetCircle.style.left = (centerX - (log.r * scale)) + 'px';
        targetCircle.style.top = (centerY - (log.r * scale)) + 'px';
        targetCircle.style.width = (log.r * scale * 2) + 'px';
        targetCircle.style.height = (log.r * scale * 2) + 'px';
        targetCircle.style.border = log.hit ? '2px solid #10b981' : '2px solid #ef4444';
        targetCircle.style.borderRadius = '50%';
        targetCircle.style.backgroundColor = 'transparent';
        targetCircle.style.opacity = '0.3';
        shootingRange.appendChild(targetCircle);
        
        // Draw click marker
        const clickMarker = document.createElement('div');
        clickMarker.style.position = 'absolute';
        clickMarker.style.left = (vizX - 12) + 'px';
        clickMarker.style.top = (vizY - 12) + 'px';
        clickMarker.style.width = '24px';
        clickMarker.style.height = '24px';
        clickMarker.style.backgroundColor = log.hit ? '#10b981' : '#ef4444';
        clickMarker.style.border = '2px solid white';
        clickMarker.style.borderRadius = '50%';
        clickMarker.style.display = 'flex';
        clickMarker.style.alignItems = 'center';
        clickMarker.style.justifyContent = 'center';
        clickMarker.style.color = 'white';
        clickMarker.style.fontSize = '10px';
        clickMarker.style.fontWeight = 'bold';
        clickMarker.style.zIndex = '10';
        clickMarker.textContent = (index + 1).toString();
        clickMarker.title = `Click ${index + 1}: ${log.hit ? 'Hit' : 'Miss'} - Accuracy: ${log.hit ? formatPercentage(log.a) : 'N/A'}`;
        shootingRange.appendChild(clickMarker);
    });
    
    // Draw center crosshair
    const crosshair = document.createElement('div');
    crosshair.style.position = 'absolute';
    crosshair.style.left = (centerX - 1) + 'px';
    crosshair.style.top = '0px';
    crosshair.style.width = '2px';
    crosshair.style.height = vizSize + 'px';
    crosshair.style.backgroundColor = '#374151';
    crosshair.style.opacity = '0.3';
    shootingRange.appendChild(crosshair);
    
    const crosshairH = document.createElement('div');
    crosshairH.style.position = 'absolute';
    crosshairH.style.left = '0px';
    crosshairH.style.top = (centerY - 1) + 'px';
    crosshairH.style.width = vizSize + 'px';
    crosshairH.style.height = '2px';
    crosshairH.style.backgroundColor = '#374151';
    crosshairH.style.opacity = '0.3';
    shootingRange.appendChild(crosshairH);
}

// Show game over modal with reorganized layout
export async function showGameOverModal(runState, liveStats, gameOverModal, shootingRange, finalElements) {
    liveStats.classList.add('hidden');
    
    // Load scoring utilities
    const scoring = await loadScoringUtils();
    
    // Calculate enhanced scores
    const speedScore = scoring.calculateSpeedScore(runState.getDuration(), runState.hits);
    const performanceScore = scoring.calculatePerformanceScore(runState.getAverageAccuracy(), runState.hits);
    
    // Update main final statistics  
    updateMainStatistics(gameOverModal, performanceScore, speedScore, scoring, runState);
    
    // Create scatter plot below main stats
    await createScatterPlotVisualization(gameOverModal, speedScore, performanceScore);
    
    // Add username input section above buttons (at the bottom)
    addUsernameSection(gameOverModal);
    
    // Then create shooting range visualization at bottom
    // createShootingRangeVisualization(runState, shootingRange); // Commented out - cool but not providing extra value right now
    
    // Submit game data to API (anonymously first)
    const submissionResult = await submitGameData(runState, speedScore, performanceScore);
    
    gameOverModal.classList.remove('hidden');
    
    // Setup username functionality after modal is shown
    if (submissionResult && submissionResult.runId) {
        setupUsernameInput(submissionResult.runId);
    }
    
    console.log('Game Over Modal displayed with', runState.logs.length, 'clicks visualized');
    console.log('Enhanced Scores - Speed:', speedScore, 'Performance:', performanceScore);
}

// Preload leaderboard data in background (call when game starts)
export async function preloadLeaderboardData() {
    // Don't reload if data is fresh (less than 2 minutes old) or currently loading
    const now = Date.now();
    const cacheAge = now - leaderboardDataCache.timestamp;
    const cacheMaxAge = 2 * 60 * 1000; // 2 minutes
    
    if (leaderboardDataCache.isLoading || (leaderboardDataCache.data && cacheAge < cacheMaxAge)) {
        console.log('🏆 Leaderboard data already fresh or loading');
        return;
    }
    
    console.log('🔄 Preloading leaderboard data in background...');
    leaderboardDataCache.isLoading = true;
    
    try {
        const response = await fetch('/api/leaderboard');
        if (response.ok) {
            leaderboardDataCache.data = await response.json();
            leaderboardDataCache.timestamp = now;
            console.log('✅ Leaderboard data preloaded successfully:', {
                hallOfFameCount: leaderboardDataCache.data.hall_of_fame?.length || 0,
                scatterPointsCount: leaderboardDataCache.data.scatter_data?.length || 0
            });
        } else {
            console.warn('⚠️ Failed to preload leaderboard data:', response.status);
        }
    } catch (error) {
        console.error('❌ Error preloading leaderboard data:', error);
    } finally {
        leaderboardDataCache.isLoading = false;
    }
}

// Update main statistics at the top of modal (data dense)
function updateMainStatistics(modal, performanceScore, speedScore, scoring, runState) {
    // Find the existing stats summary section
    let mainStatsSection = modal.querySelector('#main-stats-section');
    
    if (!mainStatsSection) {
        // Create main stats section and insert at the top
        mainStatsSection = document.createElement('div');
        mainStatsSection.id = 'main-stats-section';
        mainStatsSection.className = 'mb-3';
        
        // Insert after the title
        const title = modal.querySelector('h2');
        if (title) {
            title.parentNode.insertBefore(mainStatsSection, title.nextSibling);
        }
    }
    
    // Update main statistics content (Performance Score first, then Speed Score)
    mainStatsSection.innerHTML = `
        <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <h3 class="text-base font-bold text-blue-800 mb-2 text-center">Your Performance</h3>
            <div class="grid grid-cols-2 gap-2 mb-2">
                <div class="bg-white p-2 rounded-lg shadow-sm border border-blue-100 text-center">
                    <div class="text-xs text-blue-600 font-medium mb-1">Performance Score</div>
                    <div class="text-xl font-bold text-blue-800 mb-1">${scoring.formatScore(performanceScore)}</div>
                    <div class="text-xs text-blue-500">Accuracy & Consistency</div>
                </div>
                <div class="bg-white p-2 rounded-lg shadow-sm border border-blue-100 text-center">
                    <div class="text-xs text-blue-600 font-medium mb-1">Speed Score</div>
                    <div class="text-xl font-bold text-blue-800 mb-1">${scoring.formatScore(speedScore)}</div>
                    <div class="text-xs text-blue-500">Timing & Efficiency</div>
                </div>
            </div>
            <div class="grid grid-cols-5 gap-1">
                <div class="bg-white p-1.5 rounded shadow-sm text-center">
                    <div class="text-xs text-gray-500">Total Hits</div>
                    <div class="text-sm font-semibold text-gray-700">${runState.hits}</div>
                </div>
                <div class="bg-white p-1.5 rounded shadow-sm text-center">
                    <div class="text-xs text-gray-500">Avg Accuracy</div>
                    <div class="text-sm font-semibold text-gray-700">${formatPercentage(runState.getAverageAccuracy())}</div>
                </div>
                <div class="bg-white p-1.5 rounded shadow-sm text-center">
                    <div class="text-xs text-gray-500">Best Accuracy</div>
                    <div class="text-sm font-semibold text-gray-700">${formatPercentage(runState.bestAccuracy)}</div>
                </div>
                <div class="bg-white p-1.5 rounded shadow-sm text-center">
                    <div class="text-xs text-gray-500">Final Size</div>
                    <div class="text-sm font-semibold text-gray-700">${runState.finalRadius}px</div>
                </div>
                <div class="bg-white p-1.5 rounded shadow-sm text-center">
                    <div class="text-xs text-gray-500">Duration</div>
                    <div class="text-sm font-semibold text-gray-700">${formatTime(runState.getDuration())}</div>
                </div>
            </div>
        </div>
    `;
}


// Add username input section to modal (simplified)
function addUsernameSection(modal) {
    // Check if username section already exists
    let usernameSection = modal.querySelector('#username-section');
    
    if (!usernameSection) {
        // Create username section
        usernameSection = document.createElement('div');
        usernameSection.id = 'username-section';
        usernameSection.className = 'mb-3';
        
        // Insert after the scatter plot section
        const scatterSection = modal.querySelector('#scatter-plot-section');
        if (scatterSection) {
            scatterSection.parentNode.insertBefore(usernameSection, scatterSection.nextSibling);
        } else {
            // Fallback: insert before action buttons
            const actionButtons = modal.querySelector('.flex.justify-center');
            if (actionButtons) {
                actionButtons.parentNode.insertBefore(usernameSection, actionButtons);
            }
        }
    }
    
    // Update username section content
    usernameSection.innerHTML = `
        <div class="bg-gray-50 p-2 rounded border border-gray-200">
            <div class="flex items-center space-x-2">
                <label class="text-sm font-medium text-gray-700 whitespace-nowrap">Anon, save your name to get on the leaderboard:</label>
                <input 
                    type="text" 
                    id="username-input"
                    placeholder="Enter your name..." 
                    maxlength="20"
                    class="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                />
                <button 
                    id="save-username-btn"
                    class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors whitespace-nowrap"
                >
                    Save
                </button>
            </div>
            <div id="username-status" class="text-xs text-gray-500 mt-1 hidden"></div>
        </div>
    `;
}

// Submit game data to API
async function submitGameData(runState, speedScore, performanceScore) {
    try {
        console.log('🚀 Submitting game data to API...');
        
        // Prepare game stats
        const stats = {
            totalHits: runState.hits,
            avgAccuracy: runState.getAverageAccuracy(),
            bestAccuracy: runState.bestAccuracy,
            finalRadius: runState.finalRadius,
            durationMs: runState.getDuration()
        };
        
        // Prepare click logs (convert to API format)
        const clickLogs = runState.logs.map(log => ({
            t: log.t,      // timestamp
            cx: log.cx,    // click x
            cy: log.cy,    // click y
            tx: log.tx,    // target x
            ty: log.ty,    // target y
            r: log.r,      // target radius
            d: log.d,      // distance
            hit: log.hit,  // hit boolean
            a: log.a       // accuracy
        }));
        
        // Prepare request payload
        const payload = {
            username: null, // Anonymous for now
            stats: stats,
            click_logs: clickLogs,
            badges: []      // Badge calculation could be added here
        };
        
        console.log('📊 Payload prepared:', {
            totalHits: stats.totalHits,
            avgAccuracy: (stats.avgAccuracy * 100).toFixed(1) + '%',
            durationMs: stats.durationMs,
            clickLogsCount: clickLogs.length
        });
        
        // Submit to API (works in both dev and production)
        const apiUrl = '/api/runs';
        console.log('🚀 Making API call to:', window.location.origin + apiUrl);
        console.log('🌍 Environment check:', {
            hostname: window.location.hostname,
            origin: window.location.origin,
            isProduction: window.location.hostname !== 'localhost'
        });
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Game data submitted successfully!', result);
            console.log('🏆 Your Rankings:', {
                speedRank: result.rankings?.speed?.rank,
                performanceRank: result.rankings?.performance?.rank,
                speedPercentile: result.rankings?.speed?.percentile + 'th',
                performancePercentile: result.rankings?.performance?.percentile + 'th'
            });
            return { runId: result.id, ...result };
        } else {
            const error = await response.text();
            console.error('❌ Failed to submit game data:', response.status, error);
            return null;
        }
        
    } catch (error) {
        console.error('💥 Error submitting game data:', error);
        // Don't block the UI - game over modal should still show
        return null;
    }
}

// Setup username input functionality
function setupUsernameInput(runId) {
    const usernameInput = document.getElementById('username-input');
    const saveButton = document.getElementById('save-username-btn');
    const statusDiv = document.getElementById('username-status');
    
    if (!usernameInput || !saveButton || !statusDiv) {
        console.warn('Username input elements not found');
        return;
    }
    
    // Set initial status
    // statusDiv.textContent = 'Your score has been saved anonymously. Add your name to appear on the leaderboard!';
    // statusDiv.className = 'text-xs text-gray-500';
    
    // Handle save button click
    saveButton.addEventListener('click', async () => {
        const username = usernameInput.value.trim();
        
        if (!username) {
            statusDiv.textContent = 'Please enter a name';
            statusDiv.className = 'text-xs text-red-500';
            return;
        }
        
        if (username.length > 20) {
            statusDiv.textContent = 'Name must be 20 characters or less';
            statusDiv.className = 'text-xs text-red-500';
            return;
        }
        
        // Disable button during submission
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        statusDiv.textContent = 'Updating your name...';
        statusDiv.className = 'text-xs text-blue-500';
        
        try {
            const response = await fetch(`/api/runs/${runId}/username`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: username })
            });
            
            if (response.ok) {
                statusDiv.textContent = `✅ Success! Your name "${username}" has been added to the leaderboard.`;
                statusDiv.className = 'text-xs text-green-600';
                usernameInput.disabled = true;
                saveButton.style.display = 'none';
            } else {
                const error = await response.text();
                statusDiv.textContent = `❌ Failed to save name: ${error}`;
                statusDiv.className = 'text-xs text-red-500';
                saveButton.disabled = false;
                saveButton.textContent = 'Save';
            }
        } catch (error) {
            console.error('Error saving username:', error);
            statusDiv.textContent = '❌ Network error. Please try again.';
            statusDiv.className = 'text-xs text-red-500';
            saveButton.disabled = false;
            saveButton.textContent = 'Save';
        }
    });
    
    // Handle Enter key in input
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveButton.click();
        }
    });
}

// Create scatter plot visualization in the modal
async function createScatterPlotVisualization(modal, speedScore, performanceScore) {
    // Check if scatter plot section already exists
    let scatterSection = modal.querySelector('#scatter-plot-section');
    
    if (!scatterSection) {
        // Create scatter plot section and insert after main stats
        scatterSection = document.createElement('div');
        scatterSection.id = 'scatter-plot-section';
        scatterSection.className = 'mb-4';
        
        // Insert after main stats section
        const mainStatsSection = modal.querySelector('#main-stats-section');
        if (mainStatsSection) {
            mainStatsSection.parentNode.insertBefore(scatterSection, mainStatsSection.nextSibling);
        } else {
            // Fallback: insert after title
            const title = modal.querySelector('h2');
            if (title) {
                title.parentNode.insertBefore(scatterSection, title.nextSibling);
            }
        }
    }
    
    // Set up scatter plot HTML structure
    scatterSection.innerHTML = `
        <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 class="text-base font-bold text-gray-800 mb-2 text-center">Performance vs. All Players</h3>
            <div class="flex justify-center">
                <svg id="modal-scatter-plot" width="600" height="250" class="bg-white border border-gray-300 rounded-lg">
                    <!-- Chart content will be rendered here -->
                </svg>
            </div>
        </div>
    `;
    
    // Use cached leaderboard data or fallback to fresh fetch
    let leaderboardData;
    
    if (leaderboardDataCache.data) {
        console.log('🚀 Using cached leaderboard data for scatter plot');
        leaderboardData = leaderboardDataCache.data;
    } else {
        console.log('🔄 No cached data, fetching leaderboard data...');
        try {
            const response = await fetch('/api/leaderboard');
            if (response.ok) {
                leaderboardData = await response.json();
                // Cache this data for future use
                leaderboardDataCache.data = leaderboardData;
                leaderboardDataCache.timestamp = Date.now();
                console.log('✅ Leaderboard data fetched and cached:', {
                    scatterPointsCount: leaderboardData.scatter_data?.length || 0
                });
            } else {
                throw new Error(`API returned ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to fetch leaderboard data:', error);
            // Use empty data for now
            leaderboardData = { scatter_data: [] };
        }
    }
    
    // Process the data and add current player's score
    const scatterData = leaderboardData.scatter_data || [];
    
    // Add current player's run to the data
    scatterData.push({
        x: speedScore,
        y: performanceScore,
        type: 'current',
        username: 'Your Run'
    });
    
    // Process human players into named vs anonymous
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
                processedPoint.username = null;
            }
        }
        
        processedData.push(processedPoint);
    });
    
    // Render the scatter plot
    renderModalScatterPlot(processedData);
}

// Render scatter plot specifically for the modal (simplified version)
function renderModalScatterPlot(data) {
    const svg = document.getElementById('modal-scatter-plot');
    if (!svg) return;
    
    svg.innerHTML = ''; // Clear previous content
    
    // Chart configuration
    const config = {
        width: 600,
        height: 250,
        margin: { top: 15, right: 20, bottom: 55, left: 65 },
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
    xTitle.setAttribute('y', chartHeight + 40);
    xTitle.setAttribute('text-anchor', 'middle');
    xTitle.setAttribute('font-size', '14px');
    xTitle.setAttribute('font-weight', 'bold');
    xTitle.setAttribute('fill', '#374151');
    xTitle.textContent = 'Speed Score →';
    g.appendChild(xTitle);
    
    // Y-axis title
    const yTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yTitle.setAttribute('x', -40);
    yTitle.setAttribute('y', chartHeight / 2);
    yTitle.setAttribute('text-anchor', 'middle');
    yTitle.setAttribute('transform', `rotate(-90, -40, ${chartHeight / 2})`);
    yTitle.setAttribute('font-size', '14px');
    yTitle.setAttribute('font-weight', 'bold');
    yTitle.setAttribute('fill', '#374151');
    yTitle.textContent = 'Performance Score →';
    g.appendChild(yTitle);
    
    // Draw data points with hover tooltips
    data.forEach((point, index) => {
        const cx = scaleX(point.x);
        const cy = scaleY(point.y);
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        
        let tooltipData = null;
        
        if (point.type === 'current') {
            circle.setAttribute('r', 8);
            circle.setAttribute('fill', '#10b981');
            circle.setAttribute('stroke', '#059669');
            circle.setAttribute('stroke-width', 3);
            circle.setAttribute('opacity', 1);
            tooltipData = {
                title: 'Your Run',
                speed: point.x.toFixed(1),
                performance: point.y.toFixed(1),
                bgColor: '#059669'
            };
            
            // Add label for current user
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', cx);
            label.setAttribute('y', cy + 20);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-size', '11px');
            label.setAttribute('font-weight', 'bold');
            label.setAttribute('fill', '#059669');
            label.textContent = 'Your Run';
            g.appendChild(label);
        } else if (point.type === 'ai') {
            circle.setAttribute('r', 6);
            circle.setAttribute('fill', '#ef4444');
            circle.setAttribute('stroke', '#dc2626');
            circle.setAttribute('stroke-width', 1);
            circle.setAttribute('opacity', 0.8);
            tooltipData = {
                title: point.model || point.username,
                speed: point.x.toFixed(1),
                performance: point.y.toFixed(1),
                bgColor: '#dc2626'
            };
            
            // Add label for AI models
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', cx);
            label.setAttribute('y', cy + 18);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-size', '10px');
            label.setAttribute('font-weight', 'bold');
            label.setAttribute('fill', '#dc2626');
            label.textContent = point.model || point.username;
            g.appendChild(label);
        } else if (point.type === 'named') {
            circle.setAttribute('r', 4);
            circle.setAttribute('fill', '#3b82f6');
            circle.setAttribute('stroke', '#2563eb');
            circle.setAttribute('stroke-width', 1);
            circle.setAttribute('opacity', 0.7);
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
            tooltipData = {
                title: 'Anonymous',
                speed: point.x.toFixed(1),
                performance: point.y.toFixed(1),
                bgColor: '#7c3aed'
            };
        }
        
        circle.setAttribute('class', 'scatter-point');
        
        // Create custom tooltip for named and anonymous players
        if (point.type === 'named' || point.type === 'anonymous') {
            const tooltip = createModalTooltip(cx, cy, tooltipData, index, g);
            g.appendChild(tooltip);
            
            // Create larger invisible hover zone for easier targeting
            const hoverZone = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            hoverZone.setAttribute('cx', cx);
            hoverZone.setAttribute('cy', cy);
            hoverZone.setAttribute('r', 15); // Much larger hover area
            hoverZone.setAttribute('fill', 'transparent');
            hoverZone.setAttribute('stroke', 'none');
            hoverZone.setAttribute('cursor', 'pointer');
            
            // Shared hover functions
            const showTooltip = () => {
                tooltip.classList.add('visible');
                circle.style.strokeWidth = '3';
                circle.style.stroke = '#000';
            };
            
            const hideTooltip = () => {
                tooltip.classList.remove('visible');
                circle.style.strokeWidth = point.type === 'named' ? '1' : '1';
                circle.style.stroke = point.type === 'named' ? '#2563eb' : '#7c3aed';
            };
            
            // Add hover event listeners to BOTH the zone and the actual circle
            hoverZone.addEventListener('mouseenter', showTooltip);
            hoverZone.addEventListener('mouseleave', hideTooltip);
            circle.addEventListener('mouseenter', showTooltip);
            circle.addEventListener('mouseleave', hideTooltip);
            
            g.appendChild(hoverZone);
        }
        
        g.appendChild(circle);
    });
    
    console.log(`✅ Scatter plot rendered with ${data.length} data points`);
}

// Create custom tooltip for modal scatter plot
function createModalTooltip(cx, cy, data, id, parentGroup) {
    const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    tooltip.setAttribute('class', 'custom-tooltip');
    tooltip.setAttribute('id', `modal-tooltip-${id}`);
    
    // Add CSS for visibility toggle
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
        .custom-tooltip { opacity: 0; transition: opacity 0.2s; }
        .custom-tooltip.visible { opacity: 1; }
    `;
    if (!document.querySelector('#modal-scatter-tooltip-styles')) {
        style.setAttribute('id', 'modal-scatter-tooltip-styles');
        parentGroup.appendChild(style);
    }
    
    // Position tooltip below the dot
    const tooltipY = cy + 12;
    const tooltipWidth = 90;
    const tooltipHeight = 48;
    
    // Create background rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', cx - tooltipWidth/2);
    rect.setAttribute('y', tooltipY);
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
    border.setAttribute('y', tooltipY);
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
    titleText.setAttribute('y', tooltipY + 12);
    titleText.setAttribute('text-anchor', 'middle');
    titleText.setAttribute('font-size', '10px');
    titleText.setAttribute('font-weight', 'bold');
    titleText.setAttribute('fill', 'white');
    titleText.textContent = data.title.length > 14 ? data.title.substring(0, 14) + '...' : data.title;
    tooltip.appendChild(titleText);
    
    // Create speed label text
    const speedText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    speedText.setAttribute('x', cx);
    speedText.setAttribute('y', tooltipY + 26);
    speedText.setAttribute('text-anchor', 'middle');
    speedText.setAttribute('font-size', '9px');
    speedText.setAttribute('fill', 'white');
    speedText.setAttribute('opacity', 0.95);
    speedText.textContent = `Speed: ${data.speed}`;
    tooltip.appendChild(speedText);
    
    // Create performance label text
    const performanceText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    performanceText.setAttribute('x', cx);
    performanceText.setAttribute('y', tooltipY + 38);
    performanceText.setAttribute('text-anchor', 'middle');
    performanceText.setAttribute('font-size', '9px');
    performanceText.setAttribute('fill', 'white');
    performanceText.setAttribute('opacity', 0.95);
    performanceText.textContent = `Performance: ${data.performance}`;
    tooltip.appendChild(performanceText);
    
    return tooltip;
}

// Share screenshot functionality
export function handleShare() {
    // Simple alert for now - could be enhanced with actual sharing
    alert('Screenshot tip: Use your device\'s screenshot feature to capture this analysis!\\n\\nOn desktop: Ctrl+Shift+S (Windows) or Cmd+Shift+4 (Mac)\\nOn mobile: Power + Volume Down');
}