// Logger utility for conditional console logging
// Only logs in development environment

const isDevelopment = (): boolean => {
    return process.env.NODE_ENV === 'development';
};

// Create logger object with same interface as console
export const logger = {
    log: (...args: any[]): void => {
        if (isDevelopment()) {
            console.log(...args);
        }
    },
    info: (...args: any[]): void => {
        if (isDevelopment()) {
            console.info(...args);
        }
    },
    warn: (...args: any[]): void => {
        if (isDevelopment()) {
            console.warn(...args);
        }
    },
    error: (...args: any[]): void => {
        if (isDevelopment()) {
            console.error(...args);
        }
    },
    debug: (...args: any[]): void => {
        if (isDevelopment()) {
            console.debug(...args);
        }
    },
    trace: (...args: any[]): void => {
        if (isDevelopment()) {
            console.trace(...args);
        }
    }
};

export default logger;