/**
 * This is an object oriented class to generate the table data for the 401k calculator.
 */

export interface RetirementTableRow {
  rowKey: string;
  payPerPayPeriod: number;
  contributionFraction: number;
  contributionAmount: number;
  cumulativeAmountIndividual: number;
  employerAmount: number;
  cumulativeAmountWithEmployer: number; // Individual + Employer
  afterTaxPercent: number;
  afterTaxAmount: number;
  cumulativeAmountTotal: number; // Individual + Employer + After Tax
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
    cumulativeAmountIndividual: 0,
    employerAmount: 0,
    cumulativeAmountWithEmployer: 0,
    afterTaxPercent: 0,
    afterTaxAmount: 0,
    cumulativeAmountTotal: 0,
  };
};

export class RetirementTable {
  salary: number;
  numberOfPayPeriods: number;

  numberOfPayPeriodsSoFar: number;
  individualContributionAmountSoFar: number;
  individualContributionAfterTaxAmountSoFar: number;

  max401kIndividualAmount: number;
  max401kTotalAmount: number;

  minIndividualContributionPercent: number;
  maxContributionPercent: number;

  employerMatchBasePercent: number;
  employerMatchPercent: number;
  employerMatchUpToPercent: number;
  employerContributionAmountSoFar: number;

  // table options
  automaticallyCap401k: boolean = false;
  prioritizeMegaBackdoor: boolean = false;

  // icons for table
  payPeriodAlreadyPassedIcon: string = "\u203E"; // overline
  maxNotReachedIcon: string = "\u2020"; // dagger, shared with maxNotReached and maxReachedWithAutomaticCap
  maxReachedEarlyIcon: string = "\u2021"; // double dagger

  // output parameters to expose
  maxNotReached: boolean = false;
  maxReachedWithAutomaticCap: boolean = false;
  maxReachedEarly: boolean = false;
  table: RetirementTableRow[] = [];

  constructor(
    salary: number,
    numberOfPayPeriods: number,
    numberOfPayPeriodsSoFar: number,
    individualContributionAmountSoFar: number = 0,
    individualContributionAfterTaxAmountSoFar: number = 0,
    max401kIndividualAmount: number,
    max401kTotalAmount: number,
    minIndividualContributionPercent: number,
    maxContributionPercent: number,
    employerMatchBasePercent: number = 0,
    employerMatchPercent: number = 0,
    employerMatchUpToPercent: number = 0,
    employerContributionAmountSoFar: number = 0,
    automaticallyCap401k: boolean = false,
    prioritizeMegaBackdoor: boolean = false
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
    this.automaticallyCap401k = automaticallyCap401k;
    this.prioritizeMegaBackdoor = prioritizeMegaBackdoor;

    this.generateTable();
  }

  updateTable() {
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

    // data for table
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
    let cumulativeAmountIndividual = 0;
    let employerAmount = 0;
    let afterTaxAmount = 0;
    let cumulativeAmountWithEmployer = 0;
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
        tableRows.push(row);
        continue;
      }

      // base case: if row pay period is last period,
      // insert payPeriodAlreadyPassedIcon to row key, add amounts contributed so far, and move on
      if (isLastPeriodPassed) {
        row.rowKey += this.payPeriodAlreadyPassedIcon;
        row.contributionAmount = this.individualContributionAmountSoFar;
        row.cumulativeAmountIndividual = this.individualContributionAmountSoFar;
        row.employerAmount = this.employerContributionAmountSoFar;
        row.afterTaxAmount = this.individualContributionAfterTaxAmountSoFar;
        row.cumulativeAmountWithEmployer =
          row.contributionAmount + row.employerAmount;
        row.cumulativeAmountTotal =
          row.cumulativeAmountWithEmployer + row.afterTaxAmount;
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

      // if 401k auto caps, we're at the last row, amount contributed so far is less than max amount,
      // contribution would not equal max, and new contribution won't exceed max allowed
      // set contribution to max out
      if (
        this.automaticallyCap401k &&
        i == this.numberOfPayPeriods - 1 &&
        cumulativeAmountIndividual < this.max401kIndividualAmount &&
        individualContributionAmount !=
          this.max401kIndividualAmount -
            tableRows[i - 1].cumulativeAmountIndividual &&
        ((this.max401kIndividualAmount -
          tableRows[i - 1].cumulativeAmountIndividual) /
          payPerPayPeriod) *
          100 <=
          maxPeriodContributionAmount
      ) {
        individualContributionAmount =
          this.max401kIndividualAmount -
          tableRows[i - 1].cumulativeAmountIndividual;
        individualContributionFraction =
          Math.ceil((individualContributionAmount / payPerPayPeriod) * 100) /
          100;
        row.rowKey += this.maxNotReachedIcon;
        this.maxReachedWithAutomaticCap = true;
      }

      // if first row, use period contributions, else add value to last period contribution
      cumulativeAmountIndividual =
        i == 0
          ? individualContributionAmount
          : tableRows[i - 1].cumulativeAmountIndividual +
            individualContributionAmount;

      // check if max is hit early
      if (
        Math.floor(cumulativeAmountIndividual) > this.max401kIndividualAmount
      ) {
        this.maxReachedEarly = true;
        row.rowKey += this.maxReachedEarlyIcon;
        // if we auto cap, max out, otherwise get very close
        if (this.automaticallyCap401k) {
          cumulativeAmountIndividual = this.max401kIndividualAmount;
          individualContributionAmount =
            i == 0
              ? this.max401kIndividualAmount
              : this.max401kIndividualAmount -
                tableRows[i - 1].cumulativeAmountIndividual;
          individualContributionFraction =
            Math.ceil((individualContributionAmount / payPerPayPeriod) * 100) /
            100;
        } else {
          let upperBoundContribution =
            i == 0
              ? this.max401kIndividualAmount
              : this.max401kIndividualAmount -
                tableRows[i - 1].cumulativeAmountIndividual;
          individualContributionFraction =
            Math.floor((upperBoundContribution / payPerPayPeriod) * 100) / 100;
          individualContributionAmount =
            payPerPayPeriod * individualContributionFraction;
          cumulativeAmountIndividual =
            i == 0
              ? individualContributionAmount
              : tableRows[i - 1].cumulativeAmountIndividual +
                individualContributionAmount;
        }
      }

      // if last paycheck, cumulative is < 401k max, and last match isn't the maximum,
      // with the last check meaning you're unable to hit maximum contribution limit,
      // add dagger to let user know to bump up contribution
      if (
        i === this.numberOfPayPeriods - 1 &&
        Math.round(cumulativeAmountIndividual) < this.max401kIndividualAmount &&
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
      employerAmount =
        employerBaseAmount +
        Math.min(cumulativeAmountIndividual, employerMatchAmount);
      cumulativeAmountWithEmployer =
        i == 0
          ? cumulativeAmountIndividual + employerAmount
          : tableRows[i - 1].cumulativeAmountWithEmployer +
            individualContributionAmount +
            employerAmount;

      tableRows.push({
        ...row,
        contributionFraction: individualContributionFraction,
        contributionAmount: individualContributionAmount,
        cumulativeAmountIndividual,
        employerAmount,
        cumulativeAmountWithEmployer,
        afterTaxPercent: 0,
        afterTaxAmount: 0,
        cumulativeAmountTotal: cumulativeAmountWithEmployer,
      });
    }

    this.table = tableRows;
  }
}
