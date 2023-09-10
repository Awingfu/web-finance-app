/**
 * This is an object oriented class to generate the table data for the 401k calculator.
 * TODOs:
 * 1. Implement prioritizing after tax first
 * 2. When minIndividualContributionPercent is set below employerMatchUpToPercent, after-tax may not hit real max.
 *    This is because the after-tax max is set based on max employer matching
 */

import {
  _401k_maximum_contribution_individual,
  _401k_maximum_contribution_total,
} from "./constants";

export interface RetirementTableRow {
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
}

export enum RetirementTableStrategy {
  FRONTLOAD = "Fronload Individual Contributions",
  EQUAL = "Equal Period Contributions",
  FRONTLOAD_AT = "Frontload After Tax Contributions",
}

/**
 * Generates a RetirementTableRow object.
 * @param rowKey
 * @param payPerPayPeriod
 * @returns RetirementTableRow with default values
 */
const generateDefaultRetirementTableRow = (
  rowKey: string,
  payPerPayPeriod: number
): RetirementTableRow => {
  return {
    rowKey,
    payPerPayPeriod,
    contributionFraction: 0,
    contributionAmount: 0,
    cumulativeIndividualAmount: 0,
    employerAmount: 0,
    cumulativeEmployerAmount: 0,
    afterTaxPercent: 0,
    afterTaxAmount: 0,
    cumulativeAfterTaxAmount: 0,
    cumulativeAmountTotal: 0,
  };
};

export class RetirementTable {
  salary: number;
  numberOfPayPeriods: number;

  numberOfPayPeriodsSoFar: number;
  individualContributionAmountSoFar: number;
  employerContributionAmountSoFar: number;
  individualContributionAfterTaxAmountSoFar: number;

  max401kIndividualAmount: number;
  max401kTotalAmount: number;

  minIndividualContributionPercent: number;
  maxContributionPercent: number;

  employerMatchBasePercent: number;
  employerMatchPercent: number;
  employerMatchUpToPercent: number;

  // expose these for after tax calculations
  maxEmployerAmount: number;
  maxAfterTaxAmount: number;

  // table options
  automaticallyCap401k: boolean = false;
  contributionStrategy: RetirementTableStrategy =
    RetirementTableStrategy.FRONTLOAD;

  // icons for table
  payPeriodAlreadyPassedIcon: string;
  maxNotReachedIcon: string; // shared with maxNotReached and maxReachedWithAutomaticCap
  maxReachedEarlyIcon: string;

  // output parameters to expose
  salaryRemaining: number;
  maxNotReached: boolean = false;
  maxReachedWithAutomaticCap: boolean = false;
  maxReachedEarly: boolean = false;
  table: RetirementTableRow[] = [];

