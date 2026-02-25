import { describe, it, expect } from "vitest";
import { RetirementTable } from "../retirement_table";
import { RetirementTableOptions, RetirementTableStrategy } from "../types";

/**
 * Test fixture — clean numbers chosen so all three strategies produce
 * integer dollar amounts that are easy to reason about:
 *
 *   salary=$60k, periods=24, max401k=$24000, maxContrib=90%, minContrib=0%
 *   payPerPeriod=$2500  maxPerPeriod=$2250  minPerPeriod=$0
 *
 *   Frontload: 10×$2250 + 1×$1500 + 13×$0        = $24000
 *   Equal:     24×$1000                            = $24000  (24000÷24 exact)
 *   Backload:  13×$0   + 1×$1500 + 10×$2250       = $24000
 */
function makeOptions(
  overrides: Partial<RetirementTableOptions> = {},
): RetirementTableOptions {
  return {
    salary: 60000,
    max401kIndividualAmount: 24000,
    max401kTotalAmount: 72000,
    numberOfPayPeriods: 24,
    numberOfPayPeriodsSoFar: 0,
    individualContributionAmountSoFar: 0,
    employerContributionAmountSoFar: 0,
    individualContributionAfterTaxAmountSoFar: 0,
    minIndividualContributionPercent: 0,
    maxContributionPercent: 90,
    employerMatchBasePercent: 0,
    employerMatchPercent: 0,
    employerMatchUpToPercent: 6,
    automaticallyCap401k: false,
    contributionStrategy: RetirementTableStrategy.FRONTLOAD,
    addExistingContributions: false,
    update401kLimits: false,
    showEmployerMatch: false,
    showMegaBackdoor: false,
    prioritizeMegaBackdoor: false,
    ...overrides,
  };
}

// Unicode row-key icons used by the table
const PASSED_ICON = "\u203E"; // overline  ‾
const NOT_REACHED_ICON = "\u2020"; // dagger  †
const EARLY_ICON = "\u2021"; // double dagger ‡

