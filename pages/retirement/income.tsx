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
} from "../../src/utils/retirement_income_utils";
import styles from "../../styles/Retirement.module.scss";
import incomeStyles from "../../styles/RetirementIncome.module.scss";

const CHART_COLORS = {
  ss: "#2ecc71",
  k401: "#e67e22",
  brokerage: "#9b59b6",
  roth: "#3498db",
  cash: "#95a5a6",
  tax: "#e74c3c",
  balance401k: "#e67e22",
  balanceBrokerage: "#9b59b6",
  balanceRoth: "#3498db",
  balanceCash: "#95a5a6",
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

function RetirementIncome() {
  const [inputs, setInputs] = useState<RetirementIncomeInputs>({
    currentAge: 65,
    lifeExpectancyAge: 90,
    ssnMonthlyBenefit: 2000,
    ssnStartAge: 67,
    balance401k: 500000,
    balanceBrokerage: 200000,
    brokerageCostBasisPercent: 50,
    balanceRoth: 100000,
    balanceCash: 50000,
    strategy: "maintain_wealth",
    desiredAnnualIncome: 80000,
    annualGrowthRate: 0.07,
    filingStatus: "single",
  });

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

  const rows = useMemo(() => simulateRetirementIncome(inputs), [inputs]);
  const summary = useMemo(() => summarizeSimulation(rows), [rows]);

  const deduction =
    inputs.filingStatus === "mfj"
      ? STANDARD_DEDUCTION_MFJ
      : STANDARD_DEDUCTION_SINGLE;

  // Resolved desired income for spend_down (what the solver found)
  const effectiveTargetIncome =
    inputs.strategy === "spend_down" && rows.length > 0
      ? rows[0].totalGrossIncome // first year approximation
      : inputs.desiredAnnualIncome;

  const handleCSV = () => {
    const headers = [
      "Age",
      "SS Income ($)",
      "401k Withdrawal ($)",
      "Brokerage Withdrawal ($)",
      "Roth Withdrawal ($)",
      "Cash Withdrawal ($)",
      "Total Gross Income ($)",
      "Federal Tax ($)",
      "Net Income ($)",
      "401k Balance ($)",
      "Brokerage Balance ($)",
      "Roth Balance ($)",
      "Cash Balance ($)",
      "Total Balance ($)",
    ];
    const dataRows = rows.map((r) => [
      r.age,
      r.ssIncome,
      r.withdrawal401k,
      r.withdrawalBrokerage,
      r.withdrawalRoth,
      r.withdrawalCash,
      r.totalGrossIncome,
      r.federalTax,
      r.netIncome,
      r.balance401k,
      r.balanceBrokerage,
      r.balanceRoth,
      r.balanceCash,
      r.totalBalance,
    ]);
    downloadCSV("retirement-income-plan.csv", [headers, ...dataRows]);
  };

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
              <option value="spend_down">
                Spend Down by Life Expectancy Age
              </option>
            </Form.Select>
          </InputGroup>

          {/* Ages */}
          <Form.Label>Current Age</Form.Label>
          <InputGroup className="mb-3 w-100">
            <Form.Control
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              value={formatStateValue(inputs.currentAge)}
              onChange={(e) => updateNumber(e, "currentAge", 50, 100)}
            />
          </InputGroup>

          <Form.Label>
            {inputs.strategy === "spend_down"
              ? "Spend-Down Target Age"
              : "Life Expectancy Age"}
          </Form.Label>
          <TooltipOnHover
            text={
              inputs.strategy === "spend_down"
                ? "All accounts will be depleted by this age."
                : "How many years to simulate."
            }
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.lifeExpectancyAge)}
                  onChange={(e) =>
                    updateNumber(
                      e,
                      "lifeExpectancyAge",
                      inputs.currentAge + 1,
                      120,
                    )
                  }
                />
              </InputGroup>
            }
          />

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

          {/* Social Security */}
          <Form.Label>Estimated Monthly Social Security Benefit</Form.Label>
          <TooltipOnHover
            text="Find your estimate at ssa.gov/myaccount. Enter $0 if not applicable."
            nest={
              <InputGroup className="mb-3 w-100">
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

          <Form.Label>Age to Start Social Security</Form.Label>
          <TooltipOnHover
            text="You can claim as early as 62 (reduced) or delay up to 70 (increased ~8%/yr after full retirement age)."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.ssnStartAge)}
                  onChange={(e) => updateNumber(e, "ssnStartAge", 62, 70)}
                />
              </InputGroup>
            }
          />

          {/* Account balances */}
          <Form.Label>401k / Traditional IRA Balance</Form.Label>
          <TooltipOnHover
            text="Pre-tax balance. Withdrawals are taxed as ordinary income. RMDs start at age 73."
            nest={
              <InputGroup className="mb-3 w-100">
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

          <Form.Label>Taxable Brokerage Balance</Form.Label>
          <TooltipOnHover
            text="Only the gains portion is taxed, at long-term capital gains rates."
            nest={
              <InputGroup className="mb-3 w-100">
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

          <Form.Label>Brokerage Cost Basis</Form.Label>
          <TooltipOnHover
            text="What percentage of your brokerage balance is original investment (cost basis)? The rest is gains taxed at LTCG rates."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.brokerageCostBasisPercent)}
                  onChange={(e) =>
                    updateNumber(e, "brokerageCostBasisPercent", 0, 100)
                  }
                />
                <InputGroup.Text>% cost basis</InputGroup.Text>
              </InputGroup>
            }
          />

          <Form.Label>Roth IRA Balance</Form.Label>
          <TooltipOnHover
            text="Tax-free withdrawals. Used last to maximize tax-free growth."
            nest={
              <InputGroup className="mb-3 w-100">
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

          <Form.Label>Cash / Savings Balance</Form.Label>
          <TooltipOnHover
            text="Liquid cash. Withdrawn first since it earns the least."
            nest={
              <InputGroup className="mb-3 w-100">
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

          {/* Income target (maintain_wealth only) */}
          {inputs.strategy === "maintain_wealth" && (
            <>
              <Form.Label>Desired Annual Income</Form.Label>
              <TooltipOnHover
                text="Target gross income per year. If your accounts can't support it, withdrawals will be capped at available balance."
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
          )}

          {/* Growth rate */}
          <Form.Label>Annual Portfolio Growth Rate</Form.Label>
          <TooltipOnHover
            text="Expected annual return on all invested accounts (401k, brokerage, Roth). Historical S&P 500 average is ~10% nominal, ~7% real."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.annualGrowthRate * 100)}
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

          {/* Tax note */}
          <Alert variant="info" className="mt-2">
            <small>
              Using {INCOME_LAST_UPDATED} federal tax brackets. Standard
              deduction: {formatCurrency(deduction)}. State taxes not included.
            </small>
          </Alert>
        </Form>

        {/* ── CHARTS + SUMMARY ── */}
        <div className={incomeStyles.results}>
          {/* Summary cards */}
          <div className={incomeStyles.summaryCards}>
            <div className={incomeStyles.card}>
              <div className={incomeStyles.cardLabel}>Total Gross Income</div>
              <div className={incomeStyles.cardValue}>
                {formatCurrency(summary.totalGrossIncome)}
              </div>
            </div>
            <div className={incomeStyles.card}>
              <div className={incomeStyles.cardLabel}>Total Taxes Paid</div>
              <div className={incomeStyles.cardValue}>
                {formatCurrency(summary.totalTaxesPaid)}
              </div>
            </div>
            <div className={incomeStyles.card}>
              <div className={incomeStyles.cardLabel}>Total Net Income</div>
              <div className={incomeStyles.cardValue}>
                {formatCurrency(summary.totalNetIncome)}
              </div>
            </div>
            <div className={incomeStyles.card}>
              <div className={incomeStyles.cardLabel}>
                {summary.ageAccountsDepleted
                  ? "Accounts Depleted at Age"
                  : "Remaining at Life Expectancy"}
              </div>
              <div className={incomeStyles.cardValue}>
                {summary.ageAccountsDepleted
                  ? summary.ageAccountsDepleted
                  : formatCurrency(rows[rows.length - 1]?.totalBalance ?? 0)}
              </div>
            </div>
          </div>

          {inputs.strategy === "spend_down" && (
            <Alert variant="secondary" className="mb-3">
              <small>
                Spend-down strategy: estimated annual withdrawal of{" "}
                <strong>
                  {formatCurrency(
                    rows.length > 0 ? rows[0].totalGrossIncome : 0,
                  )}
                </strong>{" "}
                gross to deplete accounts by age {inputs.lifeExpectancyAge}.
                Actual withdrawals vary due to RMDs and Social Security.
              </small>
            </Alert>
          )}

          {/* Chart toggle */}
          <div className={incomeStyles.chartToggle}>
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
            <div className={incomeStyles.chartWrap}>
              <h5 className="text-center mb-3">Annual Income by Source</h5>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={rows}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="age"
                    label={{
                      value: "Age",
                      position: "insideBottom",
                      offset: -2,
                    }}
                  />
                  <YAxis tickFormatter={formatChartDollar} width={60} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend verticalAlign="top" />
                  {inputs.strategy === "maintain_wealth" && (
                    <ReferenceLine
                      y={inputs.desiredAnnualIncome}
                      stroke="#e74c3c"
                      strokeDasharray="6 3"
                      label={{
                        value: "Target",
                        position: "right",
                        fill: "#e74c3c",
                        fontSize: 12,
                      }}
                    />
                  )}
                  <Bar
                    dataKey="withdrawalCash"
                    name="Cash"
                    stackId="a"
                    fill={CHART_COLORS.cash}
                  />
                  <Bar
                    dataKey="withdrawalBrokerage"
                    name="Brokerage"
                    stackId="a"
                    fill={CHART_COLORS.brokerage}
                  />
                  <Bar
                    dataKey="withdrawal401k"
                    name="401k / Trad IRA"
                    stackId="a"
                    fill={CHART_COLORS.k401}
                  />
                  <Bar
                    dataKey="withdrawalRoth"
                    name="Roth IRA"
                    stackId="a"
                    fill={CHART_COLORS.roth}
                  />
                  <Bar
                    dataKey="ssIncome"
                    name="Social Security"
                    stackId="a"
                    fill={CHART_COLORS.ss}
                  />
                  <Bar
                    dataKey="federalTax"
                    name="Federal Tax"
                    stackId="b"
                    fill={CHART_COLORS.tax}
                    opacity={0.7}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className={incomeStyles.chartNote}>
                Red bars (separate stack) show estimated federal tax owed each
                year.
              </p>
            </div>
          )}

          {/* Account balances area chart */}
          {chartView === "balances" && (
            <div className={incomeStyles.chartWrap}>
              <h5 className="text-center mb-3">Account Balances Over Time</h5>
              <ResponsiveContainer width="100%" height={380}>
                <AreaChart
                  data={rows}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="age"
                    label={{
                      value: "Age",
                      position: "insideBottom",
                      offset: -2,
                    }}
                  />
                  <YAxis tickFormatter={formatChartDollar} width={60} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend verticalAlign="top" />
                  <Area
                    type="monotone"
                    dataKey="balanceCash"
                    name="Cash"
                    stackId="1"
                    stroke={CHART_COLORS.balanceCash}
                    fill={CHART_COLORS.balanceCash}
                    fillOpacity={0.7}
                  />
                  <Area
                    type="monotone"
                    dataKey="balanceBrokerage"
                    name="Brokerage"
                    stackId="1"
                    stroke={CHART_COLORS.balanceBrokerage}
                    fill={CHART_COLORS.balanceBrokerage}
                    fillOpacity={0.7}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance401k"
                    name="401k / Trad IRA"
                    stackId="1"
                    stroke={CHART_COLORS.balance401k}
                    fill={CHART_COLORS.balance401k}
                    fillOpacity={0.7}
                  />
                  <Area
                    type="monotone"
                    dataKey="balanceRoth"
                    name="Roth IRA"
                    stackId="1"
                    stroke={CHART_COLORS.balanceRoth}
                    fill={CHART_COLORS.balanceRoth}
                    fillOpacity={0.7}
                  />
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
                    <th>401k ($)</th>
                    <th>Brokerage ($)</th>
                    <th>Roth ($)</th>
                    <th>Cash ($)</th>
                    <th>Gross Income ($)</th>
                    <th>Fed Tax ($)</th>
                    <th>Net Income ($)</th>
                    <th>Total Balance ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.age}>
                      <td>{row.age}</td>
                      <td>{formatCurrency(row.ssIncome)}</td>
                      <td>{formatCurrency(row.withdrawal401k)}</td>
                      <td>{formatCurrency(row.withdrawalBrokerage)}</td>
                      <td>{formatCurrency(row.withdrawalRoth)}</td>
                      <td>{formatCurrency(row.withdrawalCash)}</td>
                      <td>{formatCurrency(row.totalGrossIncome)}</td>
                      <td>{formatCurrency(row.federalTax)}</td>
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
