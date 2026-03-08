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
  BarChart,
  Bar,
  AreaChart,
  Area,
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
  simulateConversionLadder,
  calcBracketFillAmount,
} from "../../src/utils/roth_conversion_ladder_utils";
import type {
  RothConversionInputs,
  FilingStatus,
  ConversionMode,
} from "../../src/utils/roth_conversion_ladder_utils";
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
import styles from "../../styles/RothConversionLadder.module.scss";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROTH_COLOR = "#3498db";
const SEASONED_COLOR = "#2ecc71";
const TRAD_COLOR = "#e67e22";
const REF_COLOR = "#e74c3c";
const CONVERSION_END_COLOR = "#95a5a6";

const formatChartDollar = (v: number) =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}k`
      : `$${v.toFixed(0)}`;

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

const LADDER_HORIZON_AGE = 90;

type CoreInputs = Omit<RothConversionInputs, "taxTable" | "lifeExpectancyAge">;

const DEFAULT_INPUTS: CoreInputs = {
  currentAge: 40,
  conversionEndAge: 59,
  traditionalBalance: 500_000,
  rothBalance: 0,
  otherIncome: 30_000,
  conversionMode: "fixed",
  annualConversion: 50_000,
  targetBracketRate: 0.22,
  growthRate: 0.07,
  filingStatus: "single",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function RothConversionLadder() {
  const [inputs, setInputs] = useState<CoreInputs>(DEFAULT_INPUTS);
  const [showTable, setShowTable] = useState(false);

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
  const taxTable = useMemo<RetirementTaxTable>(() => {
    if (tablePreset === "custom") {
      return editorRowsToTable(customRows, customStdDeduction);
    }
    return getPresetTable(tablePreset, inputs.filingStatus);
  }, [tablePreset, customRows, customStdDeduction, inputs.filingStatus]);

  // ── Main result ────────────────────────────────────────────────────────────
  const result = useMemo(
    () =>
      simulateConversionLadder({
        ...inputs,
        taxTable,
        lifeExpectancyAge: LADDER_HORIZON_AGE,
      }),
    [inputs, taxTable],
  );

  // ── Available bracket rates ────────────────────────────────────────────────
  const availableBracketRates = useMemo(
    () =>
      Array.from(new Set(taxTable.brackets.map((b) => b.rate))).sort(
        (a, b) => a - b,
      ),
    [taxTable],
  );

  // Ensure targetBracketRate stays valid when table/preset changes
  const safeTargetRate = useMemo(() => {
    if (availableBracketRates.includes(inputs.targetBracketRate)) {
      return inputs.targetBracketRate;
    }
    const lower = availableBracketRates.filter(
      (r) => r <= inputs.targetBracketRate,
    );
    return lower.length > 0
      ? lower[lower.length - 1]
      : (availableBracketRates[0] ?? 0.12);
  }, [availableBracketRates, inputs.targetBracketRate]);

  // ── Live hints ────────────────────────────────────────────────────────────
  const liveFillAmount = useMemo(
    () =>
      inputs.conversionMode === "bracket_fill"
        ? calcBracketFillAmount(inputs.otherIncome, safeTargetRate, taxTable)
        : 0,
    [inputs.conversionMode, inputs.otherIncome, safeTargetRate, taxTable],
  );

  const liveConversionAmount =
    inputs.conversionMode === "fixed"
      ? inputs.annualConversion
      : liveFillAmount;

  const liveConversionRate =
    liveConversionAmount > 0
      ? getEffectiveIncrementalRate(
          inputs.otherIncome,
          liveConversionAmount,
          taxTable,
        )
      : getMarginalRateFromTable(inputs.otherIncome, taxTable);

  const liveBaseRate = getMarginalRateFromTable(inputs.otherIncome, taxTable);

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

  // ── Bracket editor display helpers ────────────────────────────────────────
  const isCustom = tablePreset === "custom";
  const displayRows = isCustom ? customRows : tableToEditorRows(taxTable);
  const displayStdDeduction = isCustom
    ? customStdDeduction
    : String(taxTable.standardDeduction);

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

  // ── Chart data ────────────────────────────────────────────────────────────
  const ladderChartData = useMemo(
    () =>
      result.rungs.map((rung) => ({
        age: rung.conversionAge,
        amount: rung.amount,
        tax: rung.tax,
        effectiveTaxRate: rung.effectiveTaxRate,
        availableAge: rung.availableAge,
      })),
    [result.rungs],
  );

  const balanceChartData = useMemo(
    () =>
      result.rows.map((row) => ({
        age: row.age,
        traditionalBalance: row.traditionalBalance,
        rothBalance: row.rothBalance,
        totalSeasonedToDate: row.totalSeasonedToDate,
      })),
    [result.rows],
  );

  // ── Trad balance at end of conversion window ─────────────────────────────
  const tradBalAtConversionEnd =
    result.rows.find((r) => r.age === inputs.conversionEndAge)
      ?.traditionalBalance ?? 0;

  const rothBalAtConversionEnd =
    result.rows.find((r) => r.age === inputs.conversionEndAge)?.rothBalance ??
    0;

  const ladderFullyConverted =
    result.conversionCompleteAge !== null &&
    result.conversionCompleteAge <= inputs.conversionEndAge;

  // ── Validation warnings ───────────────────────────────────────────────────
  const warnZeroFill =
    inputs.conversionMode === "bracket_fill" && liveFillAmount <= 0;

  // ── CSV download ──────────────────────────────────────────────────────────
  const handleDownloadCSV = () => {
    const header = [
      "Age",
      "Traditional Balance",
      "Roth Balance",
      "Conversion Amount",
      "Tax Paid",
      "Effective Rate",
      "Newly Seasoned",
      "Total Seasoned",
      "Cumulative Tax",
      "Cumulative Converted",
    ].join(",");
    const csvRows = result.rows.map((r) =>
      [
        r.age,
        r.traditionalBalance.toFixed(0),
        r.rothBalance.toFixed(0),
        r.conversionAmount.toFixed(0),
        r.taxPaid.toFixed(0),
        (r.effectiveTaxRate * 100).toFixed(1) + "%",
        r.newlySeasonedAmount.toFixed(0),
        r.totalSeasonedToDate.toFixed(0),
        r.cumulativeTaxPaid.toFixed(0),
        r.cumulativeConverted.toFixed(0),
      ].join(","),
    );
    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roth-conversion-ladder.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={retirementStyles.container}>
      <Header titleName="Roth Conversion Ladder" />

      <main className={retirementStyles.main}>
        <h1>Roth Conversion Ladder</h1>
        <p>
          Model year-by-year Traditional IRA conversions to Roth — optimize
          tax-bracket filling and plan penalty-free access before age 59½ via
          the 5-year seasoning rule.
        </p>
      </main>

      <div className={retirementStyles.content}>
        {/* ── FORM ─────────────────────────────────────────────────────────── */}
        <Form className={retirementStyles.form}>
          {/* ── Filing Status ── */}
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

          {/* ── Ages ── */}
          <p className={styles.sectionLabel}>Ages</p>

          <div className={styles.twoCol}>
            <div className={styles.col}>
              <Form.Label>Current Age</Form.Label>
              <Form.Select
                className="mb-3"
                value={inputs.currentAge}
                onChange={(e) => {
                  const age = parseInt(e.target.value);
                  setField("currentAge", age);
                  if (inputs.conversionEndAge <= age) {
                    setField("conversionEndAge", age + 1);
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
              <Form.Label>Last Conversion Age</Form.Label>
              <TooltipOnHover
                text="The last age at which you want to make Roth conversions. Conversions stop after this age. Often set to 59 to avoid overlap with penalty-free withdrawals."
                nest={
                  <Form.Select
                    className="mb-3"
                    value={inputs.conversionEndAge}
                    onChange={(e) =>
                      setField("conversionEndAge", parseInt(e.target.value))
                    }
                  >
                    {Array.from(
                      { length: 80 - inputs.currentAge },
                      (_, i) => inputs.currentAge + i,
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

          {/* ── Account Balances ── */}
          <p className={styles.sectionLabel}>Account Balances</p>

          <Form.Label>Traditional IRA / 401k Balance</Form.Label>
          <TooltipOnHover
            text="Your current pre-tax Traditional IRA or 401k balance. This is the account you will be converting from."
            nest={
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.traditionalBalance)}
                  onChange={(e) =>
                    setField(
                      "traditionalBalance",
                      clamp(parseFloat(e.target.value), 0, 100_000_000),
                    )
                  }
                />
              </InputGroup>
            }
          />

          <Form.Label>Existing Roth IRA Balance</Form.Label>
          <TooltipOnHover
            text="Any existing Roth IRA balance you already have. This grows separately alongside your conversions."
            nest={
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.rothBalance)}
                  onChange={(e) =>
                    setField(
                      "rothBalance",
                      clamp(parseFloat(e.target.value), 0, 100_000_000),
                    )
                  }
                />
              </InputGroup>
            }
          />

          {/* ── Other Income ── */}
          <p className={styles.sectionLabel}>Other Income During Conversions</p>

          <Form.Label>Annual Ordinary Income (non-conversion)</Form.Label>
          <TooltipOnHover
            text="Social Security, wages, pension, or other ordinary income during your conversion years. Conversions stack on top of this income for tax purposes."
            nest={
              <InputGroup className="mb-1 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(inputs.otherIncome)}
                  onChange={(e) =>
                    setField(
                      "otherIncome",
                      clamp(parseFloat(e.target.value), 0, 1_000_000),
                    )
                  }
                />
                <InputGroup.Text>/ yr</InputGroup.Text>
              </InputGroup>
            }
          />
          <p className={styles.rateHint}>
            Marginal rate at this income level:{" "}
            <strong>{formatPercent(liveBaseRate)}</strong>
          </p>

          {/* ── Conversion Strategy ── */}
          <p className={styles.sectionLabel}>Conversion Strategy</p>

          <div className={styles.conversionModeToggle}>
            <ToggleButtonGroup
              type="radio"
              name="conversionMode"
              value={inputs.conversionMode}
              onChange={(v: ConversionMode) => setField("conversionMode", v)}
            >
              <ToggleButton
                id="mode-fixed"
                value="fixed"
                variant="outline-secondary"
                size="sm"
              >
                Fixed Amount
              </ToggleButton>
              <ToggleButton
                id="mode-fill"
                value="bracket_fill"
                variant="outline-secondary"
                size="sm"
              >
                Fill to Bracket
              </ToggleButton>
            </ToggleButtonGroup>
          </div>

          {inputs.conversionMode === "fixed" ? (
            <>
              <Form.Label>Annual Conversion Amount</Form.Label>
              <TooltipOnHover
                text="The fixed dollar amount to convert from Traditional to Roth each year. Conversions stop when the Traditional balance is depleted or conversionEndAge is reached."
                nest={
                  <InputGroup className="mb-1 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(inputs.annualConversion)}
                      onChange={(e) =>
                        setField(
                          "annualConversion",
                          clamp(parseFloat(e.target.value), 0, 10_000_000),
                        )
                      }
                    />
                    <InputGroup.Text>/ yr</InputGroup.Text>
                  </InputGroup>
                }
              />
            </>
          ) : (
            <>
              <Form.Label>Fill up to bracket</Form.Label>
              <TooltipOnHover
                text="Convert enough each year to fill up to the top of this tax bracket ceiling. Income stacks on top of your other income."
                nest={
                  <InputGroup className="mb-1 w-100">
                    <Form.Select
                      value={safeTargetRate}
                      onChange={(e) => {
                        setField(
                          "targetBracketRate",
                          parseFloat(e.target.value),
                        );
                      }}
                    >
                      {availableBracketRates.map((r) => (
                        <option key={r} value={r}>
                          {formatPercent(r)} bracket
                        </option>
                      ))}
                    </Form.Select>
                  </InputGroup>
                }
              />
              {warnZeroFill && (
                <Alert variant="info" className="mt-2 mb-1 py-2">
                  <small>
                    Your other income already exceeds the ceiling of this
                    bracket. No room to convert — try selecting a higher
                    bracket.
                  </small>
                </Alert>
              )}
              {!warnZeroFill && (
                <p className={styles.rateHint}>
                  Fill amount: <strong>{formatCurrency(liveFillAmount)}</strong>
                  /yr
                </p>
              )}
            </>
          )}
          <p className={styles.rateHint}>
            Effective tax rate on conversion:{" "}
            <strong>{formatPercent(liveConversionRate)}</strong>
            {liveConversionAmount > 0 && (
              <>
                {" "}
                ({formatCurrency(inputs.otherIncome)} base +{" "}
                {formatCurrency(liveConversionAmount)} conversion ={" "}
                {formatCurrency(inputs.otherIncome + liveConversionAmount)}{" "}
                total ordinary income)
              </>
            )}
          </p>

          {/* ── Growth ── */}
          <p className={styles.sectionLabel}>Growth</p>

          <Form.Label>Annual Growth Rate</Form.Label>
          <TooltipOnHover
            text="Expected average annual return on investments. Applied to both Traditional and Roth balances after end-of-year conversions."
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

          {/* ── Tax Table ── */}
          <p className={styles.sectionLabel}>Tax Table (Conversion Years)</p>

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
                Higher Taxes — 2026 brackets + 10% on each rate
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
        </Form>

        {/* ── RESULTS ──────────────────────────────────────────────────────── */}
        <div className={styles.results}>
          {/* Summary cards — row 1: conversion activity */}
          <div className={styles.summaryCards}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>First Withdrawal Age</div>
              <div className={styles.cardValue}>
                {result.firstWithdrawalAge}
              </div>
              <div className={styles.cardSub}>
                5 years after first conversion
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Total Converted</div>
              <div className={styles.cardValue}>
                {formatCurrency(result.totalConverted)}
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Total Tax Paid</div>
              <div className={styles.cardValue}>
                {formatCurrency(result.totalTaxPaid)}
              </div>
              <div className={styles.cardSub}>
                Avg {formatPercent(result.averageEffectiveTaxRate)} effective
                rate
              </div>
            </div>
          </div>

          {/* Summary cards — row 2: balances at conversion end */}
          <div className={styles.summaryCards}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>
                Trad Balance at {inputs.conversionEndAge}
              </div>
              <div className={styles.cardValue}>
                {formatCurrency(tradBalAtConversionEnd)}
              </div>
              <div className={styles.cardSub}>
                Remaining after last conversion
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>
                Roth Balance at {inputs.conversionEndAge}
              </div>
              <div className={styles.cardValue}>
                {formatCurrency(rothBalAtConversionEnd)}
              </div>
              <div className={styles.cardSub}>
                Includes conversions + growth
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Seasoned Basis</div>
              <div className={styles.cardValue}>
                {formatCurrency(result.finalTotalSeasonedBasis)}
              </div>
              <div className={styles.cardSub}>
                Penalty-free withdrawal basis
              </div>
            </div>
          </div>

          {/* Info callouts */}
          <div className={styles.ladderNote}>
            <strong>Note:</strong> Taxes shown are paid from outside cash — not
            deducted from the converted amount. This is the correct Roth ladder
            strategy: it maximizes your Roth balance. If taxes must come from
            the converted amount, your effective Roth balance will be lower.
          </div>
          <div className={styles.ladderNote}>
            {ladderFullyConverted ? (
              <>
                <strong>Ladder complete:</strong> The full Traditional balance
                was converted by age {result.conversionCompleteAge}. All
                remaining growth is in Roth and compounds tax-free with no
                future RMDs.
              </>
            ) : (
              <>
                <strong>Ladder incomplete:</strong>{" "}
                {formatCurrency(tradBalAtConversionEnd)} remains in the
                Traditional account after the last conversion at age{" "}
                {inputs.conversionEndAge}. This balance will continue to grow
                and will be subject to RMDs at 73. Consider increasing your
                annual conversion amount or extending the conversion window to
                convert more.
              </>
            )}
          </div>

          {/* Chart 1: Ladder Rungs */}
          {ladderChartData.length > 0 && (
            <>
              <p className={styles.chartSubtitle}>Conversion Rungs</p>
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={ladderChartData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="age" />
                    <YAxis tickFormatter={formatChartDollar} width={55} />
                    <Tooltip
                      formatter={(
                        value: number | undefined,
                        name: string | undefined,
                      ) => {
                        const v = value ?? 0;
                        return [formatCurrency(v), name ?? ""];
                      }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0)
                          return null;
                        const d = payload[0]?.payload;
                        return (
                          <div
                            style={{
                              background: "var(--bs-body-bg)",
                              border: "1px solid var(--bs-border-color)",
                              padding: "10px 14px",
                              borderRadius: 6,
                              fontSize: "0.85rem",
                            }}
                          >
                            <strong>Age {label}</strong>
                            <div>Amount: {formatCurrency(d?.amount ?? 0)}</div>
                            <div>Tax paid: {formatCurrency(d?.tax ?? 0)}</div>
                            <div>
                              Effective rate:{" "}
                              {formatPercent(d?.effectiveTaxRate ?? 0)}
                            </div>
                            <div>
                              Available from: age {d?.availableAge ?? "—"}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      x={result.firstWithdrawalAge}
                      stroke={REF_COLOR}
                      strokeDasharray="4 4"
                      label={{
                        value: "First access",
                        position: "insideTopRight",
                        fontSize: 11,
                        fill: REF_COLOR,
                      }}
                    />
                    <Bar
                      dataKey="amount"
                      fill={SEASONED_COLOR}
                      name="Conversion amount"
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className={styles.chartNote}>
                  Each bar = one conversion rung · Hover for tax and
                  available-from age · Dashed line = first penalty-free access
                </p>
              </div>
            </>
          )}

          {ladderChartData.length === 0 && (
            <Alert variant="info">
              No conversions were made. Check that your Traditional balance is
              greater than zero and your conversion end age is at or after your
              current age.
            </Alert>
          )}

          {/* Chart 2: Balance Trajectory */}
          <p className={styles.chartSubtitle}>Balance Trajectory</p>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={balanceChartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="age" />
                <YAxis tickFormatter={formatChartDollar} width={55} />
                <Tooltip
                  formatter={(
                    value: number | undefined,
                    name: string | undefined,
                  ) => [formatCurrency(value ?? 0), name ?? ""]}
                />
                <Legend />
                <ReferenceLine
                  x={result.firstWithdrawalAge}
                  stroke={REF_COLOR}
                  strokeDasharray="4 4"
                  label={{
                    value: "First access",
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: REF_COLOR,
                  }}
                />
                <ReferenceLine
                  x={inputs.conversionEndAge}
                  stroke={CONVERSION_END_COLOR}
                  strokeDasharray="4 4"
                  label={{
                    value: "Conversions end",
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: CONVERSION_END_COLOR,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rothBalance"
                  stroke={ROTH_COLOR}
                  fill={ROTH_COLOR}
                  fillOpacity={0.15}
                  name="Roth Balance"
                />
                <Area
                  type="monotone"
                  dataKey="totalSeasonedToDate"
                  stroke={SEASONED_COLOR}
                  fill={SEASONED_COLOR}
                  fillOpacity={0.2}
                  name="Seasoned Basis"
                />
                <Area
                  type="monotone"
                  dataKey="traditionalBalance"
                  stroke={TRAD_COLOR}
                  fill={TRAD_COLOR}
                  fillOpacity={0.15}
                  name="Traditional Balance"
                />
              </AreaChart>
            </ResponsiveContainer>
            <p className={styles.chartNote}>
              Blue = Roth total · Green = penalty-free conversion basis · Orange
              = Traditional total · Note: RMDs are not modeled here
            </p>
          </div>

          {/* Detail table toggle */}
          <div className="d-flex gap-2 mb-3">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setShowTable((v) => !v)}
            >
              {showTable ? "Hide" : "Show"} Year-by-Year Detail
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleDownloadCSV}
            >
              Download CSV
            </Button>
          </div>

          {showTable && (
            <div style={{ overflowX: "auto" }}>
              <Table size="sm" striped hover>
                <thead>
                  <tr>
                    <th>Age</th>
                    <th>Trad Bal</th>
                    <th>Roth Bal</th>
                    <th>Conversion</th>
                    <th>Tax Paid</th>
                    <th>Rate</th>
                    <th>Newly Seasoned</th>
                    <th>Total Seasoned</th>
                    <th>Cum. Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.age}>
                      <td>{row.age}</td>
                      <td>{formatCurrency(row.traditionalBalance)}</td>
                      <td>{formatCurrency(row.rothBalance)}</td>
                      <td>
                        {row.conversionAmount > 0
                          ? formatCurrency(row.conversionAmount)
                          : "—"}
                      </td>
                      <td>
                        {row.taxPaid > 0 ? formatCurrency(row.taxPaid) : "—"}
                      </td>
                      <td>
                        {row.effectiveTaxRate > 0
                          ? formatPercent(row.effectiveTaxRate)
                          : "—"}
                      </td>
                      <td>
                        {row.newlySeasonedAmount > 0
                          ? formatCurrency(row.newlySeasonedAmount)
                          : "—"}
                      </td>
                      <td>{formatCurrency(row.totalSeasonedToDate)}</td>
                      <td>{formatCurrency(row.cumulativeTaxPaid)}</td>
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
