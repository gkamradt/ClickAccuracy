// Integration tests for /api/runs endpoint

import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../pages/api/runs';
import { createMocks } from 'node-mocks-http';

// Mock database functions
jest.mock('@/lib/database', () => ({
  insertRun: jest.fn().mockResolvedValue(123),
  calculatePercentile: jest.fn().mockResolvedValue(75),
  getCurrentRank: jest.fn().mockResolvedValue(5),
  getAIComparisons: jest.fn().mockResolvedValue({
    chatgpt_4: { speed: 2, performance: -3 }
  })
}));

describe('/api/runs', () => {
  function createValidRequest(overrides = {}) {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        username: 'testuser',
        stats: {
          totalHits: 10,
          avgAccuracy: 0.85,
          bestAccuracy: 0.95,
          finalRadius: 15,
          durationMs: 20000
        },
        click_logs: [
          {
            t: 1000,
            cx: 100,
            cy: 100,
            tx: 102,
            ty: 98,
            r: 20,
            d: 2.83,
            hit: true,
            a: 0.86
          },
          {
            t: 2000,
            cx: 150,
            cy: 150,
            tx: 148,
            ty: 152,
            r: 18,
            d: 2.83,
            hit: true,
            a: 0.84
          }
        ],
        badges: ['sharpshooter'],
        ...overrides
      }
    });
    return { req, res };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully submit a valid run', async () => {
    const { req, res } = createValidRequest();
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.id).toBe(123);
    expect(data.scores).toBeDefined();
    expect(data.rankings).toBeDefined();
    expect(data.vs_ai).toBeDefined();
  });

  it('should reject request with missing stats', async () => {
    const { req, res } = createValidRequest();
    delete req.body.stats;
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Missing required fields');
  });

  it('should reject request with invalid username', async () => {
    const { req, res } = createValidRequest({
      username: 'a'.repeat(25) // Too long
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Username must be 20 characters or less');
  });

  it('should reject request with impossible timing', async () => {
    const { req, res } = createValidRequest({
      stats: {
        totalHits: 10,
        avgAccuracy: 0.85,
        bestAccuracy: 0.95,
        finalRadius: 15,
        durationMs: 500 // 50ms per hit - impossible for humans
      }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('too quickly to be human');
  });

  it('should reject request with invalid accuracy values', async () => {
    const { req, res } = createValidRequest({
      stats: {
        totalHits: 10,
        avgAccuracy: 1.5, // Invalid - greater than 1
        bestAccuracy: 0.95,
        finalRadius: 15,
        durationMs: 20000
      }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Invalid average accuracy');
  });

  it('should reject inconsistent stats and logs', async () => {
    const { req, res } = createValidRequest({
      stats: {
        totalHits: 5, // Doesn't match click logs (which have 2 hits)
        avgAccuracy: 0.85,
        bestAccuracy: 0.95,
        finalRadius: 15,
        durationMs: 20000
      }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.error).toContain('Hit count mismatch');
  });

  it('should handle OPTIONS request for CORS', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'OPTIONS'
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['access-control-allow-origin']).toBe('*');
  });

  it('should reject non-POST methods', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET'
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Method not allowed');
  });
});