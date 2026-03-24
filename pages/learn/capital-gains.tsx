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
  calcLtcgTax,
  getMarginalRateFromTable,
  BRACKETS_SINGLE_2026,
  BRACKETS_MFJ_2026,
  LTCG_BRACKETS_SINGLE_2026,
  LTCG_BRACKETS_MFJ_2026,
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
const COMBINED_COLOR = "#8e44ad";

const BRACKET_COLORS = [
  "#27ae60", // 10%
  "#2ecc71", // 12%
  "#f1c40f", // 22%
  "#e67e22", // 24%
  "#e74c3c", // 32%
  "#c0392b", // 35%
  "#8e44ad", // 37%
];

const LTCG_COLOR_0 = "#1abc9c"; // teal — 0% bracket
const LTCG_COLOR_15 = "#e67e22"; // orange — 15% bracket
const LTCG_COLOR_20 = "#c0392b"; // red — 20% bracket

function ltcgColor(rate: number): string {
  if (rate === 0) return LTCG_COLOR_0;
  if (rate === 0.15) return LTCG_COLOR_15;
  return LTCG_COLOR_20;
}

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

interface IncomeSegment {
  name: string;
  income: number;
  tax: number;
  rate: number;
  color: string;
  isMarginal: boolean;
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

/**
 * Compute how much of the standard deduction offsets gains.
 * Ordinary income gets the deduction first; any leftover shelters gains.
 */
function computeTaxableLtcg(
  ordinaryIncome: number,
  gains: number,
  stdDed: number,
): number {
  const deductionRemaining = Math.max(0, stdDed - ordinaryIncome);
  return Math.max(0, gains - deductionRemaining);
}

function buildIncomeSegments(
  ordinaryIncome: number,
  gains: number,
  filing: FilingStatus,
  table: RetirementTaxTable,
): IncomeSegment[] {
  const segments: IncomeSegment[] = [];
  const stdDed = table.standardDeduction;
  const totalIncome = ordinaryIncome + gains;

  // Standard deduction covers ordinary income first, then gains
  const dedAmount = Math.min(totalIncome, stdDed);
  if (dedAmount > 0) {
    segments.push({
      name: "Tax-free",
      income: Math.round(dedAmount),
      tax: 0,
      rate: 0,
      color: DEDUCTION_COLOR,
      isMarginal: false,
    });
  }

  // Ordinary income brackets
  const taxableOrdinary = Math.max(0, ordinaryIncome - stdDed);
  let bracketIndex = 0;
  for (const { min, max, rate } of table.brackets) {
    if (taxableOrdinary <= min) break;
    const incomeInBracket =
      Math.min(taxableOrdinary, max === Infinity ? taxableOrdinary : max) - min;
    if (incomeInBracket > 0) {
      segments.push({
        name: `${(rate * 100).toFixed(0)}% ordinary`,
        income: Math.round(incomeInBracket),
        tax: Math.round(incomeInBracket * rate),
        rate,
        color:
          BRACKET_COLORS[bracketIndex] ??
          BRACKET_COLORS[BRACKET_COLORS.length - 1],
        isMarginal: false,
      });
    }
    bracketIndex++;
  }

  // Mark the highest ordinary bracket as marginal
  const lastOrdinary = segments.findLast((s) => s.rate > 0);
  if (lastOrdinary) lastOrdinary.isMarginal = true;

  // LTCG / qualified dividend segments (taxable portion stacks on ordinary)
  const taxableLtcg = computeTaxableLtcg(ordinaryIncome, gains, stdDed);
  if (taxableLtcg > 0) {
    const ltcgBrackets =
      filing === "mfj" ? LTCG_BRACKETS_MFJ_2026 : LTCG_BRACKETS_SINGLE_2026;
    let remaining = taxableLtcg;
    for (const [min, max, rate] of ltcgBrackets) {
      if (taxableOrdinary >= max) continue;
      const room = max - Math.max(min, taxableOrdinary);
      const inBracket = Math.min(remaining, room);
      if (inBracket > 0) {
        const rateLabel = rate === 0 ? "0%" : rate === 0.15 ? "15%" : "20%";
        segments.push({
          name: `LTCG ${rateLabel}`,
          income: Math.round(inBracket),
          tax: Math.round(inBracket * rate),
          rate,
          color: ltcgColor(rate),
          isMarginal: false,
        });
        remaining -= inBracket;
      }
      if (remaining <= 0) break;
    }
  }

  return segments;
}

function buildRateCurve(
  gains: number,
  filing: FilingStatus,
  table: RetirementTaxTable,
  maxIncome: number,
): {
  income: number;
  ordinaryEffective: number;
  ordinaryMarginal: number;
  ltcgRate: number;
  combinedEffective: number;
}[] {
  const stdDed = table.standardDeduction;
  const ltcgBrackets =
    filing === "mfj" ? LTCG_BRACKETS_MFJ_2026 : LTCG_BRACKETS_SINGLE_2026;

  // Collect key boundary points: ordinary bracket transitions + LTCG stack boundaries
  const keyPoints = new Set<number>([0, stdDed]);
  for (const { max } of table.brackets) {
    if (max !== Infinity) {
      const g = stdDed + max;
      if (g < maxIncome) {
        keyPoints.add(g - 1);
        keyPoints.add(g);
        keyPoints.add(g + 1);
      }
    }
  }
  // Points where LTCG rate jumps (when taxableOrdinary crosses an LTCG threshold)
  for (const [min] of ltcgBrackets) {
    if (min > 0) {
      const g = stdDed + min;
      if (g < maxIncome) {
        keyPoints.add(g - 1);
        keyPoints.add(g);
        keyPoints.add(g + 1);
      }
    }
  }
  keyPoints.add(maxIncome);

  const sortedKeys = Array.from(keyPoints).sort((a, b) => a - b);
  const allPoints: number[] = [];
  for (let i = 0; i < sortedKeys.length - 1; i++) {
    const start = sortedKeys[i];
    const end = sortedKeys[i + 1];
    allPoints.push(start);
    const steps = 7;
    for (let s = 1; s < steps; s++) {
      allPoints.push(Math.round(start + ((end - start) * s) / steps));
    }
  }
  allPoints.push(sortedKeys[sortedKeys.length - 1]);

  return Array.from(new Set(allPoints))
    .sort((a, b) => a - b)
    .map((income) => {
      const taxableOrdinary = Math.max(0, income - stdDed);
      const taxableLtcg = computeTaxableLtcg(income, gains, stdDed);
      const ordTax = calcTaxFromTable(income, table);
      const lgTax = calcLtcgTax(taxableLtcg, taxableOrdinary, filing);

      const ordinaryEffective = income > 0 ? (ordTax / income) * 100 : 0;
      const ordinaryMarginal =
        income <= stdDed ? 0 : getMarginalRateFromTable(income, table) * 100;

      // Effective LTCG rate on total gains (including any portion sheltered by deduction)
      const ltcgRate = gains > 0 ? (lgTax / gains) * 100 : 0;

      const totalIncome = income + gains;
      const combinedEffective =
        totalIncome > 0 ? ((ordTax + lgTax) / totalIncome) * 100 : 0;

      return {
        income,
        ordinaryEffective,
        ordinaryMarginal,
        ltcgRate,
        combinedEffective,
      };
    });
}

// ─── Component ─────────────────────────────────────────────────────────────────

const DEFAULT_ORDINARY = 75000;
const DEFAULT_GAINS = 20000;

export default function CapitalGains() {
  const { contentStyle: tooltipStyle, labelStyle: tooltipLabelStyle } =
    useChartTooltipProps();

  const [filing, setFiling] = useState<FilingStatus>("single");
  const [ordinaryIncome, setOrdinaryIncome] = useState(DEFAULT_ORDINARY);
  const [gains, setGains] = useState(DEFAULT_GAINS);
  const [chartView, setChartView] = useState<ChartView>("breakdown");

  const clamp = (v: number, min: number, max: number) =>
    isNaN(v) ? min : Math.min(max, Math.max(min, v));

  const table = useMemo(() => makeTable(filing), [filing]);
  const stdDed = table.standardDeduction;

  const taxableOrdinary = Math.max(0, ordinaryIncome - stdDed);
  const taxableLtcg = computeTaxableLtcg(ordinaryIncome, gains, stdDed);

  const ordinaryTax = useMemo(
    () => calcTaxFromTable(ordinaryIncome, table),
    [ordinaryIncome, table],
  );
  const ltcgTax = useMemo(
    () => calcLtcgTax(taxableLtcg, taxableOrdinary, filing),
    [taxableLtcg, taxableOrdinary, filing],
  );

  const totalTax = ordinaryTax + ltcgTax;
  const totalIncome = ordinaryIncome + gains;
  const effectiveRate = totalIncome > 0 ? totalTax / totalIncome : 0;
  // Effective LTCG rate on total gains (including sheltered portion)
  const ltcgEffectiveRate = gains > 0 ? ltcgTax / gains : 0;
  const ordinaryMarginalRate =
    ordinaryIncome > stdDed
      ? getMarginalRateFromTable(ordinaryIncome, table)
      : 0;

  const segments = useMemo(
    () => buildIncomeSegments(ordinaryIncome, gains, filing, table),
    [ordinaryIncome, gains, filing, table],
  );

  const maxCurveIncome = useMemo(() => {
    const raw = Math.max(500_000, ordinaryIncome * 1.5);
    return Math.ceil(raw / 100_000) * 100_000;
  }, [ordinaryIncome]);

  const rateCurveData = useMemo(
    () => buildRateCurve(gains, filing, table, maxCurveIncome),
    [gains, filing, table, maxCurveIncome],
  );

  const ltcgThreshold =
    filing === "mfj"
      ? LTCG_BRACKETS_MFJ_2026[0][1]
      : LTCG_BRACKETS_SINGLE_2026[0][1];
  const ltcg20Threshold =
    filing === "mfj"
      ? LTCG_BRACKETS_MFJ_2026[1][1]
      : LTCG_BRACKETS_SINGLE_2026[1][1];

  function ltcgEffectiveColor(rate: number): string {
    if (rate === 0) return LTCG_COLOR_0;
    if (rate <= 0.15) return LTCG_COLOR_15;
    return LTCG_COLOR_20;
  }

  return (
    <div className={retirementStyles.container}>
      <Header titleName="Capital Gains & Qualified Dividends Tax" />

      <main className={retirementStyles.main}>
        <h1>Long-Term Capital Gains &amp; Qualified Dividends</h1>
        <p>
          Long-term capital gains (assets held over 1 year) and qualified
          dividends are taxed at preferential rates: 0%, 15%, or 20%. But your
          ordinary income fills the lower LTCG brackets first — see how both
          taxes combine in your situation.
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

          <Form.Label>Ordinary Income (wages, salary, etc.)</Form.Label>
          <TooltipOnHover
            text="Wages, salary, 1099 income, short-term capital gains, and other ordinary income before any deductions. Uses 2026 U.S. federal brackets."
            nest={
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(ordinaryIncome)}
                  onChange={(e) =>
                    setOrdinaryIncome(
                      clamp(parseFloat(e.target.value), 0, 10_000_000),
                    )
                  }
                />
                <InputGroup.Text>/ yr</InputGroup.Text>
              </InputGroup>
            }
          />

          <Form.Label>Long-Term Capital Gains / Qualified Dividends</Form.Label>
          <TooltipOnHover
            text="Gains from assets held longer than 1 year, plus qualified dividends from stocks and ETFs. These are taxed at special LTCG rates (0%, 15%, or 20%) instead of ordinary income rates."
            nest={
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(gains)}
                  onChange={(e) =>
                    setGains(clamp(parseFloat(e.target.value), 0, 10_000_000))
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
              <span className={styles.snapshotLabel}>
                Taxable Ordinary Income
              </span>
              <span className={styles.snapshotValue}>
                {formatCurrency(taxableOrdinary)}
              </span>
            </div>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>Taxable Gains</span>
              <span className={styles.snapshotValue}>
                {formatCurrency(taxableLtcg)}
              </span>
            </div>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>Ordinary Income Tax</span>
              <span className={styles.snapshotValue}>
                {formatCurrency(ordinaryTax)}
              </span>
            </div>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>
                LTCG / Qualified Div. Tax
              </span>
              <span className={styles.snapshotValue}>
                {formatCurrency(ltcgTax)}
              </span>
            </div>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>Total Federal Tax</span>
              <span className={styles.snapshotValue}>
                {formatCurrency(totalTax)}
              </span>
            </div>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>
                Combined Effective Rate
              </span>
              <span
                className={styles.snapshotValue}
                style={{ color: EFFECTIVE_COLOR }}
              >
                {totalIncome > 0 ? formatPercent(effectiveRate) : "0%"}
              </span>
            </div>
            <div className={styles.snapshotRow}>
              <span className={styles.snapshotLabel}>Your LTCG Rate</span>
              <span
                className={styles.snapshotValue}
                style={{
                  color:
                    gains > 0
                      ? ltcgEffectiveColor(ltcgEffectiveRate)
                      : undefined,
                }}
              >
                {gains > 0 ? formatPercent(ltcgEffectiveRate) : "—"}
              </span>
            </div>
          </div>
        </Form>

        {/* ── RESULTS ───────────────────────────────────────────────────────── */}
        <div className={shared.results}>
          <Alert variant="info" className="mb-3">
            {gains === 0 ? (
              <>
                Enter a long-term capital gains or qualified dividends amount to
                see how it interacts with your ordinary income taxes.
              </>
            ) : ltcgTax === 0 ? (
              <>
                Your {formatCurrency(gains)} in long-term gains / qualified
                dividends are taxed at{" "}
                <strong style={{ color: LTCG_COLOR_0 }}>0%</strong>.
                {ordinaryTax > 0 && (
                  <>
                    {" "}
                    Your ordinary income adds{" "}
                    <strong>{formatCurrency(ordinaryTax)}</strong> in federal
                    tax, for a combined effective rate of{" "}
                    <strong style={{ color: EFFECTIVE_COLOR }}>
                      {formatPercent(effectiveRate)}
                    </strong>
                    .
                  </>
                )}
              </>
            ) : (
              <>
                Your {formatCurrency(gains)} in long-term gains / qualified
                dividends are taxed at an effective LTCG rate of{" "}
                <strong
                  style={{ color: ltcgEffectiveColor(ltcgEffectiveRate) }}
                >
                  {formatPercent(ltcgEffectiveRate)}
                </strong>{" "}
                — versus{" "}
                <strong>
                  {ordinaryMarginalRate > 0
                    ? formatPercent(ordinaryMarginalRate)
                    : "0%"}
                </strong>{" "}
                if they were taxed as ordinary income.
              </>
            )}
          </Alert>

          {/* Summary cards */}
          <div className={shared.summaryCards}>
            <div className={shared.card}>
              <div className={shared.cardLabel}>Total Federal Tax</div>
              <div className={shared.cardValue}>{formatCurrency(totalTax)}</div>
              <div className={shared.cardSub}>
                {formatCurrency(Math.max(0, totalIncome - totalTax))} take-home
              </div>
            </div>
            <div className={shared.card}>
              <div className={shared.cardLabel}>Combined Effective Rate</div>
              <div
                className={shared.cardValue}
                style={{ color: EFFECTIVE_COLOR }}
              >
                {totalIncome > 0 ? formatPercent(effectiveRate) : "0%"}
              </div>
              <div className={shared.cardSub}>Average rate on all income</div>
            </div>
            <div className={shared.card}>
              <div className={shared.cardLabel}>Your LTCG Rate</div>
              <div
                className={shared.cardValue}
                style={{
                  color:
                    gains > 0
                      ? ltcgEffectiveColor(ltcgEffectiveRate)
                      : undefined,
                }}
              >
                {gains > 0 ? formatPercent(ltcgEffectiveRate) : "—"}
              </div>
              <div className={shared.cardSub}>
                {gains > 0
                  ? `${formatCurrency(ltcgTax)} in LTCG tax`
                  : "No gains entered"}
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
                id="view-breakdown"
                value="breakdown"
                variant="outline-primary"
              >
                Income Breakdown
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

          {/* Chart 1 — Income Breakdown */}
          {chartView === "breakdown" && (
            <div className={shared.chartWrap}>
              <h5 className="text-center mb-3">
                Your Combined Income &amp; Tax by Bracket
              </h5>

              {/* Custom legend */}
              <div className={styles.bracketLegend}>
                {segments.map((seg, i) => (
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

              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={segments}
                  margin={{ top: 4, right: 20, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
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
                        fill={segments[props.index]?.color}
                        fillOpacity={
                          segments[props.index]?.isMarginal ? 1 : 0.65
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
                        fill={segments[props.index]?.color}
                        fillOpacity={0.35}
                      />
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className={shared.chartNote}>
                Ordinary income brackets are shown first (green → red), then
                LTCG / qualified dividends (teal = 0%, orange = 15%, red = 20%).
                Taller bars = more income; shorter bars = tax owed.
              </p>
            </div>
          )}

          {/* Chart 2 — Rate Curves */}
          {chartView === "rates" && (
            <div className={shared.chartWrap}>
              <h5 className="text-center mb-3">
                How Ordinary Income Affects Your LTCG Rate
              </h5>
              <p
                className={shared.chartNote}
                style={{ marginBottom: "0.75rem" }}
              >
                With {formatCurrency(gains)} in long-term gains held fixed, see
                how earning more ordinary income pushes gains into higher LTCG
                brackets.
              </p>
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
                      value: "Ordinary Income",
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
                      `Ordinary Income: ${formatCurrency(income as number)}`
                    }
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Legend verticalAlign="top" />
                  <Area
                    type="monotone"
                    dataKey="ordinaryEffective"
                    name="Ordinary Effective Rate"
                    stroke={EFFECTIVE_COLOR}
                    fill={EFFECTIVE_COLOR}
                    fillOpacity={0.1}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="ltcgRate"
                    name="LTCG Rate on Gains"
                    stroke={LTCG_COLOR_0}
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="combinedEffective"
                    name="Combined Effective Rate"
                    stroke={COMBINED_COLOR}
                    fill={COMBINED_COLOR}
                    fillOpacity={0.08}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                  />
                  {ordinaryIncome > 0 && (
                    <ReferenceLine
                      x={ordinaryIncome}
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
                The teal step line shows your LTCG rate on gains — it jumps from
                0% → 15% → 20% as ordinary income rises past the LTCG
                thresholds. Your ordinary income uses up the low-rate space
                first.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── EDUCATIONAL SECTION ───────────────────────────────────────────────── */}
      <div className={styles.learnSection}>
        <h2 className="text-center mb-4">
          Understanding Capital Gains &amp; Qualified Dividends
        </h2>
        <div className={styles.learnGrid}>
          <div className={styles.learnCard}>
            <h4>Long-Term vs Short-Term</h4>
            <p>
              <strong>Long-term capital gains</strong> (assets held &gt; 1 year)
              and <strong>qualified dividends</strong> are taxed at preferential
              rates: 0%, 15%, or 20%.
            </p>
            <p>
              <strong>Short-term gains</strong> (assets held ≤ 1 year) are taxed
              as ordinary income — the same as your salary. Holding investments
              longer than a year can dramatically lower your tax bill.
            </p>
          </div>
          <div className={styles.learnCard}>
            <h4>The 0% Bracket</h4>
            <p>
              If your total taxable income (ordinary + gains) stays below{" "}
              <strong>
                {formatCurrency(ltcgThreshold)} (
                {filing === "mfj" ? "MFJ" : "single"}, 2026)
              </strong>
              , your long-term gains and qualified dividends are taxed at{" "}
              <strong style={{ color: LTCG_COLOR_0 }}>0%</strong>.
            </p>
            <p>
              Early retirees, gap-year takers, and low-income years can harvest
              gains tax-free by staying in this bracket — a powerful strategy.
            </p>
          </div>
          <div className={styles.learnCard}>
            <h4>The Stacking Effect</h4>
            <p>
              Ordinary income fills the LTCG brackets first. Once taxable
              ordinary income exceeds{" "}
              <strong>{formatCurrency(ltcgThreshold)}</strong>, every dollar of
              gains is taxed at 15%. Above{" "}
              <strong>{formatCurrency(ltcg20Threshold)}</strong>, it&apos;s 20%.
            </p>
            <p>
              This means the same {formatCurrency(gains)} gain can cost{" "}
              {formatCurrency(0)}, {formatCurrency(gains * 0.15)}, or{" "}
              {formatCurrency(gains * 0.2)} in federal taxes depending entirely
              on your ordinary income level.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
