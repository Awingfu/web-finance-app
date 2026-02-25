import { describe, it, expect } from "vitest";
import {
  calculateContributionFromPercentage,
  convertAnnualAmountToPaySchedule,
  calculateAnnualFromAmountAndFrequency,
  formatTaxRate,
  computePaycheck,
  PaycheckInputs,
} from "../paycheck_utils";
import { TAX_CLASSES, FREQUENCIES, PAY_SCHEDULE } from "../constants";

// ─── shared fixture ───────────────────────────────────────────────────────────

function makeInputs(overrides: Partial<PaycheckInputs> = {}): PaycheckInputs {
  return {
    salary: 60000,
    bonus: 0,
    bonusEligible: false,
    paySchedule: PAY_SCHEDULE.BIWEEKLY,
    taxClass: TAX_CLASSES.SINGLE,
    usState: "None",
    localTaxes: {},
    t401kContribution: 0,
    tIRAContribution: 0,
    medicalContribution: 0,
    medicalContributionFrequency: FREQUENCIES.PAYCHECK,
    commuterContribution: 0,
    commuterContributionFrequency: FREQUENCIES.PAYCHECK,
    hsaContribution: 0,
    hsaContributionFrequency: FREQUENCIES.PAYCHECK,
    otherPreTaxContribution: 0,
    otherPreTaxContributionFrequency: FREQUENCIES.PAYCHECK,
    r401kContribution: 0,
    at401kContribution: 0,
    rIRAContribution: 0,
    sppContribution: 0,
    otherPostTaxContribution: 0,
    otherPostTaxContributionFrequency: FREQUENCIES.PAYCHECK,
    ...overrides,
  };
}

// ─── math helpers ─────────────────────────────────────────────────────────────

describe("calculateContributionFromPercentage", () => {
  it("returns amount × pct/100", () => {
    expect(calculateContributionFromPercentage(60000, 5)).toBe(3000);
  });

  it("returns 0 when percentage is 0", () => {
    expect(calculateContributionFromPercentage(60000, 0)).toBe(0);
  });

  it("returns 0 when amount is 0", () => {
    expect(calculateContributionFromPercentage(0, 10)).toBe(0);
  });
});

describe("convertAnnualAmountToPaySchedule", () => {
  it("divides by 26 for biweekly", () => {
    expect(
      convertAnnualAmountToPaySchedule(60000, PAY_SCHEDULE.BIWEEKLY),
    ).toBeCloseTo(60000 / 26, 5);
  });

  it("divides by 24 for semimonthly", () => {
    expect(
      convertAnnualAmountToPaySchedule(60000, PAY_SCHEDULE.SEMIMONTHLY),
    ).toBeCloseTo(2500, 5);
  });

  it("divides by 12 for monthly", () => {
    expect(convertAnnualAmountToPaySchedule(60000, PAY_SCHEDULE.MONTHLY)).toBe(
      5000,
    );
  });
});

describe("calculateAnnualFromAmountAndFrequency", () => {
  it("monthly × 12 for MONTH frequency", () => {
    expect(
      calculateAnnualFromAmountAndFrequency(
        100,
        FREQUENCIES.MONTH,
        PAY_SCHEDULE.BIWEEKLY,
      ),
    ).toBe(1200);
  });

  it("paycheck × 26 for PAYCHECK frequency with biweekly schedule", () => {
    expect(
      calculateAnnualFromAmountAndFrequency(
        100,
        FREQUENCIES.PAYCHECK,
        PAY_SCHEDULE.BIWEEKLY,
      ),
    ).toBe(2600);
  });

  it("paycheck × 12 for PAYCHECK frequency with monthly schedule", () => {
    expect(
      calculateAnnualFromAmountAndFrequency(
        100,
        FREQUENCIES.PAYCHECK,
        PAY_SCHEDULE.MONTHLY,
      ),
    ).toBe(1200);
  });

  it("amount × 1 for ANNUM frequency", () => {
    expect(
      calculateAnnualFromAmountAndFrequency(
        5000,
        FREQUENCIES.ANNUM,
        PAY_SCHEDULE.BIWEEKLY,
      ),
    ).toBe(5000);
  });
});

describe("formatTaxRate", () => {
  it("formats 25% correctly", () => {
    expect(formatTaxRate(0.25)).toBe("25.00%");
  });

  it("formats 6.2% (FICA rate) correctly", () => {
    expect(formatTaxRate(0.062)).toBe("6.20%");
  });

  it("formats 0% correctly", () => {
    expect(formatTaxRate(0)).toBe("0.00%");
  });
});

// ─── computePaycheck ──────────────────────────────────────────────────────────

