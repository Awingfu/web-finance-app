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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Header, Footer, TooltipOnHover } from "../../src/components";
import { useChartTooltipProps } from "../../src/utils/ThemeContext";
import { formatCurrency, formatPercent } from "../../src/utils";
import { calcFire } from "../../src/utils/fire_utils";
import type { FireInputs } from "../../src/utils/fire_utils";
import retirementStyles from "../../styles/Retirement.module.scss";
import styles from "../../styles/Fire.module.scss";
import shared from "../../styles/shared.module.scss";

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAN_COLOR = "#f39c12";
const FIRE_COLOR = "#2ecc71";
const FAT_COLOR = "#9b59b6";
const PORTFOLIO_COLOR = "#2c3e50";

const formatChartDollar = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}k`
      : `$${v.toFixed(0)}`;

const DEFAULT_INPUTS: FireInputs = {
  currentAge: 30,
  currentPortfolio: 25_000,
  annualSpending: 50_000,
  annualSavings: 20_000,
  returnRate: 0.07,
  withdrawalRate: 0.04,
};

type ChartView = "growth" | "sensitivity";

// ─── Variant card definitions ─────────────────────────────────────────────────

const VARIANT_CARDS = [
  {
    key: "lean" as const,
    label: "LeanFIRE",
    color: LEAN_COLOR,
    description:
      "Early retirement on 75% of current spending — tight budget but full freedom.",
  },
  {
    key: "fire" as const,
    label: "FIRE",
    color: FIRE_COLOR,
    description: "Full financial independence at your current lifestyle.",
  },
  {
    key: "fat" as const,
    label: "FatFIRE",
    color: FAT_COLOR,
    description: "FI with 150% of current spending — no lifestyle compromises.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const FirePage = () => {
  const { contentStyle: tooltipStyle, labelStyle: tooltipLabelStyle } =
    useChartTooltipProps();
  const [inputs, setInputs] = useState<FireInputs>(DEFAULT_INPUTS);
  const [chartView, setChartView] = useState<ChartView>("growth");

  const set = (field: keyof FireInputs, raw: string) => {
    setInputs((prev) => ({ ...prev, [field]: parseFloat(raw) || 0 }));
  };

  const result = useMemo(() => calcFire(inputs), [inputs]);

  const {
    milestones,
    fireAges,
    yearlyData,
    sensitivityData,
    impliedIncome,
    currentSavingsRate,
    leanSpending,
    fatSpending,
  } = result;

  const currentSavingsRatePct = Math.round(currentSavingsRate * 100);

  // Portfolio growth chart: show up to the latest milestone age (or at least current age + 35)
  const latestMilestoneAge = Math.max(
    0,
    ...Object.values(fireAges).filter((a): a is number => a !== null),
  );
  const growthChartMaxAge = Math.max(
    latestMilestoneAge,
    inputs.currentAge + 35,
  );

  // Age select options
  const ageOptions = (min: number, max: number) =>
    Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className={retirementStyles.container}>
      <Header titleName="FIRE Calculator" />

      <main className={retirementStyles.main}>
        <h1>FIRE Calculator</h1>
        <p>
          Find your Financial Independence number and see when you reach each
          FIRE milestone.
        </p>

        <div className={retirementStyles.content}>
          {/* ── Form ── */}
          <div className={retirementStyles.form}>
            {/* Your Situation */}
            <div className={shared.sectionLabel}>Your Situation</div>
            <Form.Label>Current Age</Form.Label>
            <Form.Select
              className="mb-3"
              value={inputs.currentAge}
              onChange={(e) => set("currentAge", e.target.value)}
            >
              {ageOptions(16, 80).map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </Form.Select>

            {/* Current Portfolio */}
            <div className={shared.sectionLabel}>Current Portfolio</div>
            <Form.Label>Current Portfolio Value</Form.Label>
            <InputGroup className="mb-3">
              <InputGroup.Text>$</InputGroup.Text>
              <Form.Control
                type="number"
                min={0}
                value={inputs.currentPortfolio}
                onChange={(e) => set("currentPortfolio", e.target.value)}
              />
            </InputGroup>

            {/* Annual Finances */}
            <div className={shared.sectionLabel}>Annual Finances</div>
            <div className={shared.twoCol}>
              <div className={shared.col}>
                <Form.Label>Annual Spending</Form.Label>
                <InputGroup>
                  <InputGroup.Text>$</InputGroup.Text>
                  <Form.Control
                    type="number"
                    min={0}
                    value={inputs.annualSpending}
                    onChange={(e) => set("annualSpending", e.target.value)}
                  />
                </InputGroup>
              </div>
              <div className={shared.col}>
                <Form.Label>Annual Savings</Form.Label>
                <InputGroup>
                  <InputGroup.Text>$</InputGroup.Text>
                  <Form.Control
                    type="number"
                    min={0}
                    value={inputs.annualSavings}
                    onChange={(e) => set("annualSavings", e.target.value)}
                  />
                </InputGroup>
              </div>
            </div>
            <div className={shared.rateHint}>
              Implied income: {formatCurrency(impliedIncome)} · Savings rate:{" "}
              {formatPercent(currentSavingsRate)}
            </div>
            <div className={shared.rateHint}>
              LeanFIRE spending: {formatCurrency(leanSpending)} · FatFIRE
              spending: {formatCurrency(fatSpending)}
            </div>

            {/* Growth & Withdrawal */}
            <div className={shared.sectionLabel}>Growth &amp; Withdrawal</div>
            <div className={shared.twoCol}>
              <div className={shared.col}>
                <TooltipOnHover
                  text="Expected real (after-inflation) annual return. 7% approximates long-run S&P 500 returns after inflation."
                  nest={<Form.Label>Real Return Rate</Form.Label>}
                />
                <InputGroup>
                  <Form.Control
                    type="number"
                    min={0}
                    max={30}
                    step={0.1}
                    value={(inputs.returnRate * 100).toFixed(1)}
                    onChange={(e) =>
                      setInputs((prev) => ({
                        ...prev,
                        returnRate: parseFloat(e.target.value) / 100 || 0,
                      }))
                    }
                  />
                  <InputGroup.Text>%</InputGroup.Text>
                </InputGroup>
                <div className={shared.rateHint}>
                  7% ≈ historical S&P 500 after inflation
                </div>
              </div>
              <div className={shared.col}>
                <TooltipOnHover
                  text="Safe withdrawal rate — the percentage of your portfolio you withdraw annually in retirement. The classic 4% rule comes from the Trinity Study."
                  nest={<Form.Label>Withdrawal Rate</Form.Label>}
                />
                <InputGroup>
                  <Form.Control
                    type="number"
                    min={1}
                    max={10}
                    step={0.1}
                    value={(inputs.withdrawalRate * 100).toFixed(1)}
                    onChange={(e) =>
                      setInputs((prev) => ({
                        ...prev,
                        withdrawalRate:
                          parseFloat(e.target.value) / 100 || 0.04,
                      }))
                    }
                  />
                  <InputGroup.Text>%</InputGroup.Text>
                </InputGroup>
                <div className={shared.rateHint}>
                  4% rule: withdraw 4% of portfolio/yr — historically survives
                  30+ years
                </div>
              </div>
            </div>
          </div>

          {/* ── Results ── */}
          <div className={shared.results}>
            {/* Alert */}
            {fireAges.fire !== null ? (
              <Alert variant="success" className="mb-3">
                At your current pace you reach FIRE at age{" "}
                <strong>{fireAges.fire}</strong> —{" "}
                <strong>{fireAges.fire - inputs.currentAge} years away.</strong>
              </Alert>
            ) : (
              <Alert variant="warning" className="mb-3">
                FIRE isn&apos;t reached in this simulation. Increase savings or
                reduce spending.
              </Alert>
            )}

            {/* FIRE variant cards — education + milestone in one */}
            <div className={shared.sectionLabel}>FIRE Milestones</div>
            <div className={styles.variantCards}>
              {VARIANT_CARDS.map(({ key, label, color, description }) => {
                const age = fireAges[key];
                return (
                  <div
                    key={key}
                    className={styles.variantCard}
                    style={{ borderTopColor: color, borderTopWidth: 3 }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        marginBottom: 4,
                        color,
                      }}
                    >
                      {label}
                    </div>

                    <>
                      <div style={{ marginBottom: 8, opacity: 0.75 }}>
                        {description}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {formatCurrency(milestones[key])}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          opacity: 0.6,
                          marginTop: 2,
                        }}
                      >
                        {age !== null ? `Age ${age}` : "Not in range"}
                      </div>
                    </>
                  </div>
                );
              })}
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
                  id="chart-growth"
                  value="growth"
                  variant="outline-primary"
                >
                  Portfolio Growth
                </ToggleButton>
                <ToggleButton
                  id="chart-sensitivity"
                  value="sensitivity"
                  variant="outline-primary"
                >
                  Savings Rate Impact
                </ToggleButton>
              </ToggleButtonGroup>
            </div>

            {/* Portfolio Growth chart */}
            {chartView === "growth" && (
              <div className={shared.chartWrap}>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart
                    data={yearlyData.filter((d) => d.age <= growthChartMaxAge)}
                    margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
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
                    <Tooltip
                      formatter={(v: number | undefined) => [
                        formatCurrency(v ?? 0),
                        "Portfolio",
                      ]}
                      labelFormatter={(l) => `Age ${l}`}
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Line
                      type="monotone"
                      dataKey="portfolio"
                      stroke={PORTFOLIO_COLOR}
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <ReferenceLine
                      y={milestones.lean}
                      stroke={LEAN_COLOR}
                      strokeDasharray="4 2"
                      label={{
                        value: "LeanFIRE",
                        fill: LEAN_COLOR,
                        fontSize: 11,
                      }}
                    />
                    <ReferenceLine
                      y={milestones.fire}
                      stroke={FIRE_COLOR}
                      strokeDasharray="4 2"
                      label={{ value: "FIRE", fill: FIRE_COLOR, fontSize: 11 }}
                    />
                    <ReferenceLine
                      y={milestones.fat}
                      stroke={FAT_COLOR}
                      strokeDasharray="4 2"
                      label={{
                        value: "FatFIRE",
                        fill: FAT_COLOR,
                        fontSize: 11,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Savings Rate Impact chart */}
            {chartView === "sensitivity" && (
              <div className={shared.chartWrap}>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart
                    data={sensitivityData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      type="number"
                      dataKey="savingsRate"
                      domain={[5, 85]}
                      ticks={Array.from(
                        new Set([
                          5,
                          15,
                          25,
                          35,
                          45,
                          55,
                          65,
                          75,
                          85,
                          currentSavingsRatePct,
                        ]),
                      ).sort((a, b) => a - b)}
                      tickFormatter={(v) => `${v}%`}
                      label={{
                        value: "Savings Rate (%)",
                        position: "insideBottom",
                        offset: -2,
                      }}
                    />
                    <YAxis
                      label={{
                        value: "Years to FIRE",
                        angle: -90,
                        position: "insideLeft",
                        offset: 10,
                      }}
                    />
                    <Tooltip
                      formatter={(v: number | undefined) => [
                        v !== null && v !== undefined ? `${v} yrs` : "N/A",
                        "Years to FIRE",
                      ]}
                      labelFormatter={(l) => `Savings rate: ${l}%`}
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Line
                      type="monotone"
                      dataKey="yearsToFire"
                      stroke={FIRE_COLOR}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    <ReferenceLine
                      x={currentSavingsRatePct}
                      stroke="#e74c3c"
                      strokeDasharray="4 2"
                      label={{
                        value: "You are here",
                        fill: "#e74c3c",
                        fontSize: 11,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className={shared.chartNote}>
                  Holding income constant — spending less shrinks your FI number
                  AND increases savings, compounding the effect.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FirePage;
