/**
 * Retirement Income Planning utilities
 * Simulates year-by-year withdrawals across account types, accounting for
 * taxes, RMDs, Social Security, early withdrawal penalties, and growth.
 */

import {
  BRACKETS_SINGLE_2026,
  BRACKETS_MFJ_2026,
  STD_DEDUCTION_SINGLE_2026,
  STD_DEDUCTION_MFJ_2026,
  calcLtcgTax,
  type FilingStatus,
} from "./retirement_tax_tables";

export type { FilingStatus };

// ─── Constants ────────────────────────────────────────────────────────────────

export const INCOME_LAST_UPDATED = 2026;

// 2026 standard deduction — re-exported under the names used in the income planner UI
export const STANDARD_DEDUCTION_SINGLE = STD_DEDUCTION_SINGLE_2026;
export const STANDARD_DEDUCTION_MFJ = STD_DEDUCTION_MFJ_2026;

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

export type WithdrawalStrategy =
  | "maintain_wealth"
  | "set_withdrawal_rate"
  | "spend_down";

export interface RetirementIncomeInputs {
  currentAge: number;
  lifeExpectancyAge: number; // how far to simulate (and deplete to for spend_down)
  ssnMonthlyBenefit: number;
  ssnStartAge: number;
  pensionMonthlyBenefit: number; // monthly pension income, 0 = none
  pensionStartAge: number;
  otherAnnualIncome: number; // flat annual income (rental, part-time, annuity, etc.), 0 = none
  balance401k: number;
  balanceBrokerage: number;
  brokerageCostBasisPercent: number; // 0–100: what % of brokerage is cost basis (rest = gains)
  balanceRoth: number;
  balanceCash: number;
  cashInterestRate: number; // annual interest rate on cash (e.g. 0.01 for 1%)
  strategy: WithdrawalStrategy;
  desiredAnnualIncome: number; // fixed annual income target
  annualGrowthRate: number; // e.g. 0.07
  filingStatus: FilingStatus;
}

export interface YearlyRow {
  age: number;
  // Income sources
  ssIncome: number;
  pensionIncome: number;
  otherIncome: number;
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

/**
 * Calculate ordinary income tax given taxable income (post-deduction) and filing status.
 */
function calcOrdinaryTax(
  taxableIncome: number,
  filingStatus: FilingStatus,
): number {
  if (taxableIncome <= 0) return 0;
  const brackets =
    filingStatus === "mfj" ? BRACKETS_MFJ_2026 : BRACKETS_SINGLE_2026;
  let tax = 0;
  for (const { min, max, rate } of brackets) {
    if (taxableIncome <= min) break;
    tax += (Math.min(taxableIncome, max) - min) * rate;
  }
  return tax;
}

/**
 * Compute total federal income tax for a given year.
 * Accounts for: 401k withdrawals, pension, other income, SS taxation (up to 85%), and brokerage gains (LTCG).
 * Note: early withdrawal penalty is separate (calcEarlyWithdrawalPenalty).
 * Pension and other income are fully taxable as ordinary income and count toward SS provisional income.
 */
function calcAnnualTax(
  withdrawal401k: number,
  ssIncome: number,
  brokerageGains: number,
  pensionIncome: number,
  otherIncome: number,
  filingStatus: FilingStatus,
): number {
  const deduction =
    filingStatus === "mfj" ? STD_DEDUCTION_MFJ_2026 : STD_DEDUCTION_SINGLE_2026;

  // SS taxable portion: provisional income = AGI (ex-SS) + SS/2
  // Pension and other ordinary income contribute to provisional income per IRS rules
  const provisionalIncome =
    withdrawal401k +
    brokerageGains +
    pensionIncome +
    otherIncome +
    ssIncome / 2;
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

  // Ordinary income = 401k + taxable SS + pension + other, less standard deduction
  const ordinaryIncome = Math.max(
    0,
    withdrawal401k + ssTaxable + pensionIncome + otherIncome - deduction,
  );

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
    pensionMonthlyBenefit,
    pensionStartAge,
    otherAnnualIncome,
    annualGrowthRate,
    cashInterestRate,
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

    // 3b. Pension and other fixed income
    const pensionIncome =
      age >= pensionStartAge ? pensionMonthlyBenefit * 12 : 0;
    const otherIncome = otherAnnualIncome;

    // 4. RMD from 401k (mandatory)
    const rmdAmount = Math.min(getRmd(age, balance401k), balance401k);

    // 5. Determine target income based on strategy
    let targetIncome: number;
    if (inputs.strategy === "maintain_wealth") {
      // Withdraw only what the portfolio earned — portfolio returns to pre-growth level.
      // Pension/other income are additive on top; they don't reduce portfolio withdrawals.
      const totalGains =
        balance401k -
        pre401k +
        (balanceBrokerage - preBrokerage) +
        (balanceRoth - preRoth) +
        (balanceCash - preCash);
      targetIncome = ssIncome + totalGains;
    } else {
      // set_withdrawal_rate and spend_down: fixed annual income target
      targetIncome = inputs.desiredAnnualIncome;
    }

    // 5b. How much more do we need from the portfolio beyond fixed income and RMD?
    // For maintain_wealth: pension/other don't reduce portfolio withdrawals (they're additive).
    // For set_withdrawal_rate/spend_down: pension/other reduce what the portfolio must provide.
    let remainingNeeded: number;
    if (inputs.strategy === "maintain_wealth") {
      remainingNeeded = Math.max(0, targetIncome - ssIncome - rmdAmount);
    } else {
      remainingNeeded = Math.max(
        0,
        targetIncome - ssIncome - rmdAmount - pensionIncome - otherIncome,
      );
    }

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
      pensionIncome,
      otherIncome,
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
      pensionIncome +
      otherIncome +
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
      pensionIncome,
      otherIncome,
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
