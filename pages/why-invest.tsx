import { useState, useMemo } from "react";
import {
  Alert,
  Form,
  InputGroup,
  ToggleButton,
  ToggleButtonGroup,
} from "react-bootstrap";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Header, Footer, TooltipOnHover } from "../src/components";
import { formatCurrency, formatPercent, formatStateValue } from "../src/utils";
import { calcWhyInvest, calcCatchUp } from "../src/utils/why_invest_utils";
import type { WhyInvestInputs } from "../src/utils/why_invest_utils";
import retirementStyles from "../styles/Retirement.module.scss";
import styles from "../styles/WhyInvest.module.scss";

// ─── Constants ────────────────────────────────────────────────────────────────

const MARKET_COLOR = "#2ecc71";
const MARKET_COLOR_DARK = "#27ae60";
const SAVINGS_COLOR = "#3498db";
const CONTRIB_COLOR = "#95a5a6";
const CATCHUP_COLOR = "#e67e22";

const formatChartDollar = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}k`
      : `$${v.toFixed(0)}`;

type ChartView = "growth" | "delay" | "catchup";

// ─── Default inputs ────────────────────────────────────────────────────────────

const DEFAULT_INPUTS: WhyInvestInputs = {
  currentAge: 25,
  retirementAge: 65,
  annualSalary: 80000,
  savingsRatePercent: 15,
  startingBalance: 0,
  marketReturnRate: 0.1,
  savingsAccountRate: 0.04,
  inflationEnabled: false,
  inflationRate: 0.03,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function WhyInvest() {
  const [inputs, setInputs] = useState<WhyInvestInputs>(DEFAULT_INPUTS);
  const [chartView, setChartView] = useState<ChartView>("growth");
  const [comparisonAge, setComparisonAge] = useState(
    Math.min(DEFAULT_INPUTS.currentAge + 10, DEFAULT_INPUTS.retirementAge - 1),
  );

  const setField = <K extends keyof WhyInvestInputs>(
    key: K,
    value: WhyInvestInputs[K],
  ) => setInputs((prev) => ({ ...prev, [key]: value }));

  const clamp = (v: number, min: number, max: number) =>
    isNaN(v) ? min : Math.min(max, Math.max(min, v));

  const result = useMemo(() => calcWhyInvest(inputs), [inputs]);

  const annualContrib = result.annualContribution;
  const years = inputs.retirementAge - inputs.currentAge;

  const catchUpSliderMin = 16;
  const catchUpSliderMax = inputs.retirementAge - 1;
  const clampedCompAge = Math.min(
    Math.max(comparisonAge, catchUpSliderMin),
    catchUpSliderMax,
  );
  const catchUp = useMemo(
    () =>
      calcCatchUp(
        inputs,
        clampedCompAge,
        result.yearlyData,
        result.finalMarket,
        annualContrib,
      ),
    [
      inputs,
      clampedCompAge,
      result.yearlyData,
      result.finalMarket,
      annualContrib,
    ],
  );

  const realMarketRate =
    (1 + inputs.marketReturnRate) / (1 + inputs.inflationRate) - 1;
  const realSavingsRate =
    (1 + inputs.savingsAccountRate) / (1 + inputs.inflationRate) - 1;

  return (
    <div className={retirementStyles.container}>
      <Header titleName="Why Invest?" />

      <main className={retirementStyles.main}>
        <h1>Why Invest?</h1>
        <p>
          See the power of compounding returns and the real cost of waiting.
          Compare market investing vs a savings account, and watch how starting
          earlier dramatically grows your wealth over time.
        </p>
      </main>

      <div className={retirementStyles.content}>
        {/* ── FORM ─────────────────────────────────────────────────────────── */}
        <Form className={retirementStyles.form}>
          {/* ── Your Situation ── */}
          <p className={styles.sectionLabel}>Your Situation</p>

          <div className={styles.twoCol}>
            <div className={styles.col}>
              <Form.Label>Current Age</Form.Label>
              <Form.Select
                className="mb-3"
                value={inputs.currentAge}
                onChange={(e) => {
                  const age = parseInt(e.target.value);
                  setField("currentAge", age);
                  if (inputs.retirementAge <= age) {
                    setField("retirementAge", age + 1);
                  }
                }}
              >
                {Array.from({ length: 65 }, (_, i) => i + 16).map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </Form.Select>
            </div>
            <div className={styles.col}>
              <Form.Label>Retirement Age</Form.Label>
              <Form.Select
                className="mb-3"
                value={inputs.retirementAge}
                onChange={(e) =>
                  setField("retirementAge", parseInt(e.target.value))
                }
              >
                {Array.from(
                  { length: 90 - inputs.currentAge },
                  (_, i) => inputs.currentAge + 1 + i,
                ).map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>

          {/* ── Income & Savings ── */}
          <p className={styles.sectionLabel}>Income & Savings</p>

          <Form.Label>Annual Salary</Form.Label>
          <TooltipOnHover
            text="Your gross annual salary. Used to calculate your annual contribution based on the savings rate below."
            nest={
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
                <InputGroup.Text>/ yr</InputGroup.Text>
              </InputGroup>
            }
          />

          <Form.Label>Savings Rate</Form.Label>
          <TooltipOnHover
            text="The percentage of your salary you save and invest each year. This drives your annual contribution shown below."
            nest={
              <InputGroup className="mb-1 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.savingsRatePercent)}
                  onChange={(e) =>
                    setField(
                      "savingsRatePercent",
                      clamp(parseFloat(e.target.value), 0, 100),
                    )
                  }
                />
                <InputGroup.Text>%</InputGroup.Text>
              </InputGroup>
            }
          />
          <p className={styles.rateHint}>
            Annual contribution:{" "}
            <strong>{formatCurrency(annualContrib)}</strong> (
            {formatPercent(inputs.savingsRatePercent / 100)} &times;{" "}
            {formatCurrency(inputs.annualSalary)})
          </p>

          {/* ── Starting Balance ── */}
          <p className={styles.sectionLabel}>Starting Balance</p>

          <Form.Label>Current Portfolio Balance</Form.Label>
          <TooltipOnHover
            text="Any existing savings or investment balance you're starting with today."
            nest={
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.startingBalance)}
                  onChange={(e) =>
                    setField(
                      "startingBalance",
                      clamp(parseFloat(e.target.value), 0, 100_000_000),
                    )
                  }
                />
              </InputGroup>
            }
          />

          {/* ── Return Assumptions ── */}
          <p className={styles.sectionLabel}>Return Assumptions</p>

          <div className={styles.twoCol}>
            <div className={styles.col}>
              <Form.Label>Market Return</Form.Label>
              <TooltipOnHover
                text="Expected average annual return for a diversified market portfolio (e.g., index funds). The S&P 500 has returned ~10% annually over the long run."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(
                        Math.round(inputs.marketReturnRate * 10000) / 100,
                      )}
                      onChange={(e) =>
                        setField(
                          "marketReturnRate",
                          clamp(parseFloat(e.target.value), 0, 50) / 100,
                        )
                      }
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                }
              />
            </div>
            <div className={styles.col}>
              <Form.Label>Savings / HYSA Rate</Form.Label>
              <TooltipOnHover
                text="Expected annual interest rate for a high-yield savings account. Typically 4–5% in recent years."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(
                        Math.round(inputs.savingsAccountRate * 10000) / 100,
                      )}
                      onChange={(e) =>
                        setField(
                          "savingsAccountRate",
                          clamp(parseFloat(e.target.value), 0, 50) / 100,
                        )
                      }
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                }
              />
            </div>
          </div>

          {/* ── Inflation ── */}
          <p className={styles.sectionLabel}>Inflation</p>

          <Form.Check
            type="switch"
            id="inflation-toggle"
            label="Show in Today's Dollars (inflation-adjusted)"
            checked={inputs.inflationEnabled}
            onChange={(e) => setField("inflationEnabled", e.target.checked)}
            className="mb-2"
          />

          {inputs.inflationEnabled && (
            <div className={styles.inflationPanel}>
              <Form.Label>Inflation Rate</Form.Label>
              <InputGroup className="mb-1 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(
                    Math.round(inputs.inflationRate * 10000) / 100,
                  )}
                  onChange={(e) =>
                    setField(
                      "inflationRate",
                      clamp(parseFloat(e.target.value), 0, 20) / 100,
                    )
                  }
                />
                <InputGroup.Text>%</InputGroup.Text>
              </InputGroup>
              <p className={styles.rateHint}>
                Real market rate:{" "}
                <strong>{formatPercent(realMarketRate)}</strong>
                {" · "}Real savings rate:{" "}
                <strong>{formatPercent(realSavingsRate)}</strong>
              </p>
            </div>
          )}
        </Form>

        {/* ── RESULTS ──────────────────────────────────────────────────────── */}
        <div className={styles.results}>
          {/* Key insight alert */}
          <Alert variant="success" className="mb-3">
            <strong>
              Market investing grows your money{" "}
              {result.marketMultiplier.toFixed(1)}
              &times;
              {inputs.inflationEnabled ? " in real terms" : ""}
            </strong>{" "}
            vs just saving
            {result.investingAdvantage > 0 && (
              <>
                {" "}
                — that&apos;s{" "}
                <strong>
                  {formatCurrency(result.investingAdvantage)}
                </strong>{" "}
                more at age {inputs.retirementAge}.
              </>
            )}
          </Alert>

          {/* Summary cards */}
          <div className={styles.summaryCards}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Annual Contribution</div>
              <div className={styles.cardValue}>
                {formatCurrency(annualContrib)}
              </div>
              <div className={styles.cardSub}>
                {formatPercent(inputs.savingsRatePercent / 100)} of salary over{" "}
                {years} yrs
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>
                Market Portfolio at {inputs.retirementAge}
              </div>
              <div className={styles.cardValue} style={{ color: MARKET_COLOR }}>
                {formatCurrency(result.finalMarket)}
              </div>
              <div className={styles.cardSub}>
                {formatPercent(inputs.marketReturnRate)} annual return
                {inputs.inflationEnabled ? " nominal" : ""}
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>
                Savings Account at {inputs.retirementAge}
              </div>
              <div
                className={styles.cardValue}
                style={{ color: SAVINGS_COLOR }}
              >
                {formatCurrency(result.finalSavings)}
              </div>
              <div className={styles.cardSub}>
                {formatPercent(inputs.savingsAccountRate)} annual rate
                {inputs.inflationEnabled ? " nominal" : ""}
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Investing Advantage</div>
              <div
                className={styles.cardValue}
                style={{
                  color:
                    result.investingAdvantage > 0 ? MARKET_COLOR : undefined,
                }}
              >
                {formatCurrency(result.investingAdvantage)}
              </div>
              <div className={styles.cardSub}>Market minus savings account</div>
            </div>
          </div>

          {/* Chart toggle */}
          <div className={styles.chartToggle}>
            <ToggleButtonGroup
              type="radio"
              name="chartView"
              value={chartView}
              onChange={(v: ChartView) => setChartView(v)}
            >
              <ToggleButton
                id="view-growth"
                value="growth"
                variant="outline-primary"
              >
                Growth Over Time
              </ToggleButton>
              <ToggleButton
                id="view-delay"
                value="delay"
                variant="outline-primary"
              >
                Cost of Waiting
              </ToggleButton>
              <ToggleButton
                id="view-catchup"
                value="catchup"
                variant="outline-primary"
              >
                Catch-Up Calculator
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          {/* Chart 1 — Growth Over Time */}
          {chartView === "growth" && (
            <div className={styles.chartWrap}>
              <h5 className="text-center mb-3">
                Portfolio Growth Over Time
                {inputs.inflationEnabled && (
                  <span className="text-muted fs-6">
                    {" "}
                    (in today&apos;s dollars)
                  </span>
                )}
              </h5>
              <ResponsiveContainer width="100%" height={380}>
                <LineChart
                  data={result.yearlyData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="age"
                    label={{
                      value: "Age",
                      position: "insideBottom",
                      offset: -12,
                    }}
                  />
                  <YAxis tickFormatter={formatChartDollar} width={65} />
                  <Tooltip
                    formatter={(
                      value: number | undefined,
                      name: string | undefined,
                    ) => [formatCurrency(value ?? 0), name ?? ""]}
                    labelFormatter={(age) => `Age ${age}`}
                  />
                  <Legend verticalAlign="top" />
                  <Line
                    type="monotone"
                    dataKey="market"
                    name="Market Portfolio"
                    stroke={MARKET_COLOR}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="savings"
                    name="Savings Account"
                    stroke={SAVINGS_COLOR}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="contributions"
                    name="Contributions Only"
                    stroke={CONTRIB_COLOR}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className={styles.chartNote}>
                The gap between the colored lines and the dashed gray line are
                gains from compounding.
                {inputs.inflationEnabled &&
                  " All values adjusted for inflation."}
              </p>
            </div>
          )}

          {/* Chart 3 — Catch-Up Calculator */}
          {chartView === "catchup" && (
            <div className={styles.chartWrap}>
              {/* Age slider */}
              <div className={styles.catchUpSlider}>
                <div className={styles.catchUpAgeDisplay}>
                  <Form.Label className="mb-0">
                    Compare: if someone starts investing at age
                  </Form.Label>
                  <span
                    className={styles.catchUpAgeBadge}
                    style={{
                      color:
                        clampedCompAge > inputs.currentAge
                          ? "#e74c3c"
                          : clampedCompAge < inputs.currentAge
                            ? MARKET_COLOR
                            : undefined,
                    }}
                  >
                    {clampedCompAge}
                  </span>
                </div>
                <Form.Range
                  min={catchUpSliderMin}
                  max={catchUpSliderMax}
                  value={clampedCompAge}
                  onChange={(e) => setComparisonAge(parseInt(e.target.value))}
                />
                <div className="d-flex justify-content-between">
                  <small className="text-muted">{catchUpSliderMin}</small>
                  <small className="text-muted">{catchUpSliderMax}</small>
                </div>
              </div>

              {/* Summary cards */}
              <div className={styles.summaryCards}>
                <div className={styles.card}>
                  <div className={styles.cardLabel}>Required Contribution</div>
                  <div
                    className={styles.cardValue}
                    style={{ color: CATCHUP_COLOR }}
                  >
                    {formatCurrency(catchUp.catchUpContrib)}/yr
                  </div>
                  <div className={styles.cardSub}>
                    starting age {clampedCompAge} →{" "}
                    {formatCurrency(result.finalMarket)} at{" "}
                    {inputs.retirementAge}
                  </div>
                </div>
                <div className={styles.card}>
                  <div className={styles.cardLabel}>vs Your Contribution</div>
                  <div
                    className={styles.cardValue}
                    style={{
                      color:
                        catchUp.diffPerYear > 0
                          ? "#e74c3c"
                          : catchUp.diffPerYear < 0
                            ? MARKET_COLOR
                            : undefined,
                    }}
                  >
                    {catchUp.diffPerYear > 0 ? "+" : ""}
                    {formatCurrency(catchUp.diffPerYear)}/yr
                  </div>
                  <div className={styles.cardSub}>
                    {catchUp.diffPerYear > 0
                      ? "more needed per year"
                      : catchUp.diffPerYear < 0
                        ? "less needed per year"
                        : "same as your plan"}
                  </div>
                </div>
                <div className={styles.card}>
                  <div className={styles.cardLabel}>
                    Total Extra Contributed
                  </div>
                  <div
                    className={styles.cardValue}
                    style={{
                      color:
                        catchUp.catchUpTotalContrib > catchUp.userTotalContrib
                          ? "#e74c3c"
                          : MARKET_COLOR,
                    }}
                  >
                    {catchUp.catchUpTotalContrib > catchUp.userTotalContrib
                      ? "+"
                      : ""}
                    {formatCurrency(
                      catchUp.catchUpTotalContrib - catchUp.userTotalContrib,
                    )}
                  </div>
                  <div className={styles.cardSub}>
                    {catchUp.catchUpTotalContrib > catchUp.userTotalContrib
                      ? "extra out-of-pocket"
                      : "less out-of-pocket"}
                  </div>
                </div>
              </div>

              {/* Line chart */}
              <h5 className="text-center mb-3">
                Investment Growth to Age {inputs.retirementAge}
                {inputs.inflationEnabled && (
                  <span className="text-muted fs-6">
                    {" "}
                    (in today&apos;s dollars)
                  </span>
                )}
              </h5>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart
                  data={catchUp.catchUpData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="age"
                    label={{
                      value: "Age",
                      position: "insideBottom",
                      offset: -12,
                    }}
                  />
                  <YAxis tickFormatter={formatChartDollar} width={65} />
                  <Tooltip
                    formatter={(
                      value: number | undefined,
                      name: string | undefined,
                    ) => [formatCurrency(value ?? 0), name ?? ""]}
                    labelFormatter={(age) => `Age ${age}`}
                  />
                  <Legend verticalAlign="top" />
                  <Line
                    type="monotone"
                    dataKey="userPath"
                    name={`Your path (age ${inputs.currentAge}, ${formatCurrency(annualContrib)}/yr)`}
                    stroke={MARKET_COLOR}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="catchUpPath"
                    name={`Age ${clampedCompAge} path (${formatCurrency(catchUp.catchUpContrib)}/yr)`}
                    stroke={CATCHUP_COLOR}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className={styles.chartNote}>
                Both paths reach the same value (
                {formatCurrency(result.finalMarket)}) at age{" "}
                {inputs.retirementAge}. Starting{" "}
                {clampedCompAge > inputs.currentAge
                  ? `${clampedCompAge - inputs.currentAge} years later`
                  : clampedCompAge < inputs.currentAge
                    ? `${inputs.currentAge - clampedCompAge} years earlier`
                    : "at the same age"}{" "}
                {clampedCompAge !== inputs.currentAge &&
                  `requires ${formatCurrency(Math.abs(catchUp.diffPerYear))}/yr ${catchUp.diffPerYear > 0 ? "more" : "less"}.`}
              </p>
            </div>
          )}

          {/* Chart 2 — Cost of Waiting */}
          {chartView === "delay" && (
            <div className={styles.chartWrap}>
              <h5 className="text-center mb-3">
                Cost of Waiting — Final Balance at Age {inputs.retirementAge}
              </h5>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={result.delayData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="startAge"
                    label={{
                      value: "Age You Start Investing",
                      position: "insideBottom",
                      offset: -12,
                    }}
                  />
                  <YAxis tickFormatter={formatChartDollar} width={65} />
                  <Tooltip
                    formatter={(
                      value: number | undefined,
                      name: string | undefined,
                    ) => [formatCurrency(value ?? 0), name ?? ""]}
                    labelFormatter={(age) => `Start age: ${age}`}
                  />
                  <Legend verticalAlign="top" />
                  <Bar
                    dataKey="market"
                    name="Market Portfolio"
                    fill={MARKET_COLOR}
                  >
                    {result.delayData.map((entry, index) => (
                      <Cell
                        key={`cell-market-${index}`}
                        fill={
                          entry.isCurrent ? MARKET_COLOR_DARK : MARKET_COLOR
                        }
                        fillOpacity={entry.isCurrent ? 1 : 0.65}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="savings"
                    name="Savings Account"
                    fill={SAVINGS_COLOR}
                  >
                    {result.delayData.map((entry, index) => (
                      <Cell
                        key={`cell-savings-${index}`}
                        fill={SAVINGS_COLOR}
                        fillOpacity={entry.isCurrent ? 1 : 0.65}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className={styles.chartNote}>
                {inputs.startingBalance > 0
                  ? `Current portfolio (${formatCurrency(inputs.startingBalance)}) compounds to retirement in all scenarios.`
                  : "All scenarios start from $0."}{" "}
                Solid bars = your current age ({inputs.currentAge}). Each
                scenario invests {formatCurrency(annualContrib)}/yr until age{" "}
                {inputs.retirementAge}.
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
