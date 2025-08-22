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
function randomTarget(side) {
    return { 
        x: Math.random() * side, 
        y: Math.random() * side 
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
    const containerSize = gameArea.offsetWidth;
    runState.target = randomTarget(containerSize);
    renderTarget(gameArea, runState.target.x, runState.target.y, runState.currentR);
}

// State Transition Functions

function transitionToPlaying(gameArea) {
    const containerSize = gameArea.offsetWidth; // Square, so width = height
    runState.startGame(containerSize);
    
    // Place first target
    runState.target = randomTarget(containerSize);
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
    
    // Get stat display elements
    const statHits = document.getElementById('stat-hits');
    const statAvgAccuracy = document.getElementById('stat-avg-accuracy');
    const statBestAccuracy = document.getElementById('stat-best-accuracy');
    const statCurrentSize = document.getElementById('stat-current-size');
    const statElapsedTime = document.getElementById('stat-elapsed-time');
    
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
                // Will need to show scorecard here (in later task)
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
            // Will need to show scorecard here (in later task)
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
        
        // Hide scorecard and live stats
        scorecard.classList.add('hidden');
        liveStats.classList.add('hidden');
        
        // Show modal
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        
        // Disable game area interactions while modal is visible
        gameArea.style.pointerEvents = 'none';
        
        console.log('Game reset to idle state');
    }
    
    // Add event listeners
    if (startBtn) {
        startBtn.addEventListener('click', handleStart);
    }
    
    if (restartBtn) {
        restartBtn.addEventListener('click', handleRestart);
    }
    
    // Instrumentation hook for external monitoring
    if (window.CA_EVENTS) {
        window.CA_EVENTS.push({ 
            type: 'init', 
            payload: { config: CONFIG, timestamp: Date.now() } 
        });
    }
});