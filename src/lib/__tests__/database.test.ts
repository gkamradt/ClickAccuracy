// Database utility tests

import { 
  calculatePercentile, 
  getCurrentRank,
  getAIComparisons 
} from '../database';

// Mock @vercel/postgres
jest.mock('@vercel/postgres', () => ({
  sql: {
    query: jest.fn(),
    __esModule: true,
  },
}));

const { sql } = require('@vercel/postgres');

describe('Database Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculatePercentile', () => {
    it('should calculate percentile correctly', async () => {
      // Mock total count
      (sql.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [{ lower_count: '75' }] });

      const result = await calculatePercentile(85.5, 'performance');
      
      expect(result).toBe(75);
      expect(sql.query).toHaveBeenCalledTimes(2);
    });

    it('should return 100 for first player', async () => {
      (sql.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await calculatePercentile(85.5, 'performance');
      
      expect(result).toBe(100);
    });
  });

  describe('getCurrentRank', () => {
    it('should calculate rank correctly', async () => {
      (sql.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ rank: '5' }] });

      const result = await getCurrentRank(85.5, 'performance');
      
      expect(result).toBe(5);
    });
  });

  describe('getAIComparisons', () => {
    it('should calculate AI comparisons correctly', async () => {
      const mockAIData = {
        rows: [
          { ai_model: 'ChatGPT-4', speed_score: '78.5', performance_score: '82.3' },
          { ai_model: 'Claude', speed_score: '72.1', performance_score: '88.5' }
        ]
      };

      (sql as any).mockResolvedValueOnce(mockAIData);

      const result = await getAIComparisons(80, 85);
      
      expect(result).toEqual({
        chatgpt_4: { speed: 2, performance: 3 },
        claude: { speed: 8, performance: -4 }
      });
    });
  });
});