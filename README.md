# web-finance-app

## Summary

This is a NextJS/React app that contains tools to help with personal finance decisions:

### Current Tools

1. **Paycheck Calculator** — Estimate your take-home pay after federal/state taxes and deductions
2. **401k Equal Contribution** — Maximize your 401k by spreading contributions evenly across paychecks
3. **401k Frontloading** — Maximize your 401k as early as possible in the year

### Planned Tools

1. **401k Roth vs Traditional** — Compare Roth and Traditional 401k strategies with future value estimates and tax assumptions
2. **Why Invest?** — Visual charts showing the power of compounding and long-term investing
3. **Budgeting** — Track income and expenses with category breakdowns
4. **Emergency Fund Calculator** — Estimate how much to keep in savings based on expenses and risk tolerance
5. **Debt Payoff Planner** — Compare avalanche vs snowball strategies for paying down debt
6. **Savings Goal Tracker** — Calculate how long it takes to reach a savings goal given a monthly contribution
7. **Net Worth Tracker** — Estimate net worth by summing assets and liabilities
8. **Tax Bracket Visualizer** — See how marginal vs effective tax rates work with interactive income sliders
9. **HSA Optimizer** — Model the triple tax advantage of HSA contributions and long-term growth
10. **Social Security Estimator** — Estimate Social Security benefits based on earnings and retirement age

## Technology

This app uses:

- NextJS React with Typescript
- SASS for component level styling
- Bootstrap 5.3 / React-Bootstrap for UI components and theming (dark mode support)

Upon merge to `main` branch, GitHub Actions will autodeploy this site to <https://awingfu.github.io/web-finance-app>.

## How to Contribute

`/pages` contains the React components in route form e.g. `pages/index.tsx` contains the home page and `pages/paycheck.tsx` contains the `<url>/paycheck` route.

`/src/components` contains the reusable React components used throughout the app such as header, tooltip wrapper, footer, and navigation bar.

`/src/utils` contains the constants, helper functions, and other useful TypeScript functions for the app.

`/.github/workflows` contains the continuous integration scripts that automatically build and deploy the app on pull requests or merges to main.

## Development

### Getting Started

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
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### When Making a Pull Request

A preview deployment will deploy to `https://awingfu.github.io/web-finance-app/pr-preview/pr-<PR Number>` and will be linked in the PR Issue.

You may encounter the 404 page at the preview URL when the PR is first built so please allow 2 minutes after the preview deployment is marked successful and ensure to Hard Reload.

## References

Favicon [Wind-Chime](https://favicon.io/emoji-favicons/wind-chime)

Deployment to GH Pages [Guide](https://www.linkedin.com/pulse/deploy-nextjs-app-github-pages-federico-antu%C3%B1a/)

Setting up prettier and pre-commit hooks [Guide](https://gist.github.com/primaryobjects/9ab8d2346aa58ef6959ad357bb835963)

### Github Actions

[PR Preview Action](https://github.com/rossjrw/pr-preview-action)

[Github Pages Deploy Action](https://github.com/JamesIves/github-pages-deploy-action)

### Next.js Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!
