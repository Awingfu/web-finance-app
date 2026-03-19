import { useState, useMemo } from "react";
import { Alert, Form, InputGroup } from "react-bootstrap";
import { Header, Footer, TooltipOnHover } from "../../src/components";
import { formatCurrency, formatStateValue } from "../../src/utils";
import {
  _401k_maximum_contribution_individual as K401_BASE,
  _401k_maximum_contribution_individual_over50 as K401_CATCHUP,
  _IRA_maximum_contribution_individual as IRA_BASE,
  _IRA_maximum_contribution_individual_over50 as IRA_CATCHUP,
  maximum_HSA_contribution as HSA_SINGLE,
  maximum_HSA_contribution_family as HSA_FAMILY,
} from "../../src/utils/constants";
import retirementStyles from "../../styles/Retirement.module.scss";
import shared from "../../styles/shared.module.scss";
import styles from "../../styles/MoneyFlow.module.scss";

// ─── Other limits ─────────────────────────────────────────────────────────────

const STARTER_EF = 1000;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ─── Step Colors ──────────────────────────────────────────────────────────────

const STEP_COLORS = [
  "#e67e22", // 1 — orange (starter EF)
  "#27ae60", // 2 — green (free money)
  "#e74c3c", // 3 — red (high-interest debt)
  "#f39c12", // 4 — amber (full EF)
  "#3498db", // 5 — blue (HSA)
  "#9b59b6", // 6 — purple (IRA)
  "#2980b9", // 7 — dark blue (401k)
  "#c0392b", // 8 — dark red (medium debt)
  "#1abc9c", // 9 — teal (investing)
];

// ─── Step Definitions ─────────────────────────────────────────────────────────

interface StepDef {
  title: string;
  subtitle: string;
  why: string;
  skippable: boolean;
  consumesAll: boolean; // takes all remaining surplus vs a fixed monthly amount
  neverDone: boolean;
}

