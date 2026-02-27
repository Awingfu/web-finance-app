import type { NextPage } from "next";
import Link from "next/link";
import styles from "../styles/Home.module.scss";
import { Header, Footer } from "../src/components";

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        <h1 className={styles.title}>Welcome to the Finance App.</h1>

        <p className={styles.description}>
          We have tools for you to estimate your paycheck, frontload your 401k,
          and more.
        </p>

        <div className={styles.grid}>
          <Link href="/paycheck" className={styles.card} passHref>
            <h2>Paycheck Calculator &rarr;</h2>
            <p>Estimate your take home pay</p>
          </Link>

          <Link href="/why-invest" className={styles.card} passHref>
            <h2>Why Invest? &rarr;</h2>
            <p>See the power of compounding and the cost of waiting</p>
          </Link>

          <Link href="/retirement-savings" className={styles.card} passHref>
            <h2>401k Optimizer &rarr;</h2>
            <p>Plan your 401k strategy</p>
          </Link>

          <Link href="/retirement/income" className={styles.card} passHref>
            <h2>Retirement Income &rarr;</h2>
            <p>Plan withdrawals across accounts with taxes and RMDs</p>
          </Link>

          <Link
            href="/retirement/roth-vs-traditional"
            className={styles.card}
            passHref
          >
            <h2>Roth vs Traditional &rarr;</h2>
            <p>Compare after-tax retirement wealth across contribution types</p>
          </Link>

          <Link
            href="/retirement/roth-conversion-ladder"
            className={styles.card}
            passHref
          >
            <h2>Roth Conversion Ladder &rarr;</h2>
            <p>
              Optimize year-by-year Roth conversions to minimize lifetime taxes
            </p>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
