/**
 * DCA vs Lump Sum — investment strategy comparison
 *
 * Compares dollar-cost averaging (investing periodically) against investing a
 * lump sum immediately. Money not yet invested sits in a savings account (HYSA)
 * earning interest. Supports bullish, bearish, and volatile market scenarios.
 */

export type MarketScenario = "bull" | "bear" | "volatile" | "flat" | "custom";

export interface DcaInputs {
  totalAmount: number; // total money available to invest
  investmentHorizonYears: number; // how many years until we care about the final value
  dcaMonths: number; // how many months to spread DCA over (1 = lump sum equivalent)
  marketReturnRate: number; // nominal annual market return (e.g. 0.10)
  savingsAccountRate: number; // HYSA annual rate for uninvested cash
  scenario: MarketScenario;
  customMonthlyReturns: number[]; // used when scenario === "custom"
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

/** Build a sequence of monthly returns for a given scenario over N months. */
function buildMonthlyReturns(
  inputs: DcaInputs,
  totalMonths: number,
): number[] {
  const { scenario, marketReturnRate, customMonthlyReturns } = inputs;
  const monthlyBase = Math.pow(1 + marketReturnRate, 1 / 12) - 1;

  switch (scenario) {
    case "bull": {
      // Gradually accelerating — starts below average, ends above
      return Array.from({ length: totalMonths }, (_, i) => {
        const t = i / Math.max(totalMonths - 1, 1);
        // ramp from 0.4× to 1.8× of the average monthly return
        return monthlyBase * (0.4 + 1.4 * t);
      });
    }
    case "bear": {
      // Market drops in the first half, recovers in the second half
      return Array.from({ length: totalMonths }, (_, i) => {
        const t = i / Math.max(totalMonths - 1, 1);
        // V-shape: down then up
        const phase = Math.cos(Math.PI * t); // 1 at start, -1 at mid, 1 at end
        return monthlyBase * (1 - 1.5 * phase);
      });
    }
    case "volatile": {
      // Alternating up/down with same long-run average
      return Array.from({ length: totalMonths }, (_, i) => {
        const sign = i % 2 === 0 ? 1 : -1;
        // Swing ±2× around the base, but keep same annualized return geometrically
        return monthlyBase + sign * monthlyBase * 1.5;
      });
    }
    case "flat": {
      return Array.from({ length: totalMonths }, () => monthlyBase);
    }
    case "custom": {
      // Repeat provided values cyclically
      if (customMonthlyReturns.length === 0)
        return Array.from({ length: totalMonths }, () => monthlyBase);
      return Array.from(
        { length: totalMonths },
        (_, i) => customMonthlyReturns[i % customMonthlyReturns.length],
      );
    }
    default:
      return Array.from({ length: totalMonths }, () => monthlyBase);
  }
}

const SCENARIO_LABELS: Record<MarketScenario, string> = {
  bull: "Bull Market (steady climb)",
  bear: "Bear Market (dip then recovery)",
  volatile: "Volatile (alternating swings)",
  flat: "Flat / Average",
  custom: "Custom",
};

export function calcDcaVsLumpSum(inputs: DcaInputs): DcaResult {
  const {
    totalAmount,
    investmentHorizonYears,
    dcaMonths,
    savingsAccountRate,
  } = inputs;

  const totalMonths = Math.max(investmentHorizonYears * 12, dcaMonths);
  const monthlyInstallment = totalAmount / Math.max(dcaMonths, 1);
  const monthlySavingsRate = Math.pow(1 + savingsAccountRate, 1 / 12) - 1;
  const monthlyReturns = buildMonthlyReturns(inputs, totalMonths);

  // Track price index for average cost calculation
  let priceIndex = 100; // starts at 100
  const dcaBuyPrices: { amount: number; price: number }[] = [];

  let dcaPortfolio = 0;
  let dcaCash = totalAmount; // all money starts in HYSA
  let lumpSumPortfolio = totalAmount; // lump sum invests everything immediately
  let dcaSharesEquivalent = 0; // track shares * initial price for avg cost

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

    // Update price index (tracks cumulative market price)
    priceIndex = priceIndex * (1 + monthlyReturn);

    // DCA: apply HYSA interest to uninvested cash
    dcaCash = dcaCash * (1 + monthlySavingsRate);

    // DCA: invest this month's installment (if still in DCA period)
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

  // Calculate weighted average buy price for DCA
  const totalInvested = dcaBuyPrices.reduce((s, p) => s + p.amount, 0);
  const weightedPrice =
    totalInvested > 0
      ? dcaBuyPrices.reduce((s, p) => s + (p.amount / totalInvested) * p.price, 0)
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
