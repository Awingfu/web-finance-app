/**
 * Why Invest? — Compounding growth comparison
 *
 * Compares market portfolio vs savings account and shows the cost of
 * delaying contributions. Supports nominal and real (inflation-adjusted) modes.
 */

export interface WhyInvestInputs {
  currentAge: number;
  retirementAge: number;
  annualSalary: number;
  savingsRatePercent: number; // e.g. 15 for 15%
  startingBalance: number; // default 0
  marketReturnRate: number; // nominal, e.g. 0.10
  savingsAccountRate: number; // nominal, e.g. 0.045
  inflationEnabled: boolean;
  inflationRate: number; // e.g. 0.03
}

export interface YearlyDataPoint {
  age: number;
  market: number; // total market balance
  savings: number; // total savings balance
  contributions: number; // cumulative contributions (no growth baseline)
  marketGains: number; // market - contributions
  savingsInterest: number; // savings - contributions
}

export interface DelayDataPoint {
  startAge: number;
  market: number; // final market balance at retirementAge
  savings: number; // final savings balance at retirementAge
  contributions: number; // cumulative contributions
  isCurrent: boolean; // true when startAge === inputs.currentAge
}

export interface CatchUpPoint {
  age: number;
  userPath: number | null;
  catchUpPath: number | null;
}

export interface CatchUpResult {
  catchUpContrib: number;
  diffPerYear: number; // catchUpContrib - annualContrib (+ve = need more, -ve = need less)
  userTotalContrib: number;
  catchUpTotalContrib: number;
  catchUpData: CatchUpPoint[];
}

export interface WhyInvestResult {
  yearlyData: YearlyDataPoint[];
  delayData: DelayDataPoint[];
  annualContribution: number;
  finalMarket: number;
  finalSavings: number;
  totalContributed: number;
  investingAdvantage: number; // finalMarket - finalSavings
  marketMultiplier: number; // finalMarket / totalContributed
  inflationEnabled: boolean;
}

/** Future value of an end-of-year ordinary annuity. */
function annuityFV(annual: number, rate: number, years: number): number {
  if (years <= 0) return 0;
  if (rate === 0) return annual * years;
  return annual * ((Math.pow(1 + rate, years) - 1) / rate);
}

/**
 * Calculates the annual contribution required for a "comparison" person who
 * starts investing at comparisonAge to reach the same final market value as the
 * user at retirementAge. Builds chart data for both paths.
 */
export function calcCatchUp(
  inputs: WhyInvestInputs,
  comparisonAge: number,
  userYearlyData: YearlyDataPoint[],
  finalMarket: number,
  annualContrib: number,
): CatchUpResult {
  const {
    currentAge,
    retirementAge,
    startingBalance,
    inflationEnabled,
    marketReturnRate,
    inflationRate,
  } = inputs;

  const marketRate = inflationEnabled
    ? (1 + marketReturnRate) / (1 + inflationRate) - 1
    : marketReturnRate;

  const n = retirementAge - comparisonAge;

  // Solve: finalMarket = startingBalance*(1+r)^n + C*((1+r)^n - 1)/r
  let catchUpContrib: number;
  if (n <= 0) {
    catchUpContrib = Infinity;
  } else if (marketRate === 0) {
    catchUpContrib = (finalMarket - startingBalance) / n;
  } else {
    const growth = Math.pow(1 + marketRate, n);
    catchUpContrib =
      ((finalMarket - startingBalance * growth) * marketRate) / (growth - 1);
  }

  // Build chart data from the earlier start age to retirementAge
  const minAge = Math.min(currentAge, comparisonAge);
  const userPathByAge = new Map(userYearlyData.map((p) => [p.age, p.market]));

  const catchUpData: CatchUpPoint[] = [];
  let catchUpBal = startingBalance;

  for (let age = minAge; age <= retirementAge; age++) {
    const userPath = userPathByAge.get(age) ?? null;
    const catchUpPath = age >= comparisonAge ? catchUpBal : null;
    catchUpData.push({ age, userPath, catchUpPath });
    if (age >= comparisonAge && age < retirementAge) {
      catchUpBal = catchUpBal * (1 + marketRate) + catchUpContrib;
    }
  }

  const safeContrib = isFinite(catchUpContrib)
    ? Math.max(0, catchUpContrib)
    : 0;
  const userYears = retirementAge - currentAge;
  const catchUpYears = Math.max(0, n);

  return {
    catchUpContrib: safeContrib,
    diffPerYear: catchUpContrib - annualContrib,
    userTotalContrib: annualContrib * userYears,
    catchUpTotalContrib: safeContrib * catchUpYears,
    catchUpData,
  };
}

