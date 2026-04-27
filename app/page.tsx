'use client';

import { useMemo, useState } from 'react';
import { SeasonalCostSimulation } from '../components/SeasonalCostSimulation';
import rawListings from '../data/listings.json';
import { generateExplanation, generateKoreanMessage, ListingSignal } from '../lib/listingSignals';
import { personas } from '../lib/personas';
import { rankListings } from '../lib/scoring';
import { Listing, Persona, ScoredListing } from '../lib/types';

type ToggleKey = 'foreigner' | 'utilities' | 'parking' | 'pet' | 'moveSoon';

const toggleLabels: { key: ToggleKey; label: string }[] = [
  { key: 'foreigner', label: 'Foreigner' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'parking', label: 'Parking' },
  { key: 'pet', label: 'Pet' },
  { key: 'moveSoon', label: 'Move soon' },
];

const toggleSignals: Record<ToggleKey, ListingSignal[]> = {
  foreigner: ['foreigner_needed'],
  utilities: ['utilities_unclear'],
  parking: ['parking_needed'],
  pet: ['pet_needed'],
  moveSoon: ['move_soon_needed'],
};

const signalLabels: Record<ListingSignal, string> = {
  high_maintenance_fee: 'High maintenance',
  utilities_unclear: 'Utilities unclear',
  winter_heating_risk: 'Winter heating risk',
  deposit_above_budget: 'Deposit above budget',
  monthly_over_budget: 'Monthly over budget',
  good_station_access: 'Good station access',
  semi_basement_risk: 'Semi-basement checks',
  contract_unclear: 'Contract unclear',
  high_convenience: 'High convenience',
  foreigner_needed: 'Foreigner question',
  parking_needed: 'Parking question',
  pet_needed: 'Pet question',
  move_soon_needed: 'Move-in question',
};

function money(value: number) {
  if (value >= 1000000) return `${value / 1000000}M KRW`;
  return `${Math.round(value / 1000)}K KRW`;
}

