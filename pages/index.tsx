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

          {/* <a href="https://nextjs.org/learn" className={styles.card}>
            <h2>Learn &rarr;</h2>
            <p>Learn about Next.js in an interactive course with quizzes!</p>
          </a>

          <a
            href="https://github.com/vercel/next.js/tree/master/examples"
            className={styles.card}
          >
            <h2>Examples &rarr;</h2>
            <p>Discover and deploy boilerplate example Next.js projects.</p>
          </a>

          <a
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
            className={styles.card}
          >
            <h2>Deploy &rarr;</h2>
            <p>
              Instantly deploy your Next.js site to a public URL with Vercel.
            </p>
          </a> */}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>Created by: Adam Lui</p>
      </footer>
    </div>
  )
}

export default Home
