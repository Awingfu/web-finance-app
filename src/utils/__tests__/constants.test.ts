import { describe, it, expect, vi } from "vitest";
import {
  TAX_CLASSES,
  _IRA_roth_get_max_contribution,
  _IRA_maximum_contribution_individual,
  _IRA_maximum_contribution_individual_over50,
  _IRA_roth_phase_out_income_start_single,
  _IRA_roth_phase_out_income_limit_single,
  _IRA_roth_reduced_contribution_divisor_single,
  _IRA_roth_phase_out_income_start_married_joint,
  _IRA_roth_phase_out_income_limit_married_joint,
  _IRA_roth_reduced_contribution_divisor_married_joint,
  _IRA_roth_phase_out_income_limit_married_separate,
} from "../constants";

describe("_IRA_roth_get_max_contribution", () => {
  describe("age threshold", () => {
    it("age 49 uses the regular contribution limit", () => {
      expect(_IRA_roth_get_max_contribution(49, 0, TAX_CLASSES.SINGLE)).toBe(
        _IRA_maximum_contribution_individual,
      );
    });

    it("age 50 uses the catch-up contribution limit", () => {
      expect(_IRA_roth_get_max_contribution(50, 0, TAX_CLASSES.SINGLE)).toBe(
        _IRA_maximum_contribution_individual_over50,
      );
    });
  });

  // SINGLE and HEAD_OF_HOUSEHOLD share identical phase-out constants
  describe.each([[TAX_CLASSES.SINGLE], [TAX_CLASSES.HEAD_OF_HOUSEHOLD]])(
    "%s",
    (taxClass) => {
      it("income below phase-out start → full IRA max", () => {
        expect(
          _IRA_roth_get_max_contribution(
            30,
            _IRA_roth_phase_out_income_start_single - 1,
            taxClass,
          ),
        ).toBe(_IRA_maximum_contribution_individual);
      });

      it("income at exact phase-out start → full IRA max", () => {
        expect(
          _IRA_roth_get_max_contribution(
            30,
            _IRA_roth_phase_out_income_start_single,
            taxClass,
          ),
        ).toBe(_IRA_maximum_contribution_individual);
      });

      it("income at midpoint of phase-out range → ~50% of IRA max", () => {
        const midpoint =
          _IRA_roth_phase_out_income_start_single +
          _IRA_roth_reduced_contribution_divisor_single / 2;
        expect(
          _IRA_roth_get_max_contribution(30, midpoint, taxClass),
        ).toBeCloseTo(_IRA_maximum_contribution_individual / 2, 5);
      });

      it("income at exact phase-out limit → 0", () => {
        expect(
          _IRA_roth_get_max_contribution(
            30,
            _IRA_roth_phase_out_income_limit_single,
            taxClass,
          ),
        ).toBe(0);
      });

      it("income above phase-out limit → 0", () => {
        expect(
          _IRA_roth_get_max_contribution(
            30,
            _IRA_roth_phase_out_income_limit_single + 1,
            taxClass,
          ),
        ).toBe(0);
      });
    },
  );

  describe("Married Filing Jointly", () => {
    it("income below phase-out start → full IRA max", () => {
      expect(
        _IRA_roth_get_max_contribution(
          30,
          _IRA_roth_phase_out_income_start_married_joint - 1,
          TAX_CLASSES.MARRIED_FILING_JOINTLY,
        ),
      ).toBe(_IRA_maximum_contribution_individual);
    });

    it("income at midpoint of phase-out range → ~50% of IRA max", () => {
      const midpoint =
        _IRA_roth_phase_out_income_start_married_joint +
        _IRA_roth_reduced_contribution_divisor_married_joint / 2;
      expect(
        _IRA_roth_get_max_contribution(
          30,
          midpoint,
          TAX_CLASSES.MARRIED_FILING_JOINTLY,
        ),
      ).toBeCloseTo(_IRA_maximum_contribution_individual / 2, 5);
    });

    it("income above phase-out limit → 0", () => {
      expect(
        _IRA_roth_get_max_contribution(
          30,
          _IRA_roth_phase_out_income_limit_married_joint + 1,
          TAX_CLASSES.MARRIED_FILING_JOINTLY,
        ),
      ).toBe(0);
    });
  });

  describe("Married Filing Separately", () => {
    it("income of $0 → full IRA max (no phase-out start)", () => {
      expect(
        _IRA_roth_get_max_contribution(
          30,
          0,
          TAX_CLASSES.MARRIED_FILING_SEPARATELY,
        ),
      ).toBe(_IRA_maximum_contribution_individual);
    });

    it("income above limit → 0", () => {
      expect(
        _IRA_roth_get_max_contribution(
          30,
          _IRA_roth_phase_out_income_limit_married_separate + 1,
          TAX_CLASSES.MARRIED_FILING_SEPARATELY,
        ),
      ).toBe(0);
    });
  });

  describe("invalid tax class", () => {
    it("returns 0 and logs a warning", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      expect(_IRA_roth_get_max_contribution(30, 50000, "InvalidClass")).toBe(0);
      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });
  });
});
