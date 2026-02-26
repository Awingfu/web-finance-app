/**
 * Retirement Income Planning utilities
 * Simulates year-by-year withdrawals across account types, accounting for
 * taxes, RMDs, Social Security, early withdrawal penalties, and growth.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const INCOME_LAST_UPDATED = 2026;

// 2026 federal income tax brackets [min income, max income, cumulative tax below min, marginal rate]
const FEDERAL_BRACKETS_SINGLE: [number, number, number, number][] = [
  [0, 11925, 0, 0.1],
  [11925, 48475, 1192.5, 0.12],
  [48475, 103350, 5578.5, 0.22],
  [103350, 197300, 17651.5, 0.24],
  [197300, 250525, 40199.5, 0.32],
  [250525, 626350, 57231.5, 0.35],
  [626350, Infinity, 188769.75, 0.37],
];

const FEDERAL_BRACKETS_MFJ: [number, number, number, number][] = [
  [0, 23850, 0, 0.1],
  [23850, 96950, 2385.0, 0.12],
  [96950, 206700, 11157.0, 0.22],
  [206700, 394600, 35302.72, 0.24],
  [394600, 501050, 80398.72, 0.32],
  [501050, 751600, 114491.52, 0.35],
  [751600, Infinity, 202052.52, 0.37],
];

// 2026 standard deduction
export const STANDARD_DEDUCTION_SINGLE = 15000;
export const STANDARD_DEDUCTION_MFJ = 30000;

// 2026 LTCG brackets (taxable income thresholds) [min, max, rate]
const LTCG_BRACKETS_SINGLE: [number, number, number][] = [
  [0, 48350, 0.0],
  [48350, 533400, 0.15],
  [533400, Infinity, 0.2],
];

const LTCG_BRACKETS_MFJ: [number, number, number][] = [
  [0, 96700, 0.0],
  [96700, 600050, 0.15],
  [600050, Infinity, 0.2],
];

// IRS Uniform Lifetime Table (age → distribution period)
// Source: IRS Publication 590-B, Table III
const RMD_TABLE: Record<number, number> = {
  72: 27.4,
  73: 26.5,
  74: 25.5,
  75: 24.6,
  76: 23.7,
  77: 22.9,
  78: 22.0,
  79: 21.1,
  80: 20.2,
  81: 19.4,
  82: 18.5,
  83: 17.7,
  84: 16.8,
  85: 16.0,
  86: 15.2,
  87: 14.4,
  88: 13.7,
  89: 12.9,
  90: 12.2,
  91: 11.5,
  92: 10.8,
  93: 10.1,
  94: 9.5,
  95: 8.9,
  96: 8.4,
  97: 7.8,
  98: 7.3,
  99: 6.8,
  100: 6.4,
  101: 6.0,
  102: 5.6,
  103: 5.2,
  104: 4.9,
  105: 4.6,
  106: 4.3,
  107: 4.1,
  108: 3.9,
  109: 3.7,
  110: 3.5,
  111: 3.4,
  112: 3.3,
  113: 3.1,
  114: 3.0,
  115: 2.9,
  116: 2.8,
  117: 2.7,
  118: 2.5,
  119: 2.3,
  120: 2.0,
};

// Early withdrawal penalty applies to tax-deferred and Roth withdrawals before age 60
// (IRS rule is 59½; we round to 60 for simplicity)
export const EARLY_WITHDRAWAL_PENALTY_AGE = 60;
export const EARLY_WITHDRAWAL_PENALTY_RATE = 0.1;

// ─── Types ────────────────────────────────────────────────────────────────────

export type FilingStatus = "single" | "mfj";
export type WithdrawalStrategy =
  | "maintain_wealth"
  | "set_withdrawal_rate"
  | "spend_down";

export interface RetirementIncomeInputs {
  currentAge: number;
  lifeExpectancyAge: number; // how far to simulate (and deplete to for spend_down)
  ssnMonthlyBenefit: number;
  ssnStartAge: number;
  balance401k: number;
  balanceBrokerage: number;
  brokerageCostBasisPercent: number; // 0–100: what % of brokerage is cost basis (rest = gains)
  balanceRoth: number;
  balanceCash: number;
  cashInterestRate: number; // annual interest rate on cash (e.g. 0.01 for 1%)
  strategy: WithdrawalStrategy;
  desiredAnnualIncome: number; // base (year-0) annual income target
  annualGrowthRate: number; // e.g. 0.07
  inflationRate: number; // annual income target growth rate (e.g. 0.03)
  filingStatus: FilingStatus;
}

export interface YearlyRow {
  age: number;
  // Income sources
  ssIncome: number;
  rmdAmount: number; // required portion from 401k
  withdrawal401k: number; // total from 401k (includes RMD)
  withdrawalBrokerage: number;
  withdrawalRoth: number;
  withdrawalCash: number;
  totalGrossIncome: number;
  // Costs
  earlyWithdrawalPenalty: number; // 10% penalty on tax-deferred/Roth before age 60
  federalTax: number;
  netIncome: number;
  // End-of-year balances
  balance401k: number;
  balanceBrokerage: number;
  balanceRoth: number;
  balanceCash: number;
  totalBalance: number;
}

// ─── Tax helpers ──────────────────────────────────────────────────────────────

function getStandardDeduction(filingStatus: FilingStatus): number {
  return filingStatus === "mfj"
    ? STANDARD_DEDUCTION_MFJ
    : STANDARD_DEDUCTION_SINGLE;
}

/**
 * Calculate ordinary income tax given taxable income and filing status.
 */
