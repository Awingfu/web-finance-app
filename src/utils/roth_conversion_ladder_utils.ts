/**
 * Roth Conversion Ladder Utilities
 *
 * Models year-by-year Roth conversions from a Traditional IRA/401k.
 * Supports two conversion modes:
 *  - "fixed": convert a fixed dollar amount each year
 *  - "bracket_fill": convert enough to fill up to a target tax bracket ceiling
 *
 * Key modeling decision: taxes are paid from outside cash (not deducted from
 * the converted amount). This is the correct strategy — it maximizes the Roth
 * balance and is how a Roth ladder should be executed. Tax cost is informational.
 *
 * 5-year seasoning rule: each converted amount takes 5 years before the
 * principal (basis) can be withdrawn penalty-free before age 59½.
 */

import type { FilingStatus, RetirementTaxTable } from "./retirement_tax_tables";
import { getEffectiveIncrementalRate } from "./retirement_tax_tables";

export type { FilingStatus };

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConversionMode = "fixed" | "bracket_fill";

export interface RothConversionInputs {
  currentAge: number;
  conversionEndAge: number; // last year to convert (inclusive)
  lifeExpectancyAge: number;
  traditionalBalance: number;
  rothBalance: number; // existing Roth (grows separately)
  otherIncome: number; // SS/wages during conversion years (stacked-on base)
  conversionMode: ConversionMode;
  annualConversion: number; // used when mode = "fixed"
  targetBracketRate: number; // used when mode = "bracket_fill", e.g. 0.22
  growthRate: number;
  filingStatus: FilingStatus;
  taxTable: RetirementTaxTable;
}

export interface ConversionRung {
  conversionAge: number;
  amount: number;
  tax: number;
  effectiveTaxRate: number;
  availableAge: number; // conversionAge + 5
}

export interface ConversionYearRow {
  age: number;
  traditionalBalance: number; // end-of-year
  rothBalance: number; // end-of-year
  conversionAmount: number;
  taxPaid: number;
  effectiveTaxRate: number;
  newlySeasonedAmount: number; // rung from age-5 that just became penalty-free
  totalSeasonedToDate: number; // cumulative penalty-free conversion basis
  cumulativeTaxPaid: number;
  cumulativeConverted: number;
}

export interface RothConversionResult {
  rows: ConversionYearRow[];
  rungs: ConversionRung[];
  firstWithdrawalAge: number; // currentAge + 5
  lastConversionAge: number;
  conversionCompleteAge: number | null; // age Traditional hits ~0; null if never
  totalConverted: number;
  totalTaxPaid: number;
  averageEffectiveTaxRate: number;
  finalTraditionalBalance: number;
  finalRothBalance: number;
  finalTotalSeasonedBasis: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Computes the annual conversion amount to fill up to the ceiling of the
 * target bracket rate, stacked on top of other income.
 *
 * Formula: max(0, bracketCeiling + standardDeduction − otherIncome)
 * where bracketCeiling is the taxable income upper bound of the target bracket.
 *
 * If the top bracket is selected (max = Infinity), capped at min + 200_000.
 */
export function calcBracketFillAmount(
  otherIncome: number,
  targetBracketRate: number,
  table: RetirementTaxTable,
): number {
  const bracket = table.brackets.find((b) => b.rate === targetBracketRate);
  if (!bracket) return 0;
  const ceilingTaxable =
    bracket.max === Infinity ? bracket.min + 200_000 : bracket.max;
  return Math.max(0, ceilingTaxable + table.standardDeduction - otherIncome);
}

// ─── Main simulation ──────────────────────────────────────────────────────────

export function simulateConversionLadder(
  inputs: RothConversionInputs,
): RothConversionResult {
  const {
    currentAge,
    conversionEndAge,
    lifeExpectancyAge,
    traditionalBalance,
    rothBalance,
    otherIncome,
    conversionMode,
    annualConversion,
    targetBracketRate,
    growthRate,
    taxTable,
  } = inputs;

  let trad = traditionalBalance;
  let roth = rothBalance;

  // Map from age → conversion amount for 5-year seasoning lookups
  const conversionsByAge = new Map<number, number>();

  let cumTaxPaid = 0;
  let cumConverted = 0;
  let totalSeasonedBasis = 0;
  let conversionCompleteAge: number | null = null;

  const rows: ConversionYearRow[] = [];
  const rungs: ConversionRung[] = [];

  for (let age = currentAge; age <= lifeExpectancyAge; age++) {
    // ── Determine conversion amount ────────────────────────────────────────
    let conversionAmount = 0;
    if (age <= conversionEndAge && trad > 0.01) {
      if (conversionMode === "fixed") {
        conversionAmount = Math.min(annualConversion, trad);
      } else {
        const fillAmount = calcBracketFillAmount(
          otherIncome,
          targetBracketRate,
          taxTable,
        );
        conversionAmount = Math.min(fillAmount, trad);
      }
    }

    // ── Tax on conversion (paid from outside cash) ─────────────────────────
    const effectiveRate =
      conversionAmount > 0
        ? getEffectiveIncrementalRate(otherIncome, conversionAmount, taxTable)
        : 0;
    const taxThisYear = conversionAmount * effectiveRate;

    // ── Move conversion Traditional → Roth ────────────────────────────────
    trad -= conversionAmount;
    roth += conversionAmount;
    conversionsByAge.set(age, conversionAmount);

    // Record traditional depleting
    if (conversionCompleteAge === null && trad < 1 && traditionalBalance > 0) {
      conversionCompleteAge = age;
    }

    // ── 5-year seasoning: rung from 5 years ago becomes available ─────────
    const seasonedThisYear = conversionsByAge.get(age - 5) ?? 0;
    totalSeasonedBasis += seasonedThisYear;

    // ── End-of-year growth ─────────────────────────────────────────────────
    trad = Math.max(0, trad * (1 + growthRate));
    roth = roth * (1 + growthRate);

    cumTaxPaid += taxThisYear;
    cumConverted += conversionAmount;

    rows.push({
      age,
      traditionalBalance: trad,
      rothBalance: roth,
      conversionAmount,
      taxPaid: taxThisYear,
      effectiveTaxRate: effectiveRate,
      newlySeasonedAmount: seasonedThisYear,
      totalSeasonedToDate: totalSeasonedBasis,
      cumulativeTaxPaid: cumTaxPaid,
      cumulativeConverted: cumConverted,
    });

    // Build rungs from years with actual conversions
    if (conversionAmount > 0) {
      rungs.push({
        conversionAge: age,
        amount: conversionAmount,
        tax: taxThisYear,
        effectiveTaxRate: effectiveRate,
        availableAge: age + 5,
      });
    }
  }

  const totalConverted = cumConverted;
  const totalTaxPaid = cumTaxPaid;
  const averageEffectiveTaxRate =
    totalConverted > 0 ? totalTaxPaid / totalConverted : 0;

  const lastRow = rows[rows.length - 1];
  const lastConversionAge =
    rungs.length > 0 ? rungs[rungs.length - 1].conversionAge : currentAge;

  return {
    rows,
    rungs,
    firstWithdrawalAge: currentAge + 5,
    lastConversionAge,
    conversionCompleteAge,
    totalConverted,
    totalTaxPaid,
    averageEffectiveTaxRate,
    finalTraditionalBalance: lastRow?.traditionalBalance ?? trad,
    finalRothBalance: lastRow?.rothBalance ?? roth,
    finalTotalSeasonedBasis: totalSeasonedBasis,
  };
}
