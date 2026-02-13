import winston from 'winston';
import path from 'path';
import { config } from '../config/index.js';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);
const logLevel = process.env.LOG_LEVEL || 'info';
const enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'true';
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
/**
 * If ENABLE_FILE_LOGGING is false, logs will not be written to files.
 * If LOG_DIR is specified, logs will be written to the specified directory.
 * If LOG_DIR is not specified, logs will be written to the logs directory.
 * If LOG_LEVEL is not specified, the info level will be used.
 * If NODE_ENV is not specified, the development environment will be used.
 */

// Create logger instance
export const log = winston.createLogger({
  level: logLevel || 'info',
  format: logFormat,
  transports: []  // No console output
});

// If file logging is enabled, add file transports
if (enableFileLogging) {
  
  // Add combined log file
  log.add(
    new winston.transports.File({
      filename: path.join(logDir, 'mantis-mcp-server-combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Add error log file - only handles error-level logs
  log.add(
    new winston.transports.File({
      filename: path.join(logDir, 'mantis-mcp-server-error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}