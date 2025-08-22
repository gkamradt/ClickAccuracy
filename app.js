// Click Accuracy Game - Main Application

// Configuration
const CONFIG = {
    CONTAINER_SIDE: 'min(600px, 80vw, 80vh)',
    START_RADIUS_RATIO: 0.10,
    MIN_RADIUS_PX: 1,
    SHRINK_STEPS_APPROX: 20,
    WEIGHT_K: 1.5,
    DISPLAY_DECIMALS: 1,
    TIME_ORIGIN: 'onStart'
};

// Click Event Log Structure
class ClickEventLog {
    constructor(t, cx, cy, tx, ty, r, d, hit, a = null, w = null, s = null) {
        this.t = t;           // ms since run start
        this.cx = cx;         // click x coordinate
        this.cy = cy;         // click y coordinate  
        this.tx = tx;         // target center x
        this.ty = ty;         // target center y
        this.r = r;           // target radius at time of click
        this.d = d;           // distance from center
        this.hit = hit;       // hit or miss boolean
        this.a = a;           // unweighted accuracy [0,1]
        this.w = w;           // weight
        this.s = s;           // weighted score a*w
    }
}

// Run State Structure
class RunState {
    constructor() {
        this.phase = 'idle';      // 'idle' | 'playing' | 'ended'
        this.startTs = null;      // epoch ms
        this.endTs = null;        // epoch ms
        this.hits = 0;            // total successful hits
        this.currentR = 0;        // current radius in px
        this.startR = 0;          // starting radius in px
        this.deltaR = 0;          // radius decrement per hit
        this.target = { x: 0, y: 0 };  // current target position
        this.logs = [];           // array of ClickEventLog instances
        
        // Running statistics
        this.totalAccuracy = 0;   // sum of all hit accuracies
        this.bestAccuracy = 0;    // best single-click accuracy
        this.totalWeightedScore = 0; // cumulative weighted score
        this.finalRadius = 0;     // radius at last successful hit
    }
    
    reset() {
        this.phase = 'idle';
        this.startTs = null;
        this.endTs = null;
        this.hits = 0;
        this.currentR = 0;
        this.startR = 0;
        this.deltaR = 0;
        this.target = { x: 0, y: 0 };
        this.logs = [];
        
        // Reset statistics
        this.totalAccuracy = 0;
        this.bestAccuracy = 0;
        this.totalWeightedScore = 0;
        this.finalRadius = 0;
    }
    
    startGame(containerSize) {
        this.phase = 'playing';
        this.startTs = Date.now();
        this.endTs = null;
        this.hits = 0;
        this.startR = Math.floor(CONFIG.START_RADIUS_RATIO * containerSize);
        this.currentR = this.startR;
        this.deltaR = Math.max(1, Math.ceil(this.startR / CONFIG.SHRINK_STEPS_APPROX));
        this.logs = [];
        
        // Initialize statistics
        this.totalAccuracy = 0;
        this.bestAccuracy = 0;
        this.totalWeightedScore = 0;
        this.finalRadius = this.startR;
    }
    
    endGame() {
        this.phase = 'ended';
        this.endTs = Date.now();
    }
    
    recordHit(clickLog) {
        this.hits++;
        this.logs.push(clickLog);
        
        // Update running statistics
        if (clickLog.a !== null) {
            this.totalAccuracy += clickLog.a;
            this.bestAccuracy = Math.max(this.bestAccuracy, clickLog.a);
            this.finalRadius = clickLog.r;
        }
        if (clickLog.s !== null) {
            this.totalWeightedScore += clickLog.s;
        }
    }
    
    recordMiss(clickLog) {
        this.logs.push(clickLog);
        this.endGame();
    }
    
    getAverageAccuracy() {
        return this.hits > 0 ? this.totalAccuracy / this.hits : 0;
    }
    
    getDuration() {
        const end = this.endTs || Date.now();
        return this.startTs ? end - this.startTs : 0;
    }
}

// Initialize game state
let runState = new RunState();

// Helper Functions

// Random target placement
function randomTarget(side, radius) {
    const min = radius;
    const max = side - radius;
    return {
        x: min + Math.random() * (max - min),
        y: min + Math.random() * (max - min)
    };
}

// Calculate distance between two points
function calculateDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

