// TODO (Retirement Income Planner)
// 1. Better tax bracket awareness per withdrawal type — show effective rate per source
// 2. Allow users to customize withdrawal order priorities
// 3. Allow user to opt into early withdrawal penalties for pre-60 withdrawals (checkbox)

import { useState, useMemo, FormEvent } from "react";
import {
  Alert,
  Button,
  Form,
  InputGroup,
  Table,
  ToggleButton,
  ToggleButtonGroup,
} from "react-bootstrap";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Header, Footer, TooltipOnHover } from "../../src/components";
import { useChartTooltipProps } from "../../src/utils/ThemeContext";
import { formatCurrency, formatStateValue, downloadCSV } from "../../src/utils";
import {
  simulateRetirementIncome,
  summarizeSimulation,
  RetirementIncomeInputs,
  FilingStatus,
  WithdrawalStrategy,
  INCOME_LAST_UPDATED,
  STANDARD_DEDUCTION_SINGLE,
  STANDARD_DEDUCTION_MFJ,
  EARLY_WITHDRAWAL_PENALTY_AGE,
} from "../../src/utils/retirement_income_utils";
import styles from "../../styles/Retirement.module.scss";
import incomeStyles from "../../styles/RetirementIncome.module.scss";
import shared from "../../styles/shared.module.scss";

const CHART_COLORS = {
  ss: "#2ecc71",
  pension: "#1abc9c",
  other: "#fd9595",
  k401: "#e67e22",
  brokerage: "#9b59b6",
  roth: "#3498db",
  cash: "#95a5a6",
  tax: "#e74c3c",
  penalty: "#c0392b",
};

