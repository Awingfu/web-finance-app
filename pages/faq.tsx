import Link from "next/link";
import { Accordion } from "react-bootstrap";
import styles from "../styles/Home.module.scss";
import { Header, Footer } from "../src/components";

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
