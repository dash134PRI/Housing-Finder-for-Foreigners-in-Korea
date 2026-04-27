import { estimateSeasonalCosts } from '../utils/costSimulation';

function won(value) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
}

function CostBar({ label, amount, budget }) {
  const percentage = Math.min((amount / budget) * 100, 100);
  const overBudget = amount > budget;
  const closeToBudget = !overBudget && amount >= budget * 0.9;
  const statusClass = overBudget ? 'overBudget' : closeToBudget ? 'nearBudget' : '';

  return (
    <div className="costBar">
      <div className="costBarHeader">
        <span>{label}</span>
        <b className={overBudget ? 'overBudgetText' : closeToBudget ? 'nearBudgetText' : ''}>{won(amount)}</b>
      </div>
      <div className="costTrack">
        <div className={`costFill ${statusClass}`} style={{ width: `${percentage}%` }} />
      </div>
      {overBudget && (
        <p className="overBudgetNote">Exceeds budget by {won(amount - budget)}</p>
      )}
      {closeToBudget && (
        <p className="nearBudgetNote">Close to budget: {won(budget - amount)} remaining</p>
      )}
    </div>
  );
}

export function SeasonalCostSimulation({ listing, budget }) {
  const costs = estimateSeasonalCosts(listing);
  const winterOverage = costs.winter - budget;

  return (
    <div className="seasonalCost">
      <p className="sectionTitle">💰 Monthly Cost Reality Check</p>
      <p className="small">Budget: {won(budget)}</p>
      <p className="costCaution">⚠ Your actual monthly cost may be higher than the listed rent.</p>
      <div className="seasonalBars">
        <CostBar label="💰 Base" amount={costs.base} budget={budget} />
        <CostBar label="☀️ Summer" amount={costs.summer} budget={budget} />
        <CostBar label="❄️ Winter" amount={costs.winter} budget={budget} />
      </div>
      {winterOverage > 0 && (
        <div className="winterWarning">
          Winter estimate exceeds budget by {won(winterOverage)}.
        </div>
      )}
    </div>
  );
}
