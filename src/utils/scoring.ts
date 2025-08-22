// Score calculation utilities for Click Accuracy Game

import { GameStats, ClickLog } from '@/types/database';

/**
 * Calculate Speed Score (0-100) based on average time per click
 * 100 points: ≤ 0.1 seconds between clicks (very fast)
 * ~24 points: 5 seconds between clicks  
 * Exponential decay for natural feel (not linear)
 */
export function calculateSpeedScore(totalDurationMs: number, totalHits: number): number {
  if (totalHits === 0) return 0;
  
  // Average time per hit in seconds
  const avgTimePerHit = totalDurationMs / totalHits / 1000;

  // Perfect speed gets 100
  if (avgTimePerHit <= 0.1) return 100;
  
  // Exponential decay: score = 100 * e^(-t/3.5)  
  // This gives roughly: 0.1s=97%, 1s=75%, 2s=57%, 3s=42%, 5s=24%
  const score = 100 * Math.exp(-avgTimePerHit / 3.5);
  
  return Math.max(0, Math.round(score * 10) / 10); // Round to 1 decimal, min 0
}

/**
 * Calculate Performance Score (0-100) based on accuracy and consistency
 * Combines average accuracy with hit volume multiplier
 * Caps distance multiplier at 20 hits for fairness
 */
export function calculatePerformanceScore(averageAccuracy: number, totalHits: number): number {
  if (totalHits === 0) return 0;
  
  // Simple modular approach - easy to update later
  const distanceMultiplier = Math.min(1.0, totalHits / 20); // caps at 20 hits
  const score = averageAccuracy * distanceMultiplier * 100;
  
  return Math.round(score * 10) / 10; // Round to 1 decimal
}

/**
 * Badge definitions and criteria
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: (stats: GameStats) => boolean;
}

export const BADGES: Badge[] = [
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Average accuracy > 90%',
    icon: '🎯',
    criteria: (stats) => stats.avgAccuracy > 0.9
  },
  {
    id: 'circus_shot',
    name: 'Circus Shot', 
    description: 'Single hit with 99%+ accuracy',
    icon: '🎪',
    criteria: (stats) => stats.bestAccuracy >= 0.99
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Speed score > 85',
    icon: '⚡',
    criteria: (stats) => stats.speedScore > 85
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Performance score > 90',
    icon: '👑',
    criteria: (stats) => stats.performanceScore > 90
  },
  {
    id: 'marathon_runner',
    name: 'Marathon Runner',
    description: 'Complete 25+ hits in one run',
    icon: '🏃',
    criteria: (stats) => stats.totalHits >= 25
  },
  {
    id: 'consistency',
    name: 'Consistency King',
    description: 'All hits within 80% accuracy',
    icon: '🔄',
    criteria: (stats) => {
      const hitLogs = stats.clickLogs.filter(log => log.hit);
      return hitLogs.length > 5 && hitLogs.every(log => log.a !== undefined && log.a >= 0.8);
    }
  },
  {
    id: 'bullseye_master',
    name: 'Bullseye Master',
    description: '5+ perfect bullseye hits (100% accuracy)',
    icon: '🏹',
    criteria: (stats) => {
      const perfectHits = stats.clickLogs.filter(log => log.hit && log.a === 1.0);
      return perfectHits.length >= 5;
    }
  },
  {
    id: 'steady_hands',
    name: 'Steady Hands',
    description: 'Complete 15+ hits with no misses',
    icon: '🤝',
    criteria: (stats) => {
      const hits = stats.clickLogs.filter(log => log.hit).length;
      const misses = stats.clickLogs.filter(log => !log.hit).length;
      return hits >= 15 && misses === 0;
    }
  }
];

/**
 * Determine which badges a player has earned
 */
export function determineBadges(stats: GameStats): string[] {
  return BADGES
    .filter(badge => badge.criteria(stats))
    .map(badge => badge.id);
}

/**
 * Get badge details by ID
 */
export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(badge => badge.id === id);
}

/**
 * Calculate comprehensive game statistics including scores and badges
 * This maintains compatibility with existing GameStats while adding new fields
 */
export function calculateGameStatistics(
  totalHits: number,
  avgAccuracy: number,
  bestAccuracy: number,
  finalRadius: number,
  durationMs: number,
  clickLogs: ClickLog[]
): GameStats {
  // Calculate new scoring metrics
  const speedScore = calculateSpeedScore(durationMs, totalHits);
  const performanceScore = calculatePerformanceScore(avgAccuracy, totalHits);
  
  // Build comprehensive stats object
  const stats: GameStats = {
    totalHits,
    avgAccuracy,
    bestAccuracy,
    finalRadius,
    durationMs,
    speedScore,
    performanceScore,
    badges: [],
    clickLogs
  };
  
  // Determine earned badges
  stats.badges = determineBadges(stats);
  
  return stats;
}

/**
 * Helper function to get average time per hit in milliseconds
 */
export function getAverageTimePerHit(durationMs: number, totalHits: number): number {
  if (totalHits === 0) return 0;
  return Math.round(durationMs / totalHits);
}

/**
 * Format score for display (removes unnecessary decimals)
 */
export function formatScore(score: number): string {
  return score % 1 === 0 ? score.toString() : score.toFixed(1);
}