// Input validation and game logic validation utilities

import crypto from 'crypto';
import { ClickLog } from '@/types/database';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Validate username
export function validateUsername(username?: string): ValidationResult {
  if (!username) return { valid: true }; // Username is optional
  
  if (typeof username !== 'string') {
    return { valid: false, error: 'Username must be a string' };
  }
  
  if (username.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }
  
  // Basic sanitization - only allow alphanumeric, spaces, and common symbols
  if (!/^[a-zA-Z0-9\s\-_.!]+$/.test(username)) {
    return { valid: false, error: 'Username contains invalid characters' };
  }
  
  return { valid: true };
}

// Validate click log structure
export function validateClickLog(log: any): ValidationResult {
  if (!log || typeof log !== 'object') {
    return { valid: false, error: 'Click log must be an object' };
  }
  
  const requiredFields = ['t', 'cx', 'cy', 'tx', 'ty', 'r', 'd', 'hit'];
  
  for (const field of requiredFields) {
    if (typeof log[field] !== 'number' && typeof log[field] !== 'boolean') {
      return { valid: false, error: `Click log missing or invalid field: ${field}` };
    }
  }
  
  // Validate ranges
  if (log.t < 0 || log.t > 600000) { // Max 10 minutes
    return { valid: false, error: 'Invalid timestamp in click log' };
  }
  
  if (log.cx < 0 || log.cx > 1000 || log.cy < 0 || log.cy > 1000) {
    return { valid: false, error: 'Invalid click coordinates' };
  }
  
  if (log.tx < 0 || log.tx > 1000 || log.ty < 0 || log.ty > 1000) {
    return { valid: false, error: 'Invalid target coordinates' };
  }
  
  if (log.r <= 0 || log.r > 200) {
    return { valid: false, error: 'Invalid target radius' };
  }
  
  if (log.d < 0 || log.d > 1000) {
    return { valid: false, error: 'Invalid distance' };
  }
  
  return { valid: true };
}

// Validate game statistics for impossible values
export function validateGameStats(stats: any): ValidationResult {
  if (!stats || typeof stats !== 'object') {
    return { valid: false, error: 'Stats must be an object' };
  }
  
  // Check required fields
  const requiredFields = ['totalHits', 'avgAccuracy', 'bestAccuracy', 'finalRadius', 'durationMs'];
  
  for (const field of requiredFields) {
    if (typeof stats[field] !== 'number') {
      return { valid: false, error: `Stats missing or invalid field: ${field}` };
    }
  }
  
  // Validate ranges
  if (stats.totalHits < 0 || stats.totalHits > 1000) {
    return { valid: false, error: 'Invalid total hits count' };
  }
  
  if (stats.avgAccuracy < 0 || stats.avgAccuracy > 1) {
    return { valid: false, error: 'Invalid average accuracy' };
  }
  
  if (stats.bestAccuracy < 0 || stats.bestAccuracy > 1) {
    return { valid: false, error: 'Invalid best accuracy' };
  }
  
  if (stats.finalRadius < 1 || stats.finalRadius > 200) {
    return { valid: false, error: 'Invalid final radius' };
  }
  
  if (stats.durationMs < 0 || stats.durationMs > 3600000) { // Max 1 hour
    return { valid: false, error: 'Invalid duration' };
  }
  
  // Speed validation - detect impossible timing
  if (stats.totalHits > 0) {
    const avgTimePerHit = stats.durationMs / stats.totalHits;
    if (avgTimePerHit < 100) { // Less than 100ms per hit is suspicious
      return { valid: false, error: 'Game completed too quickly to be human' };
    }
  }
  
  return { valid: true };
}

// Cross-validate game stats with click logs for consistency
export function validateGameConsistency(stats: any, clickLogs: ClickLog[]): ValidationResult {
  if (!Array.isArray(clickLogs)) {
    return { valid: false, error: 'Click logs must be an array' };
  }
  
  // Count hits and misses from logs
  const hitLogs = clickLogs.filter(log => log.hit);
  const missLogs = clickLogs.filter(log => !log.hit);
  
  // Total hits should match
  if (hitLogs.length !== stats.totalHits) {
    return { valid: false, error: 'Hit count mismatch between stats and logs' };
  }
  
  // There should be exactly one miss (or zero if they reached minimum radius)
  if (missLogs.length > 1) {
    return { valid: false, error: 'Too many misses in click logs' };
  }
  
  // Duration should roughly match the last click timestamp
  if (clickLogs.length > 0) {
    const maxTimestamp = Math.max(...clickLogs.map(log => log.t));
    const timeDiff = Math.abs(maxTimestamp - stats.durationMs);
    
    // Allow some tolerance for timing differences
    if (timeDiff > 5000) { // More than 5 seconds difference
      return { valid: false, error: 'Duration mismatch between stats and logs' };
    }
  }
  
  // Validate accuracy calculation
  if (hitLogs.length > 0) {
    const calculatedAvgAccuracy = hitLogs.reduce((sum, log) => sum + (log.a || 0), 0) / hitLogs.length;
    const accuracyDiff = Math.abs(calculatedAvgAccuracy - stats.avgAccuracy);
    
    if (accuracyDiff > 0.05) { // More than 5% difference
      return { valid: false, error: 'Average accuracy mismatch' };
    }
  }
  
  return { valid: true };
}

// Generate IP hash for privacy-compliant tracking
export function hashIP(ip: string): string {
  return crypto.createHash('sha256')
    .update(ip + process.env.IP_SALT || 'click-accuracy-salt')
    .digest('hex')
    .substring(0, 16); // First 16 chars for storage efficiency
}

// Sanitize user agent string
export function sanitizeUserAgent(userAgent?: string): string {
  if (!userAgent || typeof userAgent !== 'string') return 'unknown';
  
  // Truncate and remove potentially harmful content
  return userAgent
    .substring(0, 200)
    .replace(/[<>\"']/g, '') // Remove HTML/injection chars
    .trim();
}

// Validate badges array
export function validateBadges(badges: any): ValidationResult {
  if (!Array.isArray(badges)) {
    return { valid: false, error: 'Badges must be an array' };
  }
  
  const validBadges = [
    'sharpshooter', 'circus_shot', 'speed_demon', 'perfectionist',
    'marathon_runner', 'consistency', 'bullseye_master', 'steady_hands'
  ];
  
  for (const badge of badges) {
    if (typeof badge !== 'string' || !validBadges.includes(badge)) {
      return { valid: false, error: `Invalid badge: ${badge}` };
    }
  }
  
  // Reasonable limit on badges
  if (badges.length > 10) {
    return { valid: false, error: 'Too many badges' };
  }
  
  return { valid: true };
}