function calcOrdinaryTax(
  taxableIncome: number,
  filingStatus: FilingStatus,
): number {
  if (taxableIncome <= 0) return 0;
  const brackets =
    filingStatus === "mfj" ? FEDERAL_BRACKETS_MFJ : FEDERAL_BRACKETS_SINGLE;
  for (const [min, max, cumulative, rate] of brackets) {
    if (taxableIncome <= max) {
      return cumulative + (taxableIncome - min) * rate;
    }
  }
  return 0;
}

/**
 * Calculate LTCG tax on capital gains given ordinary income (for bracket stacking).
 */
function calcLtcgTax(
  gains: number,
  ordinaryIncome: number,
  filingStatus: FilingStatus,
): number {
  if (gains <= 0) return 0;
  const brackets =
    filingStatus === "mfj" ? LTCG_BRACKETS_MFJ : LTCG_BRACKETS_SINGLE;
  let tax = 0;
  let remainingGains = gains;
  const stackedBase = ordinaryIncome;

  for (const [min, max, rate] of brackets) {
    if (stackedBase >= max) continue;
    const roomInBracket = max - Math.max(min, stackedBase);
    const gainsInBracket = Math.min(remainingGains, roomInBracket);
    tax += gainsInBracket * rate;
    remainingGains -= gainsInBracket;
    if (remainingGains <= 0) break;
  }
  return tax;
}

/**
 * Compute total federal income tax for a given year.
 * Accounts for: 401k withdrawals, SS taxation (up to 85%), and brokerage gains (LTCG).
 * Note: early withdrawal penalty is separate (calcEarlyWithdrawalPenalty).
 */
function calcAnnualTax(
  withdrawal401k: number,
  ssIncome: number,
  brokerageGains: number,
  filingStatus: FilingStatus,
): number {
  const deduction = getStandardDeduction(filingStatus);

  // SS taxable portion: provisional income = AGI (ex-SS) + SS/2
  const provisionalIncome = withdrawal401k + brokerageGains + ssIncome / 2;
  let ssTaxable = 0;
  if (provisionalIncome > 34000 && filingStatus === "single") {
    ssTaxable = Math.min(ssIncome * 0.85, (provisionalIncome - 34000) * 0.85);
  } else if (provisionalIncome > 25000 && filingStatus === "single") {
    ssTaxable = Math.min(ssIncome * 0.5, (provisionalIncome - 25000) * 0.5);
  } else if (provisionalIncome > 44000 && filingStatus === "mfj") {
    ssTaxable = Math.min(ssIncome * 0.85, (provisionalIncome - 44000) * 0.85);
  } else if (provisionalIncome > 32000 && filingStatus === "mfj") {
    ssTaxable = Math.min(ssIncome * 0.5, (provisionalIncome - 32000) * 0.5);
  }

  // Ordinary income = 401k withdrawals + taxable SS portion, less standard deduction
  const ordinaryIncome = Math.max(0, withdrawal401k + ssTaxable - deduction);

  const ordinaryTax = calcOrdinaryTax(ordinaryIncome, filingStatus);
  const ltcgTax = calcLtcgTax(brokerageGains, ordinaryIncome, filingStatus);

  return ordinaryTax + ltcgTax;
}

