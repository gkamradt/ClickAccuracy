// Database types for Click Accuracy Game

export interface RunRecord {
  id?: number;
  username?: string;
  speed_score: number;
  performance_score: number;
  total_hits: number;
  avg_accuracy: number;
  best_accuracy: number;
  final_radius: number;
  duration_ms: number;
  avg_time_per_hit_ms: number;
  click_logs: ClickLog[];
  badges: string[];
  is_ai: boolean;
  ai_model?: string;
  created_at?: Date;
  ip_hash?: string;
  user_agent?: string;
}

export interface ClickLog {
  t: number;           // ms since run start
  cx: number;          // click x coordinate
  cy: number;          // click y coordinate  
  tx: number;          // target center x
  ty: number;          // target center y
  r: number;           // target radius at time of click
  d: number;           // distance from center
  hit: boolean;        // hit or miss boolean
  a?: number;          // unweighted accuracy [0,1]
  w?: number;          // weight
  s?: number;          // weighted score a*w
}

export interface GameStats {
  totalHits: number;
  avgAccuracy: number;
  bestAccuracy: number;
  finalRadius: number;
  durationMs: number;
  speedScore: number;
  performanceScore: number;
  badges: string[];
  clickLogs: ClickLog[];
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  speed_score: number;
  performance_score: number;
  total_hits: number;
  avg_accuracy: number;
  created_at: Date;
  badges: string[];
  is_ai: boolean;
  ai_model?: string;
}

export interface LeaderboardData {
  hall_of_fame: LeaderboardEntry[];
  todays_best: LeaderboardEntry[];
  ai_benchmarks: LeaderboardEntry[];
  scatter_data: Array<{
    x: number;
    y: number;
    type: 'human' | 'ai' | 'current';
    model?: string;
    username?: string;
  }>;
}

export interface SubmissionResult {
  rank: number;
  percentile: number;
  vs_ai: Record<string, {
    speed: number;
    performance: number;
  }>;
}