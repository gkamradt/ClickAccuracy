// Click Accuracy Game - Core Game Logic

import { CONFIG } from './config.js';

// Helper Functions

// Random target placement
export function randomTarget(side, radius) {
    const min = radius;
    const max = side - radius;
    return {
        x: min + Math.random() * (max - min),
        y: min + Math.random() * (max - min)
    };
}

// Calculate distance between two points
export function calculateDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

// Calculate unweighted accuracy with bullseye zone
export function accuracyUnweighted(d, r) {
    // Bullseye zone: if within 5% of radius, give 100% accuracy
    const bullseyeRadius = r * 0.05; // 5% of target radius
    
    if (d <= bullseyeRadius) {
        return 1.0; // Perfect score in bullseye
    }
    
    // Linear accuracy outside bullseye zone
    return Math.max(0, 1 - d / r);
}

// Calculate weight based on radius
export function weight(r0, r, k) {
    return Math.pow(r0 / r, k);
}

// Shrink radius after hit
export function nextRadius(r, dr) {
    return Math.max(CONFIG.MIN_RADIUS_PX, r - dr);
}

// Get relative coordinates from mouse event with cursor offset adjustment
export function relCoords(e, el) {
    const rect = el.getBoundingClientRect();
    return { 
        cx: e.clientX - rect.left - CONFIG.CURSOR_OFFSET_X, 
        cy: e.clientY - rect.top - CONFIG.CURSOR_OFFSET_Y 
    };
}

// Format time as mm:ss.SS
export function formatTime(ms) {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}

// Format percentage with configured decimal places
export function formatPercentage(value) {
    return (value * 100).toFixed(CONFIG.DISPLAY_DECIMALS) + '%';
}

// Visual debug function to show where clicks are registered
export function showClickDebug(gameArea, x, y) {
    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    dot.style.width = '6px';
    dot.style.height = '6px';
    dot.style.backgroundColor = '#ff0000';
    dot.style.border = '2px solid #ffffff';
    dot.style.borderRadius = '50%';
    dot.style.transform = 'translate(-50%, -50%)';
    dot.style.pointerEvents = 'none';
    dot.style.zIndex = '1000';
    dot.classList.add('click-debug-dot');
    
    gameArea.appendChild(dot);
    
    // Remove after 2 seconds
    setTimeout(() => {
        if (dot.parentNode) {
            dot.remove();
        }
    }, 2000);
}