/**
 * 10% early withdrawal penalty on tax-deferred (401k) and Roth withdrawals
 * before age 60 (IRS rule is 59½, rounded here for simplicity).
 * Roth contributions can be withdrawn penalty-free, but gains cannot;
 * we conservatively apply the penalty to the full Roth withdrawal.
 */
function calcEarlyWithdrawalPenalty(
  age: number,
  withdrawal401k: number,
  withdrawalRoth: number,
): number {
  if (age >= EARLY_WITHDRAWAL_PENALTY_AGE) return 0;
  return (withdrawal401k + withdrawalRoth) * EARLY_WITHDRAWAL_PENALTY_RATE;
}

// ─── RMD helper ───────────────────────────────────────────────────────────────

function getRmd(age: number, balance401k: number): number {
  if (age < 73) return 0;
  const clampedAge = Math.min(age, 120);
  const distributionPeriod = RMD_TABLE[clampedAge] ?? 2.0;
  return balance401k / distributionPeriod;
}

// ─── Main simulation ──────────────────────────────────────────────────────────

/**
 * Core simulation: runs year by year from currentAge to lifeExpectancyAge.
 */
function runSimulation(inputs: RetirementIncomeInputs): YearlyRow[] {
  const {
    currentAge,
    lifeExpectancyAge,
    ssnMonthlyBenefit,
    ssnStartAge,
    annualGrowthRate,
    cashInterestRate,
    inflationRate,
    brokerageCostBasisPercent,
    filingStatus,
  } = inputs;

  let balance401k = inputs.balance401k;
  let balanceBrokerage = inputs.balanceBrokerage;
  let balanceRoth = inputs.balanceRoth;
  let balanceCash = inputs.balanceCash;

  const rows: YearlyRow[] = [];

  for (let age = currentAge; age <= lifeExpectancyAge; age++) {
    const yearIdx = age - currentAge;

    // 1. Record pre-growth balances (needed for maintain_wealth gains calculation)
    const pre401k = balance401k;
    const preBrokerage = balanceBrokerage;
    const preRoth = balanceRoth;
    const preCash = balanceCash;

    // 2. Grow accounts at start of year (before withdrawals)
    balance401k *= 1 + annualGrowthRate;
    balanceBrokerage *= 1 + annualGrowthRate;
    balanceRoth *= 1 + annualGrowthRate;
    balanceCash *= 1 + cashInterestRate;

    // 3. Social Security income
    const ssIncome = age >= ssnStartAge ? ssnMonthlyBenefit * 12 : 0;

    // 4. RMD from 401k (mandatory)
    const rmdAmount = Math.min(getRmd(age, balance401k), balance401k);

    // 5. Determine target income based on strategy
    let targetIncome: number;
    if (inputs.strategy === "maintain_wealth") {
      // Withdraw only what the portfolio earned — portfolio returns to pre-growth level
      const totalGains =
        balance401k -
        pre401k +
        (balanceBrokerage - preBrokerage) +
        (balanceRoth - preRoth) +
        (balanceCash - preCash);
      targetIncome = ssIncome + totalGains;
    } else {
      // set_withdrawal_rate and spend_down: use inflation-adjusted desired income
      targetIncome =
        inputs.desiredAnnualIncome * Math.pow(1 + inflationRate, yearIdx);
    }

    // 5. How much more do we need beyond SS and RMD?
    let remainingNeeded = Math.max(0, targetIncome - ssIncome - rmdAmount);

    // 6. Withdrawal order: Cash → Brokerage → 401k (beyond RMD) → Roth
    let withdrawalCash = 0;
    let withdrawalBrokerage = 0;
    let withdrawal401k = rmdAmount;
    let withdrawalRoth = 0;

    const cashPull = Math.min(remainingNeeded, balanceCash);
    withdrawalCash = cashPull;
    remainingNeeded -= cashPull;

    if (remainingNeeded > 0) {
      const brokeragePull = Math.min(remainingNeeded, balanceBrokerage);
      withdrawalBrokerage = brokeragePull;
      remainingNeeded -= brokeragePull;
    }

    if (remainingNeeded > 0) {
      const pull401k = Math.min(remainingNeeded, balance401k - rmdAmount);
      withdrawal401k += pull401k;
      remainingNeeded -= pull401k;
    }

    if (remainingNeeded > 0) {
      const rothPull = Math.min(remainingNeeded, balanceRoth);
      withdrawalRoth = rothPull;
    }

    // 7. Brokerage gains portion of withdrawal
    const gainFraction = Math.max(
      0,
      Math.min(1, 1 - brokerageCostBasisPercent / 100),
    );
    const brokerageGains = withdrawalBrokerage * gainFraction;

    // 8. Federal income tax
    const federalTax = calcAnnualTax(
      withdrawal401k,
      ssIncome,
      brokerageGains,
      filingStatus,
    );

    // 9. Early withdrawal penalty (before age 60)
    const earlyWithdrawalPenalty = calcEarlyWithdrawalPenalty(
      age,
      withdrawal401k,
      withdrawalRoth,
    );

    // 10. Totals
    const totalGrossIncome =
      ssIncome +
      withdrawal401k +
      withdrawalBrokerage +
      withdrawalRoth +
      withdrawalCash;
    const netIncome = totalGrossIncome - federalTax - earlyWithdrawalPenalty;

    // 11. Update balances
    balance401k = Math.max(0, balance401k - withdrawal401k);
    balanceBrokerage = Math.max(0, balanceBrokerage - withdrawalBrokerage);
    balanceRoth = Math.max(0, balanceRoth - withdrawalRoth);
    balanceCash = Math.max(0, balanceCash - withdrawalCash);

    rows.push({
      age,
      ssIncome,
      rmdAmount,
      withdrawal401k,
      withdrawalBrokerage,
      withdrawalRoth,
      withdrawalCash,
      totalGrossIncome,
      earlyWithdrawalPenalty,
      federalTax,
      netIncome,
      balance401k,
      balanceBrokerage,
      balanceRoth,
      balanceCash,
      totalBalance: balance401k + balanceBrokerage + balanceRoth + balanceCash,
    });
  }

  return rows;
}

