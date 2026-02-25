import {
  TAX_CLASSES,
  FREQUENCIES,
  FREQUENCY_TO_ANNUM,
  PAY_SCHEDULE,
  PAY_SCHEDULE_TO_ANNUM,
  _401k_numbers_last_updated,
  _401k_maximum_contribution_individual,
  _401k_catchup,
  _401k_maximum_contribution_individual_over50,
  _401k_maximum_contribution_total,
  _IRA_maximum_contribution_individual,
  _IRA_catchup,
  _IRA_maximum_contribution_individual_over50,
} from "./constants";
import {
  determineStateTaxesWithheld,
  getStateMarginalRate,
  getFICAWithholding,
  getFederalWithholding,
  getMedicareWithholding,
  getFederalMarginalRate,
  getFICAMarginalRate,
  getMedicareMarginalRate,
  US_STATES_MAP,
  instanceOfTaxUnknown,
  formatCurrency,
  maxFICAContribution,
  getFICATaxRate,
  LOCAL_TAXES,
  LOCAL_TAXES_BY_STATE,
  getLocalWithholding,
  getLocalMarginalRate,
} from "./index";

// --- Pure math helpers ---

export const calculateContributionFromPercentage = (
  amount: number,
  contributionPercentage: number,
): number => {
  return amount * (contributionPercentage / 100);
};

export const convertAnnualAmountToPaySchedule = (
  amount: number,
  paySchedule: PAY_SCHEDULE,
): number => {
  return amount / PAY_SCHEDULE_TO_ANNUM[paySchedule];
};

export const calculateAnnualFromAmountAndFrequency = (
  contributionAmount: number,
  frequency: FREQUENCIES = FREQUENCIES.ANNUM,
  paySchedule: PAY_SCHEDULE = PAY_SCHEDULE.BIWEEKLY,
): number => {
  if (frequency === FREQUENCIES.PAYCHECK) {
    return contributionAmount * PAY_SCHEDULE_TO_ANNUM[paySchedule];
  } else {
    return contributionAmount * FREQUENCY_TO_ANNUM[frequency];
  }
};

export const formatTaxRate = (rate: number) => (rate * 100).toFixed(2) + "%";

// --- Types ---

export interface PaycheckInputs {
  salary: number;
  bonus: number;
  bonusEligible: boolean;
  paySchedule: PAY_SCHEDULE;
  taxClass: TAX_CLASSES;
  usState: string;
  localTaxes: Record<string, boolean>;
  // Pre-tax (% of gross)
  t401kContribution: number;
  tIRAContribution: number;
  // Pre-tax ($ amount + frequency)
  medicalContribution: number;
  medicalContributionFrequency: FREQUENCIES;
  commuterContribution: number;
  commuterContributionFrequency: FREQUENCIES;
  hsaContribution: number;
  hsaContributionFrequency: FREQUENCIES;
  otherPreTaxContribution: number;
  otherPreTaxContributionFrequency: FREQUENCIES;
  // Post-tax (% of gross)
  r401kContribution: number;
  at401kContribution: number;
  rIRAContribution: number;
  sppContribution: number;
  // Post-tax ($ amount + frequency)
  otherPostTaxContribution: number;
  otherPostTaxContributionFrequency: FREQUENCIES;
}

interface RateInfo {
  marginal: number;
  effective: number;
}
type SimpleEntry = [number, number];
type TaxEntry = [number, number, RateInfo | undefined];

export interface PaycheckResults {
  // Income
  totalCompensation_annual: number;
  totalCompensation_paycheck: number;
  // Pre-tax
  preTaxTableMap: Record<string, SimpleEntry>;
  shouldRenderPreTaxDeductions: boolean;
  taxableIncome_annual: number;
  taxableIncome_paycheck: number;
  // Federal/FICA
  isSocialSecurityMaxed: boolean;
  socialSecurity_key: string;
  socialSecurityMaxedIcon: string;
  socialSecurityMaxedNote: string;
  socialSecurityWithholding_paycheck: number;
  // State
  stateIsUnknown: boolean;
  stateIsEstimate: boolean;
  stateEstimateIcon: string;
  // Tax table
  taxTableMap: Record<string, TaxEntry>;
  // Net pay
  netPay_annual: number;
  netPay_paycheck: number;
  // Post-tax
  postTaxTableMap: Record<string, SimpleEntry>;
  shouldRenderPostTaxDeductions: boolean;
  takeHomePay_annual: number;
  takeHomePay_paycheck: number;
  // Local tax (needed by form for checkbox rendering)
  localTaxKeys: string[];
  // Contribution limit alerts
  contributionLimitAlerts: string[];
}

