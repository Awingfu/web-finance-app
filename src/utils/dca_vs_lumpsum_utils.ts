/**
 * DCA vs Lump Sum — investment strategy comparison
 *
 * Compares dollar-cost averaging (investing periodically) against investing a
 * lump sum immediately. Money not yet invested sits in a savings account (HYSA)
 * earning interest. Supports bullish, bearish, and volatile market scenarios.
 */

export type MarketScenario = "bull" | "bear" | "volatile" | "flat";

export interface DcaInputs {
  totalAmount: number; // total money available to invest
  investmentHorizonYears: number; // how many years until we care about the final value
  dcaMonths: number; // how many months to spread DCA over (1 = lump sum equivalent)
  marketReturnRate: number; // nominal annual market return (e.g. 0.10)
  savingsAccountRate: number; // HYSA annual rate for uninvested cash
  scenario: MarketScenario;
  scenarioIntensity: number; // 0–1: how extreme the scenario path is (0 = flat, 1 = max)
}

export interface MonthlyDataPoint {
  month: number;
  dcaPortfolio: number; // invested balance for DCA
  dcaCash: number; // cash still in HYSA for DCA
  dcaTotal: number; // dcaPortfolio + dcaCash
  lumpSumPortfolio: number; // invested balance for lump sum
  invested: number; // cumulative amount invested in DCA so far
}

export interface DcaResult {
  monthlyData: MonthlyDataPoint[];
  finalDcaTotal: number;
  finalLumpSum: number;
  dcaVsLumpSumDiff: number; // finalDcaTotal - finalLumpSum (+ve = DCA wins)
  dcaWins: boolean;
  totalContributed: number;
  monthlyInstallment: number;
  averageBuyPrice: number; // weighted avg price index for DCA
  lumpSumBuyPrice: number; // price index at month 0
  avgCostAdvantage: number; // lumpSumBuyPrice - averageBuyPrice (+ = DCA got cheaper avg)
  scenarioLabel: string;
  monthlyReturns: number[]; // actual monthly return rates used
}

/**
 * Build a sequence of monthly returns for a given scenario over N months.
 *
 * All non-flat scenarios keep the arithmetic mean of their multipliers at 1.0,
 * so the long-run average return stays close to `marketReturnRate`.
 * `scenarioIntensity` (0–1) scales how far returns deviate from the flat case:
 *   0 = perfectly flat, 1 = maximum path effect.
 *
 * Amplitude constants chosen so intensity=1.0 produces realistic extremes:
 *   bull:     ±1× of base (0× at start → 2× at end)
 *   bear:     ±4× of base (sharp dip then sharp recovery — ~25% annualised drop at peak)
 *   volatile: ±3× of base (~17% annualised down to ~46% annualised up, alternating)
 */
function buildMonthlyReturns(inputs: DcaInputs, totalMonths: number): number[] {
  const { scenario, marketReturnRate, scenarioIntensity } = inputs;
  const I = scenarioIntensity;
  const mb = Math.pow(1 + marketReturnRate, 1 / 12) - 1;

  switch (scenario) {
    case "bull": {
      // Ramp from (1 - I)× to (1 + I)× — arithmetic mean of multipliers = 1 ✓
      return Array.from({ length: totalMonths }, (_, i) => {
        const t = i / Math.max(totalMonths - 1, 1);
        return mb * (1 + I * (2 * t - 1));
      });
    }
    case "bear": {
      // Cosine V-shape: drops then recovers.
      // ∫cos(πt) dt from 0→1 = 0, so arithmetic mean of multipliers = 1 ✓
      return Array.from({ length: totalMonths }, (_, i) => {
        const t = i / Math.max(totalMonths - 1, 1);
        return mb * (1 - I * 4 * Math.cos(Math.PI * t));
      });
    }
    case "volatile": {
      // Alternating up/down months — mean = 1 ✓ (with an even number of months)
      return Array.from({ length: totalMonths }, (_, i) => {
        const sign = i % 2 === 0 ? 1 : -1;
        return mb * (1 + sign * I * 3);
      });
    }
    case "flat":
    default:
      return Array.from({ length: totalMonths }, () => mb);
  }
}

