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
  ResponsiveContainer,
} from "recharts";
import { Header, Footer, TooltipOnHover } from "../../src/components";
import {
  formatCurrency,
  formatPercent,
  formatStateValue,
} from "../../src/utils";
import { calcWhyRetirementAccount } from "../../src/utils/why_retirement_account_utils";
import type { WhyRetirementInputs } from "../../src/utils/why_retirement_account_utils";
import retirementStyles from "../../styles/Retirement.module.scss";
import styles from "../../styles/WhyRetirementAccount.module.scss";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROTH_COLOR = "#2ecc71";
const TRAD_COLOR = "#3498db";
const TAXABLE_COLOR = "#e74c3c";
const TAX_COLOR = "#c0392b";
const EARLY_PENALTY_AGE = 60;

const formatChartDollar = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}k`
      : `$${v.toFixed(0)}`;

type ChartView = "growth" | "tax-impact";

// ─── 2026 tax bracket range lookup ────────────────────────────────────────────
// Gross income = taxable income + standard deduction ($15k single / $30k MFJ).
// Ranges shown to users so they can self-identify their bracket.

interface BracketRange {
  rate: number;
  single: string;
  mfj: string;
}

const ORDINARY_BRACKETS: BracketRange[] = [
  { rate: 0.1, single: "$15,000 – $26,925", mfj: "$30,000 – $53,850" },
  { rate: 0.12, single: "$26,925 – $63,475", mfj: "$53,850 – $126,950" },
  { rate: 0.22, single: "$63,475 – $118,350", mfj: "$126,950 – $236,700" },
  { rate: 0.24, single: "$118,350 – $212,300", mfj: "$236,700 – $424,600" },
  { rate: 0.32, single: "$212,300 – $265,525", mfj: "$424,600 – $531,050" },
  { rate: 0.35, single: "$265,525 – $641,350", mfj: "$531,050 – $781,600" },
  { rate: 0.37, single: "$641,350+", mfj: "$781,600+" },
];

// LTCG thresholds are against total taxable income; gross = taxable + std deduction.
const LTCG_BRACKETS: BracketRange[] = [
  { rate: 0.0, single: "up to $63,350", mfj: "up to $126,700" },
  { rate: 0.15, single: "$63,350 – $548,400", mfj: "$126,700 – $630,050" },
  { rate: 0.2, single: "$548,400+", mfj: "$630,050+" },
];

function bracketSubtitle(brackets: BracketRange[], rate: number): string {
  const b = brackets.find((x) => x.rate === rate);
  if (!b) return "";
  const pct = `${Math.round(b.rate * 100)}%`;
  return `Single ${pct} bracket: ${b.single}  ·  Married ${pct} bracket: ${b.mfj}`;
}

// ─── Default inputs ────────────────────────────────────────────────────────────

const DEFAULT_INPUTS: WhyRetirementInputs = {
  currentAge: 25,
  retirementAge: 65,
  annualAfterTaxContrib: 6000,
  currentMarginalRate: 0.22,
  retirementOrdinaryRate: 0.12,
  ltcgRate: 0.15,
  totalReturnRate: 0.1,
  dividendYield: 0.015,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function WhyRetirementAccount() {
  const [inputs, setInputs] = useState<WhyRetirementInputs>(DEFAULT_INPUTS);
  const [chartView, setChartView] = useState<ChartView>("growth");

  const setField = <K extends keyof WhyRetirementInputs>(
    key: K,
    value: WhyRetirementInputs[K],
  ) => setInputs((prev) => ({ ...prev, [key]: value }));

  const clamp = (v: number, min: number, max: number) =>
    isNaN(v) ? min : Math.min(max, Math.max(min, v));

  const result = useMemo(() => calcWhyRetirementAccount(inputs), [inputs]);

  const years = inputs.retirementAge - inputs.currentAge;
  const rothSavingsYears =
    result.rothVsTaxableAdvantage > 0 && inputs.annualAfterTaxContrib > 0
      ? Math.round(result.rothVsTaxableAdvantage / inputs.annualAfterTaxContrib)
      : 0;

  // Build tax-impact bar chart data
  const taxImpactData = useMemo(() => {
    const {
      finalRoth,
      finalTradAfterTax,
      finalTaxableAfterTax,
      totalOutOfPocket,
    } = result;

    const tradGross =
      result.yearlyData[result.yearlyData.length - 1]?.traditional ?? 0;
    const taxableGross =
      result.yearlyData[result.yearlyData.length - 1]?.taxable ?? 0;
    const taxableCostBasis =
      result.yearlyData[result.yearlyData.length - 1]?.taxableCostBasis ?? 0;

    const tradTaxes = tradGross - finalTradAfterTax;
    const taxableGains = Math.max(0, taxableGross - taxableCostBasis);
    const taxableTaxes = taxableGains * inputs.ltcgRate;
    // Approximate annual dividend tax drag over the period
    const taxableDividendDrag =
      taxableGross - finalTaxableAfterTax - taxableTaxes;

    return [
      {
        account: "Roth",
        contributions: totalOutOfPocket,
        taxFreeGains: Math.max(0, finalRoth - totalOutOfPocket),
        taxedGains: 0,
        taxes: 0,
      },
      {
        account: "Traditional",
        contributions: totalOutOfPocket,
        taxFreeGains: 0,
        taxedGains: Math.max(0, finalTradAfterTax - totalOutOfPocket),
        taxes: tradTaxes,
      },
      {
        account: "Taxable Brokerage",
        contributions: totalOutOfPocket,
        taxFreeGains: 0,
        taxedGains: Math.max(0, finalTaxableAfterTax - totalOutOfPocket),
        taxes: taxableTaxes + Math.max(0, taxableDividendDrag),
      },
    ];
  }, [result, inputs.ltcgRate]);

  // After-tax values at every age so all three lines are directly comparable.
  // Traditional: apply withdrawal tax rate (+ 10% penalty pre-60) to the gross balance.
  // Roth: 10% penalty on earnings only before age 59.5; contributions always penalty-free.
  // Taxable: subtract LTCG owed on unrealized gains (as if sold that year); no early penalty.
  const afterTaxData = useMemo(
    () =>
      result.yearlyData.map((d, i) => {
        const earlyPenalty = d.age < EARLY_PENALTY_AGE;
        const rothContributions = inputs.annualAfterTaxContrib * i;
        const rothEarnings = Math.max(0, d.roth - rothContributions);
        return {
          age: d.age,
          roth: d.roth - (earlyPenalty ? 0.1 * rothEarnings : 0),
          traditional:
            d.traditional *
            (1 - inputs.retirementOrdinaryRate - (earlyPenalty ? 0.1 : 0)),
          taxable:
            d.taxable -
            Math.max(0, d.taxable - d.taxableCostBasis) * inputs.ltcgRate,
        };
      }),
    [
      result.yearlyData,
      inputs.retirementOrdinaryRate,
      inputs.ltcgRate,
      inputs.annualAfterTaxContrib,
    ],
  );

  return (
    <div className={retirementStyles.container}>
      <Header titleName="Why Retirement Account?" />

      <main className={retirementStyles.main}>
        <h1>Why Use a Retirement Account?</h1>
        <p>
          See how Roth and Traditional 401k/IRA accounts beat taxable brokerage
          investing through tax-free or tax-deferred compounding. The same
          out-of-pocket investment grows significantly more when shielded from
          annual tax drag.
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

          {/* ── Contributions ── */}
          <p className={styles.sectionLabel}>Contributions</p>

          <Form.Label>Annual After-Tax Contribution</Form.Label>
          <TooltipOnHover
            text="The out-of-pocket cash you invest per year. All three accounts use this same amount from your pocket. The Traditional account's actual contribution is grossed up to account for the tax deduction."
            nest={
              <InputGroup className="mb-1 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.annualAfterTaxContrib)}
                  onChange={(e) =>
                    setField(
                      "annualAfterTaxContrib",
                      clamp(parseFloat(e.target.value), 0, 1_000_000),
                    )
                  }
                />
                <InputGroup.Text>/ yr</InputGroup.Text>
              </InputGroup>
            }
          />
          <p className={styles.rateHint}>
            Traditional pre-tax contribution:{" "}
            <strong>{formatCurrency(result.tradPreTaxContrib)}</strong> (
            {formatCurrency(inputs.annualAfterTaxContrib)} /{" "}
            {formatPercent(1 - inputs.currentMarginalRate)})
          </p>

          {/* ── Tax Rates ── */}
          <p className={styles.sectionLabel}>Tax Rates</p>

          <div className={styles.twoCol}>
            <div className={styles.col}>
              <Form.Label>Current Marginal Rate</Form.Label>
              <TooltipOnHover
                text="Your current federal marginal income tax rate. Used to gross up the Traditional contribution — contributing pre-tax means your actual deposit is larger for the same take-home cost."
                nest={
                  <Form.Select
                    className="mb-1"
                    value={inputs.currentMarginalRate}
                    onChange={(e) =>
                      setField(
                        "currentMarginalRate",
                        parseFloat(e.target.value),
                      )
                    }
                  >
                    {ORDINARY_BRACKETS.map((b) => (
                      <option key={b.rate} value={b.rate}>
                        {Math.round(b.rate * 100)}%
                      </option>
                    ))}
                  </Form.Select>
                }
              />
              <p className={styles.rateHint}>
                {bracketSubtitle(ORDINARY_BRACKETS, inputs.currentMarginalRate)}
              </p>
            </div>
            <div className={styles.col}>
              <Form.Label>Expected Retirement Tax Rate</Form.Label>
              <TooltipOnHover
                text="The ordinary income tax rate you expect to pay on Traditional withdrawals in retirement. If this equals your current rate, Roth and Traditional end up equal after tax."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(
                        Math.round(inputs.retirementOrdinaryRate * 10000) / 100,
                      )}
                      onChange={(e) =>
                        setField(
                          "retirementOrdinaryRate",
                          clamp(parseFloat(e.target.value), 0, 99) / 100,
                        )
                      }
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                }
              />
            </div>
          </div>

          <Form.Label>Long-Term Capital Gains Rate</Form.Label>
          <TooltipOnHover
            text="Applied to qualified dividends taxed annually in the brokerage, and to gains at sale. Based on total taxable income including LTCG."
            nest={
              <Form.Select
                className="mb-1"
                value={inputs.ltcgRate}
                onChange={(e) =>
                  setField("ltcgRate", parseFloat(e.target.value))
                }
              >
                {LTCG_BRACKETS.map((b) => (
                  <option key={b.rate} value={b.rate}>
                    {Math.round(b.rate * 100)}%
                  </option>
                ))}
              </Form.Select>
            }
          />
          <p className={styles.rateHint}>
            {bracketSubtitle(LTCG_BRACKETS, inputs.ltcgRate)}
          </p>

          {/* ── Return Assumptions ── */}
          <p className={styles.sectionLabel}>Return Assumptions</p>

          <div className={styles.twoCol}>
            <div className={styles.col}>
              <Form.Label>Total Annual Return</Form.Label>
              <TooltipOnHover
                text="Expected average annual return for a diversified portfolio. The S&P 500 has returned ~10% annually over the long run."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(
                        Math.round(inputs.totalReturnRate * 10000) / 100,
                      )}
                      onChange={(e) =>
                        setField(
                          "totalReturnRate",
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
              <Form.Label>Dividend Yield</Form.Label>
              <TooltipOnHover
                text="Portion of total return paid as dividends, taxed annually in the brokerage account. Lower yield = less annual tax drag. Broad market index funds yield ~1.5%."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(
                        Math.round(inputs.dividendYield * 10000) / 100,
                      )}
                      onChange={(e) =>
                        setField(
                          "dividendYield",
                          clamp(parseFloat(e.target.value), 0, 99) / 100,
                        )
                      }
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                }
              />
            </div>
          </div>
        </Form>

        {/* ── RESULTS ──────────────────────────────────────────────────────── */}
        <div className={styles.results}>
          {/* Key insight alert */}
          <Alert variant="success" className="mb-3">
            <strong>
              Roth grows to {formatCurrency(result.rothVsTaxableAdvantage)} more
              than a taxable brokerage
            </strong>
            {rothSavingsYears > 0 && (
              <>
                {" "}
                — that&apos;s <strong>{rothSavingsYears} years</strong> of
                contributions saved in taxes.
              </>
            )}
          </Alert>

          {/* Summary cards */}
          <div className={styles.summaryCards}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>
                Roth After-Tax at {inputs.retirementAge}
              </div>
              <div className={styles.cardValue} style={{ color: ROTH_COLOR }}>
                {formatCurrency(result.finalRoth)}
              </div>
              <div className={styles.cardSub}>
                Tax-free · {years} yrs of{" "}
                {formatCurrency(inputs.annualAfterTaxContrib)}/yr
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>
                Traditional After-Tax at {inputs.retirementAge}
              </div>
              <div className={styles.cardValue} style={{ color: TRAD_COLOR }}>
                {formatCurrency(result.finalTradAfterTax)}
              </div>
              <div className={styles.cardSub}>
                After {formatPercent(inputs.retirementOrdinaryRate)} withdrawal
                tax
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>
                Taxable Brokerage After-Tax at {inputs.retirementAge}
              </div>
              <div className={styles.cardValue}>
                {formatCurrency(result.finalTaxableAfterTax)}
              </div>
              <div className={styles.cardSub}>
                After dividend drag + {formatPercent(inputs.ltcgRate)} LTCG
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>
                Roth Tax Savings vs Brokerage
              </div>
              <div className={styles.cardValue} style={{ color: "#e67e22" }}>
                {formatCurrency(result.rothVsTaxableAdvantage)}
              </div>
              <div className={styles.cardSub}>
                Traditional saves{" "}
                {formatCurrency(result.tradVsTaxableAdvantage)}
              </div>
            </div>
          </div>

          {/* Comparison note */}
          <div className={styles.comparisonNote}>
            When your current and retirement tax rates are equal, Roth and
            Traditional after-tax values are identical — the tax break just
            comes at a different time. Roth wins if your rate rises; Traditional
            wins if it falls.
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
                id="view-tax"
                value="tax-impact"
                variant="outline-primary"
              >
                Tax Impact at Retirement
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          {/* Chart 1 — Growth Over Time */}
          {chartView === "growth" && (
            <>
              <div className={styles.chartWrap}>
                <h5 className="text-center mb-3">
                  Gross Account Balance Over Time
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
                      dataKey="roth"
                      name="Roth"
                      stroke={ROTH_COLOR}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="traditional"
                      name="Traditional"
                      stroke={TRAD_COLOR}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="taxable"
                      name="Taxable Brokerage"
                      stroke={TAXABLE_COLOR}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className={styles.chartNote}>
                  Gross balances as shown on your account statement — before
                  taxes are applied. Roth&apos;s balance is already your
                  after-tax value (nothing owed). Traditional and Taxable have
                  taxes still outstanding at withdrawal.
                </p>
              </div>
              <div className={styles.chartWrap}>
                <h5 className="text-center mb-3">After-Tax Value Over Time</h5>
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart
                    data={afterTaxData}
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
                      dataKey="roth"
                      name="Roth"
                      stroke={ROTH_COLOR}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="traditional"
                      name="Traditional"
                      stroke={TRAD_COLOR}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="taxable"
                      name="Taxable Brokerage"
                      stroke={TAXABLE_COLOR}
                      strokeWidth={2}
                      dot={false}
                    />
                    <ReferenceLine
                      x={EARLY_PENALTY_AGE}
                      stroke="#888"
                      strokeDasharray="4 4"
                      label={{
                        value: "Age 60 — penalty lifts",
                        position: "insideTopRight",
                        fontSize: 11,
                        fill: "#888",
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className={styles.chartNote}>
                  All values are after-tax — what you&apos;d actually keep if
                  you cashed out at that age. Before age 59.5, a 10% early
                  withdrawal penalty applies: Traditional on the full balance,
                  Roth on earnings only (contributions are always penalty-free).
                  Traditional assumes{" "}
                  {Math.round(inputs.retirementOrdinaryRate * 100)}% tax on
                  withdrawal; Taxable assumes{" "}
                  {Math.round(inputs.ltcgRate * 100)}% LTCG on unrealized gains;
                  no early penalty for Taxable.
                </p>
              </div>
            </>
          )}

          {/* Chart 2 — Tax Impact at Retirement */}
          {chartView === "tax-impact" && (
            <div className={styles.chartWrap}>
              <h5 className="text-center mb-3">What You Keep at Retirement</h5>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={taxImpactData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="account" />
                  <YAxis tickFormatter={formatChartDollar} width={65} />
                  <Tooltip
                    formatter={(
                      value: number | undefined,
                      name: string | undefined,
                    ) => [formatCurrency(value ?? 0), name ?? ""]}
                  />
                  <Legend verticalAlign="top" />
                  <Bar
                    dataKey="contributions"
                    name="Contributions"
                    stackId="a"
                    fill="#95a5a6"
                  />
                  <Bar
                    dataKey="taxFreeGains"
                    name="Tax-Free Gains"
                    stackId="a"
                    fill={ROTH_COLOR}
                  />
                  <Bar
                    dataKey="taxedGains"
                    name="After-Tax Gains"
                    stackId="a"
                    fill={TRAD_COLOR}
                  />
                  <Bar
                    dataKey="taxes"
                    name="Taxes Paid"
                    stackId="a"
                    fill={TAX_COLOR}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className={styles.chartNote}>
                The red &ldquo;Taxes Paid&rdquo; segment shows how much goes to
                taxes instead of your pocket. Roth pays no taxes at all on
                growth.
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
