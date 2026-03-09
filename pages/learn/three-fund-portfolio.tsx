import { useState, useMemo } from "react";
import {
  Form,
  InputGroup,
  ToggleButton,
  ToggleButtonGroup,
} from "react-bootstrap";
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  BarChart,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Header, Footer } from "../../src/components";
import { formatCurrency, formatPercent } from "../../src/utils";
import retirementStyles from "../../styles/Retirement.module.scss";
import shared from "../../styles/shared.module.scss";
import styles from "../../styles/ThreeFundPortfolio.module.scss";

// ─── Asset Assumptions (long-run historical estimates) ───────────────────────

const US_RETURN = 0.1;
const US_VOL = 0.155;
const INTL_RETURN = 0.09; // forward-looking; intl valuations are cheaper than US
const INTL_VOL = 0.165;
const BONDS_RETURN = 0.04;
const BONDS_VOL = 0.06;
const RHO_US_INTL = 0.65; // long-run avg; post-2008 correlation (~0.75) overstates diversification benefit
const RHO_US_BONDS = -0.05;
const RHO_INTL_BONDS = 0.05;
const RISK_FREE = 0.04;

// ─── Portfolio Math ──────────────────────────────────────────────────────────

function calcStats(usW: number, intlW: number, bondsW: number) {
  const mu = usW * US_RETURN + intlW * INTL_RETURN + bondsW * BONDS_RETURN;
  const sigma2 =
    usW * usW * US_VOL * US_VOL +
    intlW * intlW * INTL_VOL * INTL_VOL +
    bondsW * bondsW * BONDS_VOL * BONDS_VOL +
    2 * usW * intlW * RHO_US_INTL * US_VOL * INTL_VOL +
    2 * usW * bondsW * RHO_US_BONDS * US_VOL * BONDS_VOL +
    2 * intlW * bondsW * RHO_INTL_BONDS * INTL_VOL * BONDS_VOL;
  const sigma = Math.sqrt(Math.max(0, sigma2));
  const sharpe = sigma > 0 ? (mu - RISK_FREE) / sigma : 0;
  return { expectedReturn: mu, volatility: sigma, sharpe };
}

// Classic 3-Fund reference weights: 60% US / 20% Intl / 20% Bonds
const THREE_FUND_US = 0.6;
const THREE_FUND_INTL = 0.2;
const THREE_FUND_BONDS = 0.2;

type GrowthPoint = {
  year: number;
  bandLow: number;
  bandHeight: number;
  median: number;
  threeFundMedian: number;
  p10: number;
  p90: number;
};

function lognormal(
  initial: number,
  drift: number,
  sigma: number,
  years: number,
  z: number,
) {
  return initial * Math.exp(drift * years + z * sigma * Math.sqrt(years));
}

function calcGrowth(
  usW: number,
  intlW: number,
  bondsW: number,
  years: number,
  initial: number,
): GrowthPoint[] {
  const { expectedReturn: mu, volatility: sigma } = calcStats(
    usW,
    intlW,
    bondsW,
  );
  const drift = mu - (sigma * sigma) / 2;
  const { expectedReturn: tfMu, volatility: tfSigma } = calcStats(
    THREE_FUND_US,
    THREE_FUND_INTL,
    THREE_FUND_BONDS,
  );
  const tfDrift = tfMu - (tfSigma * tfSigma) / 2;

  const data: GrowthPoint[] = [
    {
      year: 0,
      bandLow: initial,
      bandHeight: 0,
      median: initial,
      threeFundMedian: initial,
      p10: initial,
      p90: initial,
    },
  ];

  for (let y = 1; y <= years; y++) {
    const p10 = lognormal(initial, drift, sigma, y, -1.2816);
    const p90 = lognormal(initial, drift, sigma, y, 1.2816);
    const median = lognormal(initial, drift, sigma, y, 0);
    const threeFundMedian = lognormal(initial, tfDrift, tfSigma, y, 0);
    data.push({
      year: y,
      bandLow: p10,
      bandHeight: p90 - p10,
      median,
      threeFundMedian,
      p10,
      p90,
    });
  }
  return data;
}

