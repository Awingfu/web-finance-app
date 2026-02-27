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
import {
  INCOME_LAST_UPDATED,
  STANDARD_DEDUCTION_SINGLE,
  STANDARD_DEDUCTION_MFJ,
} from "../src/utils/retirement_income_utils";
import { ROTH_TRAD_LAST_UPDATED } from "../src/utils/roth_traditional_utils";
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
  {
    page: "Retirement Income Planner",
    href: "/retirement/income",
    items: [
      {
        id: "ss-basics",
        question: "How does Social Security work in retirement?",
        answer: (
          <>
            <p>
              Social Security pays you a monthly benefit in retirement based on
              your highest 35 years of indexed earnings. The amount is called
              your <strong>Primary Insurance Amount (PIA)</strong> and is
              calculated by Social Security — you can find your personalized
              estimate at <strong>ssa.gov/myaccount</strong>.
            </p>
            <p>
              <strong>When you claim matters a lot:</strong>
            </p>
            <ul>
              <li>
                <strong>Full Retirement Age (FRA)</strong> is 67 for anyone born
                in 1960 or later. Claiming at FRA gives you 100% of your PIA.
              </li>
              <li>
                <strong>Claim early (age 62):</strong> benefit is reduced by up
                to ~30%. You collect for more years, but each check is smaller
                permanently.
              </li>
              <li>
                <strong>Delay past FRA (up to age 70):</strong> benefit grows by
                8% per year. Waiting from 67 to 70 increases your monthly check
                by 24%.
              </li>
            </ul>
            <p>
              The break-even age for delaying is roughly your mid-to-late 70s —
              if you expect to live longer than that, delaying usually pays off.
              If health or cash-flow is a concern, claiming earlier may make
              more sense.
            </p>
            <p>
              <strong>Is Social Security taxable?</strong> Possibly. Up to 85%
              of your benefit may be subject to federal income tax depending on
              your combined income (AGI + tax-exempt interest + half your SS
              benefit):
            </p>
            <ul>
              <li>
                Single: 50% taxable above $25,000; 85% taxable above $34,000
              </li>
              <li>
                Married filing jointly: 50% taxable above $32,000; 85% taxable
                above $44,000
              </li>
            </ul>
            <p>
              These thresholds are <strong>not inflation-adjusted</strong>, so
              most retirees with other income end up paying tax on 85% of their
              benefit.
            </p>
          </>
        ),
      },
      {
        id: "rmds",
        question:
          "What are Required Minimum Distributions (RMDs) from a 401k or Traditional IRA?",
        answer: (
          <>
            <p>
              The IRS requires you to start withdrawing from tax-deferred
              accounts (traditional 401k, traditional IRA, 403b, etc.) starting
              at <strong>age 73</strong> (per the SECURE 2.0 Act). These
              mandatory withdrawals are called{" "}
              <strong>Required Minimum Distributions (RMDs)</strong>.
            </p>
            <p>
              <strong>How the amount is calculated:</strong>
            </p>
            <p>
              Each year, your RMD = account balance ÷ distribution period from
              the IRS Uniform Lifetime Table. The distribution period shrinks
              each year (e.g., 26.5 at age 73, 20.2 at age 80), so the
              percentage you must withdraw increases as you age.
            </p>
            <p>
              <strong>Key facts:</strong>
            </p>
            <ul>
              <li>
                RMDs are taxed as <strong>ordinary income</strong> — the same
                rate as wages.
              </li>
              <li>
                Missing an RMD triggers a penalty of{" "}
                <strong>25% of the amount not withdrawn</strong> (reduced to 10%
                if corrected promptly).
              </li>
              <li>
                <strong>Roth IRAs are exempt</strong> from RMDs during the
                owner&apos;s lifetime — one reason they&apos;re valuable to
                preserve.
              </li>
              <li>
                If you&apos;re still working at 73, you may be able to delay
                RMDs from your current employer&apos;s 401k (but not from IRAs
                or old 401ks).
              </li>
              <li>
                Large RMDs can push you into a higher tax bracket, increase the
                taxable portion of your Social Security, and trigger Medicare
                IRMAA surcharges.
              </li>
            </ul>
            <p>
              The retirement income planner on this site automatically
              calculates RMDs each year using the IRS table and takes them from
              the 401k balance first.
            </p>
          </>
        ),
      },
      {
        id: "ltcg-rates",
        question:
          "What are the tax rates on long-term capital gains and qualified dividends?",
        answer: (
          <>
            <p>
              <strong>Long-term capital gains (LTCG)</strong> apply to assets
              held more than one year before selling.{" "}
              <strong>Qualified dividends</strong> (most dividends from U.S.
              stocks held long enough) are taxed at the same preferential rates.
              Both are taxed separately from — and lower than — ordinary income.
            </p>
            <p>
              <strong>
                {INCOME_LAST_UPDATED} LTCG / Qualified Dividend rates:
              </strong>
            </p>
            <p>Single filers:</p>
            <ul>
              <li>
                <strong>0%</strong> — taxable income up to $48,350
              </li>
              <li>
                <strong>15%</strong> — taxable income $48,351 – $533,400
              </li>
              <li>
                <strong>20%</strong> — taxable income above $533,400
              </li>
            </ul>
            <p>Married filing jointly:</p>
            <ul>
              <li>
                <strong>0%</strong> — taxable income up to $96,700
              </li>
              <li>
                <strong>15%</strong> — taxable income $96,701 – $600,050
              </li>
              <li>
                <strong>20%</strong> — taxable income above $600,050
              </li>
            </ul>
            <p>
              Taxable income here means your AGI minus the standard deduction ($
              {STANDARD_DEDUCTION_SINGLE.toLocaleString()} for single, $
              {STANDARD_DEDUCTION_MFJ.toLocaleString()} for MFJ in{" "}
              {INCOME_LAST_UPDATED}). LTCG brackets stack on top of your
              ordinary income — so ordinary income fills the bottom of the
              bracket, and gains are taxed at whatever rate applies above that.
            </p>
            <p>
              <strong>Short-term capital gains</strong> (assets held one year or
              less) are taxed as ordinary income at your regular bracket rate —
              no preferential treatment.
            </p>
          </>
        ),
      },
      {
        id: "zero-ltcg",
        question:
          "How can I strategically pay 0% tax on long-term capital gains?",
        answer: (
          <>
            <p>
              Since LTCG stack on top of ordinary income, you pay 0% on gains as
              long as your <em>total taxable income</em> stays below the
              threshold ($48,350 single / $96,700 MFJ in {INCOME_LAST_UPDATED}).
              In retirement, several windows make this achievable:
            </p>
            <p>
              <strong>The gap years:</strong> The period between when you retire
              and when Social Security + RMDs kick in is often your
              lowest-income window. With little ordinary income, you may have a
              large amount of &quot;room&quot; in the 0% LTCG bracket.
            </p>
            <p>
              <strong>Practical strategies:</strong>
            </p>
            <ul>
              <li>
                <strong>Harvest gains at 0%:</strong> Sell appreciated brokerage
                positions to realize gains tax-free, then immediately buy them
                back. This resets your cost basis higher so future gains are
                smaller. Unlike tax-loss harvesting, there&apos;s no wash-sale
                rule for gains.
              </li>
              <li>
                <strong>Roth conversions in low-income years:</strong> Convert
                traditional 401k / IRA money to Roth while your ordinary income
                is low. You pay ordinary income tax on the conversion now, but
                future growth and withdrawals are tax-free — and you shrink the
                account that will force RMDs later.
              </li>
              <li>
                <strong>Sequence withdrawals tax-efficiently:</strong> In years
                before SS and RMDs, pull from brokerage (LTCG rate) and cash
                first. Keep ordinary income (401k withdrawals) low to preserve
                room in the 0% LTCG bracket.
              </li>
              <li>
                <strong>Watch the SS taxation cliff:</strong> Every extra dollar
                of ordinary income can make up to $0.85 of SS benefits taxable
                too — effectively raising your marginal rate. Staying below the
                SS provisional income thresholds ($34,000 single / $44,000 MFJ)
                protects both sides.
              </li>
            </ul>
            <p>
              Example: a single retiree with $30,000 in ordinary income (401k
              withdrawals) has taxable income of about $15,000 after the
              standard deduction — leaving ~$33,000 of room in the 0% LTCG
              bracket. They can realize up to $33,000 in gains completely
              tax-free that year.
            </p>
          </>
        ),
      },
    ],
  },
  {
    page: "Roth vs Traditional 401k",
    href: "/retirement/roth-vs-traditional",
    items: [
      {
        id: "roth-vs-trad-inflation",
        question:
          "Shouldn't tax rates or income be adjusted for inflation and future wage growth?",
        answer: (
          <>
            <p>
              No adjustment is needed because the comparison is based on{" "}
              <strong>ratios, not nominal dollar amounts</strong>. The
              break-even rule — Traditional wins if your effective retirement
              rate is below your current marginal rate — holds regardless of
              inflation. Here&apos;s why:
            </p>
            <p>
              If wages and prices both double by the time you retire, your 401k
              balance doubles too. But so does the income that fills each tax
              bracket, and Congress historically indexes brackets to inflation.
              The result is that your{" "}
              <em>
                effective rate on withdrawals stays the same in real terms
              </em>
              . The ratio that drives the decision (current marginal rate vs.
              retirement effective rate) is unchanged whether you work in
              today&apos;s dollars or future dollars.
            </p>
            <p>
              Put another way: inflating every number by the same factor cancels
              out. Comparing today&apos;s rates directly is both accurate and
              simpler than trying to project nominal tax brackets decades into
              the future.
            </p>
            <p>
              The one scenario where this breaks down is if tax <em>policy</em>{" "}
              changes materially — e.g., Congress raises rates across the board.
              That&apos;s why the tool offers a &ldquo;+10pp&rdquo; preset and a
              custom bracket editor: to let you stress-test the comparison
              against hypothetical future rate environments.
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
