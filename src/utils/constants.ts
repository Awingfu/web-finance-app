// Constants
// This file will contain constants for calculations, enums, and interfaces

export enum TAX_CLASSES {
    SINGLE = "Single", 
    MARRIED_FILING_JOINTLY = "Married Filing Jointly", 
    MARRIED_FILING_SEPARATELY = "Married Filing Separatly", 
    HEAD_OF_HOUSEHOLD = "Head of Household"
};

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
}

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
}

export const ALL_PAY_SCHEDULES = Object.keys(PAY_SCHEDULE);

// Types of pay schedules
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
    DECEMBER = "December"
}

export const ALL_MONTH_NAMES = Object.keys(MONTH_NAMES);

// Only assuming traditional 401k (which is the same for 403b, tsp, etc.)
// Source: https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits
export const _401k_maximum_contribution_individual = 22500; // 2023
export const _401k_catchup = 7500; // 2023
export const _401k_maximum_contribution_individual_over50 = _401k_maximum_contribution_individual + _401k_catchup;
export const _401k_maximum_contribution_total = 66000; // 2023

// IRA
export const _IRA_maximum_contribution_individual = 6500; // 2023
export const _IRA_catchup = 1000; // 2023
export const _IRA_maximum_contribution_individual_over50 = _IRA_maximum_contribution_individual + _IRA_catchup;
export const _IRA_traditional_phase_out_income_limit_single_covered = 78000; // 2022
export const _IRA_traditional_phase_out_income_limit_married_joint_covered = 129000; // 2022
export const _IRA_traditional_phase_out_income_limit_married_joint_not_covered = 214000; // 2022
export const _IRA_traditional_phase_out_income_limit_married_separate_covered = 10000; // 2022

// Roth IRA
// Source: https://www.irs.gov/retirement-plans/plan-participant-employee/amount-of-roth-ira-contributions-that-you-can-make-for-2022
export const _IRA_roth_phase_out_income_start_single = 138000; // 2023
export const _IRA_roth_phase_out_income_limit_single = 153000; // 2023
export const _IRA_roth_phase_out_income_start_head_of_household = _IRA_roth_phase_out_income_start_single;
export const _IRA_roth_phase_out_income_limit_head_of_household = _IRA_roth_phase_out_income_limit_single;
export const _IRA_roth_phase_out_income_start_married_joint = 218000; // 2023
export const _IRA_roth_phase_out_income_limit_married_joint = 228000; // 2023
export const _IRA_roth_phase_out_income_limit_married_separate = 10000; // no start amount
// Source: https://www.irs.gov/retirement-plans/amount-of-roth-ira-contributions-that-you-can-make-for-2021
export const _IRA_roth_reduced_contribution_divisor_single = 15000;
export const _IRA_roth_reduced_contribution_divisor_head_of_household = _IRA_roth_reduced_contribution_divisor_single;
export const _IRA_roth_reduced_contribution_divisor_married_joint = 10000;
export const _IRA_roth_reduced_contribution_divisor_married_separate = _IRA_roth_reduced_contribution_divisor_married_joint;


// maximum contribution calculation. function of age, income, and filing status
// could probably refactor this using linear algebra
export const _IRA_roth_get_max_contribution = (age: number, income: number, tax_class: string) : number => {
    const IRA_max = age >= 50 ? _IRA_maximum_contribution_individual_over50 : _IRA_maximum_contribution_individual;
    switch(tax_class) {
        case TAX_CLASSES.SINGLE:
            if (income < _IRA_roth_phase_out_income_start_single)
                return IRA_max;
            else if (income > _IRA_roth_phase_out_income_limit_single)
                return 0;
            else {
                let amount_over_limit = income - _IRA_roth_phase_out_income_start_single;
                let divided_amount = amount_over_limit / _IRA_roth_reduced_contribution_divisor_single;
                let multiply_by_max_contribution = divided_amount * IRA_max;
                return IRA_max - multiply_by_max_contribution;
            } // shouldn't need to break since we return
        case TAX_CLASSES.HEAD_OF_HOUSEHOLD:
            if (income < _IRA_roth_phase_out_income_start_head_of_household)
                return IRA_max;
            else if (income > _IRA_roth_phase_out_income_limit_head_of_household)
                return 0;
            else {
                let amount_over_limit = income - _IRA_roth_phase_out_income_start_head_of_household;
                let divided_amount = amount_over_limit / _IRA_roth_reduced_contribution_divisor_head_of_household;
                let multiply_by_max_contribution = divided_amount * IRA_max;
                return IRA_max - multiply_by_max_contribution;
            }
        case TAX_CLASSES.MARRIED_FILING_JOINTLY:
            if (income < _IRA_roth_phase_out_income_start_married_joint)
                return IRA_max;
            else if (income > _IRA_roth_phase_out_income_limit_married_joint)
                return 0;
            else {
                let amount_over_limit = income - _IRA_roth_phase_out_income_start_married_joint;
                let divided_amount = amount_over_limit / _IRA_roth_reduced_contribution_divisor_married_joint;
                let multiply_by_max_contribution = divided_amount * IRA_max;
                return IRA_max - multiply_by_max_contribution;
            }
        case TAX_CLASSES.MARRIED_FILING_SEPARATELY:
            if (income > _IRA_roth_phase_out_income_limit_married_separate)
                return 0;
            else
                return IRA_max;
        default:
            console.log("Something wen't wrong in calculating max Roth IRA contribution. Invalid tax class");
            return 0;
    }
}

// HSA
export const maximum_HSA_contribution = 3850; // 2023