// ─── Comparison portfolios ───────────────────────────────────────────────────

const COMPARE_PORTFOLIOS = [
  { name: "All Bonds", usW: 0, intlW: 0, bondsW: 1, color: "#e67e22" },
  { name: "Conservative", usW: 0.4, intlW: 0.2, bondsW: 0.4, color: "#3498db" },
  {
    name: "Classic 3-Fund",
    usW: 0.6,
    intlW: 0.2,
    bondsW: 0.2,
    color: "#2ecc71",
  },
  { name: "Aggressive", usW: 0.8, intlW: 0.2, bondsW: 0, color: "#9b59b6" },
  { name: "All US", usW: 1, intlW: 0, bondsW: 0, color: "#e74c3c" },
  { name: "All Intl", usW: 0, intlW: 1, bondsW: 0, color: "#1abc9c" },
] as const;

// ─── Presets ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: "All US", stocksPct: 100, usPct: 100 },
  { label: "Aggressive", stocksPct: 100, usPct: 80 },
  { label: "All International", stocksPct: 100, usPct: 0 },
  { label: "Classic 3-Fund", stocksPct: 80, usPct: 75 },
  { label: "Conservative", stocksPct: 60, usPct: 67 },
  { label: "All Bonds", stocksPct: 0, usPct: 75 },
] as const;

// ─── Chart helpers ───────────────────────────────────────────────────────────

const formatChartDollar = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `$${Math.round(v / 1_000)}k`
      : `$${v}`;

type ChartView = "growth" | "risk-return" | "compare";
type CompareMetric = "return" | "volatility" | "sharpe";

// ─── Component ───────────────────────────────────────────────────────────────

