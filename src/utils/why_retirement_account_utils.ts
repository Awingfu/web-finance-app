/**
 * Why Use a Retirement Account? — Tax advantage comparison
 *
 * Compares Roth, Traditional 401k/IRA, and taxable brokerage accounts
 * over a given accumulation period, accounting for annual tax drag on
 * dividends and capital gains in the brokerage account.
 */

export interface WhyRetirementInputs {
  currentAge: number;
  retirementAge: number;
  annualAfterTaxContrib: number; // same out-of-pocket for all three accounts
  currentMarginalRate: number; // e.g. 0.22 — grosses up Traditional contribution
  retirementOrdinaryRate: number; // e.g. 0.22 — tax owed on Traditional withdrawals
  ltcgRate: number; // e.g. 0.15 — used for dividends + LTCG on brokerage
  totalReturnRate: number; // e.g. 0.10
  dividendYield: number; // e.g. 0.015 — portion of return taxed annually
}

export interface YearlyPoint {
  age: number;
  roth: number; // gross balance (= after-tax, no taxes owed)
  traditional: number; // gross balance (taxes owed at withdrawal)
  taxable: number; // gross balance (LTCG owed at sale)
  taxableCostBasis: number;
}

export interface WhyRetirementResult {
  yearlyData: YearlyPoint[];
  finalRoth: number;
  finalTradAfterTax: number;
  finalTaxableAfterTax: number;
  tradPreTaxContrib: number; // annualAfterTaxContrib / (1 - currentMarginalRate)
  totalOutOfPocket: number; // annualAfterTaxContrib * years
  rothVsTaxableAdvantage: number; // finalRoth - finalTaxableAfterTax
  tradVsTaxableAdvantage: number; // finalTradAfterTax - finalTaxableAfterTax
}

export function calcWhyRetirementAccount(
  inputs: WhyRetirementInputs,
): WhyRetirementResult {
  const {
    currentAge,
    retirementAge,
    annualAfterTaxContrib,
    currentMarginalRate,
    retirementOrdinaryRate,
    ltcgRate,
    totalReturnRate,
    dividendYield,
  } = inputs;

  const years = retirementAge - currentAge;

  // Traditional: same out-of-pocket buys more pre-tax dollars
  const tradPreTaxContrib =
    currentMarginalRate < 1
      ? annualAfterTaxContrib / (1 - currentMarginalRate)
      : annualAfterTaxContrib;

  let roth = 0;
  let traditional = 0;
  let taxable = 0;
  let taxableCostBasis = 0;

  const yearlyData: YearlyPoint[] = [];

  // Initial point before any contributions
  yearlyData.push({
    age: currentAge,
    roth: 0,
    traditional: 0,
    taxable: 0,
    taxableCostBasis: 0,
  });

  for (let age = currentAge; age < retirementAge; age++) {
    // Roth: after-tax in, tax-free growth
    roth = roth * (1 + totalReturnRate) + annualAfterTaxContrib;

    // Traditional: pre-tax equivalent in, tax-deferred growth
    traditional = traditional * (1 + totalReturnRate) + tradPreTaxContrib;

    // Taxable: annual dividend tax drag, LTCG on gains at sale
    const dividendIncome = taxable * dividendYield;
    const taxOnDividends = dividendIncome * ltcgRate;
    const priceGain = taxable * (totalReturnRate - dividendYield);
    const netDividends = dividendIncome - taxOnDividends;
    taxable = taxable + priceGain + netDividends + annualAfterTaxContrib;
    taxableCostBasis += annualAfterTaxContrib + netDividends;

    yearlyData.push({
      age: age + 1,
      roth,
      traditional,
      taxable,
      taxableCostBasis,
    });
  }

  const finalRoth = roth;
  const finalTradAfterTax = traditional * (1 - retirementOrdinaryRate);
  const taxableGains = Math.max(0, taxable - taxableCostBasis);
  const finalTaxableAfterTax = taxable - taxableGains * ltcgRate;

  return {
    yearlyData,
    finalRoth,
    finalTradAfterTax,
    finalTaxableAfterTax,
    tradPreTaxContrib,
    totalOutOfPocket: annualAfterTaxContrib * years,
    rothVsTaxableAdvantage: finalRoth - finalTaxableAfterTax,
    tradVsTaxableAdvantage: finalTradAfterTax - finalTaxableAfterTax,
  };
}