const SCENARIO_LABELS: Record<MarketScenario, string> = {
  bull: "Bull Market (steady climb)",
  bear: "Bear then Bull (V-shape)",
  volatile: "Volatile (alternating swings)",
  flat: "Flat / Average",
};

export function calcDcaVsLumpSum(inputs: DcaInputs): DcaResult {
  const { totalAmount, investmentHorizonYears, dcaMonths, savingsAccountRate } =
    inputs;

  const totalMonths = Math.max(investmentHorizonYears * 12, dcaMonths);
  const monthlyInstallment = totalAmount / Math.max(dcaMonths, 1);
  const monthlySavingsRate = Math.pow(1 + savingsAccountRate, 1 / 12) - 1;
  const monthlyReturns = buildMonthlyReturns(inputs, totalMonths);

  // Track price index for average-cost calculation
  let priceIndex = 100; // starts at 100
  const dcaBuyPrices: { amount: number; price: number }[] = [];

  let dcaPortfolio = 0;
  let dcaCash = totalAmount; // all money starts in HYSA
  let lumpSumPortfolio = totalAmount; // lump sum invests everything immediately

  const monthlyData: MonthlyDataPoint[] = [];

  // Record initial state (month 0)
  monthlyData.push({
    month: 0,
    dcaPortfolio: 0,
    dcaCash: totalAmount,
    dcaTotal: totalAmount,
    lumpSumPortfolio: totalAmount,
    invested: 0,
  });

  const lumpSumBuyPrice = priceIndex;

  for (let m = 1; m <= totalMonths; m++) {
    const monthlyReturn = monthlyReturns[m - 1] ?? 0;

    // Apply market return to both portfolios
    dcaPortfolio = dcaPortfolio * (1 + monthlyReturn);
    lumpSumPortfolio = lumpSumPortfolio * (1 + monthlyReturn);

    // Update price index (cumulative market level)
    priceIndex = priceIndex * (1 + monthlyReturn);

    // DCA: apply HYSA interest to uninvested cash
    dcaCash = dcaCash * (1 + monthlySavingsRate);

    // DCA: deploy this month's installment (if still in DCA period)
    if (m <= dcaMonths) {
      const installment = Math.min(monthlyInstallment, dcaCash);
      dcaCash -= installment;
      dcaPortfolio += installment;
      dcaBuyPrices.push({ amount: installment, price: priceIndex });
    }

    const dcaTotal = dcaPortfolio + dcaCash;
    const invested = Math.min(m * monthlyInstallment, totalAmount);

    monthlyData.push({
      month: m,
      dcaPortfolio,
      dcaCash,
      dcaTotal,
      lumpSumPortfolio,
      invested,
    });
  }

  // Weighted average buy price for DCA
  const totalInvested = dcaBuyPrices.reduce((s, p) => s + p.amount, 0);
  const weightedPrice =
    totalInvested > 0
      ? dcaBuyPrices.reduce(
          (s, p) => s + (p.amount / totalInvested) * p.price,
          0,
        )
      : lumpSumBuyPrice;

  const finalDcaTotal = dcaPortfolio + dcaCash;
  const finalLumpSum = lumpSumPortfolio;

  return {
    monthlyData,
    finalDcaTotal,
    finalLumpSum,
    dcaVsLumpSumDiff: finalDcaTotal - finalLumpSum,
    dcaWins: finalDcaTotal >= finalLumpSum,
    totalContributed: totalAmount,
    monthlyInstallment,
    averageBuyPrice: weightedPrice,
    lumpSumBuyPrice,
    avgCostAdvantage: lumpSumBuyPrice - weightedPrice,
    scenarioLabel: SCENARIO_LABELS[inputs.scenario],
    monthlyReturns,
  };
}
