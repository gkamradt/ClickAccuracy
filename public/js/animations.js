// Click Accuracy Game - Animations and Effects

import { DEMO_CONFIG } from './config.js';
import { formatPercentage } from './game-logic.js';

// GSAP Demo Animation Setup
export function setupDemoAnimation() {
    const demoCursor = document.getElementById('demo-cursor');
    const demoRippleContainer = document.getElementById('demo-ripple-container');
    const circle1 = document.getElementById('demo-circle-1');
    const circle2 = document.getElementById('demo-circle-2');
    const feedback1 = document.getElementById('demo-feedback-1');
    const feedback2 = document.getElementById('demo-feedback-2');
    
    if (!demoCursor || !demoRippleContainer || !circle1 || !circle2 || !feedback1 || !feedback2) return;
    
    function createRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'demo-ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.transform = 'translate(-50%, -50%)';
        ripple.style.width = DEMO_CONFIG.rippleStartSize + 'px';
        ripple.style.height = DEMO_CONFIG.rippleStartSize + 'px';
        ripple.style.opacity = '0.8';
        
        demoRippleContainer.appendChild(ripple);
        
        // Animate ripple with GSAP
        gsap.to(ripple, {
            width: DEMO_CONFIG.rippleEndSize,
            height: DEMO_CONFIG.rippleEndSize,
            opacity: 0,
            duration: DEMO_CONFIG.rippleDuration,
            ease: "power2.out",
            onComplete: () => ripple.remove()
        });
    }
    
    function createConfetti(x, y) {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'];
        
        for (let i = 0; i < DEMO_CONFIG.confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'demo-confetti';
            confetti.style.left = x + 'px';
            confetti.style.top = y + 'px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            confetti.style.transform = 'translate(-50%, -50%)';
            
            demoRippleContainer.appendChild(confetti);
            
            // Random direction and distance
            const angle = (Math.PI * 2 * i) / DEMO_CONFIG.confettiCount + (Math.random() - 0.5) * 0.5;
            const distance = 30 + Math.random() * 20;
            const endX = x + Math.cos(angle) * distance;
            const endY = y + Math.sin(angle) * distance;
            
            gsap.to(confetti, {
                x: endX - x,
                y: endY - y,
                rotation: Math.random() * 360,
                scale: 0,
                opacity: 0,
                duration: 0.6 + Math.random() * 0.4,
                ease: "power2.out",
                onComplete: () => confetti.remove()
            });
        }
    }
    
    function makeCircleDisappear(circle, x, y) {
        // Poof effect - scale up then disappear
        gsap.to(circle, {
            scale: DEMO_CONFIG.circlePoofScale,
            opacity: 0,
            duration: DEMO_CONFIG.circlePoofDuration,
            ease: "back.in(1.7)"
        });
        
        // Create confetti at the same time
        createConfetti(x, y);
    }
    
    function resetCircles() {
        // Reset both circles and hide feedback for next animation cycle
        gsap.set([circle1, circle2], { 
            scale: 1, 
            opacity: 1 
        });
        gsap.set([feedback1, feedback2], {
            opacity: 0
        });
    }
    
    function showFeedback(feedbackElement, delay = 0) {
        gsap.to(feedbackElement, {
            opacity: 1,
            duration: 0.3,
            delay: delay,
            ease: "power2.out"
        });
        
        gsap.to(feedbackElement, {
            opacity: 0,
            duration: 0.5,
            delay: delay + 1.5,
            ease: "power2.in"
        });
    }
    
    function playAnimation() {
        // Create GSAP timeline
        const tl = gsap.timeline();
        
        // Set initial position
        gsap.set(demoCursor, { x: DEMO_CONFIG.startX, y: DEMO_CONFIG.startY });
        
        // Add a reset at the very beginning of the timeline (this will repeat)
        tl.call(resetCircles)
        
        // Move to first circle (off-center position)
        .to(demoCursor, {
            x: DEMO_CONFIG.circle1ClickX,
            y: DEMO_CONFIG.circle1ClickY,
            duration: DEMO_CONFIG.moveSpeed,
            ease: "power3.out" // Quick start, slow stop (more realistic)
        })
        
        // Pause at target (like thinking/aiming)
        .to({}, { duration: DEMO_CONFIG.pauseAtTarget })
        
        // Click on first circle (bad accuracy)
        .to(demoCursor, {
            scale: DEMO_CONFIG.clickScale,
            duration: DEMO_CONFIG.clickDuration / 2,
            ease: "power2.in",
            onComplete: () => {
                createRipple(DEMO_CONFIG.circle1ClickX, DEMO_CONFIG.circle1ClickY);
                makeCircleDisappear(circle1, DEMO_CONFIG.circle1ClickX, DEMO_CONFIG.circle1ClickY);
                showFeedback(feedback1, 0.1);
            }
        })
        .to(demoCursor, {
            scale: 1,
            duration: DEMO_CONFIG.clickDuration / 2,
            ease: "power2.out"
        })
        
        // Pause briefly after click
        .to({}, { duration: DEMO_CONFIG.pauseBetweenClicks })
        
        // Move to second circle (perfect center position)
        .to(demoCursor, {
            x: DEMO_CONFIG.circle2ClickX,
            y: DEMO_CONFIG.circle2ClickY,
            duration: DEMO_CONFIG.moveSpeed,
            ease: "power3.out" // Quick start, slow stop
        })
        
        // Pause at second target
        .to({}, { duration: DEMO_CONFIG.pauseAtTarget })
        
        // Click on second circle (perfect accuracy)
        .to(demoCursor, {
            scale: DEMO_CONFIG.clickScale,
            duration: DEMO_CONFIG.clickDuration / 2,
            ease: "power2.in",
            onComplete: () => {
                createRipple(DEMO_CONFIG.circle2ClickX, DEMO_CONFIG.circle2ClickY);
                makeCircleDisappear(circle2, DEMO_CONFIG.circle2ClickX, DEMO_CONFIG.circle2ClickY);
                showFeedback(feedback2, 0.1);
            }
        })
        .to(demoCursor, {
            scale: 1,
            duration: DEMO_CONFIG.clickDuration / 2,
            ease: "power2.out"
        })
        
        // Pause briefly after second click
        .to({}, { duration: DEMO_CONFIG.pauseBetweenClicks })
        
        // Move off screen (final quick movement)
        .to(demoCursor, {
            x: DEMO_CONFIG.endX,
            y: DEMO_CONFIG.startY,
            duration: DEMO_CONFIG.moveSpeed,
            ease: "power3.out"
        });
        
        return tl;
    }
    
    // Start animation and loop
    const masterTimeline = gsap.timeline({ repeat: -1, repeatDelay: 1 });
    masterTimeline.add(playAnimation());
    
    // Expose config for manual tuning (accessible in browser console)
    window.demoConfig = DEMO_CONFIG;
    window.restartDemoAnimation = () => {
        masterTimeline.restart();
    };
}

