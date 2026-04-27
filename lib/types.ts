export type Listing = {
  id: string;
  title: string;
  district: string;
  area: string;
  deposit: number;
  rent: number;
  maintenance: number;
  room_type?: string;
  size_m2?: number;
  walk_to_station_min: number;
  contract_term?: string;
  utilities_note: string;
  heating_type: 'gas' | 'electric' | 'central' | 'unknown';
  convenience_score?: number;
  tags?: string[];
  scenario_type?: string;
  risk_flags: string[];
  neighborhood: {
    subway?: string;
    foreign_grocery: string | boolean;
    clinic: string | boolean;
    area_type: string;
  };
  ai_explanation?: string;
  scam_insight?: string;
  korean_messages?: Record<string, string>;
};

export type HiddenCostSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type HiddenCostWarning = {
  type:
    | 'unclear_utilities'
    | 'high_maintenance'
    | 'heating_risk'
    | 'suspiciously_low'
    | 'over_budget';
  message: string;
};

export type Persona = {
  id: string;
  label: string;
  subtitle: string;
  targetArea: string;
  maxDeposit: number;
  maxRent: number;
  priorities: string[];
};

export type ScoredListing = Listing & {
  score: number;
  signals: import('./listingSignals').ListingSignal[];
  generated_explanation: string[];
  base_monthly_cost: number;
  estimated_true_cost: number;
  seasonal_costs: {
    base: number;
    summer: number;
    winter: number;
  };
  hidden_cost_severity: HiddenCostSeverity;
  hidden_cost_warnings: HiddenCostWarning[];
  score_breakdown: {
    affordability: number;
    location: number;
    convenience: number;
  };
  why: string[];
};
