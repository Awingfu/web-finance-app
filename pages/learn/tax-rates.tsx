import { useState, useMemo } from "react";
import {
  Alert,
  Form,
  InputGroup,
  ToggleButton,
  ToggleButtonGroup,
} from "react-bootstrap";
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Rectangle,
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
  calcTaxFromTable,
  getMarginalRateFromTable,
  BRACKETS_SINGLE_2026,
  BRACKETS_MFJ_2026,
  STD_DEDUCTION_SINGLE_2026,
  STD_DEDUCTION_MFJ_2026,
} from "../../src/utils/retirement_tax_tables";
import type {
  FilingStatus,
  RetirementTaxTable,
} from "../../src/utils/retirement_tax_tables";
import retirementStyles from "../../styles/Retirement.module.scss";
import shared from "../../styles/shared.module.scss";
import styles from "../../styles/TaxRates.module.scss";

// ─── Colors ────────────────────────────────────────────────────────────────────

const DEDUCTION_COLOR = "#95a5a6";
const EFFECTIVE_COLOR = "#3498db";
const MARGINAL_COLOR = "#e74c3c";

// One color per bracket tier, green → red as rates rise
const BRACKET_COLORS = [
  "#27ae60", // 10%
  "#2ecc71", // 12%
  "#f1c40f", // 22%
  "#e67e22", // 24%
  "#e74c3c", // 32%
  "#c0392b", // 35%
  "#8e44ad", // 37%
];

// ─── Formatters ────────────────────────────────────────────────────────────────