  constructor(
    salary: number,
    numberOfPayPeriods: number,
    numberOfPayPeriodsSoFar: number = 0,
    individualContributionAmountSoFar: number = 0,
    employerContributionAmountSoFar: number = 0,
    individualContributionAfterTaxAmountSoFar: number = 0,
    max401kIndividualAmount: number = _401k_maximum_contribution_individual,
    max401kTotalAmount: number = _401k_maximum_contribution_total,
    minIndividualContributionPercent: number = 0,
    maxContributionPercent: number = 50,
    employerMatchBasePercent: number = 0,
    employerMatchPercent: number = 0,
    employerMatchUpToPercent: number = 0,
    payPeriodAlreadyPassedIcon: string = "\u203E",
    maxNotReachedIcon: string = "\u2020",
    maxReachedEarlyIcon: string = "\u2021",
    automaticallyCap401k: boolean = false,
    showMegaBackdoor: boolean = false,
    contributionStrategy: RetirementTableStrategy = RetirementTableStrategy.FRONTLOAD
  ) {
    this.salary = salary;
    this.numberOfPayPeriods = numberOfPayPeriods;
    this.numberOfPayPeriodsSoFar = numberOfPayPeriodsSoFar;
    this.individualContributionAmountSoFar = individualContributionAmountSoFar;
    this.individualContributionAfterTaxAmountSoFar =
      individualContributionAfterTaxAmountSoFar;
    this.max401kIndividualAmount = max401kIndividualAmount;
    this.max401kTotalAmount = max401kTotalAmount;
    this.minIndividualContributionPercent = minIndividualContributionPercent;
    this.maxContributionPercent = maxContributionPercent;
    this.employerMatchBasePercent = employerMatchBasePercent;
    this.employerMatchPercent = employerMatchPercent;
    this.employerMatchUpToPercent = employerMatchUpToPercent;
    this.employerContributionAmountSoFar = employerContributionAmountSoFar;
    this.payPeriodAlreadyPassedIcon = payPeriodAlreadyPassedIcon;
    this.maxNotReachedIcon = maxNotReachedIcon;
    this.maxReachedEarlyIcon = maxReachedEarlyIcon;
    this.automaticallyCap401k = automaticallyCap401k;
    this.contributionStrategy = contributionStrategy;

    // constants for after tax calculations
    const numberOfPayPeriodsRemaining =
      this.numberOfPayPeriods - this.numberOfPayPeriodsSoFar;
    this.salaryRemaining =
      (this.salary * numberOfPayPeriodsRemaining) / this.numberOfPayPeriods;
    this.maxEmployerAmount =
      (this.employerMatchBasePercent / 100) * this.salaryRemaining +
      (((this.employerMatchPercent / 100) * this.employerMatchUpToPercent) /
        100) *
        this.salaryRemaining +
      this.employerContributionAmountSoFar;

    this.maxAfterTaxAmount = showMegaBackdoor
      ? Math.max(
          _401k_maximum_contribution_total -
            _401k_maximum_contribution_individual -
            this.maxEmployerAmount,
          0
        )
      : 0;

    this.generateTable();
  }

  getTable(): RetirementTableRow[] {
    return this.table;
  }

  generateTable() {
    // Reset output parameters
    this.maxReachedWithAutomaticCap = false;
    this.maxReachedEarly = false;
    this.maxNotReached = false;
    this.table = [];

    switch (this.contributionStrategy) {
      case RetirementTableStrategy.EQUAL: {
        this.tableWithEqualPeriodContributions();
        break;
      }
      default: {
        this.tableWithFrontloadIndividualContributions();
        break;
      }
    }
  }