describe("computePaycheck", () => {
  // ── income ──────────────────────────────────────────────────────────────────

  describe("income", () => {
    it("totalCompensation_annual equals salary when bonus is 0", () => {
      const r = computePaycheck(makeInputs());
      expect(r.totalCompensation_annual).toBe(60000);
    });

    it("totalCompensation_annual equals salary when bonus exists but bonusEligible is false", () => {
      const r = computePaycheck(makeInputs({ bonus: 10000 }));
      expect(r.totalCompensation_annual).toBe(60000);
    });

    it("totalCompensation_annual includes bonus when bonusEligible is true", () => {
      const r = computePaycheck(
        makeInputs({ bonus: 10000, bonusEligible: true }),
      );
      expect(r.totalCompensation_annual).toBe(70000);
    });

    it("totalCompensation_paycheck = annual / 26 for biweekly", () => {
      const r = computePaycheck(makeInputs());
      expect(r.totalCompensation_paycheck).toBeCloseTo(60000 / 26, 5);
    });
  });

  // ── pre-tax deductions ───────────────────────────────────────────────────────

  describe("pre-tax deductions", () => {
    it("taxableIncome_annual = salary with no deductions and no bonus", () => {
      const r = computePaycheck(makeInputs());
      expect(r.taxableIncome_annual).toBe(60000);
    });

    it("non-eligible bonus is added to taxableIncome even though it did not affect totalCompensation", () => {
      const r = computePaycheck(
        makeInputs({ bonus: 5000, bonusEligible: false }),
      );
      expect(r.taxableIncome_annual).toBe(65000);
    });

    it("t401k at 10% reduces taxableIncome by 6000", () => {
      const r = computePaycheck(makeInputs({ t401kContribution: 10 }));
      expect(r.taxableIncome_annual).toBe(54000);
    });

    it("medical contribution (monthly) is annualised correctly and reduces taxableIncome", () => {
      // $200/month × 12 = $2400/year
      const r = computePaycheck(
        makeInputs({
          medicalContribution: 200,
          medicalContributionFrequency: FREQUENCIES.MONTH,
        }),
      );
      expect(r.preTaxTableMap["Medical Insurance"][0]).toBeCloseTo(2400, 5);
      expect(r.taxableIncome_annual).toBeCloseTo(60000 - 2400, 5);
    });

    it("taxableIncome_annual is clamped to 0 when deductions exceed income", () => {
      // t401k 60% + tIRA 60% = 120% of $60k → pre-tax sum exceeds salary
      const r = computePaycheck(
        makeInputs({ t401kContribution: 60, tIRAContribution: 60 }),
      );
      expect(r.taxableIncome_annual).toBe(0);
    });

    it("shouldRenderPreTaxDeductions is false when all contributions are 0", () => {
      const r = computePaycheck(makeInputs());
      expect(r.shouldRenderPreTaxDeductions).toBe(false);
    });

    it("shouldRenderPreTaxDeductions is true when any pre-tax contribution > 0", () => {
      const r = computePaycheck(makeInputs({ t401kContribution: 5 }));
      expect(r.shouldRenderPreTaxDeductions).toBe(true);
    });

    it("preTaxTableMap contains all six expected keys", () => {
      const r = computePaycheck(makeInputs());
      expect(Object.keys(r.preTaxTableMap)).toEqual([
        "Traditional 401k",
        "Traditional IRA",
        "Medical Insurance",
        "Commuter Benefits",
        "HSA/FSA",
        "Other Pre-Tax",
      ]);
    });
  });

  // ── Social Security / FICA ───────────────────────────────────────────────────

  describe("Social Security", () => {
    it("is not maxed for salary below the wage base ($60k)", () => {
      const r = computePaycheck(makeInputs());
      expect(r.isSocialSecurityMaxed).toBe(false);
      expect(r.socialSecurity_key).toBe("Social Security");
    });

    it("is maxed when gross income reaches the FICA wage base ($184,500)", () => {
      const r = computePaycheck(makeInputs({ salary: 184500 }));
      expect(r.isSocialSecurityMaxed).toBe(true);
    });

    it("key includes the dagger icon when maxed", () => {
      const r = computePaycheck(makeInputs({ salary: 184500 }));
      expect(r.socialSecurity_key).toContain("\u2020");
    });

    it("maxed note mentions 'maximum Social Security tax'", () => {
      const r = computePaycheck(makeInputs({ salary: 184500 }));
      expect(r.socialSecurityMaxedNote).toContain(
        "maximum Social Security tax",
      );
    });

    it("socialSecurityMaxedIcon is the dagger character", () => {
      const r = computePaycheck(makeInputs());
      expect(r.socialSecurityMaxedIcon).toBe("\u2020");
    });
  });

  // ── state ────────────────────────────────────────────────────────────────────

  describe("state flags", () => {
    it("stateIsUnknown is false for 'None'", () => {
      const r = computePaycheck(makeInputs({ usState: "None" }));
      expect(r.stateIsUnknown).toBe(false);
    });

    it("stateIsEstimate is false for 'None' (no-state selection)", () => {
      const r = computePaycheck(makeInputs({ usState: "None" }));
      expect(r.stateIsEstimate).toBe(false);
    });

    it("stateIsUnknown is true for a territory with no withholding data (GU)", () => {
      const r = computePaycheck(makeInputs({ usState: "GU" }));
      expect(r.stateIsUnknown).toBe(true);
    });

    it("stateIsEstimate is false when state is unknown", () => {
      const r = computePaycheck(makeInputs({ usState: "GU" }));
      expect(r.stateIsEstimate).toBe(false);
    });

    it("stateIsEstimate is true for a state with known tax data (FL)", () => {
      const r = computePaycheck(makeInputs({ usState: "FL" }));
      expect(r.stateIsEstimate).toBe(true);
    });

    it("stateEstimateIcon is an asterisk", () => {
      const r = computePaycheck(makeInputs());
      expect(r.stateEstimateIcon).toBe("*");
    });

    it("taxTableMap state key includes asterisk when stateIsEstimate", () => {
      const r = computePaycheck(makeInputs({ usState: "FL" }));
      const keys = Object.keys(r.taxTableMap);
      expect(keys.some((k) => k.includes("*"))).toBe(true);
    });

    it("taxTableMap state entry has no rates object when state is unknown", () => {
      const r = computePaycheck(makeInputs({ usState: "GU" }));
      const stateEntry = Object.values(r.taxTableMap).find((_, i) => {
        return Object.keys(r.taxTableMap)[i].includes("GU");
      });
      expect(stateEntry?.[2]).toBeUndefined();
    });
  });

  // ── local taxes ──────────────────────────────────────────────────────────────

  describe("localTaxKeys", () => {
    it("is empty for 'None'", () => {
      const r = computePaycheck(makeInputs({ usState: "None" }));
      expect(r.localTaxKeys).toEqual([]);
    });

    it("is populated for states that have local taxes (PA)", () => {
      const r = computePaycheck(makeInputs({ usState: "PA" }));
      expect(r.localTaxKeys.length).toBeGreaterThan(0);
    });

    it("local tax withholding appears in taxTableMap when opted in", () => {
      const phillyKey = "PHILADELPHIA";
      const r = computePaycheck(
        makeInputs({ usState: "PA", localTaxes: { [phillyKey]: true } }),
      );
      const keys = Object.keys(r.taxTableMap);
      expect(keys.some((k) => k.includes("Philadelphia"))).toBe(true);
    });

    it("no local tax withholding in taxTableMap when not opted in", () => {
      const r = computePaycheck(makeInputs({ usState: "PA", localTaxes: {} }));
      const keys = Object.keys(r.taxTableMap);
      expect(keys.some((k) => k.includes("Philadelphia"))).toBe(false);
    });
  });

  // ── net pay ──────────────────────────────────────────────────────────────────

  describe("net pay", () => {
    it("netPay is less than taxableIncome due to federal tax", () => {
      const r = computePaycheck(makeInputs());
      expect(r.netPay_annual).toBeLessThan(r.taxableIncome_annual);
    });

    it("netPay_paycheck ≈ netPay_annual / 26 for biweekly", () => {
      const r = computePaycheck(makeInputs());
      expect(r.netPay_paycheck).toBeCloseTo(r.netPay_annual / 26, 5);
    });
  });

  // ── post-tax deductions ──────────────────────────────────────────────────────

  describe("post-tax deductions", () => {
    it("shouldRenderPostTaxDeductions is false when all post-tax contributions are 0", () => {
      const r = computePaycheck(makeInputs());
      expect(r.shouldRenderPostTaxDeductions).toBe(false);
    });

    it("shouldRenderPostTaxDeductions is true when any post-tax contribution > 0", () => {
      const r = computePaycheck(makeInputs({ r401kContribution: 5 }));
      expect(r.shouldRenderPostTaxDeductions).toBe(true);
    });

    it("Roth 401k 5% reduces takeHomePay by 3000 annually", () => {
      const base = computePaycheck(makeInputs());
      const withRoth = computePaycheck(makeInputs({ r401kContribution: 5 }));
      expect(base.takeHomePay_annual - withRoth.takeHomePay_annual).toBeCloseTo(
        3000,
        5,
      );
    });

    it("postTaxTableMap contains all five expected keys", () => {
      const r = computePaycheck(makeInputs());
      expect(Object.keys(r.postTaxTableMap)).toEqual([
        "Roth 401k",
        "After Tax 401k",
        "Roth IRA",
        "Stock Purchase Plan",
        "Other Post-Tax",
      ]);
    });

    it("takeHomePay_annual equals netPay_annual when no post-tax contributions", () => {
      const r = computePaycheck(makeInputs());
      expect(r.takeHomePay_annual).toBe(r.netPay_annual);
    });

    it("takeHomePay_paycheck ≈ takeHomePay_annual / 26 for biweekly", () => {
      const r = computePaycheck(makeInputs({ r401kContribution: 5 }));
      expect(r.takeHomePay_paycheck).toBeCloseTo(r.takeHomePay_annual / 26, 5);
    });
  });
});
