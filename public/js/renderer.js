// Click Accuracy Game - Rendering and UI

import { formatPercentage, formatTime, randomTarget } from './game-logic.js';

// Target Rendering Functions

export function renderTarget(gameArea, x, y, radius) {
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

export function removeTarget(gameArea) {
    const target = gameArea.querySelector('.target-circle');
    if (target) {
        target.remove();
    }
}

export function updateTargetPosition(gameArea, runState) {
    const containerSize = gameArea.clientWidth;
    runState.target = randomTarget(containerSize, runState.currentR);
    renderTarget(gameArea, runState.target.x, runState.target.y, runState.currentR);
}

// Live Statistics Display

export function updateLiveStats(runState, statElements) {
    if (runState.phase !== 'playing') return;
    
    const { statHits, statAvgAccuracy, statBestAccuracy, statCurrentSize, statElapsedTime } = statElements;
    
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

// Timer Management

export function startTimer(runState, statElapsedTime) {
    const timerInterval = setInterval(() => {
        if (runState.phase === 'playing') {
            const elapsed = runState.getDuration();
            statElapsedTime.textContent = formatTime(elapsed);
        }
    }, 10); // Update every 10ms for centisecond precision
    
    return timerInterval;
}

export function stopTimer(timerInterval) {
    if (timerInterval) {
        clearInterval(timerInterval);
        return null;
    }
    return timerInterval;
}

// Scorecard Display (Legacy)

export function updateScorecard(runState, scoreElements) {
    if (runState.phase !== 'ended') return;
    
    const { scoreHits, scoreAvgAccuracy, scoreBestAccuracy, scoreFinalSize, scoreDuration } = scoreElements;
    
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

export function showScorecard(runState, liveStats, scorecard, scoreElements) {
    liveStats.classList.add('hidden');
    updateScorecard(runState, scoreElements);
    scorecard.classList.remove('hidden');
    
    console.log('Scorecard displayed:', {
        hits: runState.hits,
        avgAccuracy: formatPercentage(runState.getAverageAccuracy()),
        bestAccuracy: formatPercentage(runState.bestAccuracy),
        finalSize: runState.finalRadius + 'px',
        duration: formatTime(runState.getDuration())
    });
}

// Final Stats Modal

export function updateFinalStats(runState, finalElements) {
    const { finalHits, finalAvgAccuracy, finalBestAccuracy, finalTargetSize, finalDuration } = finalElements;
    
    finalHits.textContent = runState.hits;
    finalAvgAccuracy.textContent = formatPercentage(runState.getAverageAccuracy());
    finalBestAccuracy.textContent = formatPercentage(runState.bestAccuracy);
    finalTargetSize.textContent = runState.finalRadius + 'px';
    finalDuration.textContent = formatTime(runState.getDuration());
}