function won(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

function decisionLabel(score: number) {
  if (score > 85) return { text: '✔ Best choice', level: 'best' };
  if (score > 70) return { text: '⚠ Needs attention', level: 'medium' };
  return { text: '❌ Potential issue', level: 'bad' };
}

function hiddenCostRiskLabel(listing: ScoredListing) {
  if (listing.hidden_cost_severity === 'HIGH') return 'High hidden cost risk';
  if (listing.hidden_cost_severity === 'MEDIUM') return 'Moderate hidden cost risk';
  return 'Low hidden cost risk';
}

function getKeyInsight(signals: ListingSignal[], listing: ScoredListing) {
  if (signals.includes('high_maintenance_fee')) {
    return 'Maintenance costs are unusually high for this rent level.';
  }
  if (listing.scenario_type === 'hidden_cost_trap') {
    return 'This listing looks affordable, but hidden utility and heating costs may push it over your budget.';
  }
  if (signals.includes('winter_heating_risk')) {
    return 'Winter heating may significantly increase your monthly cost.';
  }
  if (signals.includes('deposit_above_budget')) {
    return 'Deposit exceeds your budget range.';
  }
  if (signals.includes('good_station_access')) {
    return 'This listing has strong transit access for daily life.';
  }
  return 'This listing looks relatively clear, but you should still verify real monthly costs before signing.';
}

function budgetStatus(amount: number, budget: number) {
  if (amount > budget) return `❌ Over budget by ${won(amount - budget)}`;
  return `✔ Within budget: ${won(budget - amount)} remaining`;
}

function listingRoomType(listing: ScoredListing) {
  if (listing.room_type) return listing.room_type;
  if (listing.title.toLowerCase().includes('officetel')) return 'officetel';
  if (listing.title.toLowerCase().includes('shared')) return 'shared housing';
  if (listing.title.toLowerCase().includes('semi-basement')) return 'semi-basement studio';
  return 'studio';
}

function listingSize(listing: ScoredListing) {
  return listing.size_m2 ? ` · ${listing.size_m2}m2` : '';
}

function listingTags(listing: ScoredListing) {
  return [
    ...(listing.tags ?? []),
    listing.scenario_type ? listing.scenario_type.replaceAll('_', ' ') : '',
  ].filter(Boolean);
}

function neighborhoodText(value: string | boolean, yesText: string, noText: string) {
  if (typeof value === 'string') return value;
  return value ? yesText : noText;
}

function scamInsight(listing: ScoredListing) {
  if (listing.scam_insight) return listing.scam_insight;
  if (listing.risk_flags.length === 0) {
    return 'No major risk flags from structured data. Still verify contract terms, owner identity, and deposit-return conditions before signing.';
  }
  return `Check these before visiting: ${listing.risk_flags.join(', ')}. Also confirm contract terms, owner identity, and deposit-return conditions.`;
}

function groupedDoubleChecks(listing: ScoredListing, signals: ListingSignal[]) {
  const groups = [
    {
      title: '💡 Utilities',
      items: [
        signals.includes('utilities_unclear') ? 'Electricity, gas, water, or internet may not be included.' : '',
        signals.includes('high_maintenance_fee') ? 'Ask for a maintenance-fee breakdown before visiting.' : '',
      ].filter(Boolean),
    },
    {
      title: '🔥 Heating',
      items: [
        signals.includes('winter_heating_risk') ? 'Winter costs may increase significantly.' : '',
      ].filter(Boolean),
    },
    {
      title: '📄 Contract',
      items: [
        signals.includes('contract_unclear') ? 'Contract duration is not clearly specified.' : '',
        signals.includes('deposit_above_budget') ? 'Deposit is above the selected budget.' : '',
        ...listing.risk_flags,
      ].filter(Boolean),
    },
  ];

  return groups.filter((group) => group.items.length > 0);
}

function riskCount(listing: ScoredListing) {
  return listing.risk_flags.length + listing.hidden_cost_warnings.length;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <div className="metricLabel"><span>{label}</span><b>{value}</b></div>
      <div className="bar"><div className="fill" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function ListingCard({
  listing,
  selected,
  selectedCount,
  budget,
  onToggleSelect,
}: {
  listing: ScoredListing;
  selected: boolean;
  selectedCount: number;
  budget: number;
  onToggleSelect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [toggles, setToggles] = useState<ToggleKey[]>(['foreigner', 'utilities']);
  const [copied, setCopied] = useState(false);
  const signals = listing.signals;
  const explanation = generateExplanation(signals);
  const userNeeds = toggles.flatMap((key) => toggleSignals[key]);
  const message = generateKoreanMessage(listing, signals, userNeeds);
  const decision = decisionLabel(listing.score);
  const keyInsight = getKeyInsight(signals, listing);
  const doubleCheckGroups = groupedDoubleChecks(listing, signals);
  const disableNewSelection = !selected && selectedCount >= 3;

  function toggle(key: ToggleKey) {
    setToggles((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className={`card listing ${selected ? 'selectedListing' : ''}`}>
      <div className="listingTop">
        <div className="title">
          <span className={`decisionBadge ${decision.level}`}>{decision.text}</span>
          <h3>{listing.title}</h3>
          <p>{listing.area}, {listing.district} · {listingRoomType(listing)}{listingSize(listing)}</p>
        </div>
        <div className="scoreCircle"><span>{listing.score}</span><span>Match Score</span></div>
      </div>

      <div className="tags">
        <span className={`riskPill ${listing.hidden_cost_severity.toLowerCase()}`}>{hiddenCostRiskLabel(listing)}</span>
        {listingTags(listing).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
      </div>

      <div className="priceGrid">
        <div>
          <p>Deposit</p>
          <b>{won(listing.deposit)}</b>
        </div>
        <div>
          <p>Rent</p>
          <b>{won(listing.rent)}</b>
        </div>
        <div>
          <p>Maintenance</p>
          <b>{won(listing.maintenance)}</b>
        </div>
      </div>

      <div className="costPanel">
        <div>
          <span>Base monthly</span>
          <b>{won(listing.base_monthly_cost)}</b>
        </div>
        <div>
          <span>Estimated real cost</span>
          <b>{won(listing.estimated_true_cost)}</b>
        </div>
      </div>

      {listing.hidden_cost_warnings.length > 0 && (
        <div className={`hiddenCostBanner ${listing.hidden_cost_severity.toLowerCase()}`}>
          {listing.scenario_type === 'hidden_cost_trap' ? '🔥 Looks cheap but actually expensive' : '⚠ Hidden cost risk detected'}
        </div>
      )}

      <div className="breakdown">
        <ScoreBar label="💰 Price" value={listing.score_breakdown.affordability} />
        <ScoreBar label="📍 Location" value={listing.score_breakdown.location} />
        <ScoreBar label="🌍 Convenience" value={listing.score_breakdown.convenience} />
      </div>

      <div className="actions">
        <button className="btn" onClick={() => setOpen(!open)}>{open ? 'Hide details' : 'Explain this listing'}</button>
        <button
          className={`btn ${selected ? 'selectedBtn' : 'secondary'}`}
          onClick={onToggleSelect}
          disabled={disableNewSelection}
          title={disableNewSelection ? 'You can compare up to 3 listings in the MVP.' : ''}
        >
          {selected ? 'Added to compare' : disableNewSelection ? 'Max 3 selected' : '+ Add to compare'}
        </button>
      </div>

      {open && (
        <div className="expand">
          <div className="sectionDivider">Insight</div>
          <div className="keyInsight">
            <p className="sectionTitle">💡 Key Insight</p>
            <p>{keyInsight}</p>
          </div>

          <p className="sectionTitle" title="Generated from detected listing signals.">ⓘ Why this score?</p>
          <div className="goodbox">
            <p className="sectionTitle">Detected housing signals</p>
            <div className="tags">
              {signals.map((signal) => <span className="tag" key={signal}>{signalLabels[signal]}</span>)}
            </div>
          </div>
          <ul className="explainList">
            {explanation.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div className="budgetStatus">{budgetStatus(listing.estimated_true_cost, budget)}</div>

          <div className="sectionDivider">Cost</div>
          <SeasonalCostSimulation listing={listing} budget={budget} />

          <div className="sectionDivider">Risks</div>
          <div className="warning">
            <p className="sectionTitle">⚠ Things to double-check</p>
            {doubleCheckGroups.length === 0 ? (
              <p className="explain">No major double-check items from structured data.</p>
            ) : doubleCheckGroups.map((group) => (
              <div className="checkGroup" key={group.title}>
                <b>{group.title}</b>
                <ul>
                  {group.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <div className={`hiddenCostBox ${listing.hidden_cost_severity.toLowerCase()}`}>
            <p className="sectionTitle">Hidden Cost Warnings</p>
            <ul>
              {listing.hidden_cost_warnings.map((warning) => <li key={warning.type}>{warning.message}</li>)}
            </ul>
          </div>

          <div className="goodbox">
            <p className="sectionTitle">Safety / scam double-check</p>
            <p className="explain">{scamInsight(listing)}</p>
          </div>

          <div className="sectionDivider">Message</div>
          <div className="messageCard">
            <div className="messageHeader">
              <div>
                <p className="sectionTitle">💬 What to ask the agent</p>
                <p className="messageTip">Polite Korean message based on this listing's issues.</p>
              </div>
              <button className="copyBtn" onClick={copyMessage}>{copied ? 'Copied' : 'Copy'}</button>
            </div>
            <div className="toggles">
              {toggleLabels.map((item) => (
                <button key={item.key} className={`toggle ${toggles.includes(item.key) ? 'active' : ''}`} onClick={() => toggle(item.key)}>
                  {item.label}
                </button>
              ))}
            </div>
            <pre className="messageBox">{message}</pre>
            <p className="messageTip">Tip: This uses polite Korean commonly used when contacting real-estate agents.</p>
            <div className="actions">
              <button className="btn ghost" onClick={() => alert('Pronunciation preview: Annyeonghaseyo. I bang-e gwansim-i itseumnida. Slowly show or read the Korean text to the agent.')}>Preview pronunciation</button>
            </div>
          </div>

          <div className="sectionDivider">Neighborhood</div>
          <div className="neighborhoodCard">
            <p className="sectionTitle">📍 Neighborhood snapshot</p>
            <div className="neighborhoodGrid">
              <div>🚇 Subway: {listing.walk_to_station_min} min walk</div>
              <div>🛒 Foreign grocery: {neighborhoodText(listing.neighborhood.foreign_grocery, 'Nearby', 'Limited')}</div>
              <div>🏥 Clinic: {neighborhoodText(listing.neighborhood.clinic, 'Nearby', 'Not nearby')}</div>
              <div>🏙 Area type: {listing.neighborhood.area_type}</div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function ComparePanel({ selected, onClear, onRemove }: { selected: ScoredListing[]; onClear: () => void; onRemove: (id: string) => void }) {
  const best = selected.length ? [...selected].sort((a, b) => b.score - a.score)[0] : null;

  return (
    <aside className="card side">
      <div className="compareHeader top">
        <h3>Compare shortlist</h3>
        <span className="compareCount">{selected.length}/3</span>
      </div>
      <p className="small">Add 2-3 homes to compare costs, risks, and convenience.</p>
      <div className="formula">
        Scores, explanations, and Korean messages are generated from deterministic listing signals and verified templates.
      </div>
      <div className="compareHeader">
        {selected.length > 0 && <button className="linkBtn" onClick={onClear}>Clear</button>}
      </div>

      {selected.length === 0 && <p className="small">Click Add to compare on 2-3 listings to build a side-by-side shortlist.</p>}
      {selected.length === 1 && <p className="small">One listing selected. Add one more listing to unlock comparison.</p>}

      {selected.length > 0 && (
        <div className="selectedList">
          {selected.map((item) => (
            <div className="selectedPill" key={item.id}>
              <div>
                <span>{item.title}</span>
                <small>{money(item.estimated_true_cost)} real cost · {hiddenCostRiskLabel(item)}</small>
              </div>
              <button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.title}`}>x</button>
            </div>
          ))}
        </div>
      )}

      {selected.length >= 2 && (
        <div className="compareTableWrap">
          <table className="compareTable">
            <thead>
              <tr>
                <th>Factor</th>
                {selected.map((item) => <th key={item.id}>{item.title}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Final score</td>
                {selected.map((item) => <td key={item.id}><b>{item.score}/100</b></td>)}
              </tr>
              <tr>
                <td>Deposit</td>
                {selected.map((item) => <td key={item.id}>{money(item.deposit)}</td>)}
              </tr>
              <tr>
                <td>Base monthly</td>
                {selected.map((item) => <td key={item.id}>{money(item.base_monthly_cost)}</td>)}
              </tr>
              <tr>
                <td>Estimated real cost</td>
                {selected.map((item) => <td key={item.id}><b>{money(item.estimated_true_cost)}</b></td>)}
              </tr>
              <tr>
                <td>Hidden cost risk</td>
                {selected.map((item) => <td key={item.id}>{hiddenCostRiskLabel(item)}</td>)}
              </tr>
              <tr>
                <td>Station walk</td>
                {selected.map((item) => <td key={item.id}>{item.walk_to_station_min} min</td>)}
              </tr>
              <tr>
                <td>Double-check items</td>
                {selected.map((item) => <td key={item.id}>{riskCount(item)}</td>)}
              </tr>
              <tr>
                <td>Area fit</td>
                {selected.map((item) => <td key={item.id}>{item.neighborhood.area_type}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {best && selected.length >= 2 && (
        <div className="warning">
          <p className="sectionTitle">Quick recommendation</p>
          <p className="explain"><b>{best.title}</b> currently has the strongest overall balance. Still verify utilities, contract duration, and deposit-return conditions before contacting the agent.</p>
        </div>
      )}
    </aside>
  );
}

export default function Home() {
  const listings = rawListings as Listing[];
  const [persona, setPersona] = useState<Persona>(personas[0]);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const ranked = useMemo(() => rankListings(listings, persona), [listings, persona]);
  const selected = ranked.filter((item) => compareIds.includes(item.id));

  function selectPersona(next: Persona) {
    setPersona(next);
    setCompareIds([]);
    window.requestAnimationFrame(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-3));
  }

  return (
    <main className="container">
      <section className="hero">
        <div className="badge">HomeBridge Korea · Demo MVP</div>
        <h1>Find a home in Korea — without costly mistakes</h1>
        <p>We help you understand real costs, risks, and what to ask before renting.</p>
      </section>

      <section className="grid personas">
        {personas.map((p) => (
          <button key={p.id} className={`card persona ${persona.id === p.id ? 'active' : ''}`} onClick={() => selectPersona(p)}>
            <h3>{p.label}</h3>
            <p>{p.subtitle}</p>
          </button>
        ))}
      </section>

      <div className="toolbar">
        <div>
          <h2>Ranked housing options</h2>
          <p className="small">Active profile: {persona.label}. Budget: deposit {money(persona.maxDeposit)}, monthly {money(persona.maxRent)}.</p>
        </div>
        <div className="compareStatus">{selected.length}/3 selected for comparison</div>
      </div>

      <section className="grid results">
        <div>
          {ranked.length === 0 ? <div className="card empty">No listings found.</div> : ranked.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              selected={compareIds.includes(listing.id)}
              selectedCount={compareIds.length}
              budget={persona.maxRent}
              onToggleSelect={() => toggleCompare(listing.id)}
            />
          ))}
        </div>
        <ComparePanel selected={selected} onClear={() => setCompareIds([])} onRemove={(id) => toggleCompare(id)} />
      </section>

      <div className="disclaimer">
        Demo prototype only. This app does not provide legal or financial advice. Always verify contract details with a licensed real-estate agent or qualified professional.
      </div>
    </main>
  );
}
