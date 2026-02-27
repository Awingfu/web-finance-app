import { useState, useMemo } from "react";
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
import {
  calcRothVsTraditional,
  getMarginalRate,
  getEffectiveRate,
  getStdDeduction,
  ROTH_TRAD_LAST_UPDATED,
} from "../../src/utils/roth_traditional_utils";
import type {
  RothTraditionalInputs,
  FilingStatus,
} from "../../src/utils/roth_traditional_utils";
import {
  getPresetTable,
  getEffectiveIncrementalRate,
  getMarginalRateFromTable,
} from "../../src/utils/retirement_tax_tables";
import type {
  RetirementTaxTable,
  TaxBracket,
  PresetId,
} from "../../src/utils/retirement_tax_tables";
import retirementStyles from "../../styles/Retirement.module.scss";
import styles from "../../styles/RothVsTraditional.module.scss";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROTH_COLOR = "#3498db";
const TRAD_COLOR = "#e67e22";
const TRAD_SAVINGS_COLOR = "#f39c12";
const REF_COLOR = "#e74c3c";

const formatChartDollar = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}k`
      : `$${v.toFixed(0)}`;

type ChartView = "breakeven" | "growth" | "burndown";
type TablePreset = PresetId | "custom";

// ─── Custom bracket editor types ──────────────────────────────────────────────

interface BracketRow {
  upTo: string; // "" means unlimited (last bracket only)
  rate: string; // percentage string, e.g. "22" for 22%
}

function tableToEditorRows(table: RetirementTaxTable): BracketRow[] {
  return table.brackets.map((b) => ({
    upTo: b.max === Infinity ? "" : String(b.max),
    rate: String(Math.round(b.rate * 10000) / 100),
  }));
}

function editorRowsToTable(
  rows: BracketRow[],
  stdDeduction: string,
): RetirementTaxTable {
  const sd = Math.max(0, parseFloat(stdDeduction) || 0);
  const brackets: TaxBracket[] = [];
  let prev = 0;
  for (let i = 0; i < rows.length; i++) {
    const isLast = i === rows.length - 1;
    const upToVal = isLast
      ? Infinity
      : Math.max(prev + 1, parseFloat(rows[i].upTo) || prev + 1);
    const rate = Math.min(
      1,
      Math.max(0, (parseFloat(rows[i].rate) || 0) / 100),
    );
    brackets.push({ min: prev, max: isLast ? Infinity : upToVal, rate });
    if (!isLast) prev = upToVal;
  }
  return {
    id: "custom",
    name: "Custom Tax Table",
    description: "User-defined tax brackets",
    standardDeduction: sd,
    brackets,
  };
}

// ─── Default state ────────────────────────────────────────────────────────────

type CoreInputs = Omit<RothTraditionalInputs, "retirementTaxTable">;

const DEFAULT_INPUTS: CoreInputs = {
  currentAge: 30,
  retirementAge: 65,
  lifeExpectancyAge: 90,
  annualContribution: 24500,
  currentIncome: 100000,
  filingStatus: "single",
  growthRate: 0.07,
  retirementOtherIncome: 24000,
  retirement401kWithdrawal: 40000,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function RothVsTraditional() {
  const [inputs, setInputs] = useState<CoreInputs>(DEFAULT_INPUTS);
  const [chartView, setChartView] = useState<ChartView>("breakeven");
  const [equalNetMode, setEqualNetMode] = useState(false);

  // Tax table state
  const [tablePreset, setTablePreset] = useState<TablePreset>("federal_2026");
  const [customRows, setCustomRows] = useState<BracketRow[]>(() =>
    tableToEditorRows(getPresetTable("federal_2026", "single")),
  );
  const [customStdDeduction, setCustomStdDeduction] = useState("15000");

  const setField = <K extends keyof CoreInputs>(key: K, value: CoreInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const clamp = (v: number, min: number, max: number) =>
    isNaN(v) ? min : Math.min(max, Math.max(min, v));

  // ── Derived tax table ──────────────────────────────────────────────────────
  const retirementTaxTable = useMemo<RetirementTaxTable>(() => {
    if (tablePreset === "custom") {
      return editorRowsToTable(customRows, customStdDeduction);
    }
    return getPresetTable(tablePreset, inputs.filingStatus);
  }, [tablePreset, customRows, customStdDeduction, inputs.filingStatus]);

  // ── Main result ────────────────────────────────────────────────────────────
  const result = useMemo(
    () => calcRothVsTraditional({ ...inputs, retirementTaxTable }),
    [inputs, retirementTaxTable],
  );

  // ── Live displays ──────────────────────────────────────────────────────────
  const liveMarginalRate = getMarginalRate(
    inputs.currentIncome,
    inputs.filingStatus,
  );
  const liveEffectiveRate = getEffectiveRate(
    inputs.currentIncome,
    inputs.filingStatus,
  );
  const stdDeduction = getStdDeduction(inputs.filingStatus);

  // Live effective rate on 401k withdrawals (shown inline in the form)
  const liveWithdrawalRate =
    inputs.retirement401kWithdrawal > 0
      ? getEffectiveIncrementalRate(
          inputs.retirementOtherIncome,
          inputs.retirement401kWithdrawal,
          retirementTaxTable,
        )
      : getMarginalRateFromTable(
          inputs.retirementOtherIncome,
          retirementTaxTable,
        );

  // ── Burndown chart data ───────────────────────────────────────────────────
  // In equal-net mode, Roth withdraws only enough each year to match
  // Traditional's after-tax take-home (401k net + savings net). This is the
  // fair comparison: same spendable income, so Roth's balance depletes slower.
  const burndownChartData = useMemo(() => {
    if (!equalNetMode) {
      return result.burndownData.map((p, i) => ({
        ...p,
        otherIncome: i === 0 ? 0 : inputs.retirementOtherIncome,
      }));
    }
    // Recompute Roth balance/withdrawal year-by-year targeting Traditional's net.
    // Lock in the target on the first year with positive Traditional income and
    // hold it constant — so Roth keeps withdrawing at the same rate even after
    // Traditional (401k + savings) is fully depleted.
    let bRothEq = result.burndownData[0]?.rothBalance ?? 0;
    let rothTargetNet = 0;
    return result.burndownData.map((p, i) => {
      if (i === 0) return { ...p, otherIncome: 0 };
      const tradTotalNet = p.annualTradNet + p.tradSavingsNet;
      if (rothTargetNet === 0 && tradTotalNet > 0) rothTargetNet = tradTotalNet;
      const rothWithdrawal = Math.min(bRothEq, rothTargetNet);
      bRothEq = (bRothEq - rothWithdrawal) * (1 + inputs.growthRate);
      return {
        ...p,
        rothBalance: bRothEq,
        annualRothNet: rothWithdrawal,
        otherIncome: inputs.retirementOtherIncome,
      };
    });
  }, [
    result.burndownData,
    inputs.retirementOtherIncome,
    inputs.growthRate,
    equalNetMode,
  ]);

  // ── Tax table editor helpers ───────────────────────────────────────────────
  const handlePresetChange = (newPreset: TablePreset) => {
    if (newPreset === "custom" && tablePreset !== "custom") {
      const seed = getPresetTable(tablePreset as PresetId, inputs.filingStatus);
      setCustomRows(tableToEditorRows(seed));
      setCustomStdDeduction(String(seed.standardDeduction));
    }
    setTablePreset(newPreset);
  };

  const updateBracketRow = (
    idx: number,
    field: keyof BracketRow,
    value: string,
  ) =>
    setCustomRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );

  const addBracket = () => {
    if (customRows.length >= 8) return;
    const lastIdx = customRows.length - 1;
    const prevUpTo =
      lastIdx >= 1 ? parseFloat(customRows[lastIdx - 1].upTo) || 50000 : 50000;
    const newUpTo = Math.round((prevUpTo * 1.5) / 1000) * 1000;
    const newRows = [...customRows];
    newRows.splice(lastIdx, 0, {
      upTo: String(newUpTo),
      rate: customRows[lastIdx].rate,
    });
    setCustomRows(newRows);
  };

  const removeBracket = (idx: number) => {
    if (customRows.length <= 1 || idx === customRows.length - 1) return;
    setCustomRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Chart / result helpers ─────────────────────────────────────────────────
  const estimatedRatePercent = Math.round(result.estimatedRetirementRate * 100);

  const winnerLabel =
    result.winner === "roth"
      ? "Roth wins"
      : result.winner === "traditional"
        ? "Traditional wins"
        : "Tied";

  const winnerVariant =
    result.winner === "roth"
      ? "info"
      : result.winner === "traditional"
        ? "warning"
        : "secondary";

  // ── Bracket "From" labels for editor ──────────────────────────────────────
  const isCustom = tablePreset === "custom";
  const displayRows = isCustom
    ? customRows
    : tableToEditorRows(retirementTaxTable);
  const displayStdDeduction = isCustom
    ? customStdDeduction
    : String(retirementTaxTable.standardDeduction);

  const bracketFromLabels = useMemo(() => {
    const labels: string[] = [];
    let prev = 0;
    for (const row of displayRows) {
      labels.push(formatCurrency(prev));
      const parsed = parseFloat(row.upTo);
      prev = isNaN(parsed) || row.upTo === "" ? Infinity : parsed;
    }
    return labels;
  }, [displayRows]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={retirementStyles.container}>
      <Header titleName="Roth vs Traditional 401k" />

      <main className={retirementStyles.main}>
        <h1>Roth vs Traditional 401k</h1>
        <p>
          Find out whether Roth or Traditional contributions put more money in
          your pocket in retirement — modeled against your expected income,
          withdrawals, and a realistic tax table.
        </p>
      </main>

      <div className={retirementStyles.content}>
        {/* ── FORM ─────────────────────────────────────────────────────────── */}
        <Form className={retirementStyles.form}>
          {/* ── Current Situation ── */}
          <p className={styles.sectionLabel}>Your Current Situation</p>

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

          <Form.Label>Annual Income (before 401k)</Form.Label>
          <TooltipOnHover
            text="Your gross income before 401k contributions are deducted. Used to calculate your current marginal tax rate."
            nest={
              <InputGroup className="mb-1 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.currentIncome)}
                  onChange={(e) =>
                    setField(
                      "currentIncome",
                      clamp(parseFloat(e.target.value), 0, 10_000_000),
                    )
                  }
                />
                <InputGroup.Text>/ yr</InputGroup.Text>
              </InputGroup>
            }
          />
          <p className={styles.rateHint}>
            Marginal: <strong>{formatPercent(liveMarginalRate)}</strong>
            {" · "}Effective:{" "}
            <strong>{formatPercent(liveEffectiveRate)}</strong>
            {" · "}Std deduction: {formatCurrency(stdDeduction)}
          </p>

          <Form.Label>Annual 401k Contribution</Form.Label>
          <TooltipOnHover
            text="The dollar amount you contribute each year to your 401k. The 2026 employee limit is $24,500 ($32,500 if age 50+)."
            nest={
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.annualContribution)}
                  onChange={(e) =>
                    setField(
                      "annualContribution",
                      clamp(parseFloat(e.target.value), 0, 100_000),
                    )
                  }
                />
                <InputGroup.Text>/ yr</InputGroup.Text>
              </InputGroup>
            }
          />

          {/* ── Retirement Assumptions ── */}
          <p className={styles.sectionLabel}>Retirement Assumptions</p>

          <div className={styles.threeCol}>
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
                  if (inputs.lifeExpectancyAge <= age + 1) {
                    setField("lifeExpectancyAge", age + 2);
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
                onChange={(e) => {
                  const age = parseInt(e.target.value);
                  setField("retirementAge", age);
                  if (inputs.lifeExpectancyAge <= age) {
                    setField("lifeExpectancyAge", age + 1);
                  }
                }}
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
            <div className={styles.col}>
              <Form.Label>Life Expectancy Age</Form.Label>
              <TooltipOnHover
                text="The age you plan to model income through. Used for the Retirement Burndown chart to show how balances and taxes accumulate over your retirement years."
                nest={
                  <Form.Select
                    className="mb-3"
                    value={inputs.lifeExpectancyAge}
                    onChange={(e) =>
                      setField("lifeExpectancyAge", parseInt(e.target.value))
                    }
                  >
                    {Array.from(
                      { length: 120 - inputs.retirementAge },
                      (_, i) => inputs.retirementAge + 1 + i,
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

          <Form.Label>Annual Investment Growth Rate</Form.Label>
          <TooltipOnHover
            text="Expected average annual return on your investments. S&P 500 historical nominal average is ~10%; many planners use 6–7% after inflation."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(
                    Math.round(inputs.growthRate * 10000) / 100,
                  )}
                  onChange={(e) =>
                    setField(
                      "growthRate",
                      clamp(parseFloat(e.target.value), 0, 30) / 100,
                    )
                  }
                />
                <InputGroup.Text>%</InputGroup.Text>
              </InputGroup>
            }
          />

          {/* ── Retirement Income ── */}
          <p className={styles.sectionLabel}>Retirement Income</p>

          <Form.Label>Expected Ordinary Income at Retirement</Form.Label>
          <TooltipOnHover
            text="Social Security benefits plus any ordinary wages or pension income you expect in retirement. Do NOT include dividends or long-term capital gains — those are taxed at separate LTCG rates and don't push your ordinary income into higher brackets."
            nest={
              <InputGroup className="mb-1 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.retirementOtherIncome)}
                  onChange={(e) =>
                    setField(
                      "retirementOtherIncome",
                      clamp(parseFloat(e.target.value), 0, 1_000_000),
                    )
                  }
                />
                <InputGroup.Text>/ yr</InputGroup.Text>
              </InputGroup>
            }
          />
          <p className={styles.rateHint}>
            Includes Social Security + wages/pension only — not dividends or
            LTCG
          </p>

          <Form.Label>Expected Annual 401k / IRA Withdrawal</Form.Label>
          <TooltipOnHover
            text="How much you plan to withdraw from 401k or IRA accounts each year. This stacks on top of your other income and determines the actual marginal rate you'll pay on those withdrawals."
            nest={
              <InputGroup className="mb-1 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.retirement401kWithdrawal)}
                  onChange={(e) =>
                    setField(
                      "retirement401kWithdrawal",
                      clamp(parseFloat(e.target.value), 0, 1_000_000),
                    )
                  }
                />
                <InputGroup.Text>/ yr</InputGroup.Text>
              </InputGroup>
            }
          />
          <p className={styles.rateHint}>
            Effective rate on traditional 401k withdrawals:{" "}
            <strong>{formatPercent(liveWithdrawalRate)}</strong> (
            {formatCurrency(inputs.retirementOtherIncome)} base +{" "}
            {formatCurrency(inputs.retirement401kWithdrawal)} 401k ={" "}
            {formatCurrency(
              inputs.retirementOtherIncome + inputs.retirement401kWithdrawal,
            )}{" "}
            total ordinary income)
          </p>

          {/* ── Retirement Tax Table ── */}
          <p className={styles.sectionLabel}>Retirement Tax Table</p>

          <Form.Label>Tax Table Preset</Form.Label>
          <InputGroup className="mb-3 w-100">
            <Form.Select
              value={tablePreset}
              onChange={(e) =>
                handlePresetChange(e.target.value as TablePreset)
              }
            >
              <option value="federal_2026">2026 Federal Brackets</option>
              <option value="federal_2026_plus10">
                Higher Taxes — 2026 brackets + 10pp on each rate
              </option>
              <option value="custom">Custom — define your own brackets</option>
            </Form.Select>
          </InputGroup>

          {/* Bracket editor — always visible; locked for presets */}
          <div className={styles.bracketEditor}>
            <div className={styles.twoCol} style={{ alignItems: "flex-end" }}>
              <div className={styles.col}>
                <Form.Label>
                  <small>Standard Deduction</small>
                </Form.Label>
                <InputGroup className="mb-3 w-100">
                  <InputGroup.Text>$</InputGroup.Text>
                  <Form.Control
                    type="number"
                    onWheel={(e) => e.currentTarget.blur()}
                    value={displayStdDeduction}
                    disabled={!isCustom}
                    onChange={(e) => setCustomStdDeduction(e.target.value)}
                  />
                </InputGroup>
              </div>
            </div>

            <Table size="sm" className={styles.bracketTable}>
              <thead>
                <tr>
                  <th>From</th>
                  <th>Up To ($)</th>
                  <th>Rate (%)</th>
                  {isCustom && <th></th>}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, idx) => {
                  const isLast = idx === displayRows.length - 1;
                  return (
                    <tr key={idx}>
                      <td className={styles.bracketFrom}>
                        {bracketFromLabels[idx]}
                      </td>
                      <td>
                        {isLast ? (
                          <span className={styles.unlimited}>Unlimited</span>
                        ) : (
                          <Form.Control
                            size="sm"
                            type="number"
                            onWheel={(e) => e.currentTarget.blur()}
                            value={row.upTo}
                            disabled={!isCustom}
                            onChange={(e) =>
                              updateBracketRow(idx, "upTo", e.target.value)
                            }
                          />
                        )}
                      </td>
                      <td>
                        <Form.Control
                          size="sm"
                          type="number"
                          onWheel={(e) => e.currentTarget.blur()}
                          value={row.rate}
                          disabled={!isCustom}
                          onChange={(e) =>
                            updateBracketRow(idx, "rate", e.target.value)
                          }
                        />
                      </td>
                      {isCustom && (
                        <td>
                          <button
                            type="button"
                            className={styles.bracketDelete}
                            disabled={isLast || customRows.length <= 1}
                            onClick={() => removeBracket(idx)}
                            aria-label="Remove bracket"
                          >
                            ×
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            {isCustom && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={addBracket}
                disabled={customRows.length >= 8}
              >
                + Add Bracket
              </Button>
            )}
          </div>

          <Alert variant="info">
            <small>
              <strong>Assumption:</strong> The annual tax savings from a
              Traditional contribution (
              {formatCurrency(result.annualTaxSavings)}
              /yr) are invested at the same growth rate as the 401k. This makes
              the comparison apples-to-apples.
            </small>
          </Alert>
        </Form>

        {/* ── RESULTS ──────────────────────────────────────────────────────── */}
        <div className={styles.results}>
          <Alert variant={winnerVariant} className="mb-3">
            <strong>{winnerLabel}</strong>
            {result.winner === "roth" && (
              <>
                {" "}
                — Your effective rate on 401k withdrawals (
                <strong>{formatPercent(result.estimatedRetirementRate)}</strong>
                ) is higher than your current marginal rate (
                <strong>{formatPercent(result.currentMarginalRate)}</strong>).
                Paying taxes now at a lower rate beats deferring to a higher
                one.
              </>
            )}
            {result.winner === "traditional" && (
              <>
                {" "}
                — Your effective rate on 401k withdrawals (
                <strong>{formatPercent(result.estimatedRetirementRate)}</strong>
                ) is lower than your current marginal rate (
                <strong>{formatPercent(result.currentMarginalRate)}</strong>).
                Deferring taxes to a lower bracket saves more money overall.
              </>
            )}
            {result.winner === "tie" && (
              <>
                {" "}
                — Your effective retirement rate equals your current marginal
                rate. Roth and Traditional are mathematically equivalent.
              </>
            )}
            <div className={styles.breakEvenNote}>
              Traditional wins if your effective retirement rate stays below{" "}
              <strong>{formatPercent(result.breakEvenRate)}</strong> (your
              current marginal rate).
            </div>
          </Alert>

          {/* Summary cards — stats row */}
          <div className={styles.summaryCards}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Your Marginal Rate Now</div>
              <div className={styles.cardValue}>
                {formatPercent(result.currentMarginalRate)}
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Effective Rate on 401k W/D</div>
              <div className={styles.cardValue}>
                {formatPercent(result.estimatedRetirementRate)}
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Annual Tax Savings (Trad)</div>
              <div className={styles.cardValue}>
                {formatCurrency(result.annualTaxSavings)}
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>
                Account Balance at {inputs.retirementAge}
              </div>
              <div className={styles.cardValue}>
                {formatCurrency(result.grossBalanceAtRetirement)}
              </div>
            </div>
          </div>

          {/* Comparison cards — Traditional vs Roth outcome row */}
          <div className={styles.summaryCards}>
            <div
              className={styles.card}
              style={{
                borderColor:
                  result.winner === "traditional" ? TRAD_COLOR : undefined,
                borderWidth: result.winner === "traditional" ? 2 : 1,
              }}
            >
              <div className={styles.cardLabel}>Traditional Net</div>
              <div
                className={styles.cardValue}
                style={{
                  color:
                    result.winner === "traditional" ? TRAD_COLOR : undefined,
                }}
              >
                {formatCurrency(result.afterTaxTraditional)}
              </div>
              <div className={styles.cardSub}>
                Simplified: after-tax withdrawal [Gross × (1−r)] + reinvested
                savings
                <br />
                {formatChartDollar(result.grossBalanceAtRetirement)} × (1−
                {Math.round(result.estimatedRetirementRate * 100)}%) +{" "}
                {formatChartDollar(
                  result.afterTaxTraditional -
                    result.grossBalanceAtRetirement *
                      (1 - result.estimatedRetirementRate),
                )}
              </div>
            </div>
            <div
              className={styles.card}
              style={{
                borderColor: result.winner === "roth" ? ROTH_COLOR : undefined,
                borderWidth: result.winner === "roth" ? 2 : 1,
              }}
            >
              <div className={styles.cardLabel}>Roth Net</div>
              <div
                className={styles.cardValue}
                style={{
                  color: result.winner === "roth" ? ROTH_COLOR : undefined,
                }}
              >
                {formatCurrency(result.afterTaxRoth)}
              </div>
              <div className={styles.cardSub}>
                Full balance, no tax at withdrawal
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>
                {result.winner === "roth" ? "Roth" : "Traditional"} Advantage
              </div>
              <div
                className={styles.cardValue}
                style={{
                  color:
                    result.winner === "roth"
                      ? ROTH_COLOR
                      : result.winner === "traditional"
                        ? TRAD_COLOR
                        : undefined,
                }}
              >
                {formatCurrency(Math.abs(result.advantageAmount))}
              </div>
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
                id="view-breakeven"
                value="breakeven"
                variant="outline-primary"
              >
                Break-Even Analysis
              </ToggleButton>
              <ToggleButton
                id="view-growth"
                value="growth"
                variant="outline-primary"
              >
                Account Growth
              </ToggleButton>
              <ToggleButton
                id="view-burndown"
                value="burndown"
                variant="outline-primary"
              >
                Post-Retirement
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          {/* Break-even chart */}
          {chartView === "breakeven" && (
            <div className={styles.chartWrap}>
              <h5 className="text-center mb-3">
                After-Tax Value vs Effective Retirement Tax Rate
              </h5>
              <ResponsiveContainer width="100%" height={380}>
                <LineChart
                  data={result.sensitivityData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="rate"
                    tickFormatter={(v) => `${v}%`}
                    label={{
                      value: "Effective Retirement Tax Rate",
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
                    labelFormatter={(rate) => `Effective rate: ${rate}%`}
                  />
                  <Legend verticalAlign="top" />
                  <Line
                    type="monotone"
                    dataKey="traditional"
                    name="Traditional (incl. reinvested savings)"
                    stroke={TRAD_COLOR}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="roth"
                    name="Roth 401k"
                    stroke={ROTH_COLOR}
                    strokeWidth={2}
                    dot={false}
                  />
                  <ReferenceLine
                    x={estimatedRatePercent}
                    stroke={REF_COLOR}
                    strokeDasharray="5 4"
                    label={{
                      value: `Your estimate: ${estimatedRatePercent}%`,
                      position: "insideTopRight",
                      fill: REF_COLOR,
                      fontSize: 11,
                      dx: 4,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className={styles.chartNote}>
                Lines cross at{" "}
                <strong>{formatPercent(result.breakEvenRate)}</strong> (your
                current marginal rate). Left = Traditional wins; right = Roth
                wins. Red line = effective rate computed from your retirement
                income inputs and selected tax table.
              </p>
            </div>
          )}

          {/* Account growth chart */}
          {chartView === "growth" && (
            <div className={styles.chartWrap}>
              <h5 className="text-center mb-3">Account Balance Over Time</h5>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
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
                  <Bar
                    dataKey="accountBalance"
                    name="401k Balance (both)"
                    stackId="a"
                    fill="#2ecc71"
                    fillOpacity={0.85}
                  />
                  <Bar
                    dataKey="taxSavingsBalance"
                    name="Traditional: Tax Savings Reinvested"
                    stackId="b"
                    fill={TRAD_COLOR}
                    fillOpacity={0.85}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className={styles.chartNote}>
                Both accounts accumulate the same 401k balance (green).
                Traditional also generates reinvested tax savings (orange) — the
                key source of its advantage when your retirement rate is lower.
              </p>
            </div>
          )}

          {/* Retirement burndown chart */}
          {chartView === "burndown" && (
            <div className={styles.chartWrap}>
              <h5 className="text-center mb-3">
                Post-Retirement: Income & Balance (Age {inputs.retirementAge}–
                {inputs.lifeExpectancyAge})
              </h5>

              <div className={styles.equalNetToggle}>
                <Form.Check
                  type="switch"
                  id="equal-net-toggle"
                  checked={equalNetMode}
                  onChange={(e) => setEqualNetMode(e.target.checked)}
                  label={
                    equalNetMode
                      ? "Equal after-tax income — Roth withdraws to match Traditional's net take-home"
                      : "Equal gross withdrawal — both draw the same amount before taxes"
                  }
                />
              </div>

              {/* Annual income summary cards */}
              <div
                className={styles.summaryCards}
                style={{ marginBottom: "1rem" }}
              >
                <div className={styles.card}>
                  <div className={styles.cardLabel}>Roth 401k Take-Home</div>
                  <div
                    className={styles.cardValue}
                    style={{ color: ROTH_COLOR }}
                  >
                    {formatCurrency(
                      equalNetMode
                        ? result.annualTradNetIncome
                        : result.annualRothNetIncome,
                    )}
                  </div>
                  <div className={styles.cardSub}>
                    {equalNetMode
                      ? "Matched to Traditional net take-home"
                      : "Full withdrawal, no taxes"}
                  </div>
                </div>
                <div className={styles.card}>
                  <div className={styles.cardLabel}>Trad 401k Take-Home</div>
                  <div
                    className={styles.cardValue}
                    style={{ color: TRAD_COLOR }}
                  >
                    {formatCurrency(result.annualTradNetIncome)}
                  </div>
                  <div className={styles.cardSub}>
                    After federal taxes on withdrawal
                  </div>
                </div>
                <div className={styles.card}>
                  <div className={styles.cardLabel}>Trad Annual Taxes</div>
                  <div className={styles.cardValue}>
                    {formatCurrency(result.annualTaxesPaidEachYear)}
                  </div>
                  <div className={styles.cardSub}>
                    {formatPercent(result.estimatedRetirementRate)} effective
                    rate on 401k
                  </div>
                </div>
                <div className={styles.card}>
                  <div className={styles.cardLabel}>
                    Total Trad Taxes (
                    {inputs.lifeExpectancyAge - inputs.retirementAge} yrs)
                  </div>
                  <div className={styles.cardValue}>
                    {formatCurrency(
                      result.annualTaxesPaidEachYear *
                        (inputs.lifeExpectancyAge - inputs.retirementAge),
                    )}
                  </div>
                  <div className={styles.cardSub}>
                    Cumulative tax drag vs Roth
                  </div>
                </div>
              </div>

              {/* Chart 1: Account balance over retirement */}
              <p className={styles.chartSubtitle}>Account Balance</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={burndownChartData}
                  margin={{ top: 4, right: 20, left: 10, bottom: 24 }}
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
                    dataKey="tradTotal"
                    name="Trad Total Balance"
                    stroke={TRAD_COLOR}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rothBalance"
                    name="Roth Balance"
                    stroke={ROTH_COLOR}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className={styles.chartNote}>
                Orange = Traditional total (401k + reinvested savings), blue =
                Roth.{" "}
                {equalNetMode
                  ? "Equal after-tax income mode: Roth withdraws less each year to match Traditional's net take-home, so its balance depletes more slowly."
                  : "Equal gross withdrawal mode: both draw the same amount before taxes, so Roth depletes faster (it's providing more after-tax income)."}
              </p>

              {/* Chart 2: Annual income per year */}
              <p
                className={styles.chartSubtitle}
                style={{ marginTop: "1.5rem" }}
              >
                Annual Income
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={burndownChartData}
                  margin={{ top: 4, right: 20, left: 10, bottom: 24 }}
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
                  <Bar
                    dataKey="otherIncome"
                    name="Ordinary Income"
                    fill="#2ecc71"
                    fillOpacity={0.85}
                  />
                  <Bar
                    dataKey="annualTradNet"
                    name="Trad 401k Net"
                    fill={TRAD_COLOR}
                    fillOpacity={0.85}
                  />
                  <Bar
                    dataKey="tradSavingsNet"
                    name="Trad Savings (LTCG)"
                    fill={TRAD_SAVINGS_COLOR}
                    fillOpacity={0.85}
                  />
                  <Bar
                    dataKey="annualRothNet"
                    name="Roth 401k Net"
                    fill={ROTH_COLOR}
                    fillOpacity={0.85}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className={styles.chartNote}>
                Green = ordinary income (SS + wages, same for both). Orange =
                Traditional net 401k take-home (ordinary income tax). Gold =
                Traditional reinvested savings net (0–20% LTCG, kicks in once
                401k depletes). Blue = Roth take-home (tax-free).{" "}
                {equalNetMode
                  ? `Equal after-tax income mode: Roth withdraws ${formatCurrency(result.annualTradNetIncome)}/yr to match Traditional's net — blue bars are shorter but the Roth balance lasts longer.`
                  : `Equal gross withdrawal mode: Roth draws the full ${formatCurrency(inputs.retirement401kWithdrawal)}/yr — blue bars are taller (no taxes) but the balance depletes faster.`}
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