const formatChartDollar = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}k`
      : `$${v.toFixed(0)}`;

const formatRateTick = (v: number) => `${v.toFixed(0)}%`;

// ─── Types ─────────────────────────────────────────────────────────────────────

type ChartView = "breakdown" | "rates";

interface BracketSegment {
  name: string;
  income: number;
  tax: number;
  rate: number;
  isMarginal: boolean;
  color: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeTable(filing: FilingStatus): RetirementTaxTable {
  return {
    id: `federal_2026_${filing}`,
    name: `2026 Federal`,
    description: "2026 U.S. federal income tax brackets",
    standardDeduction:
      filing === "mfj" ? STD_DEDUCTION_MFJ_2026 : STD_DEDUCTION_SINGLE_2026,
    brackets: filing === "mfj" ? BRACKETS_MFJ_2026 : BRACKETS_SINGLE_2026,
  };
}

function buildBracketSegments(
  grossIncome: number,
  table: RetirementTaxTable,
): BracketSegment[] {
  const segments: BracketSegment[] = [];
  const stdDed = table.standardDeduction;
  const dedAmount = Math.min(grossIncome, stdDed);

  if (dedAmount > 0) {
    segments.push({
      name: "Tax-free",
      income: Math.round(dedAmount),
      tax: 0,
      rate: 0,
      isMarginal: false,
      color: DEDUCTION_COLOR,
    });
  }

  const taxable = Math.max(0, grossIncome - stdDed);
  let bracketIndex = 0;

  for (const { min, max, rate } of table.brackets) {
    if (taxable <= min) break;
    const incomeInBracket =
      Math.min(taxable, max === Infinity ? taxable : max) - min;
    segments.push({
      name: `${(rate * 100).toFixed(0)}%`,
      income: Math.round(incomeInBracket),
      tax: Math.round(incomeInBracket * rate),
      rate,
      isMarginal: false,
      color:
        BRACKET_COLORS[bracketIndex] ??
        BRACKET_COLORS[BRACKET_COLORS.length - 1],
    });
    bracketIndex++;
  }

  // Last bracket segment (not the deduction) is the marginal one
  const lastBracket = segments.findLast((s) => s.rate > 0);
  if (lastBracket) lastBracket.isMarginal = true;

  return segments;
}

function buildRateCurve(
  table: RetirementTaxTable,
  maxIncome: number,
): { income: number; effectiveRate: number; marginalRate: number }[] {
  const stdDed = table.standardDeduction;

  // Key boundary points (gross income at which bracket changes)
  const keyPoints = new Set<number>([0, stdDed]);
  for (const { max } of table.brackets) {
    if (max !== Infinity) {
      const grossBoundary = stdDed + max;
      if (grossBoundary < maxIncome) {
        keyPoints.add(grossBoundary - 1);
        keyPoints.add(grossBoundary);
        keyPoints.add(grossBoundary + 1);
      }
    }
  }
  keyPoints.add(maxIncome);

  // Add interpolation points between boundaries
  const sortedKeys = Array.from(keyPoints).sort((a, b) => a - b);
  const allPoints: number[] = [];
  for (let i = 0; i < sortedKeys.length - 1; i++) {
    const start = sortedKeys[i];
    const end = sortedKeys[i + 1];
    allPoints.push(start);
    const steps = 8;
    for (let s = 1; s < steps; s++) {
      allPoints.push(Math.round(start + ((end - start) * s) / steps));
    }
  }
  allPoints.push(sortedKeys[sortedKeys.length - 1]);

  return Array.from(new Set(allPoints))
    .sort((a, b) => a - b)
    .map((income) => {
      const tax = calcTaxFromTable(income, table);
      const effectiveRate = income > 0 ? (tax / income) * 100 : 0;
      const marginalRate =
        income <= stdDed ? 0 : getMarginalRateFromTable(income, table) * 100;
      return { income, effectiveRate, marginalRate };
    });
}

// ─── Component ─────────────────────────────────────────────────────────────────

const DEFAULT_INCOME = 85000;

export default function TaxRates() {
  const { contentStyle: tooltipStyle, labelStyle: tooltipLabelStyle } =
    useChartTooltipProps();

  const [filing, setFiling] = useState<FilingStatus>("single");
  const [grossIncome, setGrossIncome] = useState(DEFAULT_INCOME);
  const [chartView, setChartView] = useState<ChartView>("breakdown");

  const clamp = (v: number, min: number, max: number) =>
    isNaN(v) ? min : Math.min(max, Math.max(min, v));

  const table = useMemo(() => makeTable(filing), [filing]);

  const totalTax = useMemo(
    () => calcTaxFromTable(grossIncome, table),
    [grossIncome, table],
  );
  const stdDed = table.standardDeduction;
  const taxableIncome = Math.max(0, grossIncome - stdDed);
  const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;
  const marginalRate =
    grossIncome > stdDed ? getMarginalRateFromTable(grossIncome, table) : 0;
  const takeHome = grossIncome - totalTax;

  const breakdownData = useMemo(
    () => buildBracketSegments(grossIncome, table),
    [grossIncome, table],
  );

  const maxCurveIncome = useMemo(() => {
    const raw = Math.max(500_000, grossIncome * 1.5);
    return Math.ceil(raw / 100_000) * 100_000;
  }, [grossIncome]);

  const rateCurveData = useMemo(
    () => buildRateCurve(table, maxCurveIncome),
    [table, maxCurveIncome],
  );

  const isBelowDeduction = grossIncome <= stdDed;
  const flatTax = marginalRate > 0 ? grossIncome * marginalRate : null;
  const bracketSavings = flatTax !== null ? flatTax - totalTax : null;

  return (
    <div className={retirementStyles.container}>
      <Header titleName="How Federal Income Tax Works" />

      <main className={retirementStyles.main}>
        <h1>How Federal Income Tax Works</h1>
        <p>
          Federal income tax is progressive: each dollar is only taxed at the
          rate for that slice of income. Being in the 22% bracket doesn&apos;t
          mean paying 22% on everything — see why your effective rate is always
          lower than your marginal rate.
        </p>
      </main>

      <div className={retirementStyles.content}>
        {/* ── FORM ──────────────────────────────────────────────────────────── */}
        <Form className={retirementStyles.form}>
          <p className={shared.sectionLabel}>Your Situation</p>

          <Form.Label>Filing Status</Form.Label>
          <Form.Select
            className="mb-3"
            value={filing}
            onChange={(e) => setFiling(e.target.value as FilingStatus)}
          >
            <option value="single">Single</option>
            <option value="mfj">Married Filing Jointly</option>
          </Form.Select>

          <Form.Label>Annual Gross Income</Form.Label>
          <TooltipOnHover
            text="Your total gross income before any deductions or taxes. Uses 2026 U.S. federal brackets."
            nest={
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(grossIncome)}
                  onChange={(e) =>
                    setGrossIncome(
                      clamp(parseFloat(e.target.value), 0, 10_000_000),
                    )
                  }
                />
                <InputGroup.Text>/ yr</InputGroup.Text>
              </InputGroup>
            }
          />

          <p className={shared.sectionLabel}>2026 Tax Snapshot</p>

          <div className={styles.taxSnapshot}>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>Standard Deduction</span>
              <span className={styles.snapshotValue}>
                {formatCurrency(stdDed)}
              </span>
            </div>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>Taxable Income</span>
              <span className={styles.snapshotValue}>
                {formatCurrency(taxableIncome)}
              </span>
            </div>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>Total Federal Tax</span>
              <span className={styles.snapshotValue}>
                {formatCurrency(totalTax)}
              </span>
            </div>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>Effective Rate</span>
              <span
                className={styles.snapshotValue}
                style={{ color: EFFECTIVE_COLOR }}
              >
                {isBelowDeduction ? "0%" : formatPercent(effectiveRate)}
              </span>
            </div>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>Marginal Rate</span>
              <span
                className={styles.snapshotValue}
                style={{ color: MARGINAL_COLOR }}
              >
                {marginalRate > 0 ? formatPercent(marginalRate) : "0%"}
              </span>
            </div>
          </div>
        </Form>

        {/* ── RESULTS ───────────────────────────────────────────────────────── */}
        <div className={shared.results}>
          <Alert variant="info" className="mb-3">
            {isBelowDeduction ? (
              <>
                Your income ({formatCurrency(grossIncome)}) is fully covered by
                the standard deduction.{" "}
                <strong>You owe $0 in federal income tax.</strong>
              </>
            ) : (
              <>
                Your{" "}
                <strong style={{ color: MARGINAL_COLOR }}>
                  marginal rate is {formatPercent(marginalRate)}
                </strong>
                , but your{" "}
                <strong style={{ color: EFFECTIVE_COLOR }}>
                  effective rate is only {formatPercent(effectiveRate)}
                </strong>
                .
                {bracketSavings !== null && bracketSavings > 100 && (
                  <>
                    {" "}
                    That&apos;s{" "}
                    <strong>{formatCurrency(bracketSavings)}</strong> less than
                    a flat {formatPercent(marginalRate)} tax on your full
                    income.
                  </>
                )}
              </>
            )}
          </Alert>

          {/* Summary cards */}
          <div className={shared.summaryCards}>
            <div className={shared.card}>
              <div className={shared.cardLabel}>Total Federal Tax</div>
              <div className={shared.cardValue}>{formatCurrency(totalTax)}</div>
              <div className={shared.cardSub}>
                {formatCurrency(takeHome)} take-home
              </div>
            </div>
            <div className={shared.card}>
              <div className={shared.cardLabel}>Effective Rate</div>
              <div
                className={shared.cardValue}
                style={{ color: EFFECTIVE_COLOR }}
              >
                {isBelowDeduction ? "0%" : formatPercent(effectiveRate)}
              </div>
              <div className={shared.cardSub}>Average rate on all income</div>
            </div>
            <div className={shared.card}>
              <div className={shared.cardLabel}>Marginal Rate</div>
              <div
                className={shared.cardValue}
                style={{ color: MARGINAL_COLOR }}
              >
                {marginalRate > 0 ? formatPercent(marginalRate) : "0%"}
              </div>
              <div className={shared.cardSub}>Rate on your next dollar</div>
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
                id="view-breakdown"
                value="breakdown"
                variant="outline-primary"
              >
                Bracket Breakdown
              </ToggleButton>
              <ToggleButton
                id="view-rates"
                value="rates"
                variant="outline-primary"
              >
                Rate Curves
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          {/* Chart 1 — Bracket Breakdown */}
          {chartView === "breakdown" && (
            <div className={shared.chartWrap}>
              <h5 className="text-center mb-3">
                How Your Income Is Taxed by Bracket
              </h5>

              {/* Custom legend */}
              <div className={styles.bracketLegend}>
                {breakdownData.map((seg, i) => (
                  <div key={i} className={styles.legendItem}>
                    <span
                      className={styles.legendSwatch}
                      style={{
                        backgroundColor: seg.color,
                        opacity: seg.isMarginal ? 1 : 0.65,
                      }}
                    />
                    <span>
                      {seg.name}
                      {seg.isMarginal && (
                        <span className={styles.marginalTag}> ← marginal</span>
                      )}
                    </span>
                  </div>
                ))}
                <div className={styles.legendOpacityHint}>
                  <span className={styles.legendSwatchPair}>
                    <span
                      className={styles.legendSwatch}
                      style={{ backgroundColor: "#888", opacity: 0.8 }}
                    />
                    <span
                      className={styles.legendSwatch}
                      style={{ backgroundColor: "#888", opacity: 0.3 }}
                    />
                  </span>
                  <span>income · tax</span>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={360}>
                <BarChart
                  data={breakdownData}
                  margin={{ top: 4, right: 20, left: 10, bottom: 10 }}
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
                    itemStyle={tooltipLabelStyle}
                  />
                  <Bar
                    dataKey="income"
                    name="Income in bracket"
                    radius={[4, 4, 0, 0]}
                    shape={(props: BarShapeProps) => (
                      <Rectangle
                        {...props}
                        fill={breakdownData[props.index]?.color}
                        fillOpacity={
                          breakdownData[props.index]?.isMarginal ? 1 : 0.65
                        }
                      />
                    )}
                  />
                  <Bar
                    dataKey="tax"
                    name="Tax owed"
                    radius={[4, 4, 0, 0]}
                    shape={(props: BarShapeProps) => (
                      <Rectangle
                        {...props}
                        fill={breakdownData[props.index]?.color}
                        fillOpacity={0.35}
                      />
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className={shared.chartNote}>
                Taller bars = income in that bracket. Shorter bars = tax owed
                from that bracket. Only income <em>within</em> your top bracket
                is taxed at your marginal rate (
                {marginalRate > 0 ? formatPercent(marginalRate) : "0%"}).
              </p>
            </div>
          )}

          {/* Chart 2 — Rate Curves */}
          {chartView === "rates" && (
            <div className={shared.chartWrap}>
              <h5 className="text-center mb-3">
                Effective vs Marginal Rate as Income Rises
              </h5>
              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart
                  data={rateCurveData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 28 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="income"
                    type="number"
                    domain={[0, maxCurveIncome]}
                    tickFormatter={formatChartDollar}
                    label={{
                      value: "Gross Income",
                      position: "insideBottom",
                      offset: -14,
                    }}
                  />
                  <YAxis
                    tickFormatter={formatRateTick}
                    domain={[0, 40]}
                    width={45}
                  />
                  <Tooltip
                    formatter={(
                      value: number | undefined,
                      name: string | undefined,
                    ) => [`${(value ?? 0).toFixed(1)}%`, name ?? ""]}
                    labelFormatter={(income) =>
                      `Income: ${formatCurrency(income as number)}`
                    }
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Legend verticalAlign="top" />
                  <Area
                    type="monotone"
                    dataKey="effectiveRate"
                    name="Effective Rate"
                    stroke={EFFECTIVE_COLOR}
                    fill={EFFECTIVE_COLOR}
                    fillOpacity={0.15}
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="marginalRate"
                    name="Marginal Rate"
                    stroke={MARGINAL_COLOR}
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="6 3"
                  />
                  {grossIncome > 0 && (
                    <ReferenceLine
                      x={grossIncome}
                      stroke="#888"
                      strokeDasharray="4 3"
                      label={{
                        value: "Your income",
                        position: "insideTopRight",
                        fontSize: 11,
                        fill: "#888",
                      }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
              <p className={shared.chartNote}>
                The{" "}
                <span style={{ color: EFFECTIVE_COLOR }}>effective rate</span>{" "}
                (solid) rises smoothly. The{" "}
                <span style={{ color: MARGINAL_COLOR }}>marginal rate</span>{" "}
                (dashed) jumps at each bracket boundary. The gap between them is
                the benefit of progressive taxation — lower dollars are always
                taxed at lower rates.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── EDUCATIONAL SECTION ───────────────────────────────────────────────── */}
      <div className={styles.learnSection}>
        <h2 className="text-center mb-4">Understanding Tax Rates</h2>
        <div className={styles.learnGrid}>
          <div className={styles.learnCard}>
            <h4>Marginal Rate</h4>
            <p>
              Your <strong>marginal rate</strong> is the tax rate on your{" "}
              <em>next dollar</em> of income. If you&apos;re in the 22% bracket,
              earning one more dollar costs you 22¢ in federal taxes.
            </p>
            <p>
              Use it for decisions like: &ldquo;How much more will I take home
              from a raise?&rdquo; or &ldquo;How much does a Traditional 401k
              contribution save me this year?&rdquo;
            </p>
          </div>
          <div className={styles.learnCard}>
            <h4>Effective Rate</h4>
            <p>
              Your <strong>effective rate</strong> is your total tax bill
              divided by your gross income. It reflects what you{" "}
              <em>actually</em> pay on average — and it&apos;s always lower than
              your marginal rate.
            </p>
            <p>
              Use it to understand your overall tax burden, compare
              year-over-year, or plan your budget around the total tax owed.
            </p>
          </div>
          <div className={styles.learnCard}>
            <h4>The Bracket Myth</h4>
            <p>
              A common fear: &ldquo;If I earn one more dollar and move into the
              22% bracket, all my income gets taxed at 22%.&rdquo;{" "}
              <strong>This is false.</strong>
            </p>
            <p>
              Only the dollars <em>within</em> each bracket are taxed at that
              bracket&apos;s rate. Lower brackets fill first. Moving up a
              bracket never reduces your take-home pay.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
