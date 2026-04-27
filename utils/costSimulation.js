export function normalizeUtilitiesNote(note) {
  return note.replaceAll(' ', '_');
}

export function baseMonthlyCost(listing) {
  return listing.rent + listing.maintenance;
}

export function estimateUtilityCost(listing) {
  const utilitiesNote = normalizeUtilitiesNote(listing.utilities_note);
  if (utilitiesNote === 'unclear') return 70000;
  if (utilitiesNote === 'not_included') return 90000;
  if (utilitiesNote === 'all_included') return 30000;
  return 50000;
}

export function estimateTrueCost(listing) {
  return baseMonthlyCost(listing) + estimateUtilityCost(listing);
}

export function estimateSeasonalCosts(listing) {
  const baseCost = baseMonthlyCost(listing);
  const utilitiesNote = normalizeUtilitiesNote(listing.utilities_note);
  let summerExtra = 30000;
  let winterExtra = 70000;

  if (utilitiesNote === 'unclear') {
    summerExtra = 50000;
    winterExtra = 120000;
  }

  if (utilitiesNote === 'not_included') {
    summerExtra = 70000;
    winterExtra = 150000;
  }

  if (listing.heating_type === 'gas') {
    winterExtra += 30000;
  }

  return {
    base: baseCost,
    summer: baseCost + summerExtra,
    winter: baseCost + winterExtra,
  };
}
