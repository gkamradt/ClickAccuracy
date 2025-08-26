// Click Accuracy Game - Event Handlers

import { CONFIG } from './config.js';
import { ClickEventLog } from './models.js';
import { 
    calculateDistance, 
    accuracyUnweighted, 
    weight, 
    nextRadius, 
    relCoords,
    showClickDebug,
    randomTarget
} from './game-logic.js';
import { renderTarget, removeTarget, updateLiveStats, startTimer, stopTimer } from './renderer.js';
import { createGameConfetti, createFloatingAccuracy } from './animations.js';
import { showGameOverModal, handleShare, preloadLeaderboardData } from './analytics.js';

// State Transition Functions
export function transitionToPlaying(gameArea, runState) {
    const containerSize = gameArea.clientWidth; // Square, so width = height
    runState.startGame(containerSize);

    // Place first target
    runState.target = randomTarget(containerSize, runState.currentR);
    renderTarget(gameArea, runState.target.x, runState.target.y, runState.currentR);
}

export function transitionToEnded(runState) {
    runState.endGame();
    // Keep the target visible to show where the miss occurred
}

export function transitionToIdle(runState) {
    runState.reset();
}

// Click handling
export function createClickHandler(gameArea, runState, statElements, timerRef, gameOverElements) {
    return function handleGameClick(e) {
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
            
            // Debug logging for accuracy verification
            const bullseyeRadius = runState.currentR * 0.05;
            const inBullseye = distance <= bullseyeRadius;
            logger.log(`Click Debug: distance=${distance.toFixed(2)}, radius=${runState.currentR}, bullseye=${bullseyeRadius.toFixed(2)}, inBullseye=${inBullseye}, accuracy=${(accuracy*100).toFixed(1)}%`);
            logger.log(`Coordinates: click=(${cx.toFixed(1)}, ${cy.toFixed(1)}), target=(${tx.toFixed(1)}, ${ty.toFixed(1)})`);
            
            // Visual debug: show click location with a temporary dot
            showClickDebug(gameArea, cx, cy);
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
            
            // Create hit effects at click position
            createGameConfetti(cx, cy, gameArea);
            createFloatingAccuracy(cx, cy, accuracy, gameArea);
            
            logger.log('Hit!', {
                accuracy: (accuracy * 100).toFixed(1) + '%',
                distance: distance.toFixed(2),
                radius: runState.currentR,
                bullseyeZone: (runState.currentR * 0.1).toFixed(2),
                inBullseye: distance <= (runState.currentR * 0.1),
                clickPos: `(${cx.toFixed(1)}, ${cy.toFixed(1)})`,
                targetCenter: `(${tx.toFixed(1)}, ${ty.toFixed(1)})`,
                avgAccuracy: (runState.getAverageAccuracy() * 100).toFixed(1) + '%',
                bestAccuracy: (runState.bestAccuracy * 100).toFixed(1) + '%'
            });
            
            // Shrink radius
            runState.currentR = nextRadius(runState.currentR, runState.deltaR);
            
            // Update live stats display
            updateLiveStats(runState, statElements);
            
            // Check if radius reached minimum
            if (runState.currentR <= CONFIG.MIN_RADIUS_PX) {
                logger.log('Target reached minimum size!');
                timerRef.current = stopTimer(timerRef.current);
                transitionToEnded(runState);
                showGameOverModal(runState, gameOverElements.liveStats, gameOverElements.gameOverModal, gameOverElements.shootingRange, gameOverElements.finalElements);
            } else {
                // Move target to new position
                const containerSize = gameArea.clientWidth;
                runState.target = randomTarget(containerSize, runState.currentR);
                renderTarget(gameArea, runState.target.x, runState.target.y, runState.currentR);
            }
        } else {
            logger.log('Miss!', {
                distance: distance.toFixed(2),
                radius: runState.currentR
            });
            
            // Record miss and end game
            runState.recordMiss(clickLog);
            timerRef.current = stopTimer(timerRef.current);
            transitionToEnded(runState);
            showGameOverModal(runState, gameOverElements.liveStats, gameOverElements.gameOverModal, gameOverElements.shootingRange, gameOverElements.finalElements);
        }
    };
}

// State transition handlers
export function createStartHandler(gameArea, runState, modal, liveStats, statElements, timerRef) {
    return function handleStart() {
        // Hide modal with fade effect
        modal.style.transition = 'opacity 0.3s';
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.pointerEvents = 'none';
        }, 300);
        
        // Transition to playing state
        transitionToPlaying(gameArea, runState);
        
        // Show live stats
        liveStats.classList.remove('hidden');
        
        // Initialize stats display
        updateLiveStats(runState, statElements);
        
        // Start the timer
        timerRef.current = startTimer(runState, statElements.statElapsedTime);
        
        // Enable game area interactions
        gameArea.style.pointerEvents = 'auto';
        
        // Preload leaderboard data in background for faster modal display
        preloadLeaderboardData().catch(error => {
            logger.warn('Background leaderboard preload failed:', error);
        });
        
        logger.log('Game started:', {
            phase: runState.phase,
            startRadius: runState.startR,
            deltaRadius: runState.deltaR,
            targetPosition: runState.target
        });
    };
}

export function createRestartHandler(gameArea, runState, modal, gameOverModal, scorecard, liveStats, timerRef, statElements) {
    return function handleRestart() {
        // Reset state
        transitionToIdle(runState);
        
        // Stop timer
        timerRef.current = stopTimer(timerRef.current);
        
        // Remove target from game area
        removeTarget(gameArea);
        
        // Hide all modals and stats
        gameOverModal.classList.add('hidden');
        scorecard.classList.add('hidden');
        liveStats.classList.add('hidden');

        // Reset clicks left display
        if (statElements?.clicksLeft) {
            statElements.clicksLeft.textContent = `${CONFIG.SHRINK_STEPS_APPROX} clicks left`;
        }
        
        // Show start modal
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        
        // Disable game area interactions while modal is visible
        gameArea.style.pointerEvents = 'none';
        
        logger.log('Game reset to idle state');
    };
}