const formatChartDollar = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}k`
      : `$${v.toFixed(0)}`;

const tooltipFormatter = (
  value: number | undefined,
  name: string | undefined,
) => [formatCurrency(value ?? 0), name ?? ""];

type ChartView = "income" | "balances";

const DEFAULT_INPUTS: RetirementIncomeInputs = {
  currentAge: 65,
  lifeExpectancyAge: 90,
  ssnMonthlyBenefit: 2000,
  ssnStartAge: 67,
  pensionMonthlyBenefit: 0,
  pensionStartAge: 65,
  otherAnnualIncome: 0,
  balance401k: 250000,
  balanceBrokerage: 0,
  brokerageCostBasisPercent: 50,
  balanceRoth: 0,
  balanceCash: 100000,
  cashInterestRate: 0.01,
  strategy: "set_withdrawal_rate",
  desiredAnnualIncome: 39000,
  annualGrowthRate: 0.07,
  filingStatus: "single",
};

function RetirementIncome() {
  const { contentStyle: tooltipStyle, labelStyle: tooltipLabelStyle } =
    useChartTooltipProps();

  const [inputs, setInputs] = useState<RetirementIncomeInputs>(DEFAULT_INPUTS);

  // Optional account section visibility
  const [showSS, setShowSS] = useState(true);
  const [showPension, setShowPension] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [show401k, setShow401k] = useState(true);
  const [showBrokerage, setShowBrokerage] = useState(false);
  const [showRoth, setShowRoth] = useState(false);
  const [showCash, setShowCash] = useState(true);

  const [chartView, setChartView] = useState<ChartView>("income");
  const [showTable, setShowTable] = useState(false);

  const setField = <K extends keyof RetirementIncomeInputs>(
    key: K,
    value: RetirementIncomeInputs[K],
  ) => setInputs((prev) => ({ ...prev, [key]: value }));

  const updateNumber = (
    e: FormEvent<HTMLElement>,
    key: keyof RetirementIncomeInputs,
    min = 0,
    max = 1_000_000_000,
  ) => {
    let v = parseFloat((e.target as HTMLInputElement).value);
    if (isNaN(v) || v < min) v = min;
    else if (v > max) v = max;
    setField(key, v as RetirementIncomeInputs[typeof key]);
  };

  const closeSS = () => {
    setField("ssnMonthlyBenefit", 0);
    setField("ssnStartAge", 67);
    setShowSS(false);
  };
  const closePension = () => {
    setField("pensionMonthlyBenefit", 0);
    setField("pensionStartAge", 65);
    setShowPension(false);
  };
  const closeOther = () => {
    setField("otherAnnualIncome", 0);
    setShowOther(false);
  };
  const close401k = () => {
    setField("balance401k", 0);
    setShow401k(false);
  };
  const closeBrokerage = () => {
    setField("balanceBrokerage", 0);
    setField("brokerageCostBasisPercent", 50);
    setShowBrokerage(false);
  };
  const closeRoth = () => {
    setField("balanceRoth", 0);
    setShowRoth(false);
  };
  const closeCash = () => {
    setField("balanceCash", 0);
    setField("cashInterestRate", 0.01);
    setShowCash(false);
  };

  const rows = useMemo(() => simulateRetirementIncome(inputs), [inputs]);
  const summary = useMemo(() => summarizeSimulation(rows), [rows]);

  const hasEarlyWithdrawal = inputs.currentAge < EARLY_WITHDRAWAL_PENALTY_AGE;

  const deduction =
    inputs.filingStatus === "mfj"
      ? STANDARD_DEDUCTION_MFJ
      : STANDARD_DEDUCTION_SINGLE;

  const handleCSV = () => {
    const headers = [
      "Age",
      "SS Income ($)",
      "Pension Income ($)",
      "Other Income ($)",
      "401k Withdrawal ($)",
      "Brokerage Withdrawal ($)",
      "Roth/After-Tax Withdrawal ($)",
      "Cash Withdrawal ($)",
      "Total Gross Income ($)",
      "Federal Tax ($)",
      "Early Withdrawal Penalty ($)",
      "Net Income ($)",
      "401k Balance ($)",
      "Brokerage Balance ($)",
      "Roth/After-Tax Balance ($)",
      "Cash Balance ($)",
      "Total Balance ($)",
    ];
    const dataRows = rows.map((r) => [
      r.age,
      r.ssIncome,
      r.pensionIncome,
      r.otherIncome,
      r.withdrawal401k,
      r.withdrawalBrokerage,
      r.withdrawalRoth,
      r.withdrawalCash,
      r.totalGrossIncome,
      r.federalTax,
      r.earlyWithdrawalPenalty,
      r.netIncome,
      r.balance401k,
      r.balanceBrokerage,
      r.balanceRoth,
      r.balanceCash,
      r.totalBalance,
    ]);
    downloadCSV("retirement-income-plan.csv", [headers, ...dataRows]);
  };

  // Chart bars: only render series that have non-zero data
  const hasPensionData = rows.some((r) => r.pensionIncome > 0);
  const hasOtherData = rows.some((r) => r.otherIncome > 0);
  const has401kData = rows.some((r) => r.withdrawal401k > 0);
  const hasBrokerageData = rows.some((r) => r.withdrawalBrokerage > 0);
  const hasRothData = rows.some((r) => r.withdrawalRoth > 0);
  const hasCashData = rows.some((r) => r.withdrawalCash > 0);
  const hasPenaltyData = rows.some((r) => r.earlyWithdrawalPenalty > 0);
  const has401kBalance = rows.some((r) => r.balance401k > 0);
  const hasBrokerageBalance = rows.some((r) => r.balanceBrokerage > 0);
  const hasRothBalance = rows.some((r) => r.balanceRoth > 0);
  const hasCashBalance = rows.some((r) => r.balanceCash > 0);

  return (
    <div className={styles.container}>
      <Header titleName="Retirement Income Planner" />

      <main className={styles.main}>
        <h1>Retirement Income Planner</h1>
        <p>
          Plan your withdrawals across accounts to meet your income goals,
          accounting for taxes, RMDs, and Social Security.
        </p>
      </main>

      <div className={styles.content}>
        {/* ── FORM ── */}
        <Form className={styles.form}>
          {/* Strategy */}
          <Form.Label>Withdrawal Strategy</Form.Label>
          <InputGroup className="mb-3 w-100">
            <Form.Select
              value={inputs.strategy}
              onChange={(e) =>
                setField("strategy", e.target.value as WithdrawalStrategy)
              }
            >
              <option value="maintain_wealth">Maintain Wealth</option>
              <option value="set_withdrawal_rate">Set Withdrawal Rate</option>
              <option value="spend_down">
                Spend Down by Life Expectancy Age
              </option>
            </Form.Select>
          </InputGroup>

          {/* Ages — same row */}
          <div className={incomeStyles.ageRow}>
            <div className={incomeStyles.ageField}>
              <Form.Label>Current Age</Form.Label>
              <Form.Select
                value={inputs.currentAge}
                onChange={(e) => {
                  const age = parseInt(e.target.value);
                  setField("currentAge", age);
                  if (inputs.lifeExpectancyAge <= age) {
                    setField("lifeExpectancyAge", age + 1);
                  }
                }}
              >
                {Array.from({ length: 81 }, (_, i) => i + 20).map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </Form.Select>
            </div>
            <div className={incomeStyles.ageField}>
              <Form.Label>
                {inputs.strategy === "spend_down"
                  ? "Spend-Down Age"
                  : "Life Expectancy Age"}
              </Form.Label>
              <TooltipOnHover
                text={
                  inputs.strategy === "spend_down"
                    ? "All accounts will be depleted by this age."
                    : "How far to run the simulation."
                }
                nest={
                  <Form.Select
                    value={inputs.lifeExpectancyAge}
                    onChange={(e) =>
                      setField("lifeExpectancyAge", parseInt(e.target.value))
                    }
                  >
                    {Array.from(
                      { length: 119 - inputs.currentAge },
                      (_, i) => inputs.currentAge + 1 + i,
                    ).map((age) => (
                      <option key={age} value={age}>
                        {age}
                      </option>
                    ))}
                  </Form.Select>
                }
              />
            </div>
          </div>

          {/* Filing status */}
          <Form.Label>Filing Status</Form.Label>
          <InputGroup className="mb-3 w-100">
            <Form.Select
              value={inputs.filingStatus}
              onChange={(e) =>
                setField("filingStatus", e.target.value as FilingStatus)
              }
            >
              <option value="single">Single</option>
              <option value="mfj">Married Filing Jointly</option>
            </Form.Select>
          </InputGroup>

          {/* ── Income / rate settings ── */}
          {inputs.strategy !== "maintain_wealth" &&
          inputs.strategy !== "spend_down" ? (
            <>
              <Form.Label>Desired Annual Income</Form.Label>
              <TooltipOnHover
                text="Target gross income, held constant each year. The investment growth rate is assumed to account for inflation."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(inputs.desiredAnnualIncome)}
                      onChange={(e) => updateNumber(e, "desiredAnnualIncome")}
                    />
                    <InputGroup.Text>/ yr</InputGroup.Text>
                  </InputGroup>
                }
              />
            </>
          ) : null}

          <Form.Label>Annual Investment Growth Rate</Form.Label>
          <TooltipOnHover
            text="Expected annual return on invested accounts (401k, brokerage, Roth). S&P 500 historical average is ~10% nominal, ~7% real."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(
                    Math.round(inputs.annualGrowthRate * 10000) / 100,
                  )}
                  onChange={(e) => {
                    let v = parseFloat((e.target as HTMLInputElement).value);
                    if (isNaN(v) || v < 0) v = 0;
                    if (v > 30) v = 30;
                    setField("annualGrowthRate", v / 100);
                  }}
                />
                <InputGroup.Text>%</InputGroup.Text>
              </InputGroup>
            }
          />

          {/* ── Assets ── */}
          <p className={shared.sectionLabel}>Assets</p>

          {/* Add account tiles */}
          <div className={incomeStyles.addAccountButtons}>
            {!showCash && (
              <button
                type="button"
                className={incomeStyles.addAccountTile}
                style={{
                  borderColor: CHART_COLORS.cash,
                  color: CHART_COLORS.cash,
                }}
                onClick={() => setShowCash(true)}
              >
                + Cash / Savings
              </button>
            )}
            {!showSS && (
              <button
                type="button"
                className={incomeStyles.addAccountTile}
                style={{
                  borderColor: CHART_COLORS.ss,
                  color: CHART_COLORS.ss,
                }}
                onClick={() => setShowSS(true)}
              >
                + Social Security
              </button>
            )}
            {!showPension && (
              <button
                type="button"
                className={incomeStyles.addAccountTile}
                style={{
                  borderColor: CHART_COLORS.pension,
                  color: CHART_COLORS.pension,
                }}
                onClick={() => setShowPension(true)}
              >
                + Pension
              </button>
            )}
            {!showOther && (
              <button
                type="button"
                className={incomeStyles.addAccountTile}
                style={{
                  borderColor: CHART_COLORS.other,
                  color: CHART_COLORS.other,
                }}
                onClick={() => setShowOther(true)}
              >
                + Other Income
              </button>
            )}
            {!showBrokerage && (
              <button
                type="button"
                className={incomeStyles.addAccountTile}
                style={{
                  borderColor: CHART_COLORS.brokerage,
                  color: CHART_COLORS.brokerage,
                }}
                onClick={() => setShowBrokerage(true)}
              >
                + Taxable Brokerage
              </button>
            )}
            {!show401k && (
              <button
                type="button"
                className={incomeStyles.addAccountTile}
                style={{
                  borderColor: CHART_COLORS.k401,
                  color: CHART_COLORS.k401,
                }}
                onClick={() => setShow401k(true)}
              >
                + Traditional Retirement Accounts (401k, IRA)
              </button>
            )}
            {!showRoth && (
              <button
                type="button"
                className={incomeStyles.addAccountTile}
                style={{
                  borderColor: CHART_COLORS.roth,
                  color: CHART_COLORS.roth,
                }}
                onClick={() => setShowRoth(true)}
              >
                + Roth Accounts
              </button>
            )}
          </div>

          {showCash && (
            <div
              className={incomeStyles.accountSection}
              style={{ borderColor: CHART_COLORS.cash }}
            >
              <div className={incomeStyles.accountSectionHeader}>
                <span style={{ color: CHART_COLORS.cash }}>Cash / Savings</span>
                <button
                  type="button"
                  className={incomeStyles.closeBtn}
                  onClick={closeCash}
                  aria-label="Remove cash account"
                >
                  ×
                </button>
              </div>
              <div className={incomeStyles.ageRow}>
                <div className={incomeStyles.ageField}>
                  <Form.Label className="mb-1">
                    <small>Balance</small>
                  </Form.Label>
                  <TooltipOnHover
                    text="Liquid cash. Withdrawn first since it typically earns the least."
                    nest={
                      <InputGroup className="mb-2 w-100">
                        <InputGroup.Text>$</InputGroup.Text>
                        <Form.Control
                          type="number"
                          onWheel={(e) => e.currentTarget.blur()}
                          value={formatStateValue(inputs.balanceCash)}
                          onChange={(e) => updateNumber(e, "balanceCash")}
                        />
                      </InputGroup>
                    }
                  />
                </div>
                <div className={incomeStyles.ageField}>
                  <Form.Label className="mb-1">
                    <small>Interest Rate</small>
                  </Form.Label>
                  <TooltipOnHover
                    text="Annual return on cash / savings (e.g. HYSA rate). Cash is not invested in the market."
                    nest={
                      <InputGroup className="mb-2 w-100">
                        <Form.Control
                          type="number"
                          onWheel={(e) => e.currentTarget.blur()}
                          value={formatStateValue(
                            Math.round(inputs.cashInterestRate * 10000) / 100,
                          )}
                          onChange={(e) => {
                            let v = parseFloat(
                              (e.target as HTMLInputElement).value,
                            );
                            if (isNaN(v) || v < 0) v = 0;
                            if (v > 20) v = 20;
                            setField("cashInterestRate", v / 100);
                          }}
                        />
                        <InputGroup.Text>%</InputGroup.Text>
                      </InputGroup>
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {showSS && (
            <div
              className={incomeStyles.accountSection}
              style={{ borderColor: CHART_COLORS.ss }}
            >
              <div className={incomeStyles.accountSectionHeader}>
                <span style={{ color: CHART_COLORS.ss }}>Social Security</span>
                <button
                  type="button"
                  className={incomeStyles.closeBtn}
                  onClick={closeSS}
                  aria-label="Remove Social Security"
                >
                  ×
                </button>
              </div>
              <div className={incomeStyles.ageRow}>
                <div className={incomeStyles.ageField}>
                  <Form.Label className="mb-1">
                    <small>Monthly Benefit</small>
                  </Form.Label>
                  <TooltipOnHover
                    text="Find your estimate at ssa.gov/myaccount."
                    nest={
                      <InputGroup className="mb-2 w-100">
                        <InputGroup.Text>$</InputGroup.Text>
                        <Form.Control
                          type="number"
                          onWheel={(e) => e.currentTarget.blur()}
                          value={formatStateValue(inputs.ssnMonthlyBenefit)}
                          onChange={(e) =>
                            updateNumber(e, "ssnMonthlyBenefit", 0, 10000)
                          }
                        />
                        <InputGroup.Text>/ mo</InputGroup.Text>
                      </InputGroup>
                    }
                  />
                </div>
                <div className={incomeStyles.ageField}>
                  <Form.Label className="mb-1">
                    <small>Age to Start Claiming</small>
                  </Form.Label>
                  <TooltipOnHover
                    text="Claim as early as 62 (reduced ~30%) or delay to 70 (increased 8%/yr past full retirement age of 67)."
                    nest={
                      <InputGroup className="mb-2 w-100">
                        <Form.Control
                          type="number"
                          onWheel={(e) => e.currentTarget.blur()}
                          value={formatStateValue(inputs.ssnStartAge)}
                          onChange={(e) =>
                            updateNumber(e, "ssnStartAge", 62, 70)
                          }
                        />
                      </InputGroup>
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {showPension && (
            <div
              className={incomeStyles.accountSection}
              style={{ borderColor: CHART_COLORS.pension }}
            >
              <div className={incomeStyles.accountSectionHeader}>
                <span style={{ color: CHART_COLORS.pension }}>Pension</span>
                <button
                  type="button"
                  className={incomeStyles.closeBtn}
                  onClick={closePension}
                  aria-label="Remove pension"
                >
                  ×
                </button>
              </div>
              <div className={incomeStyles.ageRow}>
                <div className={incomeStyles.ageField}>
                  <Form.Label className="mb-1">
                    <small>Monthly Benefit</small>
                  </Form.Label>
                  <TooltipOnHover
                    text="Fixed monthly pension payment. Fully taxable as ordinary income."
                    nest={
                      <InputGroup className="mb-2 w-100">
                        <InputGroup.Text>$</InputGroup.Text>
                        <Form.Control
                          type="number"
                          onWheel={(e) => e.currentTarget.blur()}
                          value={formatStateValue(inputs.pensionMonthlyBenefit)}
                          onChange={(e) =>
                            updateNumber(e, "pensionMonthlyBenefit", 0, 100000)
                          }
                        />
                        <InputGroup.Text>/ mo</InputGroup.Text>
                      </InputGroup>
                    }
                  />
                </div>
                <div className={incomeStyles.ageField}>
                  <Form.Label className="mb-1">
                    <small>Age Pension Starts</small>
                  </Form.Label>
                  <TooltipOnHover
                    text="The age at which your pension payments begin."
                    nest={
                      <InputGroup className="mb-2 w-100">
                        <Form.Control
                          type="number"
                          onWheel={(e) => e.currentTarget.blur()}
                          value={formatStateValue(inputs.pensionStartAge)}
                          onChange={(e) =>
                            updateNumber(e, "pensionStartAge", 40, 90)
                          }
                        />
                      </InputGroup>
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {showOther && (
            <div
              className={incomeStyles.accountSection}
              style={{ borderColor: CHART_COLORS.other }}
            >
              <div className={incomeStyles.accountSectionHeader}>
                <span style={{ color: CHART_COLORS.other }}>Other Income</span>
                <button
                  type="button"
                  className={incomeStyles.closeBtn}
                  onClick={closeOther}
                  aria-label="Remove other income"
                >
                  ×
                </button>
              </div>
              <Form.Label className="mb-1">
                <small>Annual Amount</small>
              </Form.Label>
              <TooltipOnHover
                text="Rental income, part-time work, annuity payments, or any other fixed annual income. Taxed as ordinary income."
                nest={
                  <InputGroup className="mb-2 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(inputs.otherAnnualIncome)}
                      onChange={(e) => updateNumber(e, "otherAnnualIncome")}
                    />
                    <InputGroup.Text>/ yr</InputGroup.Text>
                  </InputGroup>
                }
              />
            </div>
          )}

          {showBrokerage && (
            <div
              className={incomeStyles.accountSection}
              style={{ borderColor: CHART_COLORS.brokerage }}
            >
              <div className={incomeStyles.accountSectionHeader}>
                <span style={{ color: CHART_COLORS.brokerage }}>
                  Taxable Brokerage
                </span>
                <button
                  type="button"
                  className={incomeStyles.closeBtn}
                  onClick={closeBrokerage}
                  aria-label="Remove brokerage account"
                >
                  ×
                </button>
              </div>
              <div className={incomeStyles.ageRow}>
                <div className={incomeStyles.ageField}>
                  <Form.Label className="mb-1">
                    <small>Balance</small>
                  </Form.Label>
                  <TooltipOnHover
                    text="Only gains are taxed at LTCG rates when withdrawn."
                    nest={
                      <InputGroup className="mb-2 w-100">
                        <InputGroup.Text>$</InputGroup.Text>
                        <Form.Control
                          type="number"
                          onWheel={(e) => e.currentTarget.blur()}
                          value={formatStateValue(inputs.balanceBrokerage)}
                          onChange={(e) => updateNumber(e, "balanceBrokerage")}
                        />
                      </InputGroup>
                    }
                  />
                </div>
                <div className={incomeStyles.ageField}>
                  <Form.Label className="mb-1">
                    <small>Cost Basis</small>
                  </Form.Label>
                  <TooltipOnHover
                    text="What % of your balance is original investment? The remainder is gains taxed at LTCG rates."
                    nest={
                      <InputGroup className="mb-2 w-100">
                        <Form.Control
                          type="number"
                          onWheel={(e) => e.currentTarget.blur()}
                          value={formatStateValue(
                            inputs.brokerageCostBasisPercent,
                          )}
                          onChange={(e) =>
                            updateNumber(e, "brokerageCostBasisPercent", 0, 100)
                          }
                        />
                        <InputGroup.Text>% cost basis</InputGroup.Text>
                      </InputGroup>
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {show401k && (
            <div
              className={incomeStyles.accountSection}
              style={{ borderColor: CHART_COLORS.k401 }}
            >
              <div className={incomeStyles.accountSectionHeader}>
                <div>
                  <span style={{ color: CHART_COLORS.k401 }}>
                    Traditional Retirement Accounts (401k, IRA)
                  </span>
                  <div className={incomeStyles.accountSectionSubtitle}>
                    RMDs (required minimum distributions) are enforced starting
                    at age 73
                  </div>
                </div>
                <button
                  type="button"
                  className={incomeStyles.closeBtn}
                  onClick={close401k}
                  aria-label="Remove 401k account"
                >
                  ×
                </button>
              </div>
              <TooltipOnHover
                text="Pre-tax balance. Withdrawals are taxed as ordinary income. RMDs start at age 73."
                nest={
                  <InputGroup className="mb-2 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(inputs.balance401k)}
                      onChange={(e) => updateNumber(e, "balance401k")}
                    />
                  </InputGroup>
                }
              />
            </div>
          )}

          {showRoth && (
            <div
              className={incomeStyles.accountSection}
              style={{ borderColor: CHART_COLORS.roth }}
            >
              <div className={incomeStyles.accountSectionHeader}>
                <span style={{ color: CHART_COLORS.roth }}>Roth Accounts</span>
                <button
                  type="button"
                  className={incomeStyles.closeBtn}
                  onClick={closeRoth}
                  aria-label="Remove Roth account"
                >
                  ×
                </button>
              </div>
              <Form.Label className="mb-1">
                <small>Balance</small>
              </Form.Label>
              <TooltipOnHover
                text="Includes Roth IRA, Roth 401k, and after-tax 401k. Tax-free withdrawals. Used last to maximize tax-free growth. Roth IRAs have no RMDs during your lifetime."
                nest={
                  <InputGroup className="mb-2 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(inputs.balanceRoth)}
                      onChange={(e) => updateNumber(e, "balanceRoth")}
                    />
                  </InputGroup>
                }
              />
            </div>
          )}

          {/* Tax note */}
          <Alert variant="info" className="mt-2">
            <small>
              Using {INCOME_LAST_UPDATED} federal brackets. Standard deduction:{" "}
              {formatCurrency(deduction)}. State taxes not included.
            </small>
          </Alert>

          {hasEarlyWithdrawal && (
            <Alert variant="warning" className="mt-2">
              <small>
                <strong>Early withdrawal penalty applies.</strong> Withdrawals
                from 401k and Roth accounts before age{" "}
                {EARLY_WITHDRAWAL_PENALTY_AGE} incur a 10% IRS penalty in
                addition to income tax.
              </small>
            </Alert>
          )}
        </Form>

        {/* ── CHARTS + SUMMARY ── */}
        <div className={shared.results}>
          {/* Summary cards */}
          <div className={shared.summaryCards}>
            <div className={shared.card}>
              <div className={shared.cardLabel}>Total Gross Income</div>
              <div className={shared.cardValue}>
                {formatCurrency(summary.totalGrossIncome)}
              </div>
            </div>
            <div className={shared.card}>
              <div className={shared.cardLabel}>Federal Taxes Paid</div>
              <div className={shared.cardValue}>
                {formatCurrency(summary.totalTaxesPaid)}
              </div>
            </div>
            {summary.totalPenaltiesPaid > 0 && (
              <div className={shared.card}>
                <div className={shared.cardLabel}>Early W/D Penalties</div>
                <div className={shared.cardValue}>
                  {formatCurrency(summary.totalPenaltiesPaid)}
                </div>
              </div>
            )}
            <div className={shared.card}>
              <div className={shared.cardLabel}>Total Net Income</div>
              <div className={shared.cardValue}>
                {formatCurrency(summary.totalNetIncome)}
              </div>
            </div>
            <div className={shared.card}>
              <div className={shared.cardLabel}>
                {summary.ageAccountsDepleted
                  ? "Accounts Depleted at Age"
                  : "Remaining at End"}
              </div>
              <div className={shared.cardValue}>
                {summary.ageAccountsDepleted
                  ? summary.ageAccountsDepleted
                  : formatCurrency(rows[rows.length - 1]?.totalBalance ?? 0)}
              </div>
            </div>
          </div>

          {inputs.strategy === "spend_down" && rows.length > 0 && (
            <Alert variant="secondary" className="mb-3">
              <small>
                Spend-down: constant income of{" "}
                <strong>{formatCurrency(rows[0].totalGrossIncome)}</strong>/yr,
                depleting all accounts by age {inputs.lifeExpectancyAge}.
              </small>
            </Alert>
          )}

          {inputs.strategy === "maintain_wealth" && (
            <Alert variant="secondary" className="mb-3">
              <small>
                <strong>Maintain Wealth:</strong> Each year&apos;s income equals
                your portfolio&apos;s gains plus Social Security. Principal is
                preserved at its starting value — you never draw down the
                portfolio itself. Cash is withdrawn first each year and is not
                preserved; once depleted, gains from invested accounts fund
                income.
              </small>
            </Alert>
          )}

          {inputs.strategy === "set_withdrawal_rate" &&
            summary.ageAccountsDepleted !== null &&
            summary.ageAccountsDepleted < inputs.lifeExpectancyAge && (
              <Alert variant="danger" className="mb-3">
                <small>
                  <strong>
                    Accounts depleted at age {summary.ageAccountsDepleted}
                  </strong>{" "}
                  — {inputs.lifeExpectancyAge - summary.ageAccountsDepleted}{" "}
                  year
                  {inputs.lifeExpectancyAge - summary.ageAccountsDepleted !== 1
                    ? "s"
                    : ""}{" "}
                  before your life expectancy age of {inputs.lifeExpectancyAge}.
                  Consider reducing your target income, adding more savings, or
                  switching to the Spend Down strategy to optimize withdrawals.
                </small>
              </Alert>
            )}

          {/* Chart toggle */}
          <div className={shared.chartToggle}>
            <ToggleButtonGroup
              type="radio"
              name="chartView"
              value={chartView}
              onChange={(v: ChartView) => setChartView(v)}
            >
              <ToggleButton
                id="view-income"
                value="income"
                variant="outline-primary"
              >
                Income Sources
              </ToggleButton>
              <ToggleButton
                id="view-balances"
                value="balances"
                variant="outline-primary"
              >
                Account Balances
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          {/* Income sources bar chart */}
          {chartView === "income" && (
            <div className={shared.chartWrap}>
              <h5 className="text-center mb-3">Annual Income by Source</h5>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={rows}
                  margin={{ top: 10, right: 20, left: 10, bottom: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="age"
                    label={{
                      value: "Age",
                      position: "insideBottom",
                      offset: -8,
                    }}
                  />
                  <YAxis tickFormatter={formatChartDollar} width={60} />
                  <Tooltip
                    formatter={tooltipFormatter}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Legend verticalAlign="top" />
                  {inputs.strategy === "set_withdrawal_rate" && (
                    <ReferenceLine
                      y={inputs.desiredAnnualIncome}
                      stroke="#e74c3c"
                      strokeDasharray="6 3"
                      label={{
                        value: "Target",
                        position: "insideTopRight",
                        fill: "#e74c3c",
                        fontSize: 12,
                      }}
                    />
                  )}
                  {hasCashData && (
                    <Bar
                      dataKey="withdrawalCash"
                      name="Cash"
                      stackId="a"
                      fill={CHART_COLORS.cash}
                    />
                  )}
                  <Bar
                    dataKey="ssIncome"
                    name="Social Security"
                    stackId="a"
                    fill={CHART_COLORS.ss}
                  />
                  {hasPensionData && (
                    <Bar
                      dataKey="pensionIncome"
                      name="Pension"
                      stackId="a"
                      fill={CHART_COLORS.pension}
                    />
                  )}
                  {hasOtherData && (
                    <Bar
                      dataKey="otherIncome"
                      name="Other Income"
                      stackId="a"
                      fill={CHART_COLORS.other}
                    />
                  )}
                  {hasBrokerageData && (
                    <Bar
                      dataKey="withdrawalBrokerage"
                      name="Brokerage"
                      stackId="a"
                      fill={CHART_COLORS.brokerage}
                    />
                  )}
                  {has401kData && (
                    <Bar
                      dataKey="withdrawal401k"
                      name="Traditional (401k/IRA)"
                      stackId="a"
                      fill={CHART_COLORS.k401}
                    />
                  )}
                  {hasRothData && (
                    <Bar
                      dataKey="withdrawalRoth"
                      name="Roth Accounts"
                      stackId="a"
                      fill={CHART_COLORS.roth}
                    />
                  )}
                  <Bar
                    dataKey="federalTax"
                    name="Federal Tax"
                    stackId="b"
                    fill={CHART_COLORS.tax}
                    opacity={0.85}
                  />
                  {hasPenaltyData && (
                    <Bar
                      dataKey="earlyWithdrawalPenalty"
                      name="Early W/D Penalty"
                      stackId="b"
                      fill={CHART_COLORS.penalty}
                      opacity={0.85}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
              <p className={shared.chartNote}>
                Right stack (red) shows federal tax and any early withdrawal
                penalty — separate from income bars.
              </p>
            </div>
          )}

          {/* Account balances area chart */}
          {chartView === "balances" && (
            <div className={shared.chartWrap}>
              <h5 className="text-center mb-3">Account Balances Over Time</h5>
              <ResponsiveContainer width="100%" height={380}>
                <AreaChart
                  data={rows}
                  margin={{ top: 10, right: 20, left: 10, bottom: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="age"
                    label={{
                      value: "Age",
                      position: "insideBottom",
                      offset: -8,
                    }}
                  />
                  <YAxis tickFormatter={formatChartDollar} width={60} />
                  <Tooltip
                    formatter={tooltipFormatter}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Legend verticalAlign="top" />
                  {hasCashBalance && (
                    <Area
                      type="monotone"
                      dataKey="balanceCash"
                      name="Cash"
                      stackId="1"
                      stroke={CHART_COLORS.cash}
                      fill={CHART_COLORS.cash}
                      fillOpacity={0.7}
                    />
                  )}
                  {hasBrokerageBalance && (
                    <Area
                      type="monotone"
                      dataKey="balanceBrokerage"
                      name="Brokerage"
                      stackId="1"
                      stroke={CHART_COLORS.brokerage}
                      fill={CHART_COLORS.brokerage}
                      fillOpacity={0.7}
                    />
                  )}
                  {has401kBalance && (
                    <Area
                      type="monotone"
                      dataKey="balance401k"
                      name="Traditional (401k/IRA)"
                      stackId="1"
                      stroke={CHART_COLORS.k401}
                      fill={CHART_COLORS.k401}
                      fillOpacity={0.7}
                    />
                  )}
                  {hasRothBalance && (
                    <Area
                      type="monotone"
                      dataKey="balanceRoth"
                      name="Roth Accounts"
                      stackId="1"
                      stroke={CHART_COLORS.roth}
                      fill={CHART_COLORS.roth}
                      fillOpacity={0.7}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* CSV + table toggle */}
          <div className={incomeStyles.tableActions}>
            <Button variant="outline-secondary" size="sm" onClick={handleCSV}>
              Download CSV
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setShowTable((v) => !v)}
            >
              {showTable ? "Hide" : "Show"} Detail Table
            </Button>
          </div>

          {showTable && (
            <div className={incomeStyles.tableWrap}>
              <Table hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Age</th>
                    <th>SS ($)</th>
                    {hasPensionData && <th>Pension ($)</th>}
                    {hasOtherData && <th>Other ($)</th>}
                    {has401kData && <th>401k ($)</th>}
                    {hasBrokerageData && <th>Brokerage ($)</th>}
                    {hasRothData && <th>Roth ($)</th>}
                    {hasCashData && <th>Cash ($)</th>}
                    <th>Gross ($)</th>
                    <th>Fed Tax ($)</th>
                    {hasPenaltyData && <th>Penalty ($)</th>}
                    <th>Net ($)</th>
                    <th>Total Balance ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.age}>
                      <td>{row.age}</td>
                      <td>{formatCurrency(row.ssIncome)}</td>
                      {hasPensionData && (
                        <td>{formatCurrency(row.pensionIncome)}</td>
                      )}
                      {hasOtherData && (
                        <td>{formatCurrency(row.otherIncome)}</td>
                      )}
                      {has401kData && (
                        <td>{formatCurrency(row.withdrawal401k)}</td>
                      )}
                      {hasBrokerageData && (
                        <td>{formatCurrency(row.withdrawalBrokerage)}</td>
                      )}
                      {hasRothData && (
                        <td>{formatCurrency(row.withdrawalRoth)}</td>
                      )}
                      {hasCashData && (
                        <td>{formatCurrency(row.withdrawalCash)}</td>
                      )}
                      <td>{formatCurrency(row.totalGrossIncome)}</td>
                      <td>{formatCurrency(row.federalTax)}</td>
                      {hasPenaltyData && (
                        <td>{formatCurrency(row.earlyWithdrawalPenalty)}</td>
                      )}
                      <td>{formatCurrency(row.netIncome)}</td>
                      <td>{formatCurrency(row.totalBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default RetirementIncome;
