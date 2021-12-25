import type { NextPage } from 'next'
import Head from 'next/head'
// import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Lui Finance App</title>
        <meta name="description" content="Adam Lui finance app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to the Finance App.
        </h1>

        <p className={styles.description}>
          Here we will have multiple tools for you to estimate your paycheck, budget, and more. 
        </p>

        <div className={styles.grid}>
          <Link href="/paycheck">
            <a className={styles.card}>
              <h2>Paycheck Calculator &rarr;</h2>
              <p>Estimate your take home pay!</p>
            </a>
          </Link>

          <Link href="/retirement/frontload">
            <a href="https://nextjs.org/learn" className={styles.card}>
              <h2>401k Frontloader &rarr;</h2>
              <p>Plan your 401k maximum</p>
            </a>
          </Link>

        </div>
      </main>

      <footer className={styles.footer}>
        <p>Created by: Adam Lui</p>
      </footer>
    </div>
  )
}

export default Home
