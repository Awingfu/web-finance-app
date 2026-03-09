import type { NextPage } from "next";
import Link from "next/link";
import styles from "../styles/Home.module.scss";
import { Header, Footer } from "../src/components";

interface CardDef {
  href: string;
  title: string;
  description: string;
}

interface Section {
  label: string;
  cards: CardDef[];
}

const SECTIONS: Section[] = [
  {
    label: "Learn",
    cards: [
      {
        href: "/learn/why-invest",
        title: "Why Invest?",
        description: "See the power of compounding and the cost of waiting",
      },
      {
        href: "/learn/why-retirement-account",
        title: "Why Retirement Account?",
        description:
          "See how 401k and IRA accounts beat taxable investing with tax-free compounding",
      },
      {
        href: "/learn/three-fund-portfolio",
        title: "3-Fund Portfolio",
        description:
          "Build a simple, diversified portfolio with US stocks, international stocks, and bonds",
      },
      {
        href: "/learn/tax-rates",
        title: "How Federal Income Tax Works",
        description:
          "See how progressive tax brackets work and why your effective rate is always lower than your marginal rate",
      },
    ],
  },
  {
    label: "Calculators",
    cards: [
      {
        href: "/paycheck",
        title: "Paycheck Calculator",
        description: "Estimate your take-home pay",
      },
      {
        href: "/retirement/fire",
        title: "FIRE Calculator",
        description:
          "Find your Financial Independence number and compare CoastFIRE, BaristaFIRE, and FatFIRE milestones",
      },
    ],
  },
  {
    label: "Retirement Planning",
    cards: [
      {
        href: "/retirement/savings-optimizer",
        title: "401k Optimizer",
        description: "Plan your 401k contribution strategy",
      },
      {
        href: "/retirement/income",
        title: "Retirement Income",
        description: "Plan withdrawals across accounts with taxes and RMDs",
      },
      {
        href: "/retirement/roth-vs-traditional",
        title: "Roth vs Traditional",
        description:
          "Compare after-tax retirement wealth across contribution types",
      },
      {
        href: "/retirement/roth-conversion-ladder",
        title: "Roth Conversion Ladder",
        description:
          "Optimize year-by-year Roth conversions to minimize lifetime taxes",
      },
    ],
  },
];

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        <h1 className={styles.title}>Finance Tools</h1>

        <p className={styles.description}>
          Tools for paycheck estimation, retirement planning, and investment
          strategy.
        </p>

        <div className={styles.sections}>
          {SECTIONS.map((section) => (
            <section key={section.label} className={styles.section}>
              <h2 className={styles.sectionLabel}>{section.label}</h2>
              <div className={styles.grid}>
                {section.cards.map((card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className={styles.card}
                    passHref
                  >
                    <span className={styles.cardTitle}>
                      {card.title} &rarr;
                    </span>
                    <span className={styles.cardDesc}>{card.description}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
