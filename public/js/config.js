// Click Accuracy Game - Configuration

export const CONFIG = {
    CONTAINER_SIDE: 'min(600px, 80vw, 80vh)',
    START_RADIUS_RATIO: 0.10,
    MIN_RADIUS_PX: 1,
    SHRINK_STEPS_APPROX: 20,
    WEIGHT_K: 1.5,
    DISPLAY_DECIMALS: 1,
    TIME_ORIGIN: 'onStart',
    
    // Mouse cursor hotspot adjustment
    // Positive values move the registered click position up/left
    // Negative values move the registered click position down/right
    CURSOR_OFFSET_X: 3,  // Move click 1px left (compensate for cursor being right)
    CURSOR_OFFSET_Y: 3   // Move click 1px up (compensate for cursor being down)
};

// Animation configuration for demo
export const DEMO_CONFIG = {
    // Timing
    totalDuration: 6,        // Total animation duration in seconds
    moveSpeed: 0.8,          // Speed of mouse movement (faster bursts)
    pauseAtTarget: 0.15,     // Pause when reaching target
    clickDuration: 0.2,      // Duration of click animation
    rippleDuration: 0.8,     // Duration of ripple effect
    pauseBetweenClicks: 0.4, // Pause at each target
    
    // Positions (center of each circle)
    startX: -20,             // Start position (off-screen left)
    startY: 60,              // Vertical center
    circle1X: 50,            // Center of first circle (20px + 30px radius)
    circle1Y: 60,            // Center of first circle (30px + 30px radius)
    circle1ClickX: 67,       // Off-center click position (bad accuracy)
    circle1ClickY: 30,       // Off-center click position (bad accuracy)
    circle2X: 150,           // Center of second circle (120px + 30px radius)
    circle2Y: 60,            // Center of second circle (30px + 30px radius)
    circle2ClickX: 160,      // Perfect center click (good accuracy)
    circle2ClickY: 60,       // Perfect center click (good accuracy)
    endX: 220,               // End position (off-screen right)
    
    // Effects
    clickScale: 0.8,         // How much cursor shrinks when clicking
    rippleStartSize: 15,     // Starting size of ripple
    rippleEndSize: 80,       // Ending size of ripple
    
    // Circle disappear effects
    circlePoofScale: 1.3,    // How much circle grows before disappearing
    circlePoofDuration: 0.3, // Duration of poof effect
    confettiCount: 8,        // Number of confetti pieces
};