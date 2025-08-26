// Click Accuracy Game - Main Application Coordinator

import { CONFIG } from './config.js';
import { RunState } from './models.js';
import { setupDemoAnimation } from './animations.js';
import { handleShare } from './analytics.js';
import {
    createClickHandler,
    createStartHandler,
    createRestartHandler
} from './events.js';

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    logger.log('Click Accuracy Game initialized');
    
    // Initialize game state
    const runState = new RunState();
    
    // Timer interval reference (using object for reference semantics)
    const timerRef = { current: null };
    
    // Setup demo animation
    setupDemoAnimation();
    
    // Get DOM elements
    const modal = document.getElementById('modal');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const gameArea = document.getElementById('game-area');
    const clicksLeft = document.getElementById('clicks-left');
    const liveStats = document.getElementById('live-stats');
    const scorecard = document.getElementById('scorecard');
    
    // Game over modal elements
    const gameOverModal = document.getElementById('game-over-modal');
    const restartModalBtn = document.getElementById('restart-modal-btn');
    const shareBtn = document.getElementById('share-btn');
    const shootingRange = document.getElementById('shooting-range');
    
    // Get stat display elements
    const statElements = {
        statHits: document.getElementById('stat-hits'),
        statAvgAccuracy: document.getElementById('stat-avg-accuracy'),
        statBestAccuracy: document.getElementById('stat-best-accuracy'),
        statCurrentSize: document.getElementById('stat-current-size'),
        statElapsedTime: document.getElementById('stat-elapsed-time'),
        clicksLeft
    };
    
    // Get scorecard elements (legacy)
    const scoreElements = {
        scoreHits: document.getElementById('score-hits'),
        scoreAvgAccuracy: document.getElementById('score-avg-accuracy'),
        scoreBestAccuracy: document.getElementById('score-best-accuracy'),
        scoreFinalSize: document.getElementById('score-final-size'),
        scoreDuration: document.getElementById('score-duration')
    };
    
    // Get final stats elements (new modal)
    const finalElements = {
        finalHits: document.getElementById('final-hits'),
        finalAvgAccuracy: document.getElementById('final-avg-accuracy'),
        finalBestAccuracy: document.getElementById('final-best-accuracy'),
        finalTargetSize: document.getElementById('final-target-size'),
        finalDuration: document.getElementById('final-duration')
    };
    
    // Game over modal element group
    const gameOverElements = {
        liveStats,
        gameOverModal,
        shootingRange,
        finalElements
    };
    
    // Initial setup - disable game area until start is clicked
    gameArea.style.pointerEvents = 'none';
    
    // Create event handlers
    const handleGameClick = createClickHandler(gameArea, runState, statElements, timerRef, gameOverElements);
    const handleStart = createStartHandler(gameArea, runState, modal, liveStats, statElements, timerRef);
    const handleRestart = createRestartHandler(gameArea, runState, modal, gameOverModal, scorecard, liveStats, timerRef, statElements);
    
    // Add click listener to game area
    gameArea.addEventListener('click', handleGameClick);
    
    // Add event listeners for buttons
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

// Global debug functions for testing (available in browser console)
window.testDatabase = async function() {
    logger.log('🔧 Testing database connection...');
    try {
        const response = await fetch('/api/db-test');
        const result = await response.json();
        logger.log('Database test result:', result);
        return result;
    } catch (error) {
        logger.error('Database test failed:', error);
        return { success: false, error: error.message };
    }
};

window.testLeaderboard = async function() {
    logger.log('🔧 Testing leaderboard API...');
    try {
        const response = await fetch('/api/leaderboard');
        const result = await response.json();
        logger.log('Leaderboard test result:', {
            success: response.ok,
            status: response.status,
            dataKeys: Object.keys(result),
            counts: {
                hallOfFame: result.hall_of_fame?.length || 0,
                todaysBest: result.todays_best?.length || 0,
                scatterData: result.scatter_data?.length || 0,
                aiBenchmarks: result.ai_benchmarks?.length || 0
            }
        });
        return result;
    } catch (error) {
        logger.error('Leaderboard test failed:', error);
        return { success: false, error: error.message };
    }
};