// Calculate unweighted accuracy (0 at edge, 1 at center)
function accuracyUnweighted(d, r) {
    return Math.max(0, 1 - d / r);
}

// Calculate weight based on radius
function weight(r0, r, k) {
    return Math.pow(r0 / r, k);
}

// Shrink radius after hit
function nextRadius(r, dr) {
    return Math.max(CONFIG.MIN_RADIUS_PX, r - dr);
}

// Get relative coordinates from mouse event
function relCoords(e, el) {
    const rect = el.getBoundingClientRect();
    return { 
        cx: e.clientX - rect.left, 
        cy: e.clientY - rect.top 
    };
}

// Format time as mm:ss.SS
function formatTime(ms) {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}

// Format percentage with configured decimal places
function formatPercentage(value) {
    return (value * 100).toFixed(CONFIG.DISPLAY_DECIMALS) + '%';
}

// Target Rendering Functions

function renderTarget(gameArea, x, y, radius) {
    // Remove existing target if any
    const existingTarget = gameArea.querySelector('.target-circle');
    if (existingTarget) {
        existingTarget.remove();
    }
    
    // Create new target element
    const target = document.createElement('div');
    target.className = 'target-circle';
    target.style.position = 'absolute';
    target.style.left = x + 'px';
    target.style.top = y + 'px';
    target.style.width = (radius * 2) + 'px';
    target.style.height = (radius * 2) + 'px';
    target.style.borderRadius = '9999px';
    target.style.backgroundColor = '#ef4444'; // red-500
    target.style.border = '2px solid #dc2626'; // red-600
    target.style.transform = 'translate(-50%, -50%)';
    target.style.pointerEvents = 'none'; // Target should not block clicks
    
    gameArea.appendChild(target);
}

function removeTarget(gameArea) {
    const target = gameArea.querySelector('.target-circle');
    if (target) {
        target.remove();
    }
}

function updateTargetPosition(gameArea) {
    const containerSize = gameArea.clientWidth;
    runState.target = randomTarget(containerSize, runState.currentR);
    renderTarget(gameArea, runState.target.x, runState.target.y, runState.currentR);
}

// State Transition Functions

function transitionToPlaying(gameArea) {
    const containerSize = gameArea.clientWidth; // Square, so width = height
    runState.startGame(containerSize);

    // Place first target
    runState.target = randomTarget(containerSize, runState.currentR);
    renderTarget(gameArea, runState.target.x, runState.target.y, runState.currentR);
}

function transitionToEnded(gameArea) {
    runState.endGame();
    // Keep the target visible to show where the miss occurred
}

