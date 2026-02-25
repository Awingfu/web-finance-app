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

    // Equal distribution over phase 2 periods only
    const remainingTarget =
      this.max401kIndividualAmount - adjustedIndividualSoFar;
    let equalAmount =
      periodsForPhase2 > 0 ? remainingTarget / periodsForPhase2 : 0;
    equalAmount = Math.min(
      Math.max(equalAmount, minContribAmount),
      maxPeriodContributionAmount,
    );

    // Equal after-tax distribution across all active periods (non-MBD-priority path only)
    const afterTaxSlotPerPeriod = maxPeriodContributionAmount - equalAmount;
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
        // Phase 2: equal distribution of remaining individual budget
        individualContributionFraction = equalAmount / payPerPayPeriod;
        individualContributionAmount = equalAmount;

        // Last period: contribute exactly what's needed to hit the max
        if (i === this.numberOfPayPeriods - 1) {
          const prevCumulative =
            i === 0 ? 0 : tableRows[i - 1].cumulativeIndividualAmount;
          let lastContribution = this.max401kIndividualAmount - prevCumulative;
          if (lastContribution > maxPeriodContributionAmount) {
            this.maxNotReached = true;
            row.rowKey += this.maxNotReachedIcon;
            lastContribution = maxPeriodContributionAmount;
          }
          individualContributionAmount = Math.max(
            lastContribution,
            minContribAmount,
          );
          individualContributionFraction =
            individualContributionAmount / payPerPayPeriod;
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

    // === MBD priority pre-computation ===
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

    const individualFromMBDPhase = contributionAmountForFullMatch * mbdPeriods;
    const adjustedIndividualSoFar =
      this.individualContributionAmountSoFar + individualFromMBDPhase;
    const periodsForPhase2 = totalActivePeriods - mbdPeriods;

    // Same math as frontload — totals are identical, placement is mirrored
    const numberOfMaxIndividualContributions =
      periodsForPhase2 <= 0
        ? 0
        : Math.floor(
            (adjustedIndividualSoFar -
              this.max401kIndividualAmount +
              contributionAmountForFullMatch * periodsForPhase2) /
              (contributionAmountForFullMatch - maxPeriodContributionAmount),
          );

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

    // Relative index threshold for backload within phase 2:
    // r2 < periodsForPhase2 - numberOfMaxIndividualContributions - 1  → min
    // r2 == periodsForPhase2 - numberOfMaxIndividualContributions - 1 → special single
    // r2 > periodsForPhase2 - numberOfMaxIndividualContributions - 1  → max
    const specialRelativeIndex =
      periodsForPhase2 - numberOfMaxIndividualContributions - 1;

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

      // Default: min contribution
      individualContributionFraction =
        this.minIndividualContributionPercent / 100;
      individualContributionAmount = contributionAmountForFullMatch;

      const r = i - this.numberOfPayPeriodsSoFar;
      const inMBDPhase = prioritizeMBD && r < mbdPeriods;

      if (!inMBDPhase) {
        // phase 2 relative index within backload portion
        const r2 = r - mbdPeriods;
        if (r2 === specialRelativeIndex) {
          individualContributionFraction = singleContributionPercent / 100;
          individualContributionAmount = singleContributionAmount;
        } else if (r2 > specialRelativeIndex) {
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

      // after tax
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
}
