# web-finance-app

## What is this

This is a NextJS/React app that contains tools that will do random finance stuff such as:

1. Paycheck Calculator
2. 401k Equal Contribution Maximizing
2. 401k Frontloading

Planned features

1. 401k Roth vs Traditional
2. Budgeting

## Technology

This app uses NextJS React with Typescript and SASS for component level styling.

Upon merge to `main` branch, github actions will autodeploy this site to <https://awingfu.github.io/web-finance-app>.

## How to Contribute

`/pages` contains all of the React components in route form e.g. `pages/index.tsx` contains the home page and `pages/paycheck.tsx` contains the `<url>/paycheck` route.

`src/components` contains all of the resusable React components used throughout the app such as header, tooltip wrapper, footer, and navigation bar.

`src/utls` contains all of the constants, helper functions, and other useful items to import into the React components.

## References

Favicon from https://favicon.io/emoji-favicons/wind-chime

Deployment to GH Pages from this guide: https://www.linkedin.com/pulse/deploy-nextjs-app-github-pages-federico-antu%C3%B1a/

## Getting Started

Download the repo locally:

```
git clone https://github.com/Awingfu/web-finance-app.git
```

Change directory into the app, and install npm packages

```
cd web-finance-app && npm i
```

Run the development server which auto updates on file edits:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!
