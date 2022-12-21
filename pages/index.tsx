import type { NextPage } from "next";
import Link from "next/link";
import styles from "../styles/Home.module.scss";
import { Header, Footer } from "../src/components";

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        <h1 className={styles.title}>Welcome to the Finance Tools App.</h1>

        <p className={styles.description}>
          Here we will have multiple tools for you to estimate your paycheck,
          budget, and more.
        </p>

        <div className={styles.grid}>
          <Link href="/paycheck" className={styles.card} passHref>
            <h2>Paycheck Calculator &rarr;</h2>
            <p>Estimate your take home pay</p>
          </Link>

          <Link href="/retirement/maximize" className={styles.card} passHref>
            <h2>401k Maximizer &rarr;</h2>
            <p>
              Maximize your 401k contributions with equal period contributions
            </p>
          </Link>

          <Link href="/retirement/frontload" className={styles.card} passHref>
            <h2>401k Frontloader &rarr;</h2>
            <p>Plan your 401k frontloading strategy</p>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
