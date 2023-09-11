export type FinanceState = {
  salary: number;
  max401kIndividualAmount: number;
  max401kTotalAmount: number;
  numberOfPayPeriods: number;
  numberOfPayPeriodsSoFar: number;
  individualContributionAmountSoFar: number;
  employerContributionAmountSoFar: number;
  individualContributionAfterTaxAmountSoFar: number;
  minIndividualContributionPercent: number;
  maxContributionPercent: number;
  employerMatchBasePercent: number;
  employerMatchPercent: number;
  employerMatchUpToPercent: number;
};

export type PreferencesState = {
  automaticallyCap401k: boolean;
  contributionStrategy: RetirementTableStrategy;
  addExistingContributions: boolean;
  update401kLimits: boolean;
  showEmployerMatch: boolean;
  showMegaBackdoor: boolean;
};

export type RetirementTableOptions = FinanceState &
  PreferencesState & {
    payPeriodAlreadyPassedIcon?: string;
    maxNotReachedIcon?: string;
    maxReachedEarlyIcon?: string;
  };

export type RetirementTableRow = {
  rowKey: string;
  payPerPayPeriod: number;
  contributionFraction: number;
  contributionAmount: number;
  cumulativeIndividualAmount: number;
  employerAmount: number;
  cumulativeEmployerAmount: number;
  afterTaxPercent: number;
  afterTaxAmount: number;
  cumulativeAfterTaxAmount: number;
  cumulativeAmountTotal: number; // Individual + Employer + After Tax
};

export enum RetirementTableStrategy {
  FRONTLOAD = "Fronload Individual Contributions",
  EQUAL = "Equal Period Contributions",
  FRONTLOAD_AT = "Frontload After Tax Contributions",
}