// --- Core pure computation ---

export function computePaycheck(inputs: PaycheckInputs): PaycheckResults {
  const {
    salary,
    bonus,
    bonusEligible,
    paySchedule,
    taxClass,
    usState,
    localTaxes,
    t401kContribution,
    tIRAContribution,
    medicalContribution,
    medicalContributionFrequency,
    commuterContribution,
    commuterContributionFrequency,
    hsaContribution,
    hsaContributionFrequency,
    otherPreTaxContribution,
    otherPreTaxContributionFrequency,
    r401kContribution,
    at401kContribution,
    rIRAContribution,
    sppContribution,
    otherPostTaxContribution,
    otherPostTaxContributionFrequency,
  } = inputs;

  // Income
  let totalCompensation_annual = salary;
  if (bonusEligible) {
    totalCompensation_annual = salary + bonus;
  }
  const totalCompensation_paycheck = convertAnnualAmountToPaySchedule(
    totalCompensation_annual,
    paySchedule,
  );

  // Pre-tax deductions
  const t401k_annual = calculateContributionFromPercentage(
    totalCompensation_annual,
    t401kContribution,
  );
  const t401k_paycheck = convertAnnualAmountToPaySchedule(
    t401k_annual,
    paySchedule,
  );

  const tIRA_annual = calculateContributionFromPercentage(
    totalCompensation_annual,
    tIRAContribution,
  );
  const tIRA_paycheck = convertAnnualAmountToPaySchedule(
    tIRA_annual,
    paySchedule,
  );

  const medical_annual = calculateAnnualFromAmountAndFrequency(
    medicalContribution,
    medicalContributionFrequency,
    paySchedule,
  );
  const medical_paycheck = convertAnnualAmountToPaySchedule(
    medical_annual,
    paySchedule,
  );

  const commuter_annual = calculateAnnualFromAmountAndFrequency(
    commuterContribution,
    commuterContributionFrequency,
    paySchedule,
  );
  const commuter_paycheck = convertAnnualAmountToPaySchedule(
    commuter_annual,
    paySchedule,
  );

  const hsa_annual = calculateAnnualFromAmountAndFrequency(
    hsaContribution,
    hsaContributionFrequency,
    paySchedule,
  );
  const hsa_paycheck = convertAnnualAmountToPaySchedule(
    hsa_annual,
    paySchedule,
  );

  const otherPreTax_annual = calculateAnnualFromAmountAndFrequency(
    otherPreTaxContribution,
    otherPreTaxContributionFrequency,
    paySchedule,
  );
  const otherPreTax_paycheck = convertAnnualAmountToPaySchedule(
    otherPreTax_annual,
    paySchedule,
  );

  // Post-tax contribution amounts — computed here so over-limit flags
  // can be used when building both the pre-tax and post-tax maps.
  const r401k_annual = calculateContributionFromPercentage(
    totalCompensation_annual,
    r401kContribution,
  );
  const r401k_paycheck = convertAnnualAmountToPaySchedule(
    r401k_annual,
    paySchedule,
  );

  const at401k_annual = calculateContributionFromPercentage(
    totalCompensation_annual,
    at401kContribution,
  );
  const at401k_paycheck = convertAnnualAmountToPaySchedule(
    at401k_annual,
    paySchedule,
  );

  const rIRA_annual = calculateContributionFromPercentage(
    totalCompensation_annual,
    rIRAContribution,
  );
  const rIRA_paycheck = convertAnnualAmountToPaySchedule(
    rIRA_annual,
    paySchedule,
  );

  const stockPurchasePlan_annual = calculateContributionFromPercentage(
    totalCompensation_annual,
    sppContribution,
  );
  const stockPurchasePlan_paycheck = convertAnnualAmountToPaySchedule(
    stockPurchasePlan_annual,
    paySchedule,
  );

  const otherPostTax_annual = calculateAnnualFromAmountAndFrequency(
    otherPostTaxContribution,
    otherPostTaxContributionFrequency,
    paySchedule,
  );
  const otherPostTax_paycheck = convertAnnualAmountToPaySchedule(
    otherPostTax_annual,
    paySchedule,
  );

  // Over-limit flags — drive both the row icons and the footer alerts
  const CONTRIBUTION_LIMIT_ICON = "\u2021"; // double dagger ‡
  const total401k_annual = t401k_annual + r401k_annual;
  const totalAll401k_annual = t401k_annual + r401k_annual + at401k_annual;
  const totalIRA_annual = tIRA_annual + rIRA_annual;
  const is401kElectiveOverLimit =
    total401k_annual > _401k_maximum_contribution_individual;
  const is401kTotalOverLimit =
    totalAll401k_annual > _401k_maximum_contribution_total;
  const isIRAOverLimit = totalIRA_annual > _IRA_maximum_contribution_individual;

  const icon401k =
    is401kElectiveOverLimit || is401kTotalOverLimit
      ? CONTRIBUTION_LIMIT_ICON
      : "";
  const iconIRA = isIRAOverLimit ? CONTRIBUTION_LIMIT_ICON : "";

  const preTaxTableMap: Record<string, SimpleEntry> = {
    ["Traditional 401k" + icon401k]: [t401k_annual, t401k_paycheck],
    ["Traditional IRA" + iconIRA]: [tIRA_annual, tIRA_paycheck],
    "Medical Insurance": [medical_annual, medical_paycheck],
    "Commuter Benefits": [commuter_annual, commuter_paycheck],
    "HSA/FSA": [hsa_annual, hsa_paycheck],
    "Other Pre-Tax": [otherPreTax_annual, otherPreTax_paycheck],
  };

  const shouldRenderPreTaxDeductions = !!Object.keys(preTaxTableMap).filter(
    (key) => preTaxTableMap[key][0] != 0,
  ).length;

  const sumOfPreTaxContributions_annual = Object.keys(preTaxTableMap).reduce(
    (prev, curr) => prev + preTaxTableMap[curr][0],
    0,
  );

  let taxableIncome_annual =
    totalCompensation_annual - sumOfPreTaxContributions_annual;
  if (!bonusEligible) {
    taxableIncome_annual =
      totalCompensation_annual - sumOfPreTaxContributions_annual + bonus;
  }
  taxableIncome_annual = Math.max(0, taxableIncome_annual);
  const taxableIncome_paycheck = convertAnnualAmountToPaySchedule(
    taxableIncome_annual,
    paySchedule,
  );

  // Federal withholding
  const federalWithholding_paycheck = getFederalWithholding(
    taxableIncome_paycheck,
    taxClass,
    paySchedule,
  );
  const federalWithholding_annual =
    federalWithholding_paycheck * PAY_SCHEDULE_TO_ANNUM[paySchedule];

  // FICA / Social Security
  const grossTaxableIncome_annual = salary + bonus;
  const grossTaxableIncome_paycheck = convertAnnualAmountToPaySchedule(
    grossTaxableIncome_annual,
    paySchedule,
  );
  const socialSecurityWithholding_annual = getFICAWithholding(
    grossTaxableIncome_annual,
  );
  let socialSecurityWithholding_paycheck = convertAnnualAmountToPaySchedule(
    socialSecurityWithholding_annual,
    paySchedule,
  );

  const socialSecurityMaxedIcon = "\u2020"; // dagger
  const socialSecurityMaxedNote =
    socialSecurityMaxedIcon +
    " You will pay the maximum Social Security tax of " +
    formatCurrency(maxFICAContribution) +
    " this year. Once you have withheld the maximum, which is after withholding for " +
    Math.ceil(
      maxFICAContribution / (grossTaxableIncome_paycheck * getFICATaxRate),
    ) +
    " paychecks, you will then withhold $0 into this category for the rest of the calendar year.";

  let socialSecurity_key = "Social Security";
  const isSocialSecurityMaxed =
    socialSecurityWithholding_annual === maxFICAContribution;
  if (isSocialSecurityMaxed) {
    socialSecurity_key = "Social Security" + socialSecurityMaxedIcon;
    socialSecurityWithholding_paycheck = Math.min(
      grossTaxableIncome_paycheck * getFICATaxRate,
      maxFICAContribution,
    );
  }

  // Medicare
  const medicareWithholding_annual = getMedicareWithholding(
    grossTaxableIncome_annual,
    taxClass,
  );
  const medicareWithholding_paycheck = convertAnnualAmountToPaySchedule(
    medicareWithholding_annual,
    paySchedule,
  );

  // Marginal and effective rates
  const federalMarginalRate = getFederalMarginalRate(
    taxableIncome_paycheck,
    taxClass,
    paySchedule,
  );
  const federalEffectiveRate =
    taxableIncome_annual > 0
      ? federalWithholding_annual / taxableIncome_annual
      : 0;

  const ficaMarginalRate = getFICAMarginalRate(grossTaxableIncome_annual);
  const ficaEffectiveRate =
    grossTaxableIncome_annual > 0
      ? socialSecurityWithholding_annual / grossTaxableIncome_annual
      : 0;

  const medicareMarginalRate = getMedicareMarginalRate(
    grossTaxableIncome_annual,
    taxClass,
  );
  const medicareEffectiveRate =
    grossTaxableIncome_annual > 0
      ? medicareWithholding_annual / grossTaxableIncome_annual
      : 0;

  // State withholding
  const stateIsUnknown = instanceOfTaxUnknown(US_STATES_MAP[usState]);
  const stateIsNone = usState === "None";
  const stateIsEstimate = !stateIsNone && !stateIsUnknown;
  const stateEstimateIcon = "\u002A"; // asterisk

  const stateWithholding_annual = determineStateTaxesWithheld(
    usState,
    taxableIncome_annual,
    taxClass,
  );
  const stateWithholding_paycheck = convertAnnualAmountToPaySchedule(
    stateWithholding_annual,
    paySchedule,
  );
  const stateMarginalRate = getStateMarginalRate(
    usState,
    taxableIncome_annual,
    taxClass,
  );
  const stateEffectiveRate =
    taxableIncome_annual > 0
      ? stateWithholding_annual / taxableIncome_annual
      : 0;
  const stateWithholding_key =
    US_STATES_MAP[usState].abbreviation +
    " Withholding" +
    (stateIsEstimate ? stateEstimateIcon : "");

  // Local taxes
  const localTaxKeys = LOCAL_TAXES_BY_STATE[usState] ?? [];
  const localWithholdings = localTaxKeys
    .filter((key) => localTaxes[key])
    .map((key) => {
      const { paycheck, annual } = getLocalWithholding(
        key,
        taxableIncome_paycheck,
        taxableIncome_annual,
        paySchedule,
        PAY_SCHEDULE_TO_ANNUM[paySchedule],
      );
      const marginal = getLocalMarginalRate(
        key,
        taxableIncome_paycheck,
        paySchedule,
      );
      const effective =
        taxableIncome_annual > 0 ? annual / taxableIncome_annual : 0;
      return { key, paycheck, annual, marginal, effective };
    });
  const totalLocalWithholding_annual = localWithholdings.reduce(
    (sum, lw) => sum + lw.annual,
    0,
  );

  // Tax table map
  const taxTableMap: Record<string, TaxEntry> = {
    "Federal Withholding": [
      federalWithholding_annual,
      federalWithholding_paycheck,
      { marginal: federalMarginalRate, effective: federalEffectiveRate },
    ],
    [socialSecurity_key]: [
      socialSecurityWithholding_annual,
      socialSecurityWithholding_paycheck,
      { marginal: ficaMarginalRate, effective: ficaEffectiveRate },
    ],
    Medicare: [
      medicareWithholding_annual,
      medicareWithholding_paycheck,
      { marginal: medicareMarginalRate, effective: medicareEffectiveRate },
    ],
    [stateWithholding_key]: [
      stateWithholding_annual,
      stateWithholding_paycheck,
      stateIsEstimate
        ? { marginal: stateMarginalRate, effective: stateEffectiveRate }
        : undefined,
    ],
    ...Object.fromEntries(
      localWithholdings.map(
        ({ key, annual, paycheck, marginal, effective }) => [
          LOCAL_TAXES[key].name + " Withholding",
          [annual, paycheck, { marginal, effective }] as TaxEntry,
        ],
      ),
    ),
  };

  // Net pay
  const netPay_annual =
    taxableIncome_annual -
    federalWithholding_annual -
    socialSecurityWithholding_annual -
    medicareWithholding_annual -
    stateWithholding_annual -
    totalLocalWithholding_annual;
  const netPay_paycheck = convertAnnualAmountToPaySchedule(
    netPay_annual,
    paySchedule,
  );

  const postTaxTableMap: Record<string, SimpleEntry> = {
    ["Roth 401k" + icon401k]: [r401k_annual, r401k_paycheck],
    ["After Tax 401k" + icon401k]: [at401k_annual, at401k_paycheck],
    ["Roth IRA" + iconIRA]: [rIRA_annual, rIRA_paycheck],
    "Stock Purchase Plan": [
      stockPurchasePlan_annual,
      stockPurchasePlan_paycheck,
    ],
    "Other Post-Tax": [otherPostTax_annual, otherPostTax_paycheck],
  };

  const shouldRenderPostTaxDeductions = !!Object.keys(postTaxTableMap).filter(
    (key) => postTaxTableMap[key][0] != 0,
  ).length;

  const sumOfPostTaxContributions_annual = Object.keys(postTaxTableMap).reduce(
    (prev, curr) => prev + postTaxTableMap[curr][0],
    0,
  );

  const takeHomePay_annual = netPay_annual - sumOfPostTaxContributions_annual;
  const takeHomePay_paycheck = convertAnnualAmountToPaySchedule(
    takeHomePay_annual,
    paySchedule,
  );

  // Contribution limit alerts — flags and totals are already computed above
  const contributionLimitAlerts: string[] = [];

  if (is401kElectiveOverLimit) {
    contributionLimitAlerts.push(
      `${CONTRIBUTION_LIMIT_ICON} Your 401k contributions ` +
        `(${formatCurrency(total401k_annual)}/year) exceed the ` +
        `${_401k_numbers_last_updated} elective deferral limit of ` +
        `${formatCurrency(_401k_maximum_contribution_individual)}` +
        ` (${formatCurrency(_401k_maximum_contribution_individual_over50)} if 50 or older).`,
    );
  }

  if (is401kTotalOverLimit) {
    contributionLimitAlerts.push(
      `${CONTRIBUTION_LIMIT_ICON} Your total 401k contributions ` +
        `(${formatCurrency(totalAll401k_annual)}/year) exceed the ` +
        `${_401k_numbers_last_updated} annual additions limit of ` +
        `${formatCurrency(_401k_maximum_contribution_total)}` +
        ` (${formatCurrency(_401k_maximum_contribution_total + _401k_catchup)} if 50 or older).` +
        ` Note: this limit also includes any employer contributions.`,
    );
  }

  if (isIRAOverLimit) {
    contributionLimitAlerts.push(
      `${CONTRIBUTION_LIMIT_ICON} Your IRA contributions ` +
        `(${formatCurrency(totalIRA_annual)}/year) exceed the annual limit of ` +
        `${formatCurrency(_IRA_maximum_contribution_individual)}` +
        ` (${formatCurrency(_IRA_maximum_contribution_individual_over50)} if 50 or older).`,
    );
  }

  return {
    totalCompensation_annual,
    totalCompensation_paycheck,
    preTaxTableMap,
    shouldRenderPreTaxDeductions,
    taxableIncome_annual,
    taxableIncome_paycheck,
    isSocialSecurityMaxed,
    socialSecurity_key,
    socialSecurityMaxedIcon,
    socialSecurityMaxedNote,
    socialSecurityWithholding_paycheck,
    stateIsUnknown,
    stateIsEstimate,
    stateEstimateIcon,
    taxTableMap,
    netPay_annual,
    netPay_paycheck,
    postTaxTableMap,
    shouldRenderPostTaxDeductions,
    takeHomePay_annual,
    takeHomePay_paycheck,
    localTaxKeys,
    contributionLimitAlerts,
  };
}
