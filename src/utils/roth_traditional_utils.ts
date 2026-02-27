/**
 * Roth vs Traditional 401k Comparison Utilities
 *
 * Compares after-tax wealth at retirement between Roth and Traditional 401k
 * contributions at equal annual amounts.
 *
 * Fair comparison assumption: the annual tax savings from a Traditional
 * contribution (contribution × marginalRate) are invested and grow at the same
 * rate as the 401k. This makes the two strategies apples-to-apples.
 *
 * Break-even: Traditional wins when retirement effective rate < current marginal
 * rate; Roth wins when retirement effective rate > current marginal rate.
 *
 * The retirement effective rate is computed from the selected tax table + the
 * user's expected retirement income (other ordinary income + 401k withdrawal).
 */

export { type FilingStatus } from "./retirement_tax_tables";

import type { FilingStatus, RetirementTaxTable } from "./retirement_tax_tables";
export type { RetirementTaxTable } from "./retirement_tax_tables";

import {
  calcTaxFromTable,
  getMarginalRateFromTable,
  getEffectiveIncrementalRate,
  getPresetTable,
  STD_DEDUCTION_SINGLE_2026,
  STD_DEDUCTION_MFJ_2026,
} from "./retirement_tax_tables";

export const ROTH_TRAD_LAST_UPDATED = 2026;

// ─── Helpers based on current-year (2026) brackets ───────────────────────────

export function getStdDeduction(filing: FilingStatus): number {
  return filing === "mfj" ? STD_DEDUCTION_MFJ_2026 : STD_DEDUCTION_SINGLE_2026;
}

/** Marginal rate on current income using 2026 federal brackets. */
export function getMarginalRate(
  grossIncome: number,
  filing: FilingStatus,
): number {
  return getMarginalRateFromTable(
    grossIncome,
    getPresetTable("federal_2026", filing),
  );
}

/** Effective rate (total tax ÷ gross income) using 2026 federal brackets. */
export function getEffectiveRate(
  grossIncome: number,
  filing: FilingStatus,
): number {
  if (grossIncome <= 0) return 0;
  const table = getPresetTable("federal_2026", filing);
  return calcTaxFromTable(grossIncome, table) / grossIncome;
}

/** Future value of an end-of-year ordinary annuity. */
function annuityFV(annual: number, rate: number, years: number): number {
  if (years <= 0) return 0;
  if (rate === 0) return annual * years;
  return annual * ((Math.pow(1 + rate, years) - 1) / rate);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RothTraditionalInputs {
  currentAge: number;
  retirementAge: number;
  annualContribution: number;
  currentIncome: number;
  filingStatus: FilingStatus;
  growthRate: number; // decimal, e.g. 0.07
  // Retirement income inputs (used to compute effective rate via tax table)
  retirementOtherIncome: number; // SS + ordinary wages — NOT dividends/LTCG
  retirement401kWithdrawal: number; // expected annual 401k/IRA withdrawal
  retirementTaxTable: RetirementTaxTable; // selected or custom table
}

export interface SensitivityPoint {
  rate: number; // integer %, e.g. 22
  rateLabel: string; // "22%"
  traditional: number; // after-tax value of Traditional at this rate
  roth: number; // after-tax value of Roth
}

export interface YearlyDataPoint {
  age: number;
  accountBalance: number; // year-end 401k balance (same for both Trad and Roth)
  taxSavingsBalance: number; // cumulative reinvested tax savings (Traditional only)
}

export interface RothTraditionalResult {
  // Current year
  currentMarginalRate: number;
  currentEffectiveRate: number;
  annualTaxSavings: number;

  // Retirement
  yearsToRetirement: number;
  grossBalanceAtRetirement: number; // pre-tax account balance (same for both)
  estimatedRetirementRate: number; // effective incremental rate from tax table + income inputs

  // After-tax comparison:
  //   Traditional = grossBalance × (1 − retRate) + FV(annualTaxSavings)
  //   Roth        = grossBalance  (tax-free)
  afterTaxTraditional: number;
  afterTaxRoth: number;
  winner: "roth" | "traditional" | "tie";
  advantageAmount: number; // positive = Roth wins, negative = Traditional wins

  // Break-even = current marginal rate (exact under the reinvestment assumption)
  breakEvenRate: number;

  sensitivityData: SensitivityPoint[];
  yearlyData: YearlyDataPoint[];
}

// ─── Main calculation ─────────────────────────────────────────────────────────

export function calcRothVsTraditional(
  inputs: RothTraditionalInputs,
): RothTraditionalResult {
  const {
    currentAge,
    retirementAge,
    annualContribution,
    currentIncome,
    filingStatus,
    growthRate,
    retirementOtherIncome,
    retirement401kWithdrawal,
    retirementTaxTable,
  } = inputs;

  const years = Math.max(0, retirementAge - currentAge);
  const marginalRate = getMarginalRate(currentIncome, filingStatus);
  const effectiveRate = getEffectiveRate(currentIncome, filingStatus);

  const annualTaxSavings = annualContribution * marginalRate;
  const grossBalance = annuityFV(annualContribution, growthRate, years);
  const fvTaxSavings = annuityFV(annualTaxSavings, growthRate, years);

  // Effective incremental rate on 401k withdrawals from the selected tax table.
  // If no withdrawal specified, fall back to marginal rate at the other-income level.
  const estimatedRetirementRate =
    retirement401kWithdrawal > 0
      ? getEffectiveIncrementalRate(
          retirementOtherIncome,
          retirement401kWithdrawal,
          retirementTaxTable,
        )
      : getMarginalRateFromTable(retirementOtherIncome, retirementTaxTable);

  const afterTaxTrad =
    grossBalance * (1 - estimatedRetirementRate) + fvTaxSavings;
  const afterTaxRoth = grossBalance;

  const advantage = afterTaxRoth - afterTaxTrad;
  const winner: RothTraditionalResult["winner"] =
    advantage > 500 ? "roth" : advantage < -500 ? "traditional" : "tie";

  // Break-even = current marginal rate (exact under the reinvestment assumption)
  const breakEvenRate = marginalRate;

  // Sensitivity data: 0–50% in 1pp steps
  const sensitivityData: SensitivityPoint[] = [];
  for (let rp = 0; rp <= 50; rp++) {
    const rate = rp / 100;
    sensitivityData.push({
      rate: rp,
      rateLabel: `${rp}%`,
      traditional: grossBalance * (1 - rate) + fvTaxSavings,
      roth: afterTaxRoth,
    });
  }

  // Yearly balance data
  const yearlyData: YearlyDataPoint[] = [];
  let accountBal = 0;
  let savingsBal = 0;
  for (let y = 1; y <= years; y++) {
    accountBal = (accountBal + annualContribution) * (1 + growthRate);
    savingsBal = (savingsBal + annualTaxSavings) * (1 + growthRate);
    yearlyData.push({
      age: currentAge + y,
      accountBalance: accountBal,
      taxSavingsBalance: savingsBal,
    });
  }

  return {
    currentMarginalRate: marginalRate,
    currentEffectiveRate: effectiveRate,
    annualTaxSavings,
    yearsToRetirement: years,
    grossBalanceAtRetirement: grossBalance,
    estimatedRetirementRate,
    afterTaxTraditional: afterTaxTrad,
    afterTaxRoth,
    winner,
    advantageAmount: advantage,
    breakEvenRate,
    sensitivityData,
    yearlyData,
  };
}
