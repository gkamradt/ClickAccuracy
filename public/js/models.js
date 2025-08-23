// Click Accuracy Game - Data Models

// Click Event Log Structure
export class ClickEventLog {
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
export class RunState {
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
        this.startR = Math.floor(0.10 * containerSize); // Using CONFIG.START_RADIUS_RATIO
        this.currentR = this.startR;
        this.deltaR = Math.max(1, Math.ceil(this.startR / 20)); // Using CONFIG.SHRINK_STEPS_APPROX
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