import { baseMonthlyCost, estimateTrueCost, normalizeUtilitiesNote } from '../utils/costSimulation';
import { Listing, Persona } from './types';

export type ListingSignal =
  | 'high_maintenance_fee'
  | 'utilities_unclear'
  | 'winter_heating_risk'
  | 'deposit_above_budget'
  | 'monthly_over_budget'
  | 'good_station_access'
  | 'semi_basement_risk'
  | 'contract_unclear'
  | 'high_convenience'
  | 'foreigner_needed'
  | 'parking_needed'
  | 'pet_needed'
  | 'move_soon_needed';

const explanationTemplates: Record<ListingSignal, string> = {
  high_maintenance_fee: 'The maintenance fee is relatively high compared with the monthly rent.',
  utilities_unclear: 'The listing does not clearly say whether electricity, gas, water, or internet are included.',
  winter_heating_risk: 'Because heating may rely on gas or separate utility billing, winter costs can rise significantly.',
  deposit_above_budget: 'The deposit is above your stated budget.',
  monthly_over_budget: 'The estimated real monthly cost may exceed your selected monthly budget.',
  good_station_access: 'The location has convenient subway access.',
  semi_basement_risk: 'The room type may require extra checks for light, ventilation, dampness, and flood history.',
  contract_unclear: 'The contract term is unclear, so lease length and renewal conditions should be confirmed.',
  high_convenience: 'The neighborhood convenience score is strong for daily life.',
  foreigner_needed: 'Ask whether foreign tenants can sign the lease.',
  parking_needed: 'Ask whether parking is available and whether it costs extra.',
  pet_needed: 'Ask whether pets are allowed before arranging a visit.',
  move_soon_needed: 'Ask whether the move-in date fits your timeline.',
};

const koreanQuestionTemplates: Partial<Record<ListingSignal, string>> = {
  utilities_unclear: '관리비에 전기, 가스, 수도, 인터넷이 포함되어 있나요?',
  high_maintenance_fee: '관리비 세부 항목을 확인할 수 있을까요?',
  winter_heating_risk: '겨울철 난방비는 보통 어느 정도 나오나요?',
  deposit_above_budget: '보증금 조정이 가능한가요?',
  monthly_over_budget: '월세와 관리비 외에 추가로 내야 하는 비용이 있나요?',
  contract_unclear: '계약 기간은 정확히 어떻게 되나요?',
  semi_basement_risk: '반지하 습기, 환기, 침수 이력이 있는지 확인할 수 있을까요?',
  foreigner_needed: '외국인도 계약 가능한가요?',
  parking_needed: '주차가 가능한가요?',
  pet_needed: '반려동물 동반 입주가 가능한가요?',
  move_soon_needed: '빠른 입주가 가능한가요?',
};

function uniqueSignals(signals: ListingSignal[]) {
  return Array.from(new Set(signals));
}

export function extractListingSignals(listing: Listing, persona: Persona): ListingSignal[] {
  const total = baseMonthlyCost(listing);
  const utilitiesNote = normalizeUtilitiesNote(listing.utilities_note);
  const signals: ListingSignal[] = [];

  if (total > 0 && listing.maintenance / total > 0.25) {
    signals.push('high_maintenance_fee');
  }

  if (utilitiesNote === 'unclear') {
    signals.push('utilities_unclear');
  }

  if (listing.heating_type === 'gas' || utilitiesNote !== 'all_included') {
    signals.push('winter_heating_risk');
  }

  if (listing.deposit > persona.maxDeposit) {
    signals.push('deposit_above_budget');
  }

  if (estimateTrueCost(listing) > persona.maxRent) {
    signals.push('monthly_over_budget');
  }

  if (listing.walk_to_station_min <= 7) {
    signals.push('good_station_access');
  }

  if ((listing.room_type ?? listing.title).toLowerCase().includes('semi-basement')) {
    signals.push('semi_basement_risk');
  }

  if (!listing.contract_term || listing.contract_term === 'not shown') {
    signals.push('contract_unclear');
  }

  if ((listing.convenience_score ?? 0) >= 85 || (listing.neighborhood.foreign_grocery && listing.neighborhood.clinic)) {
    signals.push('high_convenience');
  }

  return uniqueSignals(signals);
}

export function generateExplanation(signals: ListingSignal[]) {
  return signals.map((signal) => explanationTemplates[signal]).filter(Boolean);
}

export function generateKoreanMessage(
  _listing: Listing,
  listingSignals: ListingSignal[],
  userNeeds: ListingSignal[] = [],
) {
  const base = [
    '안녕하세요. 이 방에 관심이 있습니다.',
    '아직 계약 가능한가요?',
  ];
  const questions = uniqueSignals([...listingSignals, ...userNeeds])
    .map((signal) => koreanQuestionTemplates[signal])
    .filter(Boolean);

  return [...base, ...questions, '방문 예약이 가능할까요?'].join('\n');
}
