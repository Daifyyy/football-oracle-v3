
export interface Team {
  id: number;
  name: string;
  logo: string;
}

export interface PredictionPercent {
  home: string;
  draw: string;
  away: string;
}

export interface PredictionWinner {
  id: number | null;
  name: string | null;
  comment: string | null;
}

export interface Prediction {
  winner: PredictionWinner;
  win_or_draw: boolean;
  under_over: string | null;
  goals: {
    home: string | null;
    away: string | null;
  };
  advice: string;
  percent: PredictionPercent;
}

export interface PredictionResponse {
  predictions: Prediction;
  teams: {
    home: Team;
    away: Team;
  };
  comparison: Record<string, { home: string; away: string }>;
  h2h: any[];
}

export interface ApiResponse<T> {
  get: string;
  parameters: Record<string, any>;
  errors: any[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: T[];
}

export interface Fixture {
  fixture: {
    id: number;
    referee: string;
    timezone: string;
    date: string;
    timestamp: number;
    status: {
      long: string;
      short: string;
      elapsed: number;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
  };
  teams: {
    home: Team;
    away: Team;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}