export function calcWhyInvest(inputs: WhyInvestInputs): WhyInvestResult {
  const {
    currentAge,
    retirementAge,
    annualSalary,
    savingsRatePercent,
    startingBalance,
    marketReturnRate,
    savingsAccountRate,
    inflationEnabled,
    inflationRate,
  } = inputs;

  const annualContribution = (annualSalary * savingsRatePercent) / 100;

  // When inflationEnabled, convert nominal rates to real rates.
  // Contributions stay constant in real terms (salary grows with inflation).
  const marketRate = inflationEnabled
    ? (1 + marketReturnRate) / (1 + inflationRate) - 1
    : marketReturnRate;
  const savingsRate = inflationEnabled
    ? (1 + savingsAccountRate) / (1 + inflationRate) - 1
    : savingsAccountRate;

  // ── Yearly data ────────────────────────────────────────────────────────────

  const yearlyData: YearlyDataPoint[] = [];
  let marketBal = startingBalance;
  let savingsBal = startingBalance;
  let cumContrib = 0;

  // Initial point at currentAge (before any contributions or growth)
  yearlyData.push({
    age: currentAge,
    market: marketBal,
    savings: savingsBal,
    contributions: startingBalance,
    marketGains: 0,
    savingsInterest: 0,
  });

  for (let age = currentAge; age < retirementAge; age++) {
    marketBal = marketBal * (1 + marketRate) + annualContribution;
    savingsBal = savingsBal * (1 + savingsRate) + annualContribution;
    cumContrib += annualContribution;

    const totalBase = startingBalance + cumContrib;
    yearlyData.push({
      age: age + 1,
      market: marketBal,
      savings: savingsBal,
      contributions: totalBase,
      marketGains: Math.max(0, marketBal - totalBase),
      savingsInterest: Math.max(0, savingsBal - totalBase),
    });
  }

  const finalMarket = marketBal;
  const finalSavings = savingsBal;
  const totalContributed = startingBalance + cumContrib;

  // ── Delay data ─────────────────────────────────────────────────────────────
  // Standard start ages + currentAge always included, filtered to < retirementAge, sorted

  const standardStartAges = [16, 20, 25, 30, 35, 40, 45, 50, 55];
  const startAgesSet = new Set(
    [...standardStartAges, currentAge].filter((a) => a < retirementAge),
  );
  const startAges = Array.from(startAgesSet).sort((a, b) => a - b);

  const delayData: DelayDataPoint[] = startAges.map((startAge) => {
    const n = retirementAge - startAge;
    // Both the starting balance and contributions compound from startAge,
    // so earlier start ages give the balance more years to grow.
    const mktFinal =
      startingBalance * Math.pow(1 + marketRate, n) +
      annuityFV(annualContribution, marketRate, n);
    const savFinal =
      startingBalance * Math.pow(1 + savingsRate, n) +
      annuityFV(annualContribution, savingsRate, n);
    const contribs = startingBalance + annualContribution * n;

    return {
      startAge,
      market: mktFinal,
      savings: savFinal,
      contributions: contribs,
      isCurrent: startAge === currentAge,
    };
  });

  return {
    yearlyData,
    delayData,
    annualContribution,
    finalMarket,
    finalSavings,
    totalContributed,
    investingAdvantage: finalMarket - finalSavings,
    marketMultiplier: totalContributed > 0 ? finalMarket / totalContributed : 0,
    inflationEnabled,
  };
}
