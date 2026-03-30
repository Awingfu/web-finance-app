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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Rectangle,
  ResponsiveContainer,
} from "recharts";
import type { BarShapeProps } from "recharts";
import { Header, Footer, TooltipOnHover } from "../../src/components";
import { useChartTooltipProps } from "../../src/utils/ThemeContext";
import {
  formatCurrency,
  formatPercent,
  formatStateValue,
} from "../../src/utils";
import {
  calcDcaVsLumpSum,
  type DcaInputs,
  type MarketScenario,
} from "../../src/utils/dca_vs_lumpsum_utils";
import retirementStyles from "../../styles/Retirement.module.scss";
import shared from "../../styles/shared.module.scss";
import styles from "../../styles/DcaVsLumpSum.module.scss";

// ─── Constants ────────────────────────────────────────────────────────────────

const DCA_COLOR = "#2980b9";
const LUMP_COLOR = "#8e44ad";
const CASH_COLOR = "#95a5a6";

const formatChartDollar = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}k`
      : `$${v.toFixed(0)}`;

const formatMonth = (m: number) =>
  m >= 24 ? `${Math.round(m / 12)}yr` : `${m}mo`;

type ChartView = "growth" | "breakdown" | "pricepath";

// ─── Scenario definitions ─────────────────────────────────────────────────────

const SCENARIOS: {
  value: MarketScenario;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: "bull",
    label: "Bull Market",
    icon: "📈",
    description: "Steady climb — market gains momentum over time",
  },
  {
    value: "bear",
    label: "Bear then Bull",
    icon: "📉",
    description: "Market dips first, then recovers (V-shape)",
  },
  {
    value: "volatile",
    label: "Volatile",
    icon: "〰",
    description: "Alternating up/down swings, same long-run return",
  },
  {
    value: "flat",
    label: "Flat / Average",
    icon: "➡",
    description: "Consistent average return every month",
  },
];

// ─── Default inputs ────────────────────────────────────────────────────────────

const DEFAULT_INPUTS: DcaInputs = {
  totalAmount: 50000,
  investmentHorizonYears: 10,
  dcaMonths: 12,
  marketReturnRate: 0.1,
  savingsAccountRate: 0.045,
  scenario: "flat",
  customMonthlyReturns: [],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DcaVsLumpSum() {
  const { contentStyle: tooltipStyle, labelStyle: tooltipLabelStyle } =
    useChartTooltipProps();

  const [inputs, setInputs] = useState<DcaInputs>(DEFAULT_INPUTS);
  const [chartView, setChartView] = useState<ChartView>("growth");

  const setField = <K extends keyof DcaInputs>(key: K, value: DcaInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const clamp = (v: number, min: number, max: number) =>
    isNaN(v) ? min : Math.min(max, Math.max(min, v));

  const result = useMemo(() => calcDcaVsLumpSum(inputs), [inputs]);

  const horizonMonths = inputs.investmentHorizonYears * 12;
  const dcaWins = result.dcaWins;
  const winner = dcaWins ? "DCA" : "Lump Sum";
  const winnerColor = dcaWins ? DCA_COLOR : LUMP_COLOR;

  // Downsample monthly data for charts (max ~120 points)
  const chartData = useMemo(() => {
    const data = result.monthlyData;
    if (data.length <= 120) return data;
    const step = Math.ceil(data.length / 120);
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [result.monthlyData]);

  // Price path data (normalised to 100)
  const pricePath = useMemo(() => {
    let price = 100;
    return result.monthlyReturns.slice(0, horizonMonths).map((r, i) => {
      price = price * (1 + r);
      return { month: i + 1, price };
    });
  }, [result.monthlyReturns, horizonMonths]);

  // Final value bar chart data
  const barData = [
    { name: "DCA", value: result.finalDcaTotal, fill: DCA_COLOR },
    { name: "Lump Sum", value: result.finalLumpSum, fill: LUMP_COLOR },
  ];

  return (
    <div className={retirementStyles.container}>
      <Header titleName="DCA vs Lump Sum" />

      <main className={retirementStyles.main}>
        <h1>Dollar-Cost Averaging vs Lump Sum</h1>
        <p>
          You have a windfall or savings ready to invest. Should you put it all
          in at once (<strong>lump sum</strong>), or spread it out over time (
          <strong>dollar-cost averaging</strong>)? Money not yet invested earns
          interest in a savings account. Tune the market scenario and see which
          strategy comes out ahead.
        </p>
      </main>

      <div className={retirementStyles.content}>
        {/* ── FORM ─────────────────────────────────────────────────────────── */}
        <Form className={retirementStyles.form}>
          {/* ── Money Available ── */}
          <p className={shared.sectionLabel}>Your Money</p>

          <Form.Label>Total Amount to Invest</Form.Label>
          <TooltipOnHover
            text="The total lump sum you have available to invest, e.g. a bonus, inheritance, or accumulated savings."
            nest={
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.totalAmount)}
                  onChange={(e) =>
                    setField(
                      "totalAmount",
                      clamp(parseFloat(e.target.value), 1, 100_000_000),
                    )
                  }
                />
              </InputGroup>
            }
          />

          <Form.Label>Investment Horizon</Form.Label>
          <TooltipOnHover
            text="How many years you plan to stay invested. The final portfolio value is measured at this point."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.investmentHorizonYears)}
                  onChange={(e) =>
                    setField(
                      "investmentHorizonYears",
                      clamp(parseFloat(e.target.value), 1, 40),
                    )
                  }
                />
                <InputGroup.Text>years</InputGroup.Text>
              </InputGroup>
            }
          />

          {/* ── DCA Schedule ── */}
          <p className={shared.sectionLabel}>DCA Schedule</p>

          <div className={styles.dcaSlider}>
            <div className={styles.dcaMonthDisplay}>
              <Form.Label className="mb-0">Spread investments over</Form.Label>
              <span
                className={styles.dcaMonthBadge}
                style={{ color: DCA_COLOR }}
              >
                {inputs.dcaMonths}
              </span>
              <Form.Label className="mb-0">months</Form.Label>
            </div>
            <Form.Range
              min={1}
              max={Math.min(inputs.investmentHorizonYears * 12, 60)}
              value={inputs.dcaMonths}
              onChange={(e) => setField("dcaMonths", parseInt(e.target.value))}
            />
            <div className="d-flex justify-content-between">
              <small className="text-muted">1 mo (= lump sum)</small>
              <small className="text-muted">
                {Math.min(inputs.investmentHorizonYears * 12, 60)} mo
              </small>
            </div>
          </div>

          <p className={shared.rateHint}>
            Monthly installment:{" "}
            <strong>{formatCurrency(result.monthlyInstallment)}</strong> — cash
            not yet invested earns {formatPercent(inputs.savingsAccountRate)} in
            a HYSA
          </p>

          {/* ── Return Assumptions ── */}
          <p className={shared.sectionLabel}>Return Assumptions</p>

          <div className={shared.twoCol}>
            <div className={shared.col}>
              <Form.Label>Market Return</Form.Label>
              <TooltipOnHover
                text="Expected average annual return for the invested portfolio (e.g. a broad index fund). The S&P 500 has averaged ~10% annually over the long run."
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
            <div className={shared.col}>
              <Form.Label>Savings / HYSA Rate</Form.Label>
              <TooltipOnHover
                text="Annual interest rate for cash sitting in a high-yield savings account while waiting to be invested (DCA only)."
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
                          clamp(parseFloat(e.target.value), 0, 20) / 100,
                        )
                      }
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                }
              />
            </div>
          </div>

          {/* ── Market Scenario ── */}
          <p className={shared.sectionLabel}>Market Scenario</p>
          <p className={shared.rateHint}>
            Choose how the market behaves during your investment period. All
            scenarios share the same long-run annual return above.
          </p>

          <div className={styles.scenarioGrid}>
            {SCENARIOS.map((s) => (
              <div key={s.value}>
                <TooltipOnHover
                  text={s.description}
                  nest={
                    <div
                      className={
                        inputs.scenario === s.value
                          ? styles.scenarioCardActive
                          : styles.scenarioCard
                      }
                      onClick={() => setField("scenario", s.value)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          setField("scenario", s.value);
                      }}
                    >
                      <div className={styles.scenarioIcon}>{s.icon}</div>
                      <div>{s.label}</div>
                    </div>
                  }
                />
              </div>
            ))}
          </div>
        </Form>

        {/* ── RESULTS ──────────────────────────────────────────────────────── */}
        <div className={shared.results}>
          {/* Key insight alert */}
          <Alert
            variant={dcaWins ? "info" : "primary"}
            className="mb-3"
            style={{ borderLeft: `4px solid ${winnerColor}` }}
          >
            <strong style={{ color: winnerColor }}>{winner} wins</strong> in
            this scenario —{" "}
            {dcaWins ? (
              <>
                DCA ends up{" "}
                <strong>
                  {formatCurrency(Math.abs(result.dcaVsLumpSumDiff))}
                </strong>{" "}
                ahead. The HYSA interest on uninvested cash and lower average
                buy price more than compensate for time out of market.
              </>
            ) : (
              <>
                Lump Sum ends up{" "}
                <strong>
                  {formatCurrency(Math.abs(result.dcaVsLumpSumDiff))}
                </strong>{" "}
                ahead. Getting fully invested immediately lets compounding work
                on the full amount sooner.
              </>
            )}
          </Alert>

          {/* Summary cards */}
          <div className={shared.summaryCards}>
            <div className={shared.card}>
              <div className={shared.cardLabel}>DCA Final Value</div>
              <div className={shared.cardValue} style={{ color: DCA_COLOR }}>
                {formatCurrency(result.finalDcaTotal)}
              </div>
              <div className={shared.cardSub}>
                over {inputs.dcaMonths} months at{" "}
                {formatCurrency(result.monthlyInstallment)}/mo
              </div>
            </div>
            <div className={shared.card}>
              <div className={shared.cardLabel}>Lump Sum Final Value</div>
              <div className={shared.cardValue} style={{ color: LUMP_COLOR }}>
                {formatCurrency(result.finalLumpSum)}
              </div>
              <div className={shared.cardSub}>invested all at once</div>
            </div>
            <div className={shared.card}>
              <div className={shared.cardLabel}>
                {dcaWins ? "DCA Advantage" : "Lump Sum Advantage"}
              </div>
              <div className={shared.cardValue} style={{ color: winnerColor }}>
                {formatCurrency(Math.abs(result.dcaVsLumpSumDiff))}
              </div>
              <div className={shared.cardSub}>
                {formatPercent(
                  Math.abs(result.dcaVsLumpSumDiff) / result.totalContributed,
                )}{" "}
                of total invested
              </div>
            </div>
            <div className={shared.card}>
              <div className={shared.cardLabel}>DCA Avg Buy Price</div>
              <div
                className={shared.cardValue}
                style={{
                  color: result.avgCostAdvantage > 0 ? DCA_COLOR : LUMP_COLOR,
                }}
              >
                {result.averageBuyPrice.toFixed(1)}
              </div>
              <div className={shared.cardSub}>
                vs {result.lumpSumBuyPrice.toFixed(1)} for lump sum (index
                starts at 100)
              </div>
            </div>
          </div>

          {/* Chart toggle */}
          <div className={shared.chartToggle}>
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
                Portfolio Growth
              </ToggleButton>
              <ToggleButton
                id="view-breakdown"
                value="breakdown"
                variant="outline-primary"
              >
                Final Comparison
              </ToggleButton>
              <ToggleButton
                id="view-pricepath"
                value="pricepath"
                variant="outline-primary"
              >
                Market Path
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          {/* Chart 1 — Portfolio Growth Over Time */}
          {chartView === "growth" && (
            <div className={shared.chartWrap}>
              <h5 className="text-center mb-1">Portfolio Value Over Time</h5>
              <p
                className="text-center text-muted mb-3"
                style={{ fontSize: "0.82rem" }}
              >
                DCA total includes cash still in HYSA
              </p>
              <ResponsiveContainer width="100%" height={380}>
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    label={{
                      value: "Time",
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
                    labelFormatter={(m) =>
                      `Month ${m} (${formatMonth(m as number)})`
                    }
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Legend verticalAlign="top" />
                  {inputs.dcaMonths > 1 && (
                    <ReferenceLine
                      x={inputs.dcaMonths}
                      stroke={DCA_COLOR}
                      strokeDasharray="4 3"
                      label={{
                        value: "DCA complete",
                        position: "insideTopRight",
                        fontSize: 11,
                        fill: DCA_COLOR,
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="dcaTotal"
                    name="DCA (invested + HYSA cash)"
                    stroke={DCA_COLOR}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="lumpSumPortfolio"
                    name="Lump Sum"
                    stroke={LUMP_COLOR}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="dcaCash"
                    name="DCA uninvested cash (HYSA)"
                    stroke={CASH_COLOR}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className={shared.chartNote}>
                The dashed gray line shows cash still sitting in the HYSA
                waiting to be deployed. Once DCA is complete at month{" "}
                {inputs.dcaMonths}, both strategies are fully invested.
              </p>
            </div>
          )}

          {/* Chart 2 — Final Value Comparison */}
          {chartView === "breakdown" && (
            <div className={shared.chartWrap}>
              <h5 className="text-center mb-3">
                Final Portfolio Value at {inputs.investmentHorizonYears} Years
              </h5>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={barData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={formatChartDollar} width={65} />
                  <Tooltip
                    formatter={(
                      value: number | undefined,
                      name: string | undefined,
                    ) => [formatCurrency(value ?? 0), name ?? ""]}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Bar
                    dataKey="value"
                    name="Final Value"
                    isAnimationActive={false}
                    shape={(props: BarShapeProps) => (
                      <Rectangle
                        {...props}
                        fill={barData[props.index]?.fill ?? "#888"}
                        fillOpacity={0.85}
                        radius={4}
                      />
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>

              {/* Breakdown table */}
              <div className="mt-3">
                <table className="table table-sm table-bordered text-center mb-0">
                  <thead>
                    <tr>
                      <th></th>
                      <th style={{ color: DCA_COLOR }}>DCA</th>
                      <th style={{ color: LUMP_COLOR }}>Lump Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total Invested</td>
                      <td>{formatCurrency(result.totalContributed)}</td>
                      <td>{formatCurrency(result.totalContributed)}</td>
                    </tr>
                    <tr>
                      <td>Final Portfolio</td>
                      <td style={{ color: DCA_COLOR, fontWeight: 600 }}>
                        {formatCurrency(result.finalDcaTotal)}
                      </td>
                      <td style={{ color: LUMP_COLOR, fontWeight: 600 }}>
                        {formatCurrency(result.finalLumpSum)}
                      </td>
                    </tr>
                    <tr>
                      <td>Gain</td>
                      <td>
                        {formatCurrency(
                          result.finalDcaTotal - result.totalContributed,
                        )}
                      </td>
                      <td>
                        {formatCurrency(
                          result.finalLumpSum - result.totalContributed,
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Avg Buy Price (index)</td>
                      <td>{result.averageBuyPrice.toFixed(2)}</td>
                      <td>{result.lumpSumBuyPrice.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className={shared.chartNote}>
                {result.avgCostAdvantage > 0
                  ? `DCA achieved a lower average buy price (${result.averageBuyPrice.toFixed(1)} vs ${result.lumpSumBuyPrice.toFixed(1)}), but time out of market cost some compounding.`
                  : `Lump sum secured a lower entry price. In a rising market, buying earlier is typically better.`}
              </p>
            </div>
          )}

          {/* Chart 3 — Market Price Path */}
          {chartView === "pricepath" && (
            <div className={shared.chartWrap}>
              <h5 className="text-center mb-3">
                Market Price Path — {result.scenarioLabel}
              </h5>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={pricePath}
                  margin={{ top: 10, right: 20, left: 10, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    label={{
                      value: "Time",
                      position: "insideBottom",
                      offset: -12,
                    }}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => v.toFixed(0)}
                    width={55}
                  />
                  <Tooltip
                    formatter={(v: number | undefined) => [
                      (v ?? 0).toFixed(1),
                      "Price index",
                    ]}
                    labelFormatter={(m) =>
                      `Month ${m} (${formatMonth(m as number)})`
                    }
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <ReferenceLine
                    y={100}
                    stroke="#888"
                    strokeDasharray="4 3"
                    label={{
                      value: "Start",
                      position: "insideTopLeft",
                      fontSize: 11,
                    }}
                  />
                  {inputs.dcaMonths > 1 && (
                    <ReferenceLine
                      x={inputs.dcaMonths}
                      stroke={DCA_COLOR}
                      strokeDasharray="4 3"
                      label={{
                        value: "DCA done",
                        position: "insideTopRight",
                        fontSize: 11,
                        fill: DCA_COLOR,
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="price"
                    name="Market Index"
                    stroke="#e67e22"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className={shared.chartNote}>
                All scenarios produce the same long-run annualised return (
                {formatPercent(inputs.marketReturnRate)}), but the path affects
                how much each strategy benefits from timing. DCA buys more
                shares when prices are low and fewer when high.
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
