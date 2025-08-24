// Logger utility for conditional console logging
// Only logs in development environment

// Simple environment detection - you can manually set this
// Set to true for development, false for production
const isDevelopment = () => {
    // Since this is a static file, we'll use a simple approach
    // You can change this value manually or via a build script
    const LOG_LEVEL = 'development'; // Change to 'development' to enable logs
    return LOG_LEVEL === 'development';
};

// Create logger object with same interface as console
const logger = {
    log: (...args) => {
        if (isDevelopment()) {
            console.log(...args);
        }
    },
    info: (...args) => {
        if (isDevelopment()) {
            console.info(...args);
        }
    },
    warn: (...args) => {
        if (isDevelopment()) {
            console.warn(...args);
        }
    },
    error: (...args) => {
        if (isDevelopment()) {
            console.error(...args);
        }
    },
    debug: (...args) => {
        if (isDevelopment()) {
            console.debug(...args);
        }
    },
    trace: (...args) => {
        if (isDevelopment()) {
            console.trace(...args);
        }
    }
};

// Export for both ES modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = logger;
} else if (typeof window !== 'undefined') {
    window.logger = logger;
}