  tableWithFrontloadIndividualContributions() {
    const tableRows: RetirementTableRow[] = [];

    const payPerPayPeriod = this.salary / this.numberOfPayPeriods;
    const maxPeriodContributionAmount =
      (this.maxContributionPercent / 100) * payPerPayPeriod;
    const contributionAmountForFullMatch =
      (this.minIndividualContributionPercent / 100) * payPerPayPeriod;

    const numberOfMaxIndividualContributions = Math.floor(
      (this.individualContributionAmountSoFar -
        this.max401kIndividualAmount +
        contributionAmountForFullMatch *
          (this.numberOfPayPeriods - this.numberOfPayPeriodsSoFar)) /
        (contributionAmountForFullMatch - maxPeriodContributionAmount)
    );

    // special single contribution percent between maxing out and tapering to the minimum desired contribution
    const singleContributionPercent = Math.floor(
      ((this.max401kIndividualAmount -
        (this.individualContributionAmountSoFar +
          numberOfMaxIndividualContributions * maxPeriodContributionAmount +
          (this.numberOfPayPeriods -
            numberOfMaxIndividualContributions -
            this.numberOfPayPeriodsSoFar -
            1) *
            contributionAmountForFullMatch)) /
        this.salary) *
        this.numberOfPayPeriods *
        100
    );
    const singleContributionAmount =
      (singleContributionPercent / 100) * payPerPayPeriod;

    let individualContributionFraction = 0;
    let individualContributionAmount = 0;
    let cumulativeIndividualAmount = 0;
    let employerAmount = 0;
    let cumulativeEmployerAmount = 0;
    let afterTaxCapacity = this.maxAfterTaxAmount;
    let afterTaxAmount = 0;
    let cumulativeAfterTaxAmount = 0;
    let cumulativeAmountTotal = 0;

    // generate RetirementTableRow for each period
    for (let i = 0; i < this.numberOfPayPeriods; i++) {
      // initialize RetirementTableRow with key for paycheck number (index 1) and pay per pay period.
      const row: RetirementTableRow = generateDefaultRetirementTableRow(
        (i + 1).toString(),
        payPerPayPeriod
      );

      // base cases when pay periods have passed
      const isOverOnePeriodPassed = i < this.numberOfPayPeriodsSoFar - 1;
      const isLastPeriodPassed = i == this.numberOfPayPeriodsSoFar - 1;

      // base case: if row pay period is over 1 period than current
      // insert payPeriodAlreadyPassedIcon and move on
      if (isOverOnePeriodPassed) {
        row.rowKey += this.payPeriodAlreadyPassedIcon;
        row.payPerPayPeriod = 0;
        tableRows.push(row);
        continue;
      }

      // base case: if row pay period is last period,
      // insert payPeriodAlreadyPassedIcon to row key, add amounts contributed so far, and move on
      if (isLastPeriodPassed) {
        row.rowKey += this.payPeriodAlreadyPassedIcon;
        row.payPerPayPeriod = 0;
        row.contributionAmount = this.individualContributionAmountSoFar;
        row.cumulativeIndividualAmount = this.individualContributionAmountSoFar;
        row.employerAmount = this.employerContributionAmountSoFar;
        row.cumulativeEmployerAmount = row.employerAmount;
        row.afterTaxAmount = this.individualContributionAfterTaxAmountSoFar;
        row.cumulativeAfterTaxAmount = row.afterTaxAmount;
        row.cumulativeAmountTotal =
          row.contributionAmount + row.employerAmount + row.afterTaxAmount;
        tableRows.push(row);
        continue;
      }

      // set general case individual contribution fraction and contribution amount
      individualContributionFraction =
        this.minIndividualContributionPercent / 100;
      individualContributionAmount =
        individualContributionFraction * payPerPayPeriod;

      // cases to override individual contribution
      // do max contributions, then single contribution, then default to min match
      const shouldMaxIndividualContributions =
        i - this.numberOfPayPeriodsSoFar < numberOfMaxIndividualContributions;
      const shouldDoSpecialIndividualContribution =
        i - this.numberOfPayPeriodsSoFar == numberOfMaxIndividualContributions;

      if (shouldMaxIndividualContributions) {
        individualContributionFraction = this.maxContributionPercent / 100;
        individualContributionAmount = maxPeriodContributionAmount;
      }
      if (shouldDoSpecialIndividualContribution) {
        individualContributionFraction = singleContributionPercent / 100;
        individualContributionAmount = singleContributionAmount;
      }

      // if 401k auto caps, we're at the last row (or first row which is also last),
      // amount contributed so far is less than max amount,
      // contribution would not equal max, and new contribution won't exceed max allowed
      // set contribution to max out
      if (
        this.automaticallyCap401k &&
        ((i > 0 &&
          i == this.numberOfPayPeriods - 1 &&
          cumulativeIndividualAmount < this.max401kIndividualAmount &&
          individualContributionAmount !=
            this.max401kIndividualAmount -
              tableRows[i - 1].cumulativeIndividualAmount &&
          ((this.max401kIndividualAmount -
            tableRows[i - 1].cumulativeIndividualAmount) /
            payPerPayPeriod) *
            100 <=
            maxPeriodContributionAmount) ||
          (i == 0 &&
            i == this.numberOfPayPeriods - 1 &&
            cumulativeIndividualAmount < this.max401kIndividualAmount &&
            individualContributionAmount != this.max401kIndividualAmount &&
            (this.max401kIndividualAmount / payPerPayPeriod) * 100 <=
              maxPeriodContributionAmount))
      ) {
        individualContributionAmount =
          i == 0
            ? this.max401kIndividualAmount
            : this.max401kIndividualAmount -
              tableRows[i - 1].cumulativeIndividualAmount;
        individualContributionFraction =
          Math.ceil((individualContributionAmount / payPerPayPeriod) * 100) /
          100;
        row.rowKey += this.maxNotReachedIcon;
        this.maxReachedWithAutomaticCap = true;
      }

      // if first row, use period contributions, else add value to last period contribution
      cumulativeIndividualAmount =
        i == 0
          ? individualContributionAmount
          : tableRows[i - 1].cumulativeIndividualAmount +
            individualContributionAmount;

      // check if max is hit early
      if (
        Math.floor(cumulativeIndividualAmount) > this.max401kIndividualAmount
      ) {
        this.maxReachedEarly = true;
        row.rowKey += this.maxReachedEarlyIcon;
        // if we auto cap, max out, otherwise get very close
        if (this.automaticallyCap401k) {
          cumulativeIndividualAmount = this.max401kIndividualAmount;
          individualContributionAmount =
            i == 0
              ? this.max401kIndividualAmount
              : this.max401kIndividualAmount -
                tableRows[i - 1].cumulativeIndividualAmount;
          individualContributionFraction =
            Math.ceil((individualContributionAmount / payPerPayPeriod) * 100) /
            100;
        } else {
          let upperBoundContribution =
            i == 0
              ? this.max401kIndividualAmount
              : this.max401kIndividualAmount -
                tableRows[i - 1].cumulativeIndividualAmount;
          individualContributionFraction =
            Math.floor((upperBoundContribution / payPerPayPeriod) * 100) / 100;
          individualContributionAmount =
            payPerPayPeriod * individualContributionFraction;
          cumulativeIndividualAmount =
            i == 0
              ? individualContributionAmount
              : tableRows[i - 1].cumulativeIndividualAmount +
                individualContributionAmount;
        }
      }

      // if last paycheck, cumulative is < 401k max, and last match isn't the maximum,
      // with the last check meaning you're unable to hit maximum contribution limit,
      // add dagger to let user know to bump up contribution
      if (
        i === this.numberOfPayPeriods - 1 &&
        Math.round(cumulativeIndividualAmount) < this.max401kIndividualAmount &&
        individualContributionAmount != maxPeriodContributionAmount
      ) {
        this.maxNotReached = true;
        row.rowKey += this.maxNotReachedIcon;
      }

      // set employer match
      let employerBaseAmount =
        (this.employerMatchBasePercent / 100) * payPerPayPeriod;
      let employerMatchAmount =
        ((this.employerMatchPercent / 100) *
          Math.min(
            this.employerMatchUpToPercent,
            individualContributionFraction * 100
          ) *
          payPerPayPeriod) /
        100;
      employerAmount = employerBaseAmount + employerMatchAmount;
      cumulativeEmployerAmount =
        i == 0
          ? employerAmount
          : tableRows[i - 1].cumulativeEmployerAmount + employerAmount;

      // set after tax
      afterTaxCapacity =
        i == 0
          ? afterTaxCapacity
          : afterTaxCapacity - tableRows[i - 1].afterTaxAmount;
      afterTaxAmount = Math.max(
        Math.min(
          maxPeriodContributionAmount - individualContributionAmount,
          afterTaxCapacity
        ),
        0
      );
      const afterTaxPercent =
        Math.floor((afterTaxAmount / payPerPayPeriod) * 100) / 100;
      afterTaxAmount = afterTaxPercent * payPerPayPeriod;
      cumulativeAfterTaxAmount =
        i == 0
          ? afterTaxAmount
          : tableRows[i - 1].cumulativeAfterTaxAmount + afterTaxAmount;

      cumulativeAmountTotal =
        cumulativeIndividualAmount +
        cumulativeEmployerAmount +
        cumulativeAfterTaxAmount;

      tableRows.push({
        ...row,
        contributionFraction: individualContributionFraction,
        contributionAmount: individualContributionAmount,
        cumulativeIndividualAmount,
        employerAmount,
        cumulativeEmployerAmount,
        afterTaxPercent,
        afterTaxAmount,
        cumulativeAfterTaxAmount,
        cumulativeAmountTotal,
      });
    }
    this.table = tableRows;
  }

