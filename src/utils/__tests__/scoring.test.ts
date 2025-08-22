// Tests for scoring utility functions

import {
  calculateSpeedScore,
  calculatePerformanceScore,
  determineBadges,
  calculateGameStatistics,
  getAverageTimePerHit,
  formatScore,
  BADGES
} from '../scoring';
import { GameStats, ClickLog } from '@/types/database';

describe('Scoring Utilities', () => {
  describe('calculateSpeedScore', () => {
    it('should return 0 for 0 hits', () => {
      expect(calculateSpeedScore(10000, 0)).toBe(0);
    });

    it('should give high scores for optimal timing (1-2s per hit)', () => {
      // 1.5 seconds per hit should be high score
      const score = calculateSpeedScore(15000, 10); // 1.5s per hit
      expect(score).toBeGreaterThan(80);
    });

    it('should penalize very fast times (automation protection)', () => {
      // 0.2 seconds per hit should have diminishing returns
      const fastScore = calculateSpeedScore(2000, 10); // 0.2s per hit
      const optimalScore = calculateSpeedScore(15000, 10); // 1.5s per hit
      expect(fastScore).toBeLessThan(optimalScore);
    });

    it('should penalize very slow times', () => {
      // 6 seconds per hit should be low score
      const score = calculateSpeedScore(60000, 10); // 6s per hit
      expect(score).toBeLessThan(30);
    });

    it('should cap at 100', () => {
      const score = calculateSpeedScore(12000, 10); // 1.2s per hit
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculatePerformanceScore', () => {
    it('should return 0 for 0 hits', () => {
      expect(calculatePerformanceScore(0.85, 0)).toBe(0);
    });

    it('should calculate basic performance score', () => {
      const score = calculatePerformanceScore(0.8, 10); // 80% accuracy, 10 hits
      expect(score).toBe(40.0); // 0.8 * (10/20) * 100 = 40
    });

    it('should cap distance multiplier at 20 hits', () => {
      const score20 = calculatePerformanceScore(0.9, 20); // Full multiplier
      const score40 = calculatePerformanceScore(0.9, 40); // Same multiplier
      expect(score20).toBe(score40);
      expect(score20).toBe(90.0); // 0.9 * 1.0 * 100
    });

    it('should scale with hit count up to 20', () => {
      const score5 = calculatePerformanceScore(0.8, 5);   // 0.8 * 0.25 * 100 = 20
      const score10 = calculatePerformanceScore(0.8, 10); // 0.8 * 0.5 * 100 = 40
      const score20 = calculatePerformanceScore(0.8, 20); // 0.8 * 1.0 * 100 = 80
      
      expect(score5).toBe(20.0);
      expect(score10).toBe(40.0);
      expect(score20).toBe(80.0);
    });
  });

  describe('determineBadges', () => {
    const createMockStats = (overrides: Partial<GameStats>): GameStats => ({
      totalHits: 10,
      avgAccuracy: 0.75,
      bestAccuracy: 0.85,
      finalRadius: 15,
      durationMs: 20000,
      speedScore: 65,
      performanceScore: 60,
      badges: [],
      clickLogs: [],
      ...overrides
    });

    it('should award Sharpshooter badge for >90% avg accuracy', () => {
      const stats = createMockStats({ avgAccuracy: 0.92 });
      const badges = determineBadges(stats);
      expect(badges).toContain('sharpshooter');
    });

    it('should award Circus Shot badge for 99%+ best accuracy', () => {
      const stats = createMockStats({ bestAccuracy: 0.995 });
      const badges = determineBadges(stats);
      expect(badges).toContain('circus_shot');
    });

    it('should award Speed Demon badge for speed score >85', () => {
      const stats = createMockStats({ speedScore: 87 });
      const badges = determineBadges(stats);
      expect(badges).toContain('speed_demon');
    });

    it('should award Perfectionist badge for performance score >90', () => {
      const stats = createMockStats({ performanceScore: 92 });
      const badges = determineBadges(stats);
      expect(badges).toContain('perfectionist');
    });

    it('should award Marathon Runner badge for 25+ hits', () => {
      const stats = createMockStats({ totalHits: 30 });
      const badges = determineBadges(stats);
      expect(badges).toContain('marathon_runner');
    });

    it('should award Bullseye Master for 5+ perfect hits', () => {
      const perfectLogs: ClickLog[] = Array(6).fill(null).map((_, i) => ({
        t: i * 1000,
        cx: 100,
        cy: 100,
        tx: 100,
        ty: 100,
        r: 20,
        d: 0,
        hit: true,
        a: 1.0
      }));
      
      const stats = createMockStats({ clickLogs: perfectLogs });
      const badges = determineBadges(stats);
      expect(badges).toContain('bullseye_master');
    });
  });

  describe('calculateGameStatistics', () => {
    it('should calculate comprehensive stats with scores and badges', () => {
      const mockLogs: ClickLog[] = [
        { t: 1000, cx: 100, cy: 100, tx: 100, ty: 100, r: 20, d: 2, hit: true, a: 0.9 },
        { t: 2000, cx: 98, cy: 98, tx: 100, ty: 100, r: 18, d: 3, hit: true, a: 0.85 }
      ];

      const stats = calculateGameStatistics(
        2,      // totalHits
        0.875,  // avgAccuracy 
        0.9,    // bestAccuracy
        18,     // finalRadius
        2000,   // durationMs
        mockLogs
      );

      expect(stats.totalHits).toBe(2);
      expect(stats.avgAccuracy).toBe(0.875);
      expect(stats.speedScore).toBeGreaterThan(0);
      expect(stats.performanceScore).toBeGreaterThan(0);
      expect(stats.badges).toBeDefined();
      expect(stats.clickLogs).toEqual(mockLogs);
    });
  });

  describe('getAverageTimePerHit', () => {
    it('should calculate average time correctly', () => {
      expect(getAverageTimePerHit(10000, 5)).toBe(2000); // 2000ms per hit
    });

    it('should return 0 for 0 hits', () => {
      expect(getAverageTimePerHit(10000, 0)).toBe(0);
    });

    it('should round to nearest millisecond', () => {
      expect(getAverageTimePerHit(10001, 3)).toBe(3334); // Rounded
    });
  });

  describe('formatScore', () => {
    it('should remove unnecessary decimals for whole numbers', () => {
      expect(formatScore(85.0)).toBe('85');
      expect(formatScore(90)).toBe('90');
    });

    it('should keep one decimal for non-whole numbers', () => {
      expect(formatScore(85.7)).toBe('85.7');
      expect(formatScore(92.34)).toBe('92.3');
    });
  });
});