// Game Hit Effects Functions
export function createGameConfetti(x, y, gameArea) {
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
    const confettiCount = 4; // More subtle than demo
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'game-confetti';
        confetti.style.left = x + 'px';
        confetti.style.top = y + 'px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '1px';
        confetti.style.transform = 'translate(-50%, -50%)';
        
        gameArea.appendChild(confetti);
        
        // Smaller, more subtle burst
        const angle = (Math.PI * 2 * i) / confettiCount + (Math.random() - 0.5) * 0.3;
        const distance = 15 + Math.random() * 10; // Smaller spread
        const endX = x + Math.cos(angle) * distance;
        const endY = y + Math.sin(angle) * distance;
        
        gsap.to(confetti, {
            x: endX - x,
            y: endY - y,
            rotation: Math.random() * 180,
            scale: 0,
            opacity: 0,
            duration: 0.4 + Math.random() * 0.2,
            ease: "power2.out",
            onComplete: () => confetti.remove()
        });
    }
}

export function createFloatingAccuracy(x, y, accuracy, gameArea) {
    const floatingText = document.createElement('div');
    floatingText.className = 'floating-accuracy';
    floatingText.textContent = formatPercentage(accuracy);
    floatingText.style.left = x + 'px';
    floatingText.style.top = y + 'px';
    floatingText.style.transform = 'translate(-50%, -50%)';
    
    // Color based on accuracy percentage
    const accuracyPercent = accuracy * 100;
    let color;
    
    if (accuracyPercent >= 50) {
        // Green gradient: 50% = yellow-green, 100% = pure green
        const greenIntensity = Math.min(255, 100 + (accuracyPercent - 50) * 3.1); // 100 to 255
        const redComponent = Math.max(100, 255 - (accuracyPercent - 50) * 3.1); // 255 to 100
        color = `rgb(${redComponent}, ${greenIntensity}, 100)`;
    } else {
        // Red gradient: 0% = dark red, 50% = bright red
        const redIntensity = Math.min(255, 150 + accuracyPercent * 2.1); // 150 to 255
        const greenComponent = Math.max(50, accuracyPercent * 2); // 0 to 100
        color = `rgb(${redIntensity}, ${greenComponent}, 50)`;
    }
    
    floatingText.style.color = color;
    
    gameArea.appendChild(floatingText);
    
    // Float up slowly and fade out more gradually
    gsap.to(floatingText, {
        y: "-=40", // Move UP 40px (relative to current position)
        opacity: 0,
        duration: 2.5, // Slower animation
        ease: "power1.out", // Gentler easing
        onComplete: () => floatingText.remove()
    });
}