  tableWithEqualPeriodContributions() {
    const tableRows: RetirementTableRow[] = [];

    const payPerPayPeriod = this.salary / this.numberOfPayPeriods;
    const maxPeriodContributionAmount =
      (this.maxContributionPercent / 100) * payPerPayPeriod;
    const contributionAmountForFullMatch =
      (this.minIndividualContributionPercent / 100) * payPerPayPeriod;

    const numberOfMaxIndividualContributions = Math.floor(
      (this.individualContributionAmountSoFar -
        this.max401kIndividualAmount +
        contributionAmountForFullMatch *
          (this.numberOfPayPeriods - this.numberOfPayPeriodsSoFar)) /
        (contributionAmountForFullMatch - maxPeriodContributionAmount)
    );

    // special single contribution percent between maxing out and tapering to the minimum desired contribution
    const singleContributionPercent = Math.floor(
      ((this.max401kIndividualAmount -
        (this.individualContributionAmountSoFar +
          numberOfMaxIndividualContributions * maxPeriodContributionAmount +
          (this.numberOfPayPeriods -
            numberOfMaxIndividualContributions -
            this.numberOfPayPeriodsSoFar -
            1) *
            contributionAmountForFullMatch)) /
        this.salary) *
        this.numberOfPayPeriods *
        100
    );
    const singleContributionAmount =
      (singleContributionPercent / 100) * payPerPayPeriod;

    let individualContributionFraction = 0;
    let individualContributionAmount = 0;
    let cumulativeIndividualAmount = 0;
    let employerAmount = 0;
    let cumulativeEmployerAmount = 0;
    let afterTaxCapacity = this.maxAfterTaxAmount;
    let afterTaxAmount = 0;
    let cumulativeAfterTaxAmount = 0;
    let cumulativeAmountTotal = 0;

    let match = 0;
    let contributionAmount = 0;
    let employerMatchAmount = 0;
    let cumulativeAmountIndividual: number = 0;
    let cumulativeAmountEmployer: number = 0;

    for (let i = 0; i < this.numberOfPayPeriods; i++) {
      // initialize RetirementTableRow with key for paycheck number (index 1) and pay per pay period.
      const row: RetirementTableRow = generateDefaultRetirementTableRow(
        (i + 1).toString(),
        payPerPayPeriod
      );

      // base cases when pay periods have passed
      const isOverOnePeriodPassed = i < this.numberOfPayPeriodsSoFar - 1;
      const isLastPeriodPassed = i == this.numberOfPayPeriodsSoFar - 1;

      // base case: if row pay period is over 1 period than current
      // insert payPeriodAlreadyPassedIcon and move on
      if (isOverOnePeriodPassed) {
        row.rowKey += this.payPeriodAlreadyPassedIcon;
        row.payPerPayPeriod = 0;
        tableRows.push(row);
        continue;
      }

      // base case: if row pay period is last period,
      // insert payPeriodAlreadyPassedIcon to row key, add amounts contributed so far, and move on
      if (isLastPeriodPassed) {
        row.rowKey += this.payPeriodAlreadyPassedIcon;
        row.payPerPayPeriod = 0;
        row.contributionAmount = this.individualContributionAmountSoFar;
        row.cumulativeIndividualAmount = this.individualContributionAmountSoFar;
        row.employerAmount = this.employerContributionAmountSoFar;
        row.cumulativeEmployerAmount = row.employerAmount;
        row.afterTaxAmount = this.individualContributionAfterTaxAmountSoFar;
        row.cumulativeAfterTaxAmount = row.afterTaxAmount;
        row.cumulativeAmountTotal =
          row.contributionAmount + row.employerAmount + row.afterTaxAmount;
        tableRows.push(row);
        continue;
      }

      match = this.employerMatchPercent;
      contributionAmount = match * payPerPayPeriod;

      // if previous row is above max individual contribution, stop
      // else if new contribution will push over the limit and we auto cap, adjust
      if (
        i > 0 &&
        tableRows[i - 1].cumulativeIndividualAmount >=
          this.max401kIndividualAmount
      ) {
        match = 0;
        contributionAmount = 0;
        row.rowKey += this.maxReachedEarlyIcon;
        this.maxReachedEarly = true;
      } else if (
        i > 0 &&
        this.automaticallyCap401k &&
        tableRows[i - 1].cumulativeIndividualAmount + contributionAmount >=
          this.max401kIndividualAmount
      ) {
        contributionAmount = Math.max(
          0,
          this.max401kIndividualAmount -
            tableRows[i - 1].cumulativeIndividualAmount
        );
        match = Math.ceil((contributionAmount / payPerPayPeriod) * 100) / 100;
        // show note only if it's before the last pay period
        if (i < this.numberOfPayPeriods - 1) {
          row.rowKey += this.maxReachedEarlyIcon;
          this.maxReachedEarly = true;
        }
      }

      // edge case for last paycheck and autocap and backload is true
      if (
        this.automaticallyCap401k &&
        backloadToggle &&
        i == this.numberOfPayPeriods - 1
      ) {
        contributionAmount = Math.min(
          _401k_maximum_contribution_individual - cumulativeAmountIndividual,
          _401k_maximum_contribution_total - cumulativeAmountTotal,
          (this.maxContributionFromPaycheck / 100) * payPerPayPeriod
        );
        match = Math.ceil((contributionAmount / payPerPayPeriod) * 100) / 100;
      }

      // Employer match cannot exceed contribution amount
      employerMatchAmount = Math.min(
        (employerMatch / 100) * payPerPayPeriod,
        contributionAmount
      );
      if (
        i > 0 &&
        table_rows[i - 1][7] + contributionAmount > _401kMaximum &&
        megabackdoorEligible
      ) {
        employerMatchAmount = 0;
      } else if (
        i > 0 &&
        table_rows[i - 1][7] + employerMatchAmount + contributionAmount >
          _401kMaximum &&
        _401kAutoCap &&
        megabackdoorEligible
      ) {
        employerMatchAmount =
          _401kMaximum - table_rows[i - 1][7] - contributionAmount;
      }

      //if prev row exists, add value to period contribution, else use period contribution
      cumulativeAmountIndividual =
        i != 0 ? table_rows[i - 1][4] + contributionAmount : contributionAmount;

      cumulativeAmountEmployer =
        i != 0
          ? table_rows[i - 1][6] + employerMatchAmount
          : employerMatchAmount;

      cumulativeAmountTotal =
        i != 0
          ? table_rows[i - 1][7] + contributionAmount + employerMatchAmount
          : contributionAmount + employerMatchAmount;

      // if last paycheck, cumulative is < 401k max, and last match isnt the maximum,
      // with the last check meaning you're unable to hit maximum contribution limit,
      // add dagger to let user know to bump up contribution
      if (
        !_401kAutoCap &&
        i === numberOfPayPeriods - 1 &&
        Math.round(cumulativeAmountIndividual) != _401kMaximumIndividual &&
        match != maxContributionFromPaycheck / 100
      ) {
        concatKey += _401kMaxNotReachedIcon;
      }

      // row values: key, compensation, match, contribution, cumulative
      tableRows.push({
        ...row,
        contributionFraction: individualContributionFraction,
        contributionAmount: individualContributionAmount,
        cumulativeIndividualAmount,
        employerAmount,
        cumulativeEmployerAmount,
        afterTaxPercent,
        afterTaxAmount,
        cumulativeAfterTaxAmount,
        cumulativeAmountTotal,
      });
    }
    this.table = tableRows;
  }
}