const STEP_DEFS: StepDef[] = [
  {
    title: "Build a Starter Emergency Fund",
    subtitle: "First $1,000 — your financial safety net",
    why: "One small unexpected expense shouldn't push you into high-interest debt. $1,000 covers most minor emergencies while you work on the rest of the plan.",
    skippable: false,
    consumesAll: false,
    neverDone: false,
  },
  {
    title: "Contribute to 401k up to Employer Match",
    subtitle: "Free money — an instant 50–100% return",
    why: "An employer match is an immediate guaranteed return. There is no investment that competes with it. Always capture the full match before anything else.",
    skippable: true,
    consumesAll: false,
    neverDone: false,
  },
  {
    title: "Pay Off High-Interest Debt",
    subtitle: "Credit cards, payday loans — above ~7% APR",
    why: "High-interest debt costs more than markets reliably return. Paying off a 20% APR card is equivalent to a guaranteed 20% risk-free investment.",
    skippable: false,
    consumesAll: true,
    neverDone: false,
  },
  {
    title: "Build a Full Emergency Fund",
    subtitle: "3–6 months of essential expenses",
    why: "A full cushion lets you survive job loss or major expenses without derailing your finances or going into debt. Choose 6 months if your income is variable.",
    skippable: false,
    consumesAll: true,
    neverDone: false,
  },
  {
    title: "Max Your HSA",
    subtitle: "Triple tax advantage — the best account available",
    why: "HSA contributions are tax-deductible, grow tax-free, and withdraw tax-free for medical expenses. Invest the balance and reimburse yourself years later.",
    skippable: true,
    consumesAll: false,
    neverDone: false,
  },
  {
    title: "Max Your IRA",
    subtitle: "Roth (or Traditional if income limits apply)",
    why: "An IRA gives you more investment choices and lower fees than most 401k plans, with the same tax-advantaged compounding. Roth grows and withdraws tax-free.",
    skippable: false,
    consumesAll: false,
    neverDone: false,
  },
  {
    title: "Max Your 401k",
    subtitle: "Fill the full annual limit, beyond the match",
    why: "After maxing your IRA, go back to max the 401k. More tax-advantaged space, despite higher fees and fewer fund choices.",
    skippable: false,
    consumesAll: false,
    neverDone: false,
  },
  {
    title: "Pay Off Medium-Interest Debt",
    subtitle: "Student loans, auto loans — 4–7% APR",
    why: "At these rates, the math is close to market returns. Many people pay this off for the guaranteed return and peace of mind.",
    skippable: false,
    consumesAll: true,
    neverDone: false,
  },
  {
    title: "Invest & Save for Goals",
    subtitle: "Taxable brokerage, down payment, low-interest debt",
    why: "With all higher priorities covered, invest in a taxable brokerage for long-term wealth, save for a home, or pay down low-interest debt (mortgage, loans < 4%).",
    skippable: false,
    consumesAll: true,
    neverDone: true,
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface MoneyFlowInputs {
  currentMonth: number; // 1–12
  monthlyTakeHome: number;
  monthlyExpenses: number;
  emergencyFundBalance: number;
  emergencyFundTargetMonths: 3 | 6;
  has401kMatch: boolean;
  annualSalary: number;
  matchUpToPercent: number;
  currentContribPercent: number;
  highInterestDebtBalance: number;
  mediumInterestDebtBalance: number;
  hsaEligible: boolean;
  hsaCoverage: "single" | "family";
  hsaContributedThisYear: number;
  iraContributedThisYear: number;
  k401ContributedThisYear: number;
  age50Plus: boolean;
}

type StepStatus = "done" | "current" | "future" | "skipped";

interface StepResult {
  status: StepStatus;
  allocation: number;
  progressPct: number | null;
  progressLabel: string | null;
  monthsToComplete: number | null;
  limitLabel: string | null;
  isAnnualCapped: boolean; // HSA, IRA, 401k — limited by calendar year
}

interface ComputeResult {
  surplus: number;
  stepResults: StepResult[];
  currentStepIndex: number | null; // index 0–8, null if all done or negative surplus
  allDone: boolean;
  negativeSurplus: boolean;
  monthsRemaining: number; // months left in the calendar year
}

// ─── Compute ──────────────────────────────────────────────────────────────────

function compute(inputs: MoneyFlowInputs): ComputeResult {
  const {
    currentMonth,
    monthlyTakeHome,
    monthlyExpenses,
    emergencyFundBalance,
    emergencyFundTargetMonths,
    has401kMatch,
    annualSalary,
    matchUpToPercent,
    currentContribPercent,
    highInterestDebtBalance,
    mediumInterestDebtBalance,
    hsaEligible,
    hsaCoverage,
    hsaContributedThisYear,
    iraContributedThisYear,
    k401ContributedThisYear,
    age50Plus,
  } = inputs;

  const surplus = monthlyTakeHome - monthlyExpenses;
  const negativeSurplus = surplus <= 0;
  const monthsRemaining = Math.max(1, 13 - currentMonth);

  const iraLimit = age50Plus ? IRA_CATCHUP : IRA_BASE;
  const k401Limit = age50Plus ? K401_CATCHUP : K401_BASE;
  const hsaLimit = hsaCoverage === "family" ? HSA_FAMILY : HSA_SINGLE;
  const efTarget = emergencyFundTargetMonths * monthlyExpenses;

  // Monthly amounts needed for capped contribution steps
  const step1Need = Math.max(0, STARTER_EF - emergencyFundBalance);
  const step2Need = has401kMatch
    ? Math.max(
        0,
        (((matchUpToPercent - currentContribPercent) / 100) * annualSalary) /
          12,
      )
    : 0;
  const step5Need = hsaEligible
    ? Math.max(0, hsaLimit - hsaContributedThisYear) / monthsRemaining
    : 0;
  const step6Need =
    Math.max(0, iraLimit - iraContributedThisYear) / monthsRemaining;
  const step7Need =
    Math.max(0, k401Limit - k401ContributedThisYear) / monthsRemaining;

  // Limit labels
  const limitLabels: (string | null)[] = [
    `Target: ${formatCurrency(STARTER_EF)}`,
    has401kMatch
      ? `Up to ${matchUpToPercent}% of salary · ${formatCurrency((matchUpToPercent / 100) * annualSalary)} / yr`
      : null,
    null,
    `Target: ${formatCurrency(efTarget)} (${emergencyFundTargetMonths} months)`,
    hsaEligible
      ? `2026 limit: ${formatCurrency(hsaLimit)} (${hsaCoverage})`
      : null,
    `2026 limit: ${formatCurrency(iraLimit)}${age50Plus ? " (50+ catch-up)" : ""}`,
    `2026 limit: ${formatCurrency(k401Limit)}${age50Plus ? " (50+ catch-up)" : ""}`,
    null,
    null,
  ];

  // Done conditions
  const doneFlags = [
    emergencyFundBalance >= STARTER_EF,
    !has401kMatch || currentContribPercent >= matchUpToPercent,
    highInterestDebtBalance <= 0,
    emergencyFundBalance >= efTarget,
    !hsaEligible || hsaContributedThisYear >= hsaLimit,
    iraContributedThisYear >= iraLimit,
    k401ContributedThisYear >= k401Limit,
    mediumInterestDebtBalance <= 0,
    false, // step 9 never done
  ];

  const skippedFlags = [
    false,
    !has401kMatch,
    false,
    false,
    !hsaEligible,
    false,
    false,
    false,
    false,
  ];

  // Progress
  const progressData: { pct: number | null; label: string | null }[] = [
    {
      pct: Math.min(100, (emergencyFundBalance / STARTER_EF) * 100),
      label: `${formatCurrency(emergencyFundBalance)} / ${formatCurrency(STARTER_EF)}`,
    },
    {
      pct:
        has401kMatch && matchUpToPercent > 0
          ? Math.min(100, (currentContribPercent / matchUpToPercent) * 100)
          : null,
      label: has401kMatch
        ? `Contributing ${currentContribPercent}% of ${matchUpToPercent}% available match`
        : null,
    },
    {
      pct: null,
      label:
        highInterestDebtBalance > 0
          ? `${formatCurrency(highInterestDebtBalance)} remaining`
          : null,
    },
    {
      pct:
        efTarget > 0
          ? Math.min(100, (emergencyFundBalance / efTarget) * 100)
          : 100,
      label: `${formatCurrency(emergencyFundBalance)} / ${formatCurrency(efTarget)}`,
    },
    {
      pct:
        hsaEligible && hsaLimit > 0
          ? Math.min(100, (hsaContributedThisYear / hsaLimit) * 100)
          : null,
      label: hsaEligible
        ? `${formatCurrency(hsaContributedThisYear)} / ${formatCurrency(hsaLimit)}`
        : null,
    },
    {
      pct:
        iraLimit > 0
          ? Math.min(100, (iraContributedThisYear / iraLimit) * 100)
          : 100,
      label: `${formatCurrency(iraContributedThisYear)} / ${formatCurrency(iraLimit)}`,
    },
    {
      pct:
        k401Limit > 0
          ? Math.min(100, (k401ContributedThisYear / k401Limit) * 100)
          : 100,
      label: `${formatCurrency(k401ContributedThisYear)} / ${formatCurrency(k401Limit)}`,
    },
    {
      pct: null,
      label:
        mediumInterestDebtBalance > 0
          ? `${formatCurrency(mediumInterestDebtBalance)} remaining`
          : null,
    },
    { pct: null, label: null },
  ];

  // Monthly need per step (0 = consumesAll or done)
  const monthlyNeeds = [
    step1Need,
    step2Need,
    0,
    0,
    step5Need,
    step6Need,
    step7Need,
    0,
    0,
  ];

  // Walk and allocate
  let remaining = Math.max(0, surplus);
  let currentStepIndex: number | null = null;
  const allocations = new Array<number>(9).fill(0);

  for (let i = 0; i < 9; i++) {
    if (remaining <= 0) break;
    if (doneFlags[i] || skippedFlags[i]) continue;

    if (currentStepIndex === null) currentStepIndex = i;

    const def = STEP_DEFS[i];
    let alloc: number;
    if (def.consumesAll) {
      alloc = remaining;
      remaining = 0;
    } else {
      alloc = Math.min(remaining, monthlyNeeds[i]);
      remaining -= alloc;
    }
    allocations[i] = Math.round(alloc * 100) / 100;
  }

  const allDone = currentStepIndex === null && !negativeSurplus;

  // Build step results
  const stepResults: StepResult[] = STEP_DEFS.map((_, i) => {
    let status: StepStatus;
    if (skippedFlags[i]) status = "skipped";
    else if (doneFlags[i]) status = "done";
    else if (i === currentStepIndex) status = "current";
    else status = "future";

    const allocation = allocations[i];
    const { pct, label } = progressData[i];

    // months to complete
    const isAnnualCapped = i === 4 || i === 5 || i === 6;
    let monthsToComplete: number | null = null;
    if (!doneFlags[i] && !skippedFlags[i] && allocation > 0) {
      if (i === 0) monthsToComplete = Math.ceil(step1Need / allocation);
      else if (i === 2 && highInterestDebtBalance > 0)
        monthsToComplete = Math.ceil(highInterestDebtBalance / allocation);
      else if (i === 3) {
        const rem = Math.max(0, efTarget - emergencyFundBalance);
        if (rem > 0) monthsToComplete = Math.ceil(rem / allocation);
      } else if (i === 4 && step5Need > 0)
        monthsToComplete = Math.ceil(
          (step5Need * monthsRemaining) / allocation,
        );
      else if (i === 5 && step6Need > 0)
        monthsToComplete = Math.ceil(
          (step6Need * monthsRemaining) / allocation,
        );
      else if (i === 6 && step7Need > 0)
        monthsToComplete = Math.ceil(
          (step7Need * monthsRemaining) / allocation,
        );
      else if (i === 7 && mediumInterestDebtBalance > 0)
        monthsToComplete = Math.ceil(mediumInterestDebtBalance / allocation);
    }

    return {
      status,
      allocation,
      progressPct: pct,
      progressLabel: label,
      monthsToComplete,
      limitLabel: limitLabels[i],
      isAnnualCapped,
    };
  });

  return {
    surplus,
    stepResults,
    currentStepIndex,
    allDone,
    negativeSurplus,
    monthsRemaining,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMonths(n: number): string {
  if (n <= 1) return "~1 month";
  if (n < 24) return `~${Math.round(n)} months`;
  return `~${(n / 12).toFixed(1)} yrs`;
}

// ─── StepCard ─────────────────────────────────────────────────────────────────

interface StepCardProps {
  idx: number;
  def: StepDef;
  result: StepResult;
  isLast: boolean;
  monthsRemaining: number;
}

function StepCard({
  idx,
  def,
  result,
  isLast,
  monthsRemaining,
}: StepCardProps) {
  const {
    status,
    allocation,
    progressPct,
    progressLabel,
    monthsToComplete,
    limitLabel,
    isAnnualCapped,
  } = result;
  const color = STEP_COLORS[idx];
  const isDimmed = status === "future" && allocation === 0;

  const circleClass =
    status === "done"
      ? styles.circleDone
      : status === "current"
        ? styles.circleCurrent
        : status === "skipped"
          ? styles.circleSkipped
          : styles.circleFuture;

  const allocationText = (() => {
    if (allocation <= 0 || status === "done" || status === "skipped")
      return null;
    if (idx === 1)
      return `Redirect ${formatCurrency(allocation)}/mo to 401k to capture match`;
    if (idx === 8) return `${formatCurrency(allocation)}/mo → ongoing`;
    if (isAnnualCapped && monthsToComplete !== null) {
      const canMax = monthsToComplete <= monthsRemaining;
      return canMax
        ? `${formatCurrency(allocation)}/mo · on track to max by year-end`
        : `${formatCurrency(allocation)}/mo · won't max this year at this rate`;
    }
    const base = `${formatCurrency(allocation)}/mo allocated`;
    return monthsToComplete
      ? `${base} · ${fmtMonths(monthsToComplete)} to complete`
      : base;
  })();

  return (
    <div className={styles.stepRow}>
      <div className={styles.stepLeft}>
        <div
          className={`${styles.stepCircle} ${circleClass}`}
          style={{ borderColor: color }}
        >
          {status === "done" ? "✓" : status === "skipped" ? "–" : idx + 1}
        </div>
        {!isLast && <div className={styles.stepLine} />}
      </div>

      <div
        className={`${styles.stepContent} ${isDimmed ? styles.isDimmed : ""}`}
      >
        <div className={styles.stepHeader}>
          <div className={styles.stepTitle}>{def.title}</div>
          {status === "done" && (
            <span className={`${styles.badge} ${styles.badgeDone}`}>
              ✓ Done
            </span>
          )}
          {status === "current" && (
            <span className={`${styles.badge} ${styles.badgeCurrent}`}>
              → Next
            </span>
          )}
          {status === "skipped" && (
            <span className={`${styles.badge} ${styles.badgeSkipped}`}>
              N/A
            </span>
          )}
        </div>

        <div className={styles.stepSubtitle}>{def.subtitle}</div>
        <p className={styles.stepWhy}>{def.why}</p>

        {progressPct !== null && status !== "skipped" && (
          <>
            <div className={styles.progressWrap}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: status === "done" ? "#2ecc71" : color,
                }}
              />
            </div>
            {progressLabel && (
              <div className={styles.progressLabel}>{progressLabel}</div>
            )}
          </>
        )}

        {status === "skipped" && progressLabel && (
          <div className={styles.progressLabel}>{progressLabel}</div>
        )}

        {limitLabel && <div className={styles.stepLimit}>{limitLabel}</div>}

        {allocationText && (
          <div className={styles.allocationLine}>{allocationText}</div>
        )}
      </div>
    </div>
  );
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_INPUTS: MoneyFlowInputs = {
  currentMonth: new Date().getMonth() + 1,
  monthlyTakeHome: 5000,
  monthlyExpenses: 3500,
  emergencyFundBalance: 500,
  emergencyFundTargetMonths: 3,
  has401kMatch: true,
  annualSalary: 80000,
  matchUpToPercent: 6,
  currentContribPercent: 0,
  highInterestDebtBalance: 0,
  mediumInterestDebtBalance: 0,
  hsaEligible: false,
  hsaCoverage: "single",
  hsaContributedThisYear: 0,
  iraContributedThisYear: 0,
  k401ContributedThisYear: 0,
  age50Plus: false,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MoneyFlow() {
  const [inputs, setInputs] = useState<MoneyFlowInputs>(DEFAULT_INPUTS);

  const setField = <K extends keyof MoneyFlowInputs>(
    k: K,
    v: MoneyFlowInputs[K],
  ) => setInputs((prev) => ({ ...prev, [k]: v }));

  const clamp = (v: number, min: number, max: number) =>
    isNaN(v) ? min : Math.min(max, Math.max(min, v));

  const result = useMemo(() => compute(inputs), [inputs]);
  const {
    surplus,
    stepResults,
    currentStepIndex,
    allDone,
    negativeSurplus,
    monthsRemaining,
  } = result;

  const currentStep =
    currentStepIndex !== null ? STEP_DEFS[currentStepIndex] : null;

  return (
    <div className={retirementStyles.container}>
      <Header titleName="Where Should My Money Go?" />

      <main className={retirementStyles.main}>
        <h1>Where Should My Money Go?</h1>
        <p>
          The Reddit r/personalfinance &ldquo;Prime Directive&rdquo; — a
          priority order for every dollar of surplus income. Enter your
          situation and see exactly where your next dollar should go, and how
          long each step will take.
        </p>
      </main>

      <div className={retirementStyles.content}>
        {/* ── FORM ──────────────────────────────────────────────────────────── */}
        <Form className={retirementStyles.form}>
          <p className={shared.sectionLabel}>Income & Budget</p>

          <div className={shared.threeCol}>
            <div className={shared.col}>
              <Form.Label>Current Month</Form.Label>
              <TooltipOnHover
                text="Used to calculate how many months remain in the year for annual contribution limits (HSA, IRA, 401k)."
                nest={
                  <Form.Select
                    className="mb-3"
                    value={inputs.currentMonth}
                    onChange={(e) =>
                      setField("currentMonth", parseInt(e.target.value))
                    }
                  >
                    {MONTH_NAMES.map((name, i) => (
                      <option key={i + 1} value={i + 1}>
                        {name} ({13 - (i + 1)} mo left)
                      </option>
                    ))}
                  </Form.Select>
                }
              />
            </div>
            <div className={shared.col}>
              <Form.Label>Monthly Take-Home Pay</Form.Label>
              <TooltipOnHover
                text="Your monthly income after taxes and any pre-tax deductions (e.g., current 401k contributions already being taken out)."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(inputs.monthlyTakeHome)}
                      onChange={(e) =>
                        setField(
                          "monthlyTakeHome",
                          clamp(parseFloat(e.target.value), 0, 1_000_000),
                        )
                      }
                    />
                  </InputGroup>
                }
              />
            </div>
            <div className={shared.col}>
              <Form.Label>Monthly Essential Expenses</Form.Label>
              <TooltipOnHover
                text="Rent/mortgage, food, utilities, transportation, insurance, and minimum debt payments. Exclude discretionary spending."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(inputs.monthlyExpenses)}
                      onChange={(e) =>
                        setField(
                          "monthlyExpenses",
                          clamp(parseFloat(e.target.value), 0, 1_000_000),
                        )
                      }
                    />
                  </InputGroup>
                }
              />
            </div>
          </div>
          <p className={shared.rateHint}>
            Monthly surplus:{" "}
            <strong
              style={{
                color:
                  surplus > 0 ? "#2ecc71" : surplus < 0 ? "#e74c3c" : undefined,
              }}
            >
              {surplus >= 0
                ? formatCurrency(surplus)
                : `−${formatCurrency(-surplus)}`}
            </strong>
          </p>

          <Form.Check
            type="switch"
            id="age-50"
            label="I am age 50 or older (catch-up contribution limits)"
            checked={inputs.age50Plus}
            onChange={(e) => setField("age50Plus", e.target.checked)}
            className="mb-3"
          />

          <p className={shared.sectionLabel}>Emergency Fund</p>

          <div className={shared.twoCol}>
            <div className={shared.col}>
              <Form.Label>Full Emergency Fund Target</Form.Label>
              <Form.Select
                className="mb-3"
                value={inputs.emergencyFundTargetMonths}
                onChange={(e) =>
                  setField(
                    "emergencyFundTargetMonths",
                    parseInt(e.target.value) as 3 | 6,
                  )
                }
              >
                <option value={3}>
                  3 months ({formatCurrency(inputs.monthlyExpenses * 3)})
                </option>
                <option value={6}>
                  6 months ({formatCurrency(inputs.monthlyExpenses * 6)})
                </option>
              </Form.Select>
            </div>
            <div className={shared.col}>
              <Form.Label>Current Balance</Form.Label>
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.emergencyFundBalance)}
                  onChange={(e) =>
                    setField(
                      "emergencyFundBalance",
                      clamp(parseFloat(e.target.value), 0, 10_000_000),
                    )
                  }
                />
              </InputGroup>
            </div>
          </div>

          <p className={shared.sectionLabel}>Employer 401k Match</p>

          <Form.Check
            type="switch"
            id="has-match"
            label="My employer offers a 401k match"
            checked={inputs.has401kMatch}
            onChange={(e) => setField("has401kMatch", e.target.checked)}
            className="mb-2"
          />

          {inputs.has401kMatch && (
            <div className={styles.conditionalSection}>
              <Form.Label>Base Salary + 401k Eligible Bonus</Form.Label>
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.annualSalary)}
                  onChange={(e) =>
                    setField(
                      "annualSalary",
                      clamp(parseFloat(e.target.value), 0, 10_000_000),
                    )
                  }
                />
              </InputGroup>

              <div className={shared.twoCol}>
                <div className={shared.col}>
                  <Form.Label>Match up to</Form.Label>
                  <TooltipOnHover
                    text="The maximum % of your salary the employer will match. E.g., '6%' means they match up to 6% of your salary."
                    nest={
                      <InputGroup className="mb-3 w-100">
                        <Form.Control
                          type="number"
                          onWheel={(e) => e.currentTarget.blur()}
                          value={formatStateValue(inputs.matchUpToPercent)}
                          onChange={(e) =>
                            setField(
                              "matchUpToPercent",
                              clamp(parseFloat(e.target.value), 0, 100),
                            )
                          }
                        />
                        <InputGroup.Text>% of salary</InputGroup.Text>
                      </InputGroup>
                    }
                  />
                </div>
                <div className={shared.col}>
                  <Form.Label>Currently contributing</Form.Label>
                  <InputGroup className="mb-3 w-100">
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(inputs.currentContribPercent)}
                      onChange={(e) =>
                        setField(
                          "currentContribPercent",
                          clamp(parseFloat(e.target.value), 0, 100),
                        )
                      }
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                </div>
              </div>
            </div>
          )}

          <p className={shared.sectionLabel}>Medium to High Interest Debt</p>

          <div className={shared.twoCol}>
            <div className={shared.col}>
              <Form.Label>High-Interest Debt (&gt;7% APR)</Form.Label>
              <TooltipOnHover
                text="Credit cards, payday loans, and personal loans above ~7% APR. Do not include your mortgage."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(inputs.highInterestDebtBalance)}
                      onChange={(e) =>
                        setField(
                          "highInterestDebtBalance",
                          clamp(parseFloat(e.target.value), 0, 10_000_000),
                        )
                      }
                    />
                  </InputGroup>
                }
              />
            </div>
            <div className={shared.col}>
              <Form.Label>Medium-Interest Debt (4–7% APR)</Form.Label>
              <TooltipOnHover
                text="Student loans, auto loans, and personal loans between 4–7% APR."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(inputs.mediumInterestDebtBalance)}
                      onChange={(e) =>
                        setField(
                          "mediumInterestDebtBalance",
                          clamp(parseFloat(e.target.value), 0, 10_000_000),
                        )
                      }
                    />
                  </InputGroup>
                }
              />
            </div>
          </div>

          <p className={shared.sectionLabel}>HSA</p>

          <Form.Check
            type="switch"
            id="hsa-eligible"
            label="I'm enrolled in an HSA-eligible health plan"
            checked={inputs.hsaEligible}
            onChange={(e) => setField("hsaEligible", e.target.checked)}
            className="mb-2"
          />

          {inputs.hsaEligible && (
            <div className={styles.conditionalSection}>
              <div className={shared.twoCol}>
                <div className={shared.col}>
                  <Form.Label>Coverage</Form.Label>
                  <Form.Select
                    className="mb-3"
                    value={inputs.hsaCoverage}
                    onChange={(e) =>
                      setField(
                        "hsaCoverage",
                        e.target.value as "single" | "family",
                      )
                    }
                  >
                    <option value="single">
                      Single ({formatCurrency(HSA_SINGLE)})
                    </option>
                    <option value="family">
                      Family ({formatCurrency(HSA_FAMILY)})
                    </option>
                  </Form.Select>
                </div>
                <div className={shared.col}>
                  <Form.Label>Contributed this year</Form.Label>
                  <InputGroup className="mb-3 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(inputs.hsaContributedThisYear)}
                      onChange={(e) =>
                        setField(
                          "hsaContributedThisYear",
                          clamp(parseFloat(e.target.value), 0, HSA_FAMILY),
                        )
                      }
                    />
                  </InputGroup>
                </div>
              </div>
            </div>
          )}

          <p className={shared.sectionLabel}>IRA & 401k (This Year)</p>

          <div className={shared.twoCol}>
            <div className={shared.col}>
              <Form.Label>IRA contributed</Form.Label>
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.iraContributedThisYear)}
                  onChange={(e) =>
                    setField(
                      "iraContributedThisYear",
                      clamp(parseFloat(e.target.value), 0, IRA_CATCHUP),
                    )
                  }
                />
              </InputGroup>
            </div>
            <div className={shared.col}>
              <Form.Label>401k contributed</Form.Label>
              <TooltipOnHover
                text={`Your own employee contributions only (excludes employer match). Used to track progress toward the ${formatCurrency(K401_BASE)} employee limit.`}
                nest={
                  <InputGroup className="mb-3 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(inputs.k401ContributedThisYear)}
                      onChange={(e) =>
                        setField(
                          "k401ContributedThisYear",
                          clamp(parseFloat(e.target.value), 0, K401_CATCHUP),
                        )
                      }
                    />
                  </InputGroup>
                }
              />
            </div>
          </div>
        </Form>

        {/* ── LADDER ────────────────────────────────────────────────────────── */}
        <div className={shared.results}>
          {negativeSurplus && (
            <Alert variant="warning" className="mb-3">
              <strong>Your expenses exceed your income.</strong> Before
              following this priority order, focus on closing your budget gap —
              increase income or reduce expenses.
            </Alert>
          )}

          {allDone && (
            <Alert variant="success" className="mb-3">
              <strong>You&apos;ve completed all steps.</strong> Keep investing
              your surplus in a taxable brokerage and work toward other goals.
            </Alert>
          )}

          {/* Summary banner */}
          {!negativeSurplus && (
            <div className={styles.summaryBanner}>
              <div className={styles.surplusRow}>
                Monthly surplus:{" "}
                <span className={styles.surplusAmount}>
                  {formatCurrency(surplus)}
                </span>
              </div>
              {currentStep && (
                <div className={styles.priorityRow}>
                  Current priority:{" "}
                  <strong>
                    Step {(currentStepIndex ?? 0) + 1} — {currentStep.title}
                  </strong>
                </div>
              )}
              {allDone && (
                <div className={styles.priorityRow}>
                  <strong>All steps complete — keep investing!</strong>
                </div>
              )}
            </div>
          )}

          {/* Step ladder */}
          <div className={styles.ladder}>
            {STEP_DEFS.map((def, i) => (
              <StepCard
                key={i}
                idx={i}
                def={def}
                result={stepResults[i]}
                isLast={i === STEP_DEFS.length - 1}
                monthsRemaining={monthsRemaining}
              />
            ))}
          </div>

          <p className={shared.chartNote}>
            Based on the r/personalfinance{" "}
            <a
              href="https://www.reddit.com/r/personalfinance/wiki/commontopics"
              target="_blank"
              rel="noopener noreferrer"
            >
              Prime Directive
            </a>
            . HSA, IRA, and 401k monthly amounts are spread over the months
            remaining in the year from the selected month. State taxes and
            investment returns not included.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
