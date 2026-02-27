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
  lifeExpectancyAge: number; // age to project retirement burndown through
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

export interface BurndownPoint {
  age: number;
  rothBalance: number; // Roth account balance remaining
  tradBalance: number; // Traditional 401k balance remaining
  tradSavings: number; // Reinvested tax savings account (Traditional bonus)
  tradTotal: number; // tradBalance + tradSavings (total Traditional assets)
  annualTaxesPaid: number; // total taxes paid this year (ordinary + LTCG)
  annualTradNet: number; // net from 401k withdrawal only (after ordinary income tax)
  tradSavingsNet: number; // net from savings withdrawal (after 15% LTCG) — shown separately
  annualRothNet: number; // net spendable from Roth withdrawal (tax-free)
  cumTaxesPaid: number; // cumulative taxes paid in retirement so far
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
  burndownData: BurndownPoint[];
  annualTaxesPaidEachYear: number; // taxes on the fixed annual 401k withdrawal
  annualTradNetIncome: number; // Traditional net 401k take-home per year (after taxes)
  annualRothNetIncome: number; // Roth net take-home per year (full withdrawal, no taxes)
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

  // Burndown: simulate annual withdrawals from retirement to life expectancy.
  // Traditional draws from 401k first (ordinary income tax), then from reinvested
  // savings when 401k is depleted (LTCG tax on savings withdrawals). Roth is
  // fully independent — draws from its own balance, no taxes.
  const SAVINGS_LTCG_RATE = 0.15; // flat LTCG rate on reinvested savings withdrawals
  const annualTaxOnWithdrawal =
    estimatedRetirementRate * retirement401kWithdrawal;
  const annualTradNetIncome = retirement401kWithdrawal - annualTaxOnWithdrawal;
  const annualRothNetIncome = retirement401kWithdrawal;
  const retirementYears = Math.max(0, inputs.lifeExpectancyAge - retirementAge);

  const burndownData: BurndownPoint[] = [
    {
      age: retirementAge,
      rothBalance: grossBalance,
      tradBalance: grossBalance,
      tradSavings: fvTaxSavings,
      tradTotal: grossBalance + fvTaxSavings,
      annualTaxesPaid: 0,
      annualTradNet: 0,
      tradSavingsNet: 0,
      annualRothNet: 0,
      cumTaxesPaid: 0,
    },
  ];
  let bRoth = grossBalance;
  let bTrad = grossBalance;
  let bSavings = fvTaxSavings;
  let cumTax = 0;
  for (let y = 1; y <= retirementYears; y++) {
    // Roth: withdrawal capped by available Roth balance (independent of Traditional)
    const actualRothWithdrawal = Math.min(bRoth, retirement401kWithdrawal);

    // Traditional: draw from 401k first, cover any shortfall from savings.
    const actualTradWithdrawal = Math.min(bTrad, retirement401kWithdrawal);
    const tradShortfall = retirement401kWithdrawal - actualTradWithdrawal;
    const savingsWithdrawal = Math.min(bSavings, tradShortfall);

    // Ordinary income tax on the 401k portion
    const actualTradTax =
      actualTradWithdrawal > 0
        ? getEffectiveIncrementalRate(
            retirementOtherIncome,
            actualTradWithdrawal,
            retirementTaxTable,
          ) * actualTradWithdrawal
        : 0;

    // LTCG tax on savings withdrawal (gains approximated as full withdrawal)
    const savingsTax = savingsWithdrawal * SAVINGS_LTCG_RATE;

    cumTax += actualTradTax + savingsTax;

    bRoth = (bRoth - actualRothWithdrawal) * (1 + growthRate);
    bTrad = (bTrad - actualTradWithdrawal) * (1 + growthRate);
    bSavings = (bSavings - savingsWithdrawal) * (1 + growthRate);

    burndownData.push({
      age: retirementAge + y,
      rothBalance: bRoth,
      tradBalance: bTrad,
      tradSavings: bSavings,
      tradTotal: bTrad + bSavings,
      annualTaxesPaid: actualTradTax + savingsTax,
      annualTradNet: actualTradWithdrawal - actualTradTax, // 401k portion only
      tradSavingsNet: savingsWithdrawal - savingsTax, // savings portion (LTCG taxed, shown in gold)
      annualRothNet: actualRothWithdrawal,
      cumTaxesPaid: cumTax,
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
    burndownData,
    annualTaxesPaidEachYear: annualTaxOnWithdrawal,
    annualTradNetIncome,
    annualRothNetIncome,
  };
}
