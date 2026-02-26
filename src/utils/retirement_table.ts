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
import {
  RetirementTableOptions,
  RetirementTableRow,
  RetirementTableStrategy,
} from "./types";

/**
 * Generates a RetirementTableRow object.
 * @param rowKey
 * @param payPerPayPeriod
 * @returns RetirementTableRow with default values
 */
const generateDefaultRetirementTableRow = (
  rowKey: string,
  payPerPayPeriod: number,
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
  prioritizeMegaBackdoor: boolean = false;

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

  constructor(options: RetirementTableOptions) {
    this.salary = options.salary;
    this.numberOfPayPeriods = options.numberOfPayPeriods;
    this.numberOfPayPeriodsSoFar = options.numberOfPayPeriodsSoFar;
    this.individualContributionAmountSoFar =
      options.individualContributionAmountSoFar;

    this.individualContributionAfterTaxAmountSoFar =
      options.individualContributionAfterTaxAmountSoFar;
    this.max401kIndividualAmount = options.max401kIndividualAmount;
    this.max401kTotalAmount = options.max401kTotalAmount;
    this.minIndividualContributionPercent =
      options.minIndividualContributionPercent;
    this.maxContributionPercent = options.maxContributionPercent;
    this.employerMatchBasePercent = options.employerMatchBasePercent;
    this.employerMatchPercent = options.employerMatchPercent;
    this.employerMatchUpToPercent = options.employerMatchUpToPercent;
    this.employerContributionAmountSoFar =
      options.employerContributionAmountSoFar;
    this.payPeriodAlreadyPassedIcon =
      options.payPeriodAlreadyPassedIcon || "\u203E";
    this.maxNotReachedIcon = options.maxNotReachedIcon || "\u2020";
    this.maxReachedEarlyIcon = options.maxReachedEarlyIcon || "\u2021";
    this.automaticallyCap401k = options.automaticallyCap401k;
    this.contributionStrategy = options.contributionStrategy;
    this.prioritizeMegaBackdoor = options.prioritizeMegaBackdoor ?? false;

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

    this.maxAfterTaxAmount = options.showMegaBackdoor
      ? Math.max(
          _401k_maximum_contribution_total -
            _401k_maximum_contribution_individual -
            this.maxEmployerAmount,
          0,
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
      case RetirementTableStrategy.BACKLOAD: {
        this.tableWithBackloadIndividualContributions();
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

    // === MBD priority pre-computation ===
    // How many active periods are needed to fill remaining after-tax capacity
    // while contributing only the minimum individual amount each period.
    const prioritizeMBD =
      this.prioritizeMegaBackdoor && this.maxAfterTaxAmount > 0;
    const afterTaxPerPeriodMax = Math.max(
      maxPeriodContributionAmount - contributionAmountForFullMatch,
      0,
    );
    const remainingAfterTaxCapacity =
      this.maxAfterTaxAmount - this.individualContributionAfterTaxAmountSoFar;
    const totalActivePeriods =
      this.numberOfPayPeriods - this.numberOfPayPeriodsSoFar;
    const mbdPeriods =
      prioritizeMBD && afterTaxPerPeriodMax > 0 && remainingAfterTaxCapacity > 0
        ? Math.min(
            Math.ceil(remainingAfterTaxCapacity / afterTaxPerPeriodMax),
            totalActivePeriods,
          )
        : 0;

    // Individual contribution made during MBD phase (min% * mbdPeriods)
    const individualFromMBDPhase = contributionAmountForFullMatch * mbdPeriods;
    // Effective "so far" for frontload param computation in phase 2
    const adjustedIndividualSoFar =
      this.individualContributionAmountSoFar + individualFromMBDPhase;
    const periodsForPhase2 = totalActivePeriods - mbdPeriods;

    const numberOfMaxIndividualContributions =
      periodsForPhase2 <= 0
        ? 0
        : Math.floor(
            (adjustedIndividualSoFar -
              this.max401kIndividualAmount +
              contributionAmountForFullMatch * periodsForPhase2) /
              (contributionAmountForFullMatch - maxPeriodContributionAmount),
          );

    // special single contribution percent between maxing out and tapering to the minimum desired contribution
    const singleContributionPercent =
      periodsForPhase2 <= 0
        ? 0
        : Math.floor(
            ((this.max401kIndividualAmount -
              (adjustedIndividualSoFar +
                numberOfMaxIndividualContributions *
                  maxPeriodContributionAmount +
                (periodsForPhase2 - numberOfMaxIndividualContributions - 1) *
                  contributionAmountForFullMatch)) /
              this.salary) *
              this.numberOfPayPeriods *
              100,
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
        payPerPayPeriod,
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

      // relative index within active (non-passed) periods
      const r = i - this.numberOfPayPeriodsSoFar;
      const inMBDPhase = prioritizeMBD && r < mbdPeriods;

      // set individual contribution: MBD phase keeps min%, phase 2 uses frontload logic
      individualContributionFraction =
        this.minIndividualContributionPercent / 100;
      individualContributionAmount = contributionAmountForFullMatch;

      if (!inMBDPhase) {
        // phase 2 relative index
        const r2 = r - mbdPeriods;
        const shouldMaxIndividualContributions =
          r2 < numberOfMaxIndividualContributions;
        const shouldDoSpecialIndividualContribution =
          r2 === numberOfMaxIndividualContributions;

        if (shouldMaxIndividualContributions) {
          individualContributionFraction = this.maxContributionPercent / 100;
          individualContributionAmount = maxPeriodContributionAmount;
        }
        if (shouldDoSpecialIndividualContribution) {
          individualContributionFraction = singleContributionPercent / 100;
          individualContributionAmount = singleContributionAmount;
        }
      }

      // if 401k auto caps, we're at the last row (or first row which is also last),
      // amount contributed so far is less than max amount,
      // contribution would not equal max, and remaining amount is within max% limit
      // set contribution to max out
      if (
        this.automaticallyCap401k &&
        ((i > 0 &&
          i == this.numberOfPayPeriods - 1 &&
          cumulativeIndividualAmount < this.max401kIndividualAmount &&
          individualContributionAmount !=
            this.max401kIndividualAmount -
              tableRows[i - 1].cumulativeIndividualAmount &&
          this.max401kIndividualAmount -
            tableRows[i - 1].cumulativeIndividualAmount <=
            maxPeriodContributionAmount) ||
          (i == 0 &&
            i == this.numberOfPayPeriods - 1 &&
            cumulativeIndividualAmount < this.max401kIndividualAmount &&
            individualContributionAmount != this.max401kIndividualAmount &&
            this.max401kIndividualAmount <= maxPeriodContributionAmount))
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
      const employerBaseAmount =
        (this.employerMatchBasePercent / 100) * payPerPayPeriod;
      const employerMatchAmount =
        ((this.employerMatchPercent / 100) *
          Math.min(
            this.employerMatchUpToPercent,
            individualContributionFraction * 100,
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
          afterTaxCapacity,
        ),
        0,
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
    const minContribAmount =
      (this.minIndividualContributionPercent / 100) * payPerPayPeriod;

    // === MBD priority pre-computation ===
    const prioritizeMBD =
      this.prioritizeMegaBackdoor && this.maxAfterTaxAmount > 0;
    const afterTaxPerPeriodMax = Math.max(
      maxPeriodContributionAmount - minContribAmount,
      0,
    );
    const remainingAfterTaxCapacity =
      this.maxAfterTaxAmount - this.individualContributionAfterTaxAmountSoFar;
    const totalActivePeriods =
      this.numberOfPayPeriods - this.numberOfPayPeriodsSoFar;
    const mbdPeriods =
      prioritizeMBD && afterTaxPerPeriodMax > 0 && remainingAfterTaxCapacity > 0
        ? Math.min(
            Math.ceil(remainingAfterTaxCapacity / afterTaxPerPeriodMax),
            totalActivePeriods,
          )
        : 0;

    const individualFromMBDPhase = minContribAmount * mbdPeriods;
    const adjustedIndividualSoFar =
      this.individualContributionAmountSoFar + individualFromMBDPhase;
    const periodsForPhase2 = totalActivePeriods - mbdPeriods;

    // Whole-number percentage equal distribution over phase 2 periods.
    // 401k plans only accept integer percentages, so we find the two adjacent
    // integer percents that bracket the ideal per-period contribution, then use
    // numUpper periods at upperPct and the rest at lowerPct.
    const remainingTarget =
      this.max401kIndividualAmount - adjustedIndividualSoFar;

    let lowerPct = this.minIndividualContributionPercent;
    let upperPct = this.minIndividualContributionPercent;
    let lowerAmt = minContribAmount;
    let upperAmt = minContribAmount;
    let numUpper = 0;

    if (periodsForPhase2 > 0) {
      const targetPct =
        (remainingTarget / periodsForPhase2 / payPerPayPeriod) * 100;
      lowerPct = Math.max(
        Math.floor(targetPct),
        this.minIndividualContributionPercent,
      );
      upperPct = Math.min(lowerPct + 1, this.maxContributionPercent);
      lowerAmt = (lowerPct / 100) * payPerPayPeriod;
      upperAmt = (upperPct / 100) * payPerPayPeriod;
      if (upperAmt > lowerAmt) {
        numUpper = Math.max(
          0,
          Math.min(
            Math.floor(
              (remainingTarget - periodsForPhase2 * lowerAmt) /
                (upperAmt - lowerAmt),
            ),
            periodsForPhase2,
          ),
        );
      }
    }

    // Equal after-tax slot based on upper% periods (most constrained)
    const afterTaxSlotPerPeriod = maxPeriodContributionAmount - upperAmt;
    const remainingAfterTaxTarget =
      this.maxAfterTaxAmount - this.individualContributionAfterTaxAmountSoFar;
    let equalAfterTaxPercent = 0;
    let equalAfterTaxAmount = 0;
    if (
      !prioritizeMBD &&
      totalActivePeriods > 0 &&
      this.maxAfterTaxAmount > 0
    ) {
      const rawEqualAfterTax = Math.min(
        remainingAfterTaxTarget / totalActivePeriods,
        afterTaxSlotPerPeriod,
      );
      equalAfterTaxPercent =
        Math.floor((rawEqualAfterTax / payPerPayPeriod) * 100) / 100;
      equalAfterTaxAmount = equalAfterTaxPercent * payPerPayPeriod;
    }

    let individualContributionFraction = 0;
    let individualContributionAmount = 0;
    let cumulativeIndividualAmount = 0;
    let employerAmount = 0;
    let cumulativeEmployerAmount = 0;
    let afterTaxCapacity = this.maxAfterTaxAmount;
    let afterTaxAmount = 0;
    let cumulativeAfterTaxAmount = 0;
    let cumulativeAmountTotal = 0;

    for (let i = 0; i < this.numberOfPayPeriods; i++) {
      const row: RetirementTableRow = generateDefaultRetirementTableRow(
        (i + 1).toString(),
        payPerPayPeriod,
      );

      const isOverOnePeriodPassed = i < this.numberOfPayPeriodsSoFar - 1;
      const isLastPeriodPassed = i == this.numberOfPayPeriodsSoFar - 1;

      if (isOverOnePeriodPassed) {
        row.rowKey += this.payPeriodAlreadyPassedIcon;
        row.payPerPayPeriod = 0;
        tableRows.push(row);
        continue;
      }

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

      const r = i - this.numberOfPayPeriodsSoFar;
      const inMBDPhase = prioritizeMBD && r < mbdPeriods;

      if (inMBDPhase) {
        // MBD priority phase: keep min individual, fill after-tax
        individualContributionFraction =
          this.minIndividualContributionPercent / 100;
        individualContributionAmount = minContribAmount;
      } else {
        // Phase 2: upper% for the first numUpper periods, lower% for the rest
        const r2 = r - mbdPeriods;
        if (r2 < numUpper) {
          individualContributionFraction = upperPct / 100;
          individualContributionAmount = upperAmt;
        } else {
          individualContributionFraction = lowerPct / 100;
          individualContributionAmount = lowerAmt;
        }
      }

      // automaticallyCap401k: same last-period cap logic as frontload
      if (
        this.automaticallyCap401k &&
        ((i > 0 &&
          i == this.numberOfPayPeriods - 1 &&
          cumulativeIndividualAmount < this.max401kIndividualAmount &&
          individualContributionAmount !=
            this.max401kIndividualAmount -
              tableRows[i - 1].cumulativeIndividualAmount &&
          this.max401kIndividualAmount -
            tableRows[i - 1].cumulativeIndividualAmount <=
            maxPeriodContributionAmount) ||
          (i == 0 &&
            i == this.numberOfPayPeriods - 1 &&
            cumulativeIndividualAmount < this.max401kIndividualAmount &&
            individualContributionAmount != this.max401kIndividualAmount &&
            this.max401kIndividualAmount <= maxPeriodContributionAmount))
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

      // last period check
      if (
        i === this.numberOfPayPeriods - 1 &&
        Math.round(cumulativeIndividualAmount) < this.max401kIndividualAmount &&
        individualContributionAmount != maxPeriodContributionAmount
      ) {
        this.maxNotReached = true;
        row.rowKey += this.maxNotReachedIcon;
      }

      // employer match
      const employerBaseAmount =
        (this.employerMatchBasePercent / 100) * payPerPayPeriod;
      const employerMatchAmount =
        ((this.employerMatchPercent / 100) *
          Math.min(
            this.employerMatchUpToPercent,
            individualContributionFraction * 100,
          ) *
          payPerPayPeriod) /
        100;
      employerAmount = employerBaseAmount + employerMatchAmount;
      cumulativeEmployerAmount =
        i == 0
          ? employerAmount
          : tableRows[i - 1].cumulativeEmployerAmount + employerAmount;

      // after tax
      afterTaxCapacity =
        i == 0
          ? afterTaxCapacity
          : afterTaxCapacity - tableRows[i - 1].afterTaxAmount;
      // Non-MBD-priority equal strategy: spread after-tax evenly; last period takes any remainder
      const afterTaxSlot =
        !inMBDPhase && !prioritizeMBD
          ? equalAfterTaxAmount
          : maxPeriodContributionAmount - individualContributionAmount;
      afterTaxAmount = Math.max(Math.min(afterTaxSlot, afterTaxCapacity), 0);
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

  tableWithBackloadIndividualContributions() {
    const tableRows: RetirementTableRow[] = [];

    const payPerPayPeriod = this.salary / this.numberOfPayPeriods;
    const maxPeriodContributionAmount =
      (this.maxContributionPercent / 100) * payPerPayPeriod;
    const contributionAmountForFullMatch =
      (this.minIndividualContributionPercent / 100) * payPerPayPeriod;

    const prioritizeMBD =
      this.prioritizeMegaBackdoor && this.maxAfterTaxAmount > 0;
    const afterTaxPerPeriodMax = Math.max(
      maxPeriodContributionAmount - contributionAmountForFullMatch,
      0,
    );
    const remainingAfterTaxCapacity =
      this.maxAfterTaxAmount - this.individualContributionAfterTaxAmountSoFar;
    const totalActivePeriods =
      this.numberOfPayPeriods - this.numberOfPayPeriodsSoFar;

    // afterTaxPeriods: how many active periods needed to fill the remaining after-tax capacity.
    // Computed unconditionally — used to place the after-tax block regardless of prioritizeMBD.
    const afterTaxPeriods =
      afterTaxPerPeriodMax > 0 && remainingAfterTaxCapacity > 0
        ? Math.min(
            Math.ceil(remainingAfterTaxCapacity / afterTaxPerPeriodMax),
            totalActivePeriods,
          )
        : 0;

    // === After-tax window placement (in r-space, relative to numberOfPayPeriodsSoFar) ===
    //
    // For backload, both individual ramp and after-tax are placed as late as possible.
    // The question is which one comes LAST:
    //
    //   prioritizeMBD = false (default):
    //     Individual ramp is placed at the very end (most backloaded).
    //     After-tax fills the window just before and including the special transition period.
    //     Window: r in [specialRelIdx + 1 - afterTaxPeriods, specialRelIdx + 1)
    //     This includes the special period so its reduced individual slot can be used for after-tax.
    //
    //   prioritizeMBD = true:
    //     After-tax is placed at the very end (most backloaded).
    //     Individual ramp is compressed into the window just before the after-tax block.
    //     After-tax window: r in [totalActivePeriods - afterTaxPeriods, totalActivePeriods)
    //     Individual ramp window: r in [0, totalActivePeriods - afterTaxPeriods)
    //     During the after-tax window, individual stays at min%.

    // === Individual ramp parameters ===
    //
    // prioritizeMBD = false:
    //   Individual ramp spans all totalActivePeriods. No adjustment needed.
    //   The after-tax window overlaps the end of the ramp (including the special period).
    //
    // prioritizeMBD = true:
    //   After-tax occupies the last `afterTaxPeriods` periods.
    //   The first period of the after-tax window is a TRANSITION period where both individual
    //   and after-tax are contributed, filling up to the 90% cap:
    //     afterTaxFirstAmount = floor(remainder / payPerPayPeriod * 100) / 100 * payPerPayPeriod
    //     indAtTransition     = maxPeriodContributionAmount - afterTaxFirstAmount
    //   The remaining (afterTaxPeriods - 1) after-tax periods contribute min individual.
    //   So the ramp [0, afterTaxPhaseStart) must target:
    //     rampTarget = max401kIndividualAmount - indAtTransition - (afterTaxPeriods-1)*min

    // For prio: pre-compute the after-tax first-period remainder so we can derive indAtTransition.
    // (Non-prio computes firstPeriodAfterTaxAmount the same way but doesn't affect individual.)
    let firstPeriodAfterTaxAmount = 0;
    if (afterTaxPeriods > 0) {
      // Sum full after-tax slots for all periods in window EXCEPT the first.
      // Non-prio: special period (last in window) has a reduced slot; others have afterTaxPerPeriodMax.
      // Prio: all periods after the first are simple min-individual periods with full slot.
      // We don't know singleContributionAmount yet for non-prio, but we DO know specialRelativeIndex
      // will equal afterTaxPhaseEnd - 1 for non-prio. Temporarily compute for prio only here;
      // non-prio version is recomputed below after ramp params are finalized.
      if (prioritizeMBD) {
        const sumOfFullSlots = (afterTaxPeriods - 1) * afterTaxPerPeriodMax;
        const firstPeriodRaw = Math.max(
          remainingAfterTaxCapacity - sumOfFullSlots,
          0,
        );
        const firstPeriodPct =
          Math.floor((firstPeriodRaw / payPerPayPeriod) * 100) / 100;
        firstPeriodAfterTaxAmount = firstPeriodPct * payPerPayPeriod;
      }
    }

    // Individual contribution at the transition period (first of after-tax window) for prio:
    // fills the 90% cap gap left by after-tax.
    const indAtTransition = prioritizeMBD
      ? maxPeriodContributionAmount - firstPeriodAfterTaxAmount
      : 0; // not used for non-prio

    const periodsForIndividualRamp = prioritizeMBD
      ? totalActivePeriods - afterTaxPeriods // ramp fits in [0, afterTaxPhaseStart)
      : totalActivePeriods;

    // For prio: account for indAtTransition + (afterTaxPeriods-1)*min during the AT window.
    // For non-prio: individual adjustedSoFar is just what's been contributed so far.
    const adjustedIndividualSoFar = prioritizeMBD
      ? this.individualContributionAmountSoFar +
        indAtTransition +
        (afterTaxPeriods - 1) * contributionAmountForFullMatch
      : this.individualContributionAmountSoFar;

    const numberOfMaxIndividualContributions =
      periodsForIndividualRamp <= 0
        ? 0
        : Math.floor(
            (adjustedIndividualSoFar -
              this.max401kIndividualAmount +
              contributionAmountForFullMatch * periodsForIndividualRamp) /
              (contributionAmountForFullMatch - maxPeriodContributionAmount),
          );

    const singleContributionPercent =
      periodsForIndividualRamp <= 0
        ? 0
        : Math.floor(
            ((this.max401kIndividualAmount -
              (adjustedIndividualSoFar +
                numberOfMaxIndividualContributions *
                  maxPeriodContributionAmount +
                (periodsForIndividualRamp -
                  numberOfMaxIndividualContributions -
                  1) *
                  contributionAmountForFullMatch)) /
              this.salary) *
              this.numberOfPayPeriods *
              100,
          );
    const singleContributionAmount =
      (singleContributionPercent / 100) * payPerPayPeriod;

    // Relative index (in r-space) of the special transition period within the ramp window:
    //   r < specialRelativeIndex  → min
    //   r == specialRelativeIndex → special single
    //   r > specialRelativeIndex  → max
    const specialRelativeIndex =
      periodsForIndividualRamp - numberOfMaxIndividualContributions - 1;

    // === After-tax phase boundaries in r-space ===
    //
    //   prioritizeMBD = false:
    //     Individual ramp is placed at the very end (most backloaded).
    //     After-tax fills the window just before and including the special transition period.
    //     afterTaxPhaseEnd   = specialRelativeIndex + 1  (exclusive, includes special)
    //     afterTaxPhaseStart = max(0, afterTaxPhaseEnd - afterTaxPeriods)
    //
    //   prioritizeMBD = true:
    //     After-tax is placed at the very end (most backloaded).
    //     afterTaxPhaseStart = totalActivePeriods - afterTaxPeriods
    //     afterTaxPhaseEnd   = totalActivePeriods
    const afterTaxPhaseStart = prioritizeMBD
      ? totalActivePeriods - afterTaxPeriods
      : Math.max(0, specialRelativeIndex + 1 - afterTaxPeriods);
    const afterTaxPhaseEnd = prioritizeMBD
      ? totalActivePeriods
      : specialRelativeIndex + 1;

    // For non-prio: now that we have singleContributionAmount, finalize firstPeriodAfterTaxAmount.
    // (Prio already computed it above.)
    if (!prioritizeMBD && afterTaxPeriods > 0) {
      let sumOfFullSlots = 0;
      for (let r = afterTaxPhaseStart + 1; r < afterTaxPhaseEnd; r++) {
        const isSpecial = r === specialRelativeIndex;
        const slot = isSpecial
          ? maxPeriodContributionAmount - singleContributionAmount
          : afterTaxPerPeriodMax;
        sumOfFullSlots += slot;
      }
      const firstPeriodRaw = Math.max(
        remainingAfterTaxCapacity - sumOfFullSlots,
        0,
      );
      const firstPeriodPct =
        Math.floor((firstPeriodRaw / payPerPayPeriod) * 100) / 100;
      firstPeriodAfterTaxAmount = firstPeriodPct * payPerPayPeriod;
    }

    let individualContributionFraction = 0;
    let individualContributionAmount = 0;
    let cumulativeIndividualAmount = 0;
    let employerAmount = 0;
    let cumulativeEmployerAmount = 0;
    let afterTaxCapacity = this.maxAfterTaxAmount;
    let afterTaxAmount = 0;
    let cumulativeAfterTaxAmount = 0;
    let cumulativeAmountTotal = 0;

    for (let i = 0; i < this.numberOfPayPeriods; i++) {
      const row: RetirementTableRow = generateDefaultRetirementTableRow(
        (i + 1).toString(),
        payPerPayPeriod,
      );

      const isOverOnePeriodPassed = i < this.numberOfPayPeriodsSoFar - 1;
      const isLastPeriodPassed = i == this.numberOfPayPeriodsSoFar - 1;

      if (isOverOnePeriodPassed) {
        row.rowKey += this.payPeriodAlreadyPassedIcon;
        row.payPerPayPeriod = 0;
        tableRows.push(row);
        continue;
      }

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

      // r: index within active periods
      const r = i - this.numberOfPayPeriodsSoFar;

      const inAfterTaxPhase =
        afterTaxPeriods > 0 && r >= afterTaxPhaseStart && r < afterTaxPhaseEnd;

      // Default: min contribution
      individualContributionFraction =
        this.minIndividualContributionPercent / 100;
      individualContributionAmount = contributionAmountForFullMatch;

      // Individual ramp logic:
      //
      // Non-prio: ramp spans all 24 periods; special/max logic applies even inside the
      //   after-tax window (the special period is the last period of that window).
      //
      // Prio: ramp is confined to [0, afterTaxPhaseStart). Inside the after-tax window:
      //   - First period (transition): individual = indAtTransition (fills the 90% gap).
      //   - All other periods: individual stays at min.
      if (prioritizeMBD) {
        if (inAfterTaxPhase) {
          if (r === afterTaxPhaseStart) {
            // Transition period: individual fills whatever the 90% cap allows after after-tax.
            const indPct =
              Math.floor((indAtTransition / payPerPayPeriod) * 100) / 100;
            individualContributionFraction = indPct;
            individualContributionAmount = indPct * payPerPayPeriod;
          }
          // else: individual stays at min (default set above)
        } else {
          // Ramp phase: standard backload individual logic.
          if (r === specialRelativeIndex) {
            individualContributionFraction = singleContributionPercent / 100;
            individualContributionAmount = singleContributionAmount;
          } else if (r > specialRelativeIndex) {
            individualContributionFraction = this.maxContributionPercent / 100;
            individualContributionAmount = maxPeriodContributionAmount;
          }
        }
      } else {
        // Non-prio: ramp logic applies regardless of after-tax phase.
        if (r === specialRelativeIndex) {
          individualContributionFraction = singleContributionPercent / 100;
          individualContributionAmount = singleContributionAmount;
        } else if (r > specialRelativeIndex) {
          individualContributionFraction = this.maxContributionPercent / 100;
          individualContributionAmount = maxPeriodContributionAmount;
        }
      }

      // automaticallyCap401k: same last-period cap logic as frontload
      if (
        this.automaticallyCap401k &&
        ((i > 0 &&
          i == this.numberOfPayPeriods - 1 &&
          cumulativeIndividualAmount < this.max401kIndividualAmount &&
          individualContributionAmount !=
            this.max401kIndividualAmount -
              tableRows[i - 1].cumulativeIndividualAmount &&
          this.max401kIndividualAmount -
            tableRows[i - 1].cumulativeIndividualAmount <=
            maxPeriodContributionAmount) ||
          (i == 0 &&
            i == this.numberOfPayPeriods - 1 &&
            cumulativeIndividualAmount < this.max401kIndividualAmount &&
            individualContributionAmount != this.max401kIndividualAmount &&
            this.max401kIndividualAmount <= maxPeriodContributionAmount))
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

      cumulativeIndividualAmount =
        i == 0
          ? individualContributionAmount
          : tableRows[i - 1].cumulativeIndividualAmount +
            individualContributionAmount;

      // maxReachedEarly guard (unlikely in backload but handled for correctness)
      if (
        Math.floor(cumulativeIndividualAmount) > this.max401kIndividualAmount
      ) {
        this.maxReachedEarly = true;
        row.rowKey += this.maxReachedEarlyIcon;
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

      // maxNotReached: same last-period check
      if (
        i === this.numberOfPayPeriods - 1 &&
        Math.round(cumulativeIndividualAmount) < this.max401kIndividualAmount &&
        individualContributionAmount != maxPeriodContributionAmount
      ) {
        this.maxNotReached = true;
        row.rowKey += this.maxNotReachedIcon;
      }

      // employer match
      const employerBaseAmount =
        (this.employerMatchBasePercent / 100) * payPerPayPeriod;
      const employerMatchAmount =
        ((this.employerMatchPercent / 100) *
          Math.min(
            this.employerMatchUpToPercent,
            individualContributionFraction * 100,
          ) *
          payPerPayPeriod) /
        100;
      employerAmount = employerBaseAmount + employerMatchAmount;
      cumulativeEmployerAmount =
        i == 0
          ? employerAmount
          : tableRows[i - 1].cumulativeEmployerAmount + employerAmount;

      // after tax — fill from the end of the window (backload within window).
      // The first period of the window gets the pre-computed remainder;
      // all subsequent periods get their full available slot.
      // For prio: the transition period's after-tax was pre-computed as firstPeriodAfterTaxAmount.
      // For non-prio: same logic, but the individual at the special period (last in window)
      //   is higher, so its slot is naturally smaller.
      afterTaxCapacity =
        i == 0
          ? afterTaxCapacity
          : afterTaxCapacity - tableRows[i - 1].afterTaxAmount;
      if (inAfterTaxPhase) {
        const isFirstInWindow = r === afterTaxPhaseStart;
        if (isFirstInWindow) {
          afterTaxAmount = firstPeriodAfterTaxAmount;
        } else {
          const slot =
            maxPeriodContributionAmount - individualContributionAmount;
          afterTaxAmount = Math.max(Math.min(slot, afterTaxCapacity), 0);
        }
      } else {
        afterTaxAmount = 0;
      }
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
}
