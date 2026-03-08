// ── FIRE Calculator Utilities ─────────────────────────────────────────────────

export interface FireInputs {
  currentAge: number;
  targetRetirementAge: number;
  currentPortfolio: number;
  annualSpending: number;
  annualSavings: number;
  returnRate: number;
  withdrawalRate: number;
  partTimeIncome: number;
}

export interface FireMilestones {
  coast: number;
  lean: number;
  barista: number;
  fire: number;
  fat: number;
}

export interface FireAges {
  coast: number | null;
  lean: number | null;
  barista: number | null;
  fire: number | null;
  fat: number | null;
}

export interface YearlyFirePoint {
  age: number;
  portfolio: number;
}

export interface SensitivityPoint {
  savingsRate: number;
  yearsToFire: number | null;
}

export interface FireResult {
  milestones: FireMilestones;
  fireAges: FireAges;
  yearlyData: YearlyFirePoint[];
  sensitivityData: SensitivityPoint[];
  impliedIncome: number;
  currentSavingsRate: number;
  leanSpending: number;
  fatSpending: number;
}

export function calcFire(inputs: FireInputs): FireResult {
  const {
    currentAge,
    targetRetirementAge,
    currentPortfolio,
    annualSpending,
    annualSavings,
    returnRate,
    withdrawalRate,
    partTimeIncome,
  } = inputs;

  const leanSpending = annualSpending * 0.75;
  const fatSpending = annualSpending * 1.5;
  const impliedIncome = annualSpending + annualSavings;
  const currentSavingsRate =
    impliedIncome > 0 ? annualSavings / impliedIncome : 0;

  const wr = withdrawalRate > 0 ? withdrawalRate : 0.04;

  const fireNumber = annualSpending / wr;
  const leanNumber = leanSpending / wr;
  const fatNumber = fatSpending / wr;
  const baristaAnnualNeeded = Math.max(0, annualSpending - partTimeIncome);
  const baristaNumber = baristaAnnualNeeded / wr;
  const yearsToRetirement = targetRetirementAge - currentAge;
  const coastNumber =
    yearsToRetirement > 0
      ? fireNumber / Math.pow(1 + returnRate, yearsToRetirement)
      : fireNumber;

  const milestones: FireMilestones = {
    coast: coastNumber,
    lean: leanNumber,
    barista: baristaNumber,
    fire: fireNumber,
    fat: fatNumber,
  };

  // Year-by-year accumulation to age 100
  const yearlyData: YearlyFirePoint[] = [];
  const fireAges: FireAges = {
    coast: null,
    lean: null,
    barista: null,
    fire: null,
    fat: null,
  };

  let portfolio = currentPortfolio;
  for (let age = currentAge; age <= 100; age++) {
    yearlyData.push({ age, portfolio: Math.round(portfolio) });

    if (portfolio >= coastNumber && fireAges.coast === null)
      fireAges.coast = age;
    if (portfolio >= leanNumber && fireAges.lean === null) fireAges.lean = age;
    if (portfolio >= baristaNumber && fireAges.barista === null)
      fireAges.barista = age;
    if (portfolio >= fireNumber && fireAges.fire === null) fireAges.fire = age;
    if (portfolio >= fatNumber && fireAges.fat === null) fireAges.fat = age;

    portfolio = portfolio * (1 + returnRate) + annualSavings;
  }

  // Savings rate sensitivity (hold impliedIncome constant)
  const sensitivityData: SensitivityPoint[] = [];
  for (let ratePercent = 5; ratePercent <= 85; ratePercent += 2) {
    const rate = ratePercent / 100;
    const spendingI = impliedIncome * (1 - rate);
    const savingsI = impliedIncome * rate;
    const fiNumberI = spendingI / wr;

    let yearsToFire: number | null = null;
    let p = currentPortfolio;
    for (let yr = 0; yr <= 80; yr++) {
      if (p >= fiNumberI) {
        yearsToFire = yr;
        break;
      }
      p = p * (1 + returnRate) + savingsI;
    }

    sensitivityData.push({ savingsRate: ratePercent, yearsToFire });
  }

  return {
    milestones,
    fireAges,
    yearlyData,
    sensitivityData,
    impliedIncome,
    currentSavingsRate,
    leanSpending,
    fatSpending,
  };
}