function transitionToIdle() {
    runState.reset();
}

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Click Accuracy Game initialized');
    
    // Get DOM elements
    const modal = document.getElementById('modal');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const gameArea = document.getElementById('game-area');
    const liveStats = document.getElementById('live-stats');
    const scorecard = document.getElementById('scorecard');
    
    // Game over modal elements
    const gameOverModal = document.getElementById('game-over-modal');
    const restartModalBtn = document.getElementById('restart-modal-btn');
    const shareBtn = document.getElementById('share-btn');
    const shootingRange = document.getElementById('shooting-range');
    
    // Get stat display elements
    const statHits = document.getElementById('stat-hits');
    const statAvgAccuracy = document.getElementById('stat-avg-accuracy');
    const statBestAccuracy = document.getElementById('stat-best-accuracy');
    const statCurrentSize = document.getElementById('stat-current-size');
    const statElapsedTime = document.getElementById('stat-elapsed-time');
    
    // Get scorecard elements (old inline scorecard)
    const scoreHits = document.getElementById('score-hits');
    const scoreAvgAccuracy = document.getElementById('score-avg-accuracy');
    const scoreBestAccuracy = document.getElementById('score-best-accuracy');
    const scoreFinalSize = document.getElementById('score-final-size');
    const scoreDuration = document.getElementById('score-duration');
    
    // Get final stats elements (new modal)
    const finalHits = document.getElementById('final-hits');
    const finalAvgAccuracy = document.getElementById('final-avg-accuracy');
    const finalBestAccuracy = document.getElementById('final-best-accuracy');
    const finalTargetSize = document.getElementById('final-target-size');
    const finalDuration = document.getElementById('final-duration');
    
    // Timer interval reference
    let timerInterval = null;
    
    // Initial setup - disable game area until start is clicked
    gameArea.style.pointerEvents = 'none';
    
    // Update live statistics display
    function updateLiveStats() {
        if (runState.phase !== 'playing') return;
        
        // Update hit count
        statHits.textContent = runState.hits;
        
        // Update average accuracy
        const avgAccuracy = runState.getAverageAccuracy();
        statAvgAccuracy.textContent = formatPercentage(avgAccuracy);
        
        // Update best accuracy
        statBestAccuracy.textContent = formatPercentage(runState.bestAccuracy);
        
        // Update current size
        statCurrentSize.textContent = runState.currentR + 'px';
        
        // Update elapsed time
        const elapsed = runState.getDuration();
        statElapsedTime.textContent = formatTime(elapsed);
    }
    
    // Start timer for updating elapsed time
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (runState.phase === 'playing') {
                const elapsed = runState.getDuration();
                statElapsedTime.textContent = formatTime(elapsed);
            }
        }, 10); // Update every 10ms for centisecond precision
    }
    
    // Stop timer
    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }
    
    // Update scorecard display
    function updateScorecard() {
        if (runState.phase !== 'ended') return;
        
        // Update final scores
        scoreHits.textContent = runState.hits;
        scoreAvgAccuracy.textContent = formatPercentage(runState.getAverageAccuracy());
        scoreBestAccuracy.textContent = formatPercentage(runState.bestAccuracy);
        scoreFinalSize.textContent = runState.finalRadius + 'px';
        scoreDuration.textContent = formatTime(runState.getDuration());
        
        // Persist to localStorage (optional feature)
        try {
            const scorecardData = {
                hits: runState.hits,
                avgAccuracy: runState.getAverageAccuracy(),
                bestAccuracy: runState.bestAccuracy,
                finalRadius: runState.finalRadius,
                duration: runState.getDuration(),
                timestamp: Date.now()
            };
            localStorage.setItem('click-accuracy:last', JSON.stringify(scorecardData));
        } catch (e) {
            console.warn('Could not save scorecard to localStorage:', e);
        }
    }
    
    // Show scorecard and hide live stats (legacy function - keeping for compatibility)
    function showScorecard() {
        liveStats.classList.add('hidden');
        updateScorecard();
        scorecard.classList.remove('hidden');
        
        console.log('Scorecard displayed:', {
            hits: runState.hits,
            avgAccuracy: formatPercentage(runState.getAverageAccuracy()),
            bestAccuracy: formatPercentage(runState.bestAccuracy),
            finalSize: runState.finalRadius + 'px',
            duration: formatTime(runState.getDuration())
        });
    }
    
    // Create shooting range visualization
    function createShootingRangeVisualization() {
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
    
    // Update final stats modal
    function updateFinalStats() {
        finalHits.textContent = runState.hits;
        finalAvgAccuracy.textContent = formatPercentage(runState.getAverageAccuracy());
        finalBestAccuracy.textContent = formatPercentage(runState.bestAccuracy);
        finalTargetSize.textContent = runState.finalRadius + 'px';
        finalDuration.textContent = formatTime(runState.getDuration());
    }
    
    // Show game over modal with shooting range
    function showGameOverModal() {
        liveStats.classList.add('hidden');
        createShootingRangeVisualization();
        updateFinalStats();
        gameOverModal.classList.remove('hidden');
        
        console.log('Game Over Modal displayed with', runState.logs.length, 'clicks visualized');
    }
    
    // Click handling
    function handleGameClick(e) {
        // Only process clicks during playing phase
        if (runState.phase !== 'playing') {
            return;
        }
        
        // Get click coordinates relative to game area
        const coords = relCoords(e, gameArea);
        const cx = coords.cx;
        const cy = coords.cy;
        
        // Calculate distance from target center
        const tx = runState.target.x;
        const ty = runState.target.y;
        const distance = calculateDistance(cx, cy, tx, ty);
        
        // Determine if it's a hit (d <= r, including exact edge)
        const isHit = distance <= runState.currentR;
        
        // Calculate metrics
        const elapsedMs = Date.now() - runState.startTs;
        let accuracy = null;
        let weightValue = null;
        let score = null;
        
        if (isHit) {
            accuracy = accuracyUnweighted(distance, runState.currentR);
            weightValue = weight(runState.startR, runState.currentR, CONFIG.WEIGHT_K);
            score = accuracy * weightValue;
        }
        
        // Create click event log
        const clickLog = new ClickEventLog(
            elapsedMs,
            cx,
            cy,
            tx,
            ty,
            runState.currentR,
            distance,
            isHit,
            accuracy,
            weightValue,
            score
        );
        
        // Instrumentation hook
        if (window.CA_EVENTS) {
            window.CA_EVENTS.push({
                type: isHit ? 'hit' : 'miss',
                payload: {
                    accuracy: accuracy,
                    radius: runState.currentR,
                    time: elapsedMs
                }
            });
        }
        
        // Handle hit or miss
        if (isHit) {
            // Record hit (updates statistics)
            runState.recordHit(clickLog);
            
            console.log('Hit!', {
                accuracy: (accuracy * 100).toFixed(1) + '%',
                distance: distance.toFixed(2),
                radius: runState.currentR,
                avgAccuracy: (runState.getAverageAccuracy() * 100).toFixed(1) + '%',
                bestAccuracy: (runState.bestAccuracy * 100).toFixed(1) + '%',
                totalScore: runState.totalWeightedScore.toFixed(2)
            });
            
            // Shrink radius
            runState.currentR = nextRadius(runState.currentR, runState.deltaR);
            
            // Update live stats display
            updateLiveStats();
            
            // Check if radius reached minimum
            if (runState.currentR <= CONFIG.MIN_RADIUS_PX) {
                console.log('Target reached minimum size!');
                stopTimer();
                transitionToEnded(gameArea);
                showGameOverModal();
            } else {
                // Move target to new position
                updateTargetPosition(gameArea);
            }
        } else {
            console.log('Miss!', {
                distance: distance.toFixed(2),
                radius: runState.currentR
            });
            
            // Record miss and end game
            runState.recordMiss(clickLog);
            stopTimer();
            transitionToEnded(gameArea);
            showGameOverModal();
        }
    }
    
    // Add click listener to game area
    gameArea.addEventListener('click', handleGameClick);
    
    // State transition handlers
    function handleStart() {
        // Hide modal with fade effect
        modal.style.transition = 'opacity 0.3s';
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.pointerEvents = 'none';
        }, 300);
        
        // Transition to playing state
        transitionToPlaying(gameArea);
        
        // Show live stats
        liveStats.classList.remove('hidden');
        
        // Initialize stats display
        updateLiveStats();
        
        // Start the timer
        startTimer();
        
        // Enable game area interactions
        gameArea.style.pointerEvents = 'auto';
        
        console.log('Game started:', {
            phase: runState.phase,
            startRadius: runState.startR,
            deltaRadius: runState.deltaR,
            targetPosition: runState.target
        });
    }
    
    function handleRestart() {
        // Reset state
        transitionToIdle();
        
        // Stop timer
        stopTimer();
        
        // Remove target from game area
        removeTarget(gameArea);
        
        // Hide all modals and stats
        gameOverModal.classList.add('hidden');
        scorecard.classList.add('hidden');
        liveStats.classList.add('hidden');
        
        // Show start modal
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        
        // Disable game area interactions while modal is visible
        gameArea.style.pointerEvents = 'none';
        
        console.log('Game reset to idle state');
    }
    
    // Share screenshot functionality
    function handleShare() {
        // Simple alert for now - could be enhanced with actual sharing
        alert('Screenshot tip: Use your device\'s screenshot feature to capture this analysis!\n\nOn desktop: Ctrl+Shift+S (Windows) or Cmd+Shift+4 (Mac)\nOn mobile: Power + Volume Down');
    }
    
    // Add event listeners
    if (startBtn) {
        startBtn.addEventListener('click', handleStart);
    }
    
    if (restartBtn) {
        restartBtn.addEventListener('click', handleRestart);
    }
    
    if (restartModalBtn) {
        restartModalBtn.addEventListener('click', handleRestart);
    }
    
    if (shareBtn) {
        shareBtn.addEventListener('click', handleShare);
    }
    
    // Instrumentation hook for external monitoring
    if (window.CA_EVENTS) {
        window.CA_EVENTS.push({ 
            type: 'init', 
            payload: { config: CONFIG, timestamp: Date.now() } 
        });
    }
});