// Tests for validation utilities

import {
  validateUsername,
  validateGameStats,
  validateGameConsistency,
  validateClickLog,
  validateBadges,
  hashIP,
  sanitizeUserAgent
} from '../validation';

describe('Validation Utilities', () => {
  describe('validateUsername', () => {
    it('should accept valid usernames', () => {
      expect(validateUsername('john_doe')).toEqual({ valid: true });
      expect(validateUsername('Player123')).toEqual({ valid: true });
      expect(validateUsername('Test User!')).toEqual({ valid: true });
      expect(validateUsername('')).toEqual({ valid: true }); // Empty is allowed
      expect(validateUsername(undefined)).toEqual({ valid: true }); // Undefined is allowed
    });

    it('should reject invalid usernames', () => {
      expect(validateUsername('a'.repeat(25))).toEqual({ 
        valid: false, 
        error: 'Username must be 20 characters or less' 
      });
      
      expect(validateUsername('user<script>')).toEqual({ 
        valid: false, 
        error: 'Username contains invalid characters' 
      });
      
      expect(validateUsername(123 as any)).toEqual({ 
        valid: false, 
        error: 'Username must be a string' 
      });
    });
  });

  describe('validateGameStats', () => {
    const validStats = {
      totalHits: 10,
      avgAccuracy: 0.85,
      bestAccuracy: 0.95,
      finalRadius: 15,
      durationMs: 20000
    };

    it('should accept valid stats', () => {
      expect(validateGameStats(validStats)).toEqual({ valid: true });
    });

    it('should reject missing fields', () => {
      const invalidStats: any = { ...validStats };
      delete invalidStats.totalHits;
      
      expect(validateGameStats(invalidStats)).toEqual({
        valid: false,
        error: 'Stats missing or invalid field: totalHits'
      });
    });

    it('should reject invalid ranges', () => {
      expect(validateGameStats({ ...validStats, avgAccuracy: 1.5 })).toEqual({
        valid: false,
        error: 'Invalid average accuracy'
      });
      
      expect(validateGameStats({ ...validStats, totalHits: -1 })).toEqual({
        valid: false,
        error: 'Invalid total hits count'
      });
      
      expect(validateGameStats({ ...validStats, durationMs: 500, totalHits: 10 })).toEqual({
        valid: false,
        error: 'Game completed too quickly to be human'
      });
    });
  });

  describe('validateClickLog', () => {
    const validLog = {
      t: 1000,
      cx: 100,
      cy: 100,
      tx: 102,
      ty: 98,
      r: 20,
      d: 2.83,
      hit: true,
      a: 0.86
    };

    it('should accept valid click logs', () => {
      expect(validateClickLog(validLog)).toEqual({ valid: true });
    });

    it('should reject missing fields', () => {
      const invalidLog: any = { ...validLog };
      delete invalidLog.hit;
      
      expect(validateClickLog(invalidLog)).toEqual({
        valid: false,
        error: 'Click log missing or invalid field: hit'
      });
    });

    it('should reject invalid ranges', () => {
      expect(validateClickLog({ ...validLog, cx: -10 })).toEqual({
        valid: false,
        error: 'Invalid click coordinates'
      });
      
      expect(validateClickLog({ ...validLog, r: 0 })).toEqual({
        valid: false,
        error: 'Invalid target radius'
      });
      
      expect(validateClickLog({ ...validLog, t: 700000 })).toEqual({
        valid: false,
        error: 'Invalid timestamp in click log'
      });
    });
  });

  describe('validateGameConsistency', () => {
    const validStats = {
      totalHits: 2,
      avgAccuracy: 0.85,
      bestAccuracy: 0.95,
      finalRadius: 15,
      durationMs: 2000
    };

    const validLogs = [
      { t: 1000, cx: 100, cy: 100, tx: 102, ty: 98, r: 20, d: 2.83, hit: true, a: 0.86 },
      { t: 2000, cx: 150, cy: 150, tx: 148, ty: 152, r: 18, d: 2.83, hit: true, a: 0.84 }
    ];

    it('should accept consistent stats and logs', () => {
      expect(validateGameConsistency(validStats, validLogs)).toEqual({ valid: true });
    });

    it('should reject inconsistent hit counts', () => {
      const inconsistentStats = { ...validStats, totalHits: 5 };
      
      expect(validateGameConsistency(inconsistentStats, validLogs)).toEqual({
        valid: false,
        error: 'Hit count mismatch between stats and logs'
      });
    });

    it('should reject multiple misses', () => {
      const logsWithMultipleMisses = [
        ...validLogs,
        { t: 3000, cx: 200, cy: 200, tx: 100, ty: 100, r: 16, d: 141.4, hit: false },
        { t: 4000, cx: 300, cy: 300, tx: 100, ty: 100, r: 14, d: 282.8, hit: false }
      ];
      
      expect(validateGameConsistency(validStats, logsWithMultipleMisses)).toEqual({
        valid: false,
        error: 'Too many misses in click logs'
      });
    });
  });

  describe('validateBadges', () => {
    it('should accept valid badges', () => {
      expect(validateBadges(['sharpshooter', 'speed_demon'])).toEqual({ valid: true });
      expect(validateBadges([])).toEqual({ valid: true });
    });

    it('should reject invalid badges', () => {
      expect(validateBadges(['invalid_badge'])).toEqual({
        valid: false,
        error: 'Invalid badge: invalid_badge'
      });
      
      expect(validateBadges('not_array' as any)).toEqual({
        valid: false,
        error: 'Badges must be an array'
      });
      
      const tooManyBadges = new Array(15).fill('sharpshooter');
      expect(validateBadges(tooManyBadges)).toEqual({
        valid: false,
        error: 'Too many badges'
      });
    });
  });

  describe('hashIP', () => {
    it('should consistently hash IP addresses', () => {
      const ip = '192.168.1.1';
      const hash1 = hashIP(ip);
      const hash2 = hashIP(ip);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('should produce different hashes for different IPs', () => {
      const hash1 = hashIP('192.168.1.1');
      const hash2 = hashIP('192.168.1.2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('sanitizeUserAgent', () => {
    it('should sanitize user agent strings', () => {
      expect(sanitizeUserAgent('Mozilla/5.0')).toBe('Mozilla/5.0');
      expect(sanitizeUserAgent('Test<script>alert()</script>')).toBe('Testscriptalert()/script');
      expect(sanitizeUserAgent(undefined)).toBe('unknown');
      expect(sanitizeUserAgent('a'.repeat(300))).toHaveLength(200);
    });
  });
});