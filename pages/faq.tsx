import Link from "next/link";
import { Accordion } from "react-bootstrap";
import styles from "../styles/Home.module.scss";
import { Header, Footer } from "../src/components";
import {
  _401k_numbers_last_updated,
  _401k_maximum_contribution_individual,
  _401k_catchup,
  _401k_maximum_contribution_individual_over50,
  _401k_maximum_contribution_total,
  _IRA_maximum_contribution_individual,
  _IRA_catchup,
  _IRA_maximum_contribution_individual_over50,
  maximum_HSA_contribution,
  maximum_HSA_contribution_family,
  HSA_catchup_contribution,
} from "../src/utils/constants";
import { formatCurrency } from "../src/utils";

interface FaqItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

interface FaqSection {
  page: string;
  href: string;
  items: FaqItem[];
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    page: "Paycheck Calculator",
    href: "/paycheck",
    items: [
      {
        id: "payroll-vs-income-tax",
        question:
          "What is the difference between income tax and payroll tax (FICA)?",
        answer: (
          <>
            <p>
              <strong>Income tax</strong> (federal and state) is a tax on your
              earnings that funds general government operations. The amount you
              owe depends on your total taxable income and filing status, and is
              calculated when you file your annual tax return.
            </p>
            <p>
              <strong>Payroll taxes (FICA)</strong> are separate taxes that
              specifically fund Social Security and Medicare. They are:
            </p>
            <ul>
              <li>
                <strong>Social Security:</strong> 6.2% of gross wages up to the
                annual wage base ($184,500 in 2026). Once you hit that cap, no
                further Social Security tax is withheld for the rest of the
                year.
              </li>
              <li>
                <strong>Medicare:</strong> 1.45% of all gross wages, plus an
                additional 0.9% on wages above $200,000 (single) or $250,000
                (married filing jointly).
              </li>
            </ul>
            <p>
              Your employer also pays a matching 6.2% Social Security and 1.45%
              Medicare on your behalf — those amounts are not reflected in your
              paycheck.
            </p>
          </>
        ),
      },
      {
        id: "fica-gross-income",
        question:
          "Why are Social Security and Medicare based on gross income, not taxable income?",
        answer: (
          <>
            <p>
              FICA taxes (Social Security and Medicare) are calculated on your{" "}
              <strong>gross wages</strong> — your total pay before any pre-tax
              deductions. This means that contributions to a 401k, traditional
              IRA, HSA, or medical insurance <strong>do not reduce</strong> the
              wages subject to FICA.
            </p>
            <p>
              This is different from federal and state income tax withholding,
              which are calculated on your <strong>taxable income</strong> after
              pre-tax deductions are subtracted.
            </p>
            <p>
              For example, if you earn $80,000 and contribute 10% to a
              traditional 401k:
            </p>
            <ul>
              <li>
                Federal and state income tax is withheld on{" "}
                <strong>$72,000</strong> (gross minus $8,000 401k contribution)
              </li>
              <li>
                Social Security and Medicare are still withheld on the full{" "}
                <strong>$80,000</strong>
              </li>
            </ul>
            <p>
              One benefit: your 401k basis for Social Security purposes reflects
              your full earnings, and Roth conversions later are not subject to
              FICA again.
            </p>
          </>
        ),
      },
      {
        id: "withholding-vs-actual-tax",
        question:
          "What is the difference between withholding and my actual tax liability?",
        answer: (
          <>
            <p>
              <strong>Withholding</strong> is the amount your employer sends to
              the government from each paycheck as a prepayment toward your
              estimated tax bill. It is based on your W-4 elections and the IRS
              withholding tables — it is an approximation, not your final tax
              owed.
            </p>
            <p>
              <strong>Actual tax liability</strong> is the true amount you owe
              for the year, calculated when you file your return. It accounts
              for your full income picture — investment income, deductions,
              credits, life changes, and more.
            </p>
            <p>
              If too much was withheld during the year, you get a refund. If too
              little was withheld, you owe the difference (and may owe a
              penalty). The goal of withholding is to get as close to your
              actual liability as possible.
            </p>
          </>
        ),
      },
      {
        id: "federal-accuracy",
        question:
          "How accurate are the federal tax estimates in this calculator?",
        answer: (
          <>
            <p>
              Federal income tax withholding is calculated using the{" "}
              <strong>IRS Publication 15-T withholding tables</strong> (updated
              for 2026), which is the same method employers use. This gives a
              very accurate estimate of the federal income tax withheld from
              each paycheck.
            </p>
            <p>
              Social Security and Medicare withholding are also computed using
              the official rates and income caps.
            </p>
            <p>
              That said, some factors are not accounted for and may affect your
              actual withholding:
            </p>
            <ul>
              <li>Additional withholding elected on your W-4 (Step 4c)</li>
              <li>Multiple jobs adjustments (W-4 Step 2)</li>
              <li>Dependent credits claimed on the W-4</li>
              <li>Itemized deductions beyond the standard deduction</li>
            </ul>
          </>
        ),
      },
      {
        id: "401k-limits",
        question: `What are the ${_401k_numbers_last_updated} 401k contribution limits?`,
        answer: (
          <>
            <p>There are two separate 401k limits to be aware of:</p>
            <p>
              <strong>Elective deferral limit</strong> — the maximum you can
              contribute from your own paycheck across traditional and Roth 401k
              combined:
            </p>
            <ul>
              <li>
                Under 50:{" "}
                {formatCurrency(_401k_maximum_contribution_individual)}
              </li>
              <li>
                50 or older (catch-up):{" "}
                {formatCurrency(_401k_maximum_contribution_individual_over50)}{" "}
                (an extra {formatCurrency(_401k_catchup)})
              </li>
            </ul>
            <p>
              <strong>Annual additions limit</strong> — the cap on <em>all</em>{" "}
              contributions to a 401k including your elective deferrals,
              after-tax (Mega Backdoor Roth) contributions, and any employer
              match or profit sharing:
            </p>
            <ul>
              <li>
                Under 50: {formatCurrency(_401k_maximum_contribution_total)}
              </li>
              <li>
                50 or older (catch-up):{" "}
                {formatCurrency(
                  _401k_maximum_contribution_total + _401k_catchup,
                )}
              </li>
            </ul>
            <p>
              The Mega Backdoor Roth strategy uses after-tax contributions to
              fill the gap between your elective deferrals and the annual
              additions limit. The available room depends on how much your
              employer contributes.
            </p>
          </>
        ),
      },
      {
        id: "ira-limits",
        question: "What are the IRA contribution limits?",
        answer: (
          <>
            <p>
              Your combined contributions across{" "}
              <strong>all traditional and Roth IRAs</strong> cannot exceed:
            </p>
            <ul>
              <li>
                Under 50: {formatCurrency(_IRA_maximum_contribution_individual)}
                /year
              </li>
              <li>
                50 or older (catch-up):{" "}
                {formatCurrency(_IRA_maximum_contribution_individual_over50)}
                /year (an extra {formatCurrency(_IRA_catchup)})
              </li>
            </ul>
            <p>A few additional rules to keep in mind:</p>
            <ul>
              <li>
                <strong>Roth IRA income limits:</strong> your ability to
                contribute to a Roth IRA phases out at higher incomes
                ($138,000–$153,000 for single filers; $218,000–$228,000 for
                married filing jointly in recent years). Above the limit you
                cannot contribute directly, though a Backdoor Roth conversion is
                an option.
              </li>
              <li>
                <strong>Traditional IRA deductibility:</strong> contributions
                are always allowed, but the tax deduction phases out if you (or
                your spouse) are covered by a workplace retirement plan and your
                income exceeds certain thresholds.
              </li>
              <li>
                You must have earned income at least equal to your contribution
                for the year.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "hsa-limits",
        question: "What are the HSA and FSA contribution limits?",
        answer: (
          <>
            <p>
              <strong>HSA (Health Savings Account)</strong> — available only if
              you are enrolled in a qualifying High Deductible Health Plan
              (HDHP). Contributions are pre-tax, grow tax-free, and withdrawals
              for qualified medical expenses are tax-free (triple tax
              advantage). Unused balances roll over indefinitely.
            </p>
            <ul>
              <li>
                Self-only coverage: {formatCurrency(maximum_HSA_contribution)}
                /year
              </li>
              <li>
                Family coverage:{" "}
                {formatCurrency(maximum_HSA_contribution_family)}/year
              </li>
              <li>
                55 or older (catch-up): add{" "}
                {formatCurrency(HSA_catchup_contribution)}/year to whichever
                limit applies
              </li>
            </ul>
            <p>
              <strong>FSA (Flexible Spending Account)</strong> —
              employer-sponsored account that also lets you pay for qualified
              medical expenses pre-tax, but with different rules:
            </p>
            <ul>
              <li>
                The IRS limit for a healthcare FSA is $3,400/year (2025); your
                employer may set a lower cap.
              </li>
              <li>
                FSAs are generally <em>use-it-or-lose-it</em> — unused funds do
                not roll over (though employers may offer a grace period or
                allow a small rollover amount).
              </li>
              <li>
                You can have an FSA regardless of your health plan type, but you{" "}
                <strong>cannot</strong> contribute to an HSA while enrolled in a
                general-purpose healthcare FSA.
              </li>
            </ul>
            <p>
              This calculator&apos;s HSA/FSA field applies pre-tax treatment to
              whatever amount you enter. Check with your employer or plan
              documents for which account type you have.
            </p>
          </>
        ),
      },
      {
        id: "state-accuracy",
        question: "How accurate are the state tax estimates?",
        answer: (
          <>
            <p>
              State withholding is an <strong>approximation</strong>. Unlike
              federal withholding, which uses IRS-published payroll withholding
              tables, state estimates here are calculated by applying the
              state&apos;s{" "}
              <strong>income tax brackets and standard deduction</strong>{" "}
              directly to your annualized taxable income.
            </p>
            <p>
              This approach is reasonably accurate for most situations, but
              actual employer withholding may differ because:
            </p>
            <ul>
              <li>
                Many states publish separate withholding tables or percentage
                methods that differ slightly from the statutory tax brackets
              </li>
              <li>
                State standard deductions used here come from the Tax Foundation
                2026 data and may not match the withholding-specific deduction
                amounts in each state&apos;s employer withholding guide
              </li>
              <li>
                Some states (e.g., Arizona) allow employees to choose their own
                withholding percentage
              </li>
              <li>
                Local/city taxes, occupational taxes, and state-specific credits
                are not included
              </li>
            </ul>
            <p>
              For the most accurate state withholding, consult your state&apos;s
              department of revenue withholding tables or your employer&apos;s
              payroll provider.
            </p>
          </>
        ),
      },
    ],
  },
];

function FAQ() {
  return (
    <div className={styles.container}>
      <Header titleName="FAQ" />

      <main style={{ minHeight: "85vh", padding: "2rem 1rem" }}>
        <h1 className="mb-1">Frequently Asked Questions</h1>
        <p className="text-muted mb-4">
          Common questions about how each calculator works.
        </p>

        {FAQ_SECTIONS.map((section) => (
          <section key={section.page} className="mb-5">
            <h2 className="h5 mb-3">
              <Link href={section.href}>{section.page}</Link>
            </h2>
            <Accordion alwaysOpen={false}>
              {section.items.map((item) => (
                <Accordion.Item key={item.id} eventKey={item.id}>
                  <Accordion.Header>{item.question}</Accordion.Header>
                  <Accordion.Body>{item.answer}</Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          </section>
        ))}
      </main>

      <Footer />
    </div>
  );
}

export default FAQ;