/**
 * Binary-search for the base year-0 income that depletes all accounts
 * exactly at lifeExpectancyAge, given inflation adjustments per year.
 */
function calcSpendDownWithdrawal(inputs: RetirementIncomeInputs): number {
  const years = inputs.lifeExpectancyAge - inputs.currentAge;
  if (years <= 0) return 0;

  let lo = 0;
  let hi = 10_000_000;

  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2;
    const rows = runSimulation({ ...inputs, desiredAnnualIncome: mid });
    const finalBalance = rows[rows.length - 1].totalBalance;

    if (finalBalance > 1000) {
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < 10) break;
  }

  return (lo + hi) / 2;
}

/**
 * Public entry point. Resolves strategy, then runs simulation.
 */
export function simulateRetirementIncome(
  inputs: RetirementIncomeInputs,
): YearlyRow[] {
  if (inputs.strategy === "spend_down") {
    const solved = calcSpendDownWithdrawal(inputs);
    return runSimulation({ ...inputs, desiredAnnualIncome: solved });
  }
  // maintain_wealth and set_withdrawal_rate run directly
  return runSimulation(inputs);
}

/**
 * Summarize simulation results for display.
 */
export interface SimulationSummary {
  totalTaxesPaid: number;
  totalPenaltiesPaid: number;
  totalGrossIncome: number;
  totalNetIncome: number;
  ageAccountsDepleted: number | null; // null if never depleted
}

export function summarizeSimulation(rows: YearlyRow[]): SimulationSummary {
  let totalTaxesPaid = 0;
  let totalPenaltiesPaid = 0;
  let totalGrossIncome = 0;
  let totalNetIncome = 0;
  let ageAccountsDepleted: number | null = null;

  for (const row of rows) {
    totalTaxesPaid += row.federalTax;
    totalPenaltiesPaid += row.earlyWithdrawalPenalty;
    totalGrossIncome += row.totalGrossIncome;
    totalNetIncome += row.netIncome;
    if (ageAccountsDepleted === null && row.totalBalance < 100) {
      ageAccountsDepleted = row.age;
    }
  }

  return {
    totalTaxesPaid,
    totalPenaltiesPaid,
    totalGrossIncome,
    totalNetIncome,
    ageAccountsDepleted,
  };
}
