/**
 * Retirement Tax Table utilities
 *
 * Defines TaxBracket / RetirementTaxTable types, preset tables for common
 * scenarios, and helper functions for computing tax from a table.
 *
 * Key function: getEffectiveIncrementalRate — computes the blended marginal
 * rate on a 401k withdrawal stacked on top of other ordinary income, accounting
 * for standard deduction and bracket fill-up. This is more accurate than using
 * a single flat marginal rate.
 */

export interface TaxBracket {
  min: number; // lower bound of taxable income
  max: number; // upper bound — Infinity for the top bracket
  rate: number; // marginal rate as a decimal, e.g. 0.22
}

export interface RetirementTaxTable {
  id: string;
  name: string;
  description: string;
  standardDeduction: number;
  brackets: TaxBracket[]; // must be ordered ascending by min
}

export type FilingStatus = "single" | "mfj";
export type PresetId = "federal_2026" | "federal_2026_plus10";

// ─── 2026 Bracket Data ────────────────────────────────────────────────────────

const BRACKETS_SINGLE_2026: TaxBracket[] = [
  { min: 0, max: 11925, rate: 0.1 },
  { min: 11925, max: 48475, rate: 0.12 },
  { min: 48475, max: 103350, rate: 0.22 },
  { min: 103350, max: 197300, rate: 0.24 },
  { min: 197300, max: 250525, rate: 0.32 },
  { min: 250525, max: 626350, rate: 0.35 },
  { min: 626350, max: Infinity, rate: 0.37 },
];

const BRACKETS_MFJ_2026: TaxBracket[] = [
  { min: 0, max: 23850, rate: 0.1 },
  { min: 23850, max: 96950, rate: 0.12 },
  { min: 96950, max: 206700, rate: 0.22 },
  { min: 206700, max: 394600, rate: 0.24 },
  { min: 394600, max: 501050, rate: 0.32 },
  { min: 501050, max: 751600, rate: 0.35 },
  { min: 751600, max: Infinity, rate: 0.37 },
];

export const STD_DEDUCTION_SINGLE_2026 = 15000;
export const STD_DEDUCTION_MFJ_2026 = 30000;

// ─── Preset factory ───────────────────────────────────────────────────────────

/** Returns a preset RetirementTaxTable for the given scenario and filing status. */
export function getPresetTable(
  presetId: PresetId,
  filing: FilingStatus,
): RetirementTaxTable {
  const isMfj = filing === "mfj";
  const baseBrackets = isMfj ? BRACKETS_MFJ_2026 : BRACKETS_SINGLE_2026;
  const baseDeduction = isMfj
    ? STD_DEDUCTION_MFJ_2026
    : STD_DEDUCTION_SINGLE_2026;
  const filingLabel = isMfj ? "Married Filing Jointly" : "Single";

  if (presetId === "federal_2026") {
    return {
      id: `federal_2026_${filing}`,
      name: `2026 Federal (${filingLabel})`,
      description:
        "2026 U.S. federal income tax brackets with standard deduction.",
      standardDeduction: baseDeduction,
      brackets: baseBrackets,
    };
  }

  // federal_2026_plus10: each bracket rate + 10%, capped at 50%
  return {
    id: `federal_2026_plus10_${filing}`,
    name: `2026 Federal +10% (${filingLabel})`,
    description:
      "2026 federal brackets with each rate raised by 10 percentage points. " +
      "Represents a hypothetical future where Congress raises tax rates.",
    standardDeduction: baseDeduction,
    brackets: baseBrackets.map((b) => ({
      ...b,
      rate: Math.min(0.5, b.rate + 0.1),
    })),
  };
}

// ─── Calculation helpers ──────────────────────────────────────────────────────

/** Federal income tax owed on gross income using a given tax table. */
export function calcTaxFromTable(
  grossIncome: number,
  table: RetirementTaxTable,
): number {
  const taxable = Math.max(0, grossIncome - table.standardDeduction);
  if (taxable <= 0) return 0;
  let tax = 0;
  for (const { min, max, rate } of table.brackets) {
    if (taxable <= min) break;
    tax += (Math.min(taxable, max) - min) * rate;
  }
  return tax;
}

/** The marginal bracket rate that applies at a given gross income. */
export function getMarginalRateFromTable(
  grossIncome: number,
  table: RetirementTaxTable,
): number {
  const taxable = Math.max(0, grossIncome - table.standardDeduction);
  for (const { min, max, rate } of table.brackets) {
    if (taxable >= min && taxable < max) return rate;
  }
  return table.brackets[table.brackets.length - 1]?.rate ?? 0;
}

/**
 * Effective incremental tax rate on a 401k withdrawal stacked on top of other
 * ordinary income (e.g. Social Security + wages — NOT dividends or LTCG).
 *
 *   = (tax(otherIncome + withdrawal) − tax(otherIncome)) / withdrawal
 *
 * Accounts for the standard deduction and how other income fills lower brackets,
 * giving the true blended marginal cost of the 401k/IRA money.
 */
export function getEffectiveIncrementalRate(
  otherIncome: number,
  withdrawal: number,
  table: RetirementTaxTable,
): number {
  if (withdrawal <= 0) return 0;
  const taxWithout = calcTaxFromTable(otherIncome, table);
  const taxWith = calcTaxFromTable(otherIncome + withdrawal, table);
  return (taxWith - taxWithout) / withdrawal;
}
