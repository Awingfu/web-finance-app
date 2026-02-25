// Constants
// This file will contain constants for calculations, enums, and interfaces

export enum TAX_CLASSES {
  SINGLE = "Single",
  MARRIED_FILING_JOINTLY = "Married Filing Jointly",
  MARRIED_FILING_SEPARATELY = "Married Filing Separately",
  HEAD_OF_HOUSEHOLD = "Head of Household",
}

// Contribution frequencies
export enum FREQUENCIES {
  PAYCHECK = "Paycheck",
  DAY = "Day",
  WEEK = "Week",
  MONTH = "Month",
  ANNUM = "Annum",
}

export const FREQUENCY_TO_ANNUM = {
  [FREQUENCIES.PAYCHECK]: 0, // this shouldn't be used
  [FREQUENCIES.DAY]: 365, // simple assumption
  [FREQUENCIES.WEEK]: 52,
  [FREQUENCIES.MONTH]: 12,
  [FREQUENCIES.ANNUM]: 1,
};

export const ALL_FREQUENCIES = Object.keys(FREQUENCIES);

// Types of pay schedules
export enum PAY_SCHEDULE {
  WEEKLY = "Weekly",
  BIWEEKLY = "Biweekly",
  BIWEEKLY_1 = "Biweekly Offset 1",
  SEMIMONTHLY = "Semimonthly",
  MONTHLY = "Monthly",
}

export const PAY_SCHEDULE_TO_ANNUM = {
  [PAY_SCHEDULE.WEEKLY]: 52,
  [PAY_SCHEDULE.BIWEEKLY]: 26,
  [PAY_SCHEDULE.BIWEEKLY_1]: 26,
  [PAY_SCHEDULE.SEMIMONTHLY]: 24,
  [PAY_SCHEDULE.MONTHLY]: 12,
};

export const ALL_PAY_SCHEDULES = Object.keys(PAY_SCHEDULE);

// Month names
export enum MONTH_NAMES {
  JANUARY = "January",
  FEBRUARY = "February",
  MARCH = "March",
  APRIL = "April",
  MAY = "May",
  JUNE = "June",
  JULY = "July",
  AUGUST = "August",
  SEPTEMBER = "September",
  OCTOBER = "October",
  NOVEMBER = "November",
  DECEMBER = "December",
}

export const ALL_MONTH_NAMES = Object.keys(MONTH_NAMES);

// Only assuming traditional 401k (which is the same for 403b, tsp, etc.)
// Source: https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits
export const _401k_numbers_last_updated = 2026; // used for frontend display
export const _401k_maximum_contribution_individual = 24500;
export const _401k_catchup = 8000;
export const _401k_maximum_contribution_individual_over50 =
  _401k_maximum_contribution_individual + _401k_catchup;
export const _401k_maximum_contribution_total = 72000;

// IRA
// not used, last updated 2022
export const _IRA_maximum_contribution_individual = 7000;
export const _IRA_catchup = 1000;
export const _IRA_maximum_contribution_individual_over50 =
  _IRA_maximum_contribution_individual + _IRA_catchup;
export const _IRA_traditional_phase_out_income_limit_single_covered = 78000;
export const _IRA_traditional_phase_out_income_limit_married_joint_covered = 129000;
export const _IRA_traditional_phase_out_income_limit_married_joint_not_covered = 214000;
export const _IRA_traditional_phase_out_income_limit_married_separate_covered = 10000;

// Roth IRA
// Source: https://www.irs.gov/retirement-plans/plan-participant-employee/amount-of-roth-ira-contributions-that-you-can-make-for-2022
// not used, last updated 2023
export const _IRA_roth_phase_out_income_start_single = 138000;
export const _IRA_roth_phase_out_income_limit_single = 153000;
export const _IRA_roth_phase_out_income_start_head_of_household =
  _IRA_roth_phase_out_income_start_single;
export const _IRA_roth_phase_out_income_limit_head_of_household =
  _IRA_roth_phase_out_income_limit_single;
export const _IRA_roth_phase_out_income_start_married_joint = 218000;
export const _IRA_roth_phase_out_income_limit_married_joint = 228000;
export const _IRA_roth_phase_out_income_limit_married_separate = 10000; // no start amount
// Source: https://www.irs.gov/retirement-plans/amount-of-roth-ira-contributions-that-you-can-make-for-2021
export const _IRA_roth_reduced_contribution_divisor_single = 15000;
export const _IRA_roth_reduced_contribution_divisor_head_of_household =
  _IRA_roth_reduced_contribution_divisor_single;
export const _IRA_roth_reduced_contribution_divisor_married_joint = 10000;
export const _IRA_roth_reduced_contribution_divisor_married_separate =
  _IRA_roth_reduced_contribution_divisor_married_joint;

const ROTH_PHASE_OUT: Partial<
  Record<TAX_CLASSES, { start: number; limit: number; divisor: number }>
> = {
  [TAX_CLASSES.SINGLE]: {
    start: _IRA_roth_phase_out_income_start_single,
    limit: _IRA_roth_phase_out_income_limit_single,
    divisor: _IRA_roth_reduced_contribution_divisor_single,
  },
  [TAX_CLASSES.HEAD_OF_HOUSEHOLD]: {
    start: _IRA_roth_phase_out_income_start_head_of_household,
    limit: _IRA_roth_phase_out_income_limit_head_of_household,
    divisor: _IRA_roth_reduced_contribution_divisor_head_of_household,
  },
  [TAX_CLASSES.MARRIED_FILING_JOINTLY]: {
    start: _IRA_roth_phase_out_income_start_married_joint,
    limit: _IRA_roth_phase_out_income_limit_married_joint,
    divisor: _IRA_roth_reduced_contribution_divisor_married_joint,
  },
};

// maximum contribution calculation. function of age, income, and filing status
export const _IRA_roth_get_max_contribution = (
  age: number,
  income: number,
  tax_class: string,
): number => {
  const IRA_max =
    age >= 50
      ? _IRA_maximum_contribution_individual_over50
      : _IRA_maximum_contribution_individual;

  // MFS has no phase-out range, just a hard cutoff
  if (tax_class === TAX_CLASSES.MARRIED_FILING_SEPARATELY)
    return income > _IRA_roth_phase_out_income_limit_married_separate
      ? 0
      : IRA_max;

  const params = ROTH_PHASE_OUT[tax_class as TAX_CLASSES];
  if (!params) {
    console.log(
      "Something went wrong in calculating max Roth IRA contribution. Invalid tax class",
    );
    return 0;
  }

  if (income < params.start) return IRA_max;
  if (income > params.limit) return 0;
  return IRA_max - ((income - params.start) / params.divisor) * IRA_max;
};

// HSA
// last updated 2026
export const maximum_HSA_contribution = 4400;
export const maximum_HSA_contribution_family = 8750;
export const HSA_catchup_contribution = 1000;

// FSA
// last updated 2026
export const maximum_FSA_contribution = 3400;
export const maximum_FSA_contribution_dependent_care = 7500;
export const FSA_carryover_limit = 680;