describe("RetirementTable", () => {
  // ─────────────────────────────────────────────────────────────────────────
  describe("Frontload strategy", () => {
    it("generates one row per pay period", () => {
      const t = new RetirementTable(makeOptions());
      expect(t.getTable()).toHaveLength(24);
    });

    it("periods 0–9 (10 periods) contribute max ($2250 each)", () => {
      const rows = new RetirementTable(makeOptions()).getTable();
      for (let i = 0; i < 10; i++) {
        expect(rows[i].contributionAmount).toBe(2250);
      }
    });

    it("period 10 is the single-bridging contribution ($1500)", () => {
      const rows = new RetirementTable(makeOptions()).getTable();
      expect(rows[10].contributionAmount).toBe(1500);
    });

    it("periods 11–23 contribute min ($0 each)", () => {
      const rows = new RetirementTable(makeOptions()).getTable();
      for (let i = 11; i < 24; i++) {
        expect(rows[i].contributionAmount).toBe(0);
      }
    });

    it("final cumulative individual amount equals max401k ($24000)", () => {
      const rows = new RetirementTable(makeOptions()).getTable();
      expect(rows[23].cumulativeIndividualAmount).toBe(24000);
    });

    it("no alert flags set in a clean scenario", () => {
      const t = new RetirementTable(makeOptions());
      expect(t.maxNotReached).toBe(false);
      expect(t.maxReachedEarly).toBe(false);
      expect(t.maxReachedWithAutomaticCap).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("Equal strategy", () => {
    const opts = () =>
      makeOptions({ contributionStrategy: RetirementTableStrategy.EQUAL });

    it("all 24 periods contribute equal amounts ($1000 each)", () => {
      const rows = new RetirementTable(opts()).getTable();
      for (const row of rows) {
        expect(row.contributionAmount).toBeCloseTo(1000, 5);
      }
    });

    it("final cumulative individual amount equals max401k ($24000)", () => {
      const rows = new RetirementTable(opts()).getTable();
      expect(rows[23].cumulativeIndividualAmount).toBeCloseTo(24000, 5);
    });

    it("no alert flags set in a clean scenario", () => {
      const t = new RetirementTable(opts());
      expect(t.maxNotReached).toBe(false);
      expect(t.maxReachedEarly).toBe(false);
      expect(t.maxReachedWithAutomaticCap).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("Backload strategy", () => {
    const opts = () =>
      makeOptions({ contributionStrategy: RetirementTableStrategy.BACKLOAD });

    it("periods 0–12 (13 periods) contribute min ($0 each)", () => {
      const rows = new RetirementTable(opts()).getTable();
      for (let i = 0; i < 13; i++) {
        expect(rows[i].contributionAmount).toBe(0);
      }
    });

    it("period 13 is the single-bridging contribution ($1500)", () => {
      const rows = new RetirementTable(opts()).getTable();
      expect(rows[13].contributionAmount).toBe(1500);
    });

    it("periods 14–23 (10 periods) contribute max ($2250 each)", () => {
      const rows = new RetirementTable(opts()).getTable();
      for (let i = 14; i < 24; i++) {
        expect(rows[i].contributionAmount).toBe(2250);
      }
    });

    it("final cumulative individual amount equals max401k ($24000)", () => {
      const rows = new RetirementTable(opts()).getTable();
      expect(rows[23].cumulativeIndividualAmount).toBe(24000);
    });

    it("no alert flags set in a clean scenario", () => {
      const t = new RetirementTable(opts());
      expect(t.maxNotReached).toBe(false);
      expect(t.maxReachedEarly).toBe(false);
      expect(t.maxReachedWithAutomaticCap).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("Passed pay periods", () => {
    // 3 periods already received; 3×$2250=$6750 already contributed (max frontload pace)
    const opts = () =>
      makeOptions({
        numberOfPayPeriodsSoFar: 3,
        individualContributionAmountSoFar: 6750,
      });

    it("periods 0–1 are marked as already-passed with $0 gross pay", () => {
      const rows = new RetirementTable(opts()).getTable();
      expect(rows[0].rowKey).toContain(PASSED_ICON);
      expect(rows[0].payPerPayPeriod).toBe(0);
      expect(rows[1].rowKey).toContain(PASSED_ICON);
      expect(rows[1].payPerPayPeriod).toBe(0);
    });

    it("period 2 (last already-passed period) shows the prior contributions", () => {
      const row = new RetirementTable(opts()).getTable()[2];
      expect(row.rowKey).toContain(PASSED_ICON);
      expect(row.contributionAmount).toBe(6750);
      expect(row.cumulativeIndividualAmount).toBe(6750);
    });

    it("periods 3–9 contribute max ($2250) — 7 remaining max periods", () => {
      const rows = new RetirementTable(opts()).getTable();
      for (let i = 3; i <= 9; i++) {
        expect(rows[i].contributionAmount).toBe(2250);
      }
    });

    it("final cumulative individual amount equals max401k ($24000)", () => {
      const rows = new RetirementTable(opts()).getTable();
      expect(rows[23].cumulativeIndividualAmount).toBe(24000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("Employer match", () => {
    // 50% match up to 6% of salary.
    // max period (90%): min(6, 90) × 50% × $2500 / 100 = $75
    // special period (60%): min(6, 60) × 50% × $2500 / 100 = $75
    // min period (0%): $0
    const opts = () =>
      makeOptions({ employerMatchPercent: 50, employerMatchUpToPercent: 6 });

    it("max-contribution periods (0–9) each receive $75 employer match", () => {
      const rows = new RetirementTable(opts()).getTable();
      for (let i = 0; i < 10; i++) {
        expect(rows[i].employerAmount).toBe(75);
      }
    });

    it("bridging period (10) also receives $75 employer match", () => {
      const rows = new RetirementTable(opts()).getTable();
      expect(rows[10].employerAmount).toBe(75);
    });

    it("min-contribution periods (11–23) receive $0 employer match", () => {
      const rows = new RetirementTable(opts()).getTable();
      for (let i = 11; i < 24; i++) {
        expect(rows[i].employerAmount).toBe(0);
      }
    });

    it("final cumulative employer amount is 11×$75 = $825", () => {
      const rows = new RetirementTable(opts()).getTable();
      expect(rows[23].cumulativeEmployerAmount).toBe(825);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("maxNotReached flag", () => {
    // max401k=$24001 — one dollar above the clean $24000 target.
    // The algorithm floors the bridging percent, producing $24000 < $24001,
    // and the final period contributes $0 (min) so the gap can never close.
    const opts = () => makeOptions({ max401kIndividualAmount: 24001 });

    it("sets maxNotReached = true", () => {
      expect(new RetirementTable(opts()).maxNotReached).toBe(true);
    });

    it("adds dagger icon (†) to the last row's key", () => {
      const rows = new RetirementTable(opts()).getTable();
      expect(rows[23].rowKey).toContain(NOT_REACHED_ICON);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("maxReachedEarly flag", () => {
    // salary=$600k → min contribution ($1500/period at 6%) fills max401k=$24000
    // in exactly 16 periods; period 16 (index) pushes past the limit.
    const opts = () =>
      makeOptions({
        salary: 600000,
        minIndividualContributionPercent: 6,
      });

    it("sets maxReachedEarly = true", () => {
      expect(new RetirementTable(opts()).maxReachedEarly).toBe(true);
    });

    it("adds double-dagger icon (‡) to the row where the limit is first breached", () => {
      const rows = new RetirementTable(opts()).getTable();
      expect(rows[16].rowKey).toContain(EARLY_ICON);
    });

    it("cumulative stays capped at max401k ($24000) from period 16 onward", () => {
      const rows = new RetirementTable(opts()).getTable();
      for (let i = 16; i < 24; i++) {
        expect(rows[i].cumulativeIndividualAmount).toBe(24000);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe("automaticallyCap401k", () => {
    // max401k=$24001 + autocap: last period should receive the $1 needed
    // to hit the max exactly, rather than contributing $0 (min).
    const opts = () =>
      makeOptions({
        max401kIndividualAmount: 24001,
        automaticallyCap401k: true,
      });

    it("sets maxReachedWithAutomaticCap = true", () => {
      expect(new RetirementTable(opts()).maxReachedWithAutomaticCap).toBe(true);
    });

    it("final cumulative individual amount hits max401k exactly ($24001)", () => {
      const rows = new RetirementTable(opts()).getTable();
      expect(rows[23].cumulativeIndividualAmount).toBe(24001);
    });
  });
});