export default function ThreeFundPortfolio() {
  const [stocksPct, setStocksPct] = useState(80);
  const [usPct, setUsPct] = useState(75);
  const [years, setYears] = useState(25);
  const [initial, setInitial] = useState(10000);
  const [chartView, setChartView] = useState<ChartView>("growth");
  const [compareMetric, setCompareMetric] = useState<CompareMetric>("return");

  const usW = (stocksPct / 100) * (usPct / 100);
  const intlW = (stocksPct / 100) * (1 - usPct / 100);
  const bondsW = 1 - stocksPct / 100;

  const stats = useMemo(
    () => calcStats(usW, intlW, bondsW),
    [usW, intlW, bondsW],
  );

  const growthData = useMemo(
    () => calcGrowth(usW, intlW, bondsW, years, initial),
    [usW, intlW, bondsW, years, initial],
  );

  // Background scatter — sweep of all allocations to show the "feasible set"
  const frontierData = useMemo(() => {
    const points: { x: number; y: number }[] = [];
    for (let sp = 0; sp <= 100; sp += 5) {
      for (let up = 0; up <= 100; up += 10) {
        const uw = (sp / 100) * (up / 100);
        const iw = (sp / 100) * (1 - up / 100);
        const bw = 1 - sp / 100;
        const { expectedReturn, volatility } = calcStats(uw, iw, bw);
        points.push({
          x: parseFloat((volatility * 100).toFixed(2)),
          y: parseFloat((expectedReturn * 100).toFixed(2)),
        });
      }
    }
    return points;
  }, []);

  // Preset scatter points for Risk vs Return chart
  const presetScatterData = useMemo(
    () =>
      COMPARE_PORTFOLIOS.map((p) => {
        const { expectedReturn, volatility, sharpe } = calcStats(
          p.usW,
          p.intlW,
          p.bondsW,
        );
        return {
          x: parseFloat((volatility * 100).toFixed(2)),
          y: parseFloat((expectedReturn * 100).toFixed(2)),
          sharpe: parseFloat(sharpe.toFixed(2)),
          name: p.name,
          color: p.color,
        };
      }),
    [],
  );

  // User's portfolio scatter point
  const userScatterPoint = useMemo(
    () => [
      {
        x: parseFloat((stats.volatility * 100).toFixed(2)),
        y: parseFloat((stats.expectedReturn * 100).toFixed(2)),
        sharpe: parseFloat(stats.sharpe.toFixed(2)),
      },
    ],
    [stats],
  );

  // Iso-Sharpe line: y = RISK_FREE*100 + sharpe * x, spanning chart x-domain
  const isoSharpeLineData = useMemo(
    () =>
      [0, 3, 6, 9, 12, 15, 18, 21].map((x) => ({
        x,
        y: RISK_FREE * 100 + stats.sharpe * x,
      })),
    [stats.sharpe],
  );

  // Bar chart comparison data: all presets + user's portfolio
  const compareData = useMemo(() => {
    const base = COMPARE_PORTFOLIOS.map((p) => {
      const s = calcStats(p.usW, p.intlW, p.bondsW);
      return {
        name: p.name,
        color: p.color,
        return: parseFloat((s.expectedReturn * 100).toFixed(2)),
        volatility: parseFloat((s.volatility * 100).toFixed(2)),
        sharpe: parseFloat(s.sharpe.toFixed(3)),
      };
    });
    return [
      ...base,
      {
        name: "Your Portfolio",
        color: "#0070f3",
        return: parseFloat((stats.expectedReturn * 100).toFixed(2)),
        volatility: parseFloat((stats.volatility * 100).toFixed(2)),
        sharpe: parseFloat(stats.sharpe.toFixed(3)),
      },
    ];
  }, [stats]);

  const usDisplay = Math.round(usW * 100);
  const intlDisplay = Math.round(intlW * 100);
  const bondsDisplay = 100 - usDisplay - intlDisplay;

  return (
    <div className={retirementStyles.container}>
      <Header titleName="3-Fund Portfolio" />

      <main className={retirementStyles.main}>
        <h1>The 3-Fund Portfolio</h1>
        <p>
          The simplest, most diversified approach to long-term investing —
          recommended by Bogleheads. Adjust the sliders to see how US stocks,
          international stocks, and bonds affect expected return, risk, and
          long-term growth.
        </p>
      </main>

      <div className={retirementStyles.content}>
        {/* ── Inputs ───────────────────────────────────────────────────── */}
        <Form className={retirementStyles.form}>
          <p className={shared.sectionLabel}>Portfolio Allocation</p>

          <div className={styles.presets}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={styles.presetBtn}
                onClick={() => {
                  setStocksPct(p.stocksPct);
                  setUsPct(p.usPct);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Form.Label>
            Stocks{" "}
            <span className={shared.rateHint}>
              {stocksPct}% stocks · {100 - stocksPct}% bonds
            </span>
          </Form.Label>
          <Form.Range
            min={0}
            max={100}
            step={5}
            value={stocksPct}
            onChange={(e) => setStocksPct(Number(e.target.value))}
            className="mb-1"
          />
          <div className={`${styles.sliderEnds} mb-3`}>
            <span>All bonds</span>
            <span>All stocks</span>
          </div>

          {stocksPct > 0 && (
            <>
              <Form.Label>
                US share of stocks{" "}
                <span className={shared.rateHint}>
                  {usPct}% US · {100 - usPct}% international
                </span>
              </Form.Label>
              <Form.Range
                min={0}
                max={100}
                step={5}
                value={usPct}
                onChange={(e) => setUsPct(Number(e.target.value))}
                className="mb-1"
              />
              <div className={`${styles.sliderEnds} mb-3`}>
                <span>All international</span>
                <span>All US</span>
              </div>
            </>
          )}

          {/* Allocation bar */}
          <div className={styles.allocationBar}>
            {usDisplay > 0 && (
              <div className={styles.barUs} style={{ width: `${usDisplay}%` }}>
                {usDisplay >= 12 && <span>US {usDisplay}%</span>}
              </div>
            )}
            {intlDisplay > 0 && (
              <div
                className={styles.barIntl}
                style={{ width: `${intlDisplay}%` }}
              >
                {intlDisplay >= 12 && <span>Intl {intlDisplay}%</span>}
              </div>
            )}
            {bondsDisplay > 0 && (
              <div
                className={styles.barBonds}
                style={{ width: `${bondsDisplay}%` }}
              >
                {bondsDisplay >= 12 && <span>Bonds {bondsDisplay}%</span>}
              </div>
            )}
          </div>

          <p className={shared.sectionLabel} style={{ marginTop: "2rem" }}>
            Projection Settings
          </p>

          <Form.Label>Starting Amount</Form.Label>
          <InputGroup className="mb-3">
            <InputGroup.Text>$</InputGroup.Text>
            <Form.Control
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              value={initial}
              onChange={(e) =>
                setInitial(Math.max(0, parseFloat(e.target.value) || 0))
              }
            />
          </InputGroup>

          <Form.Label>Time Horizon</Form.Label>
          <Form.Select
            className="mb-3"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
          >
            {[5, 10, 15, 20, 25, 30, 35, 40].map((y) => (
              <option key={y} value={y}>
                {y} years
              </option>
            ))}
          </Form.Select>
        </Form>

        {/* ── Results ──────────────────────────────────────────────────── */}
        <div className={shared.results}>
          <p className={shared.sectionLabel}>Portfolio Statistics</p>

          <div className={shared.summaryCards}>
            <div className={shared.card}>
              <div className={shared.cardLabel}>Expected Annual Return</div>
              <div className={shared.cardValue}>
                {formatPercent(stats.expectedReturn)}
              </div>
              <div className={shared.cardSub}>weighted average</div>
            </div>
            <div className={shared.card}>
              <div className={shared.cardLabel}>Annual Volatility</div>
              <div className={shared.cardValue}>
                {formatPercent(stats.volatility)}
              </div>
              <div className={shared.cardSub}>std. deviation</div>
            </div>
            <div className={shared.card}>
              <div className={shared.cardLabel}>Sharpe Ratio</div>
              <div className={shared.cardValue}>{stats.sharpe.toFixed(2)}</div>
              <div className={shared.cardSub}>
                +{stats.sharpe.toFixed(2)}% above risk-free per 1% of volatility
              </div>
            </div>
          </div>

          {/* ── Chart toggle ─────────────────────────────────────────── */}
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
                Growth
              </ToggleButton>
              <ToggleButton
                id="view-risk"
                value="risk-return"
                variant="outline-primary"
              >
                Risk vs Return
              </ToggleButton>
              <ToggleButton
                id="view-compare"
                value="compare"
                variant="outline-primary"
              >
                Compare
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          {/* ── Chart 1: Growth Projection ───────────────────────────── */}
          {chartView === "growth" && (
            <div className={shared.chartWrap}>
              <p className={shared.chartNote}>
                Solid line is your portfolio median with 80% probability range
                (P10–P90). Dashed gray is Classic 3-Fund (60/20/20) as
                reference. {years}-year horizon, {formatCurrency(initial)} lump
                sum.
              </p>
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart
                  data={growthData}
                  margin={{ top: 8, right: 20, left: 10, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="year"
                    label={{
                      value: "Years",
                      position: "insideBottom",
                      offset: -12,
                    }}
                  />
                  <YAxis tickFormatter={formatChartDollar} width={65} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload as GrowthPoint;
                      if (!d) return null;
                      return (
                        <div className={styles.chartTooltip}>
                          <div className={styles.tooltipLabel}>
                            Year {label}
                          </div>
                          <div style={{ color: "#0070f3" }}>
                            Your Portfolio: {formatCurrency(d.median)}
                          </div>
                          <div className={styles.tooltipMuted}>
                            Range: {formatCurrency(d.p10)} –{" "}
                            {formatCurrency(d.p90)}
                          </div>
                          <div style={{ color: "#6c757d" }}>
                            Classic 3-Fund: {formatCurrency(d.threeFundMedian)}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend verticalAlign="top" />
                  <Area
                    dataKey="bandLow"
                    stackId="band"
                    fill="transparent"
                    stroke="none"
                    legendType="none"
                  />
                  <Area
                    dataKey="bandHeight"
                    stackId="band"
                    fill="#0070f3"
                    fillOpacity={0.15}
                    stroke="none"
                    name="P10–P90 range"
                  />
                  <Line
                    dataKey="median"
                    stroke="#0070f3"
                    strokeWidth={2}
                    dot={false}
                    name="Your Portfolio"
                  />
                  <Line
                    dataKey="threeFundMedian"
                    stroke="#6c757d"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Classic 3-Fund (60/20/20)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Chart 2: Risk vs Return Scatter ──────────────────────── */}
          {chartView === "risk-return" && (
            <div className={shared.chartWrap}>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart
                  margin={{ top: 50, right: 30, left: 10, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[3, 18]}
                    tickFormatter={(v) => `${v}%`}
                    label={{
                      value: "Annual Volatility (risk)",
                      position: "insideBottom",
                      offset: -20,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={[3.5, 11]}
                    tickFormatter={(v) => `${v}%`}
                    label={{
                      value: "Expected Return (%)",
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle" },
                      dx: -5,
                    }}
                    width={65}
                  />
                  <ZAxis range={[30, 30]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      if (!d) return null;
                      return (
                        <div className={styles.chartTooltip}>
                          {d.name && (
                            <div className={styles.tooltipLabel}>{d.name}</div>
                          )}
                          <div>Return: {(d.y as number).toFixed(1)}%</div>
                          <div>Volatility: {(d.x as number).toFixed(1)}%</div>
                          {d.sharpe != null && (
                            <div>Sharpe: {(d.sharpe as number).toFixed(2)}</div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend verticalAlign="top" />

                  {/* Iso-Sharpe line through user's portfolio */}
                  <Scatter
                    data={isoSharpeLineData}
                    line={{
                      stroke: "#0070f3",
                      strokeWidth: 1.5,
                      strokeDasharray: "6 3",
                      strokeOpacity: 0.5,
                    }}
                    shape={(props: { cx?: number; cy?: number }) => (
                      <circle cx={props.cx ?? 0} cy={props.cy ?? 0} r={0} />
                    )}
                    legendType="none"
                  />

                  {/* Feasible set background */}
                  <Scatter
                    data={frontierData}
                    fill="#adb5bd"
                    opacity={0.4}
                    legendType="none"
                    name="bg"
                  />

                  {/* Named comparison portfolios */}
                  {COMPARE_PORTFOLIOS.map((p) => {
                    const point = presetScatterData.find(
                      (d) => d.name === p.name,
                    )!;
                    return (
                      <Scatter
                        key={p.name}
                        name={p.name}
                        data={[point]}
                        fill={p.color}
                      />
                    );
                  })}

                  {/* Your portfolio */}
                  <Scatter
                    name="Your Portfolio"
                    data={userScatterPoint}
                    fill="#0070f3"
                    shape={(props: { cx?: number; cy?: number }) => (
                      <circle
                        cx={props.cx ?? 0}
                        cy={props.cy ?? 0}
                        r={9}
                        fill="#0070f3"
                        stroke="white"
                        strokeWidth={2}
                      />
                    )}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <p className={shared.chartNote}>
                Gray cloud = all possible 3-asset allocations. The blue dashed
                line passes through your portfolio — every point on it has the
                same Sharpe ratio ({stats.sharpe.toFixed(2)}). Portfolios above
                the line are more efficient. <strong>Sharpe</strong> = (return −
                4% risk-free) ÷ volatility.
              </p>
            </div>
          )}

          {/* ── Chart 3: Compare Portfolios ──────────────────────────── */}
          {chartView === "compare" && (
            <div className={shared.chartWrap}>
              <div className={styles.compareToggle}>
                <ToggleButtonGroup
                  type="radio"
                  name="compareMetric"
                  value={compareMetric}
                  onChange={(v: CompareMetric) => setCompareMetric(v)}
                  size="sm"
                >
                  <ToggleButton
                    id="metric-return"
                    value="return"
                    variant="outline-secondary"
                  >
                    Expected Return
                  </ToggleButton>
                  <ToggleButton
                    id="metric-vol"
                    value="volatility"
                    variant="outline-secondary"
                  >
                    Volatility
                  </ToggleButton>
                  <ToggleButton
                    id="metric-sharpe"
                    value="sharpe"
                    variant="outline-secondary"
                  >
                    Sharpe Ratio
                  </ToggleButton>
                </ToggleButtonGroup>
              </div>
              <p className={shared.chartNote}>
                {compareMetric === "return" &&
                  "Expected annual return for each allocation. Higher is better — but only in context of the risk taken."}
                {compareMetric === "volatility" &&
                  "Annual standard deviation (risk). Lower means a smoother, more predictable ride."}
                {compareMetric === "sharpe" &&
                  "Return earned per unit of risk (Sharpe ratio). Higher is better — it means more efficient use of risk."}
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={compareData}
                  margin={{ top: 8, right: 20, left: 10, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={false} axisLine={false} />
                  <YAxis
                    tickFormatter={(v) =>
                      compareMetric === "sharpe"
                        ? (v as number).toFixed(2)
                        : `${v}%`
                    }
                    width={55}
                  />
                  <Tooltip
                    formatter={(value) => [
                      compareMetric === "sharpe"
                        ? (value as number).toFixed(2)
                        : `${value}%`,
                      compareMetric === "return"
                        ? "Expected Return"
                        : compareMetric === "volatility"
                          ? "Volatility"
                          : "Sharpe Ratio",
                    ]}
                  />
                  <Bar dataKey={compareMetric} radius={[4, 4, 0, 0]}>
                    {compareData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className={styles.compareLegend}>
                {compareData.map((entry) => (
                  <div key={entry.name} className={styles.legendItem}>
                    <span
                      className={styles.legendSwatch}
                      style={{ background: entry.color }}
                    />
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Educational Section ──────────────────────────────────────────── */}
      <div className={styles.learnSection}>
        <p className={shared.sectionLabel}>Why Each Component?</p>
        <div className={styles.learnGrid}>
          <div className={styles.learnCard}>
            <div className={styles.learnCardHeader}>US Total Market</div>
            <p>
              Owns every publicly traded US company — thousands of stocks in one
              fund. Low cost and broadly diversified within the world&apos;s
              largest economy. Historically ~10% annual return but with
              meaningful year-to-year swings.
            </p>
            <p className={styles.learnFunds}>
              Example funds: VTI (Vanguard), FZROX (Fidelity), SWTSX (Schwab)
            </p>
          </div>
          <div className={styles.learnCard}>
            <div className={styles.learnCardHeader}>International Stocks</div>
            <p>
              Developed and emerging market companies outside the US. Reduces
              concentration risk — the US is only ~60% of world market cap.
              Different economic cycles mean international markets don&apos;t
              always move in lockstep with the US.
            </p>
            <p className={styles.learnFunds}>
              Example funds: VXUS (Vanguard), FZILX (Fidelity), SWISX (Schwab)
            </p>
          </div>
          <div className={styles.learnCard}>
            <div className={styles.learnCardHeader}>US Bonds</div>
            <p>
              Lower return, lower risk. Bonds tend to hold value (or rise) when
              stocks fall, providing stability and a rebalancing buffer. More
              bonds means smaller drawdowns — important when you&apos;re close
              to spending the money.
            </p>
            <p className={styles.learnFunds}>
              Example funds: BND (Vanguard), FXNAX (Fidelity), SWAGX (Schwab)
            </p>
          </div>
        </div>

        <p className={styles.assumptions}>
          <strong>Assumptions:</strong> US stocks: 10.0% avg return, 15.5%
          volatility · International: 9.0%, 16.5% (forward-looking; lower
          valuations suggest higher expected returns than recent history) ·
          Bonds: 4.0%, 6.0% · US-Intl correlation: 0.65 (long-run average;
          post-2008 correlation of ~0.75 overstates the diversification benefit)
          · Sharpe ratio uses 4% risk-free rate. Historical returns do not
          guarantee future results. Projection assumes a lump sum with no
          additional contributions.
        </p>
      </div>

      <Footer />
    </div>
  );
}
