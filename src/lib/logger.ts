/**
 * Simple logger utility that respects LOG_LEVEL environment variable
 */

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Get the current log level from environment or default to INFO
const getCurrentLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL;
  if (envLevel !== undefined) {
    const level = parseInt(envLevel, 10);
    if (!isNaN(level) && level >= 0 && level <= 3) {
      return level;
    }
  }
  return LogLevel.INFO; // Default to INFO
};

const CURRENT_LOG_LEVEL = getCurrentLogLevel();

// Define generic type for log arguments
type LogArgs = Array<string | number | boolean | object | null | undefined>;

// Logger implementation
export const logger = {
  debug: (message: string, ...args: LogArgs) => {
    if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: LogArgs) => {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: LogArgs) => {
    if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: LogArgs) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  // Always log regardless of level - useful for critical debugging
  always: (message: string, ...args: LogArgs) => {
    console.log(`[ALWAYS] ${message}`, ...args);
  }
};

// Quick way to debug what log level is being used
logger.always(`Logger initialized with level: ${LogLevel[CURRENT_LOG_LEVEL]} (${CURRENT_LOG_LEVEL})`); 