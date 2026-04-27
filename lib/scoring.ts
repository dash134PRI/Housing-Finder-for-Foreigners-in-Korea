import { HiddenCostSeverity, HiddenCostWarning, Listing, Persona, ScoredListing } from './types';
import { extractListingSignals, generateExplanation } from './listingSignals';
import {
  baseMonthlyCost,
  estimateSeasonalCosts,
  estimateTrueCost,
  estimateUtilityCost,
  normalizeUtilitiesNote,
} from '../utils/costSimulation';

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function affordabilityScore(listing: Listing, persona: Persona) {
  const rentScore = clamp((persona.maxRent / estimateTrueCost(listing)) * 100);
  const depositScore = clamp((persona.maxDeposit / listing.deposit) * 100);
  return Math.round(0.7 * rentScore + 0.3 * depositScore);
}

export function convenienceScore(listing: Listing) {
  if (typeof listing.convenience_score === 'number') return listing.convenience_score;
  let score = 50;
  if (listing.neighborhood.foreign_grocery) score += 18;
  if (listing.neighborhood.clinic) score += 14;
  if (listing.walk_to_station_min <= 5) score += 18;
  else if (listing.walk_to_station_min <= 8) score += 12;
  else if (listing.walk_to_station_min <= 12) score += 6;
  return clamp(score);
}

export function locationScore(listing: Listing, persona: Persona) {
  let walkScore = 40;
  if (listing.walk_to_station_min <= 5) walkScore = 100;
  else if (listing.walk_to_station_min <= 10) walkScore = 80;
  else if (listing.walk_to_station_min <= 15) walkScore = 60;

  const areaBonus = listing.area.toLowerCase().includes(persona.targetArea.toLowerCase()) ? 15 : 0;
  return clamp(walkScore + areaBonus);
}

export function detectHiddenCosts(
  listing: Listing,
  districtAverageRent: number,
  persona?: Persona,
): HiddenCostWarning[] {
  const warnings: HiddenCostWarning[] = [];
  const total = baseMonthlyCost(listing);
  const maintenanceRatio = total > 0 ? listing.maintenance / total : 0;

  const utilitiesNote = normalizeUtilitiesNote(listing.utilities_note);

  if (utilitiesNote === 'unclear') {
    warnings.push({
      type: 'unclear_utilities',
      message: 'Maintenance fee may not include electricity, gas, water, or internet.',
    });
  }

  if (maintenanceRatio > 0.25) {
    warnings.push({
      type: 'high_maintenance',
      message: 'Maintenance fee is relatively high compared to rent.',
    });
  }

  if (utilitiesNote !== 'all_included') {
    warnings.push({
      type: 'heating_risk',
      message: 'Winter heating costs may add KRW 50,000-120,000 per month.',
    });
  }

  if (districtAverageRent > 0 && listing.rent < districtAverageRent * 0.7) {
    warnings.push({
      type: 'suspiciously_low',
      message: 'Rent is unusually low for this district. Check for hidden costs or room issues.',
    });
  }

  if (persona && estimateTrueCost(listing) > persona.maxRent) {
    warnings.push({
      type: 'over_budget',
      message: 'Estimated real cost may exceed your monthly budget.',
    });
  }

  return warnings;
}

export function classifyHiddenCostSeverity(warnings: HiddenCostWarning[]): HiddenCostSeverity {
  if (warnings.length >= 3) return 'HIGH';
  if (warnings.length === 2) return 'MEDIUM';
  return 'LOW';
}

export function adjustScoreForHiddenCost(score: number, severity: HiddenCostSeverity) {
  if (severity === 'HIGH') return clamp(score - 15);
  if (severity === 'MEDIUM') return clamp(score - 8);
  return score;
}

function districtAverageRent(listings: Listing[], district: string) {
  const districtListings = listings.filter((item) => item.district === district);
  if (districtListings.length === 0) return 0;
  return districtListings.reduce((sum, item) => sum + item.rent, 0) / districtListings.length;
}

export function scoreListing(
  listing: Listing,
  persona: Persona,
  districtAvgRent = listing.rent,
): ScoredListing {
  const affordability = affordabilityScore(listing, persona);
  const location = locationScore(listing, persona);
  const convenience = convenienceScore(listing);
  const rawScore = Math.round(0.4 * affordability + 0.3 * location + 0.3 * convenience);
  const hiddenCostWarnings = detectHiddenCosts(listing, districtAvgRent, persona);
  const hiddenCostSeverity = classifyHiddenCostSeverity(hiddenCostWarnings);
  const signals = extractListingSignals(listing, persona);
  const score = adjustScoreForHiddenCost(rawScore, hiddenCostSeverity);
  const baseCost = baseMonthlyCost(listing);
  const trueCost = estimateTrueCost(listing);
  const seasonalCosts = estimateSeasonalCosts(listing);

  const why = [
    `Base monthly: KRW ${baseCost.toLocaleString()}`,
    `Estimated real cost: KRW ${trueCost.toLocaleString()} vs budget KRW ${persona.maxRent.toLocaleString()}`,
    `${hiddenCostSeverity} hidden cost risk`,
    `${listing.walk_to_station_min}-min walk to station`,
    listing.neighborhood.foreign_grocery ? 'Foreign grocery access nearby' : 'No foreign grocery signal provided',
  ];

  return {
    ...listing,
    score,
    signals,
    generated_explanation: generateExplanation(signals),
    base_monthly_cost: baseCost,
    estimated_true_cost: trueCost,
    seasonal_costs: seasonalCosts,
    hidden_cost_severity: hiddenCostSeverity,
    hidden_cost_warnings: hiddenCostWarnings,
    score_breakdown: { affordability, location, convenience },
    why,
  };
}

export function rankListings(listings: Listing[], persona: Persona) {
  return listings
    .map((listing) => scoreListing(listing, persona, districtAverageRent(listings, listing.district)))
    .sort((a, b) => b.score - a.score);
}
