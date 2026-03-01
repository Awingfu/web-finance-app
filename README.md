# web-finance-app

## Summary

This is a NextJS/React app that contains tools to help with personal finance decisions:

### Current Tools

1. **Paycheck Calculator** (`/paycheck`) — Estimate take-home pay after federal, state, and local taxes and deductions
2. **Why Invest?** (`/why-invest`) — Visualize the power of compounding and the cost of delaying investment
3. **Why Retirement Account** (`/learn/why-retirement-account`) — Compare Roth, Traditional 401k, and taxable brokerage accounts side-by-side with gross and after-tax value charts (including early withdrawal penalties before age 59.5)
4. **401k Optimizer** (`/retirement/savings-optimizer`) — Choose a contribution strategy (frontload, equal, backload) to max out your 401k
5. **Retirement Income Planner** (`/retirement/income`) — Model year-by-year withdrawals across accounts (401k, Roth, brokerage, cash, Social Security) with taxes, RMDs, and three withdrawal strategies
6. **Roth vs Traditional** (`/retirement/roth-vs-traditional`) — Compare after-tax retirement wealth between Roth and Traditional 401k contributions at different tax scenarios
7. **Roth Conversion Ladder** (`/retirement/roth-conversion-ladder`) — Simulate year-by-year Roth conversions with 5-year seasoning tracking, tax cost estimates, and bracket-fill or fixed-amount strategies

### Planned Tools

1. **Social Security Estimator** (High Prio) — Estimate Social Security benefits based on earnings and retirement age. Keep it simple and assume static income
2. **Budgeting** — Track income and expenses with category breakdowns. Maybe just given an income, calculate taxes then what budget should look like and export it
3. **Debt Payoff Planner** — Compare avalanche vs snowball strategies for paying down debt
4. **Savings Goal Tracker** — Calculate how long it takes to reach a savings goal given a monthly contribution. Probably a simple FV calculator

## Technology

This app uses:

- **Next.js 15** with **React 19** and **TypeScript**
- **Bootstrap 5.3** / **React-Bootstrap** for UI components and theming (dark mode via `ThemeContext`)
- **SASS Modules** (`*.module.scss`) for per-page component-level styling
- **Recharts** for all data visualization (bar charts, area charts, reference lines)
- **Prettier** + pre-commit hooks for consistent code formatting

Upon merge to `main` branch, GitHub Actions will autodeploy this site to <https://awingfu.github.io/web-finance-app>.

## Project Structure

```
/pages                  — Route-level page components
  /retirement/          — Retirement tool pages
/src
  /components           — Shared UI: Header, Footer, NavigationBar, TooltipOnHover
  /utils                — Calculation logic, constants, and helpers
    constants.ts        — Tax limits, bracket constants (updated annually)
    helperFunctions.ts  — formatCurrency, formatPercent, downloadCSV, etc.
    types.ts            — Shared TypeScript types
    retirement_tax_tables.ts        — Tax bracket types + presets (federal_2026, +10yr)
    retirement_income_utils.ts      — Retirement Income Planner simulation
    roth_traditional_utils.ts       — Roth vs Traditional comparison logic
    roth_conversion_ladder_utils.ts — Roth Conversion Ladder simulation
    why_invest_utils.ts             — Why Invest compounding calculations
    why_retirement_account_utils.ts — Why Retirement Account Roth/Trad/Taxable comparison
    paycheck_utils.ts               — Paycheck tax calculation logic
    withholdings_federal/state/local.ts — Withholding tables
/styles                 — Per-page SCSS modules + globals.scss
/.github/workflows      — CI scripts for build, preview, and deploy
```

## Code Patterns

### Adding a New Page

1. Create `pages/<route>.tsx` for the page component
2. Create `styles/<PageName>.module.scss` for styles (copy structure from an existing module)
3. Create `src/utils/<name>_utils.ts` for calculation logic (keep pure functions separate from UI)
4. Register the route in both places in `src/components/NavigationBar.tsx`:
   - Add to `NAV_ENTRIES` (top-level link or inside a `group`)
   - Add to `PAGE_NAMES` (used for mobile header display)
5. Add a card to `pages/index.tsx`

### State & Derived Data

- Use `useState` for form inputs; group related inputs into a single typed object (e.g. `RetirementIncomeInputs`)
- Use `useMemo` for all expensive calculations — pass the full inputs object as the dependency
- Pattern for tax table inputs: define `CoreInputs = Omit<FullInputs, "taxTable">` and derive `taxTable` inside `useMemo` from a preset + optional custom rows

### Form Inputs

- Wrap inputs with `<TooltipOnHover>` for help text
- Number inputs: always include `onWheel={(e) => e.currentTarget.blur()}` to prevent accidental scroll changes
- Use `formatStateValue` when setting input `value` to handle zero/empty edge cases
- Use `<ToggleButtonGroup>` for mutually exclusive mode switches (e.g. fixed vs bracket-fill)

### Charts (Recharts)

- Always wrap charts in `<ResponsiveContainer width="100%" height={N}>`
- Use `fill` prop on `<Bar>` for the legend color; use `<Cell>` children only to override per-bar colors — both are needed when mixing the two
- Tooltip formatter pattern: `(value: number | undefined, name: string | undefined) => [formatCurrency(value ?? 0), name ?? ""]`
- For `ReferenceLine` labels that might clip at chart edges, use `position: "insideTopRight"` instead of `"top"`
- Conditionally render chart series: check `rows.some(r => r.field > 0)` and only render `<Bar>` / `<Area>` if true

### Styling

- Each page has its own SCSS module; import as `import styles from "../../styles/PageName.module.scss"`
- Dark mode is handled globally via `ThemeContext` and `data-bs-theme` — avoid hardcoding colors; prefer Bootstrap semantic variables
- Layout: two-column `form | results` split is the standard pattern for tool pages

### Tax Tables

- `retirement_tax_tables.ts` owns `TaxBracket`, `RetirementTaxTable`, and preset tables
- Key helpers: `calcTaxFromTable`, `getEffectiveIncrementalRate` (blended marginal rate on income stacked on a base), `getMarginalRateFromTable`
- Pages that need custom tax brackets use the preset/custom editor pattern from `roth-vs-traditional.tsx`; tax brackets are not exported from pages — `tableToEditorRows` / `editorRowsToTable` helpers are local to each page

### TypeScript Notes

- Avoid `[...new Set(array)]` — use `Array.from(new Set(array))` to avoid `downlevelIteration` TS errors
- Use `Array.from({ length: N }, (_, i) => ...)` for range generation

## Development

### Getting Started

Download the repo locally:

```
git clone https://github.com/Awingfu/web-finance-app.git
```

Change directory into the app, and install npm packages:

```
cd web-finance-app && npm i
```

Run the development server which auto-updates on file edits:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Type-check without building:

```bash
npx tsc --noEmit
```

### When Making a Pull Request

A preview deployment will deploy to `https://awingfu.github.io/web-finance-app/pr-preview/pr-<PR Number>` and will be linked in the PR.

You may encounter the 404 page at the preview URL when the PR is first built — allow 2 minutes after the preview deployment is marked successful and hard reload.

## Operations Guide

### CI Overview

There are two GitHub Actions workflows:

| Workflow                   | File                  | Trigger                      | What it does                                                                      |
| -------------------------- | --------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| **Deploy to GitHub Pages** | `gh-pages.deploy.yml` | Push to `main`               | Builds and deploys to `https://awingfu.github.io/web-finance-app` (the live site) |
| **Deploy PR Previews**     | `preview.yml`         | PR opened / updated / closed | Builds and deploys to `/pr-preview/pr-<N>`; tears down on PR close                |

Both workflows run `npm ci` → `npm test` → `npm run build`, then deploy to the `gh-pages` branch. The main deploy uses `clean-exclude: pr-preview/` so previews are not wiped when main is deployed.

### Troubleshooting CI Failures

**1. Find the failing step**

- Go to the repo → **Actions** tab → click the failed run → expand the failing step to read the full log

**2. Common failure causes**

| Symptom                                 | Likely cause                       | Fix                                                                                                                                                    |
| --------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test` fails                        | A test assertion is broken         | Run `npm test` locally to reproduce and fix                                                                                                            |
| `npm run build` fails                   | TypeScript error or missing import | Run `npx tsc --noEmit` locally; then `npm run build`                                                                                                   |
| Deploy step fails with 403              | GitHub Pages permissions issue     | Confirm Settings → Pages → Source is `gh-pages` branch; check Actions have write permissions under Settings → Actions → General                        |
| Preview URL returns 404 after "success" | CDN/Pages propagation delay        | Wait 2 minutes, then hard reload (`Cmd+Shift+R`)                                                                                                       |
| Two workflows queue-cancel each other   | `concurrency` groups collide       | Each workflow uses a different group prefix (`ci-` vs `preview-`), so this shouldn't happen — if it does, check that the group keys are still distinct |

**3. Re-run a failed job**

- In the Actions tab, open the failed run → click **Re-run failed jobs** (top right). No code change needed if it was a transient infrastructure issue.

**4. Validate locally before pushing**

```bash
npm ci           # clean install
npm test         # run tests
npm run build    # static export to /out
npx tsc --noEmit # type-check without building
```

---

### Manually Removing a Stuck PR Preview

PR previews live at `/pr-preview/pr-<N>/` on the `gh-pages` branch. They are normally removed automatically when a PR is closed (the `preview.yml` workflow handles cleanup via `pr-preview-action`). If that cleanup job fails or is skipped, the preview directory will remain live until removed manually.

**Steps to manually remove a PR preview:**

1. **Check out the `gh-pages` branch locally:**

   ```bash
   git fetch origin gh-pages
   git checkout gh-pages
   ```

2. **Delete the stale preview directory** (replace `42` with the PR number):

   ```bash
   git rm -rf pr-preview/pr-42
   git commit -m "chore: manually remove stale pr-42 preview"
   git push origin gh-pages
   ```

3. **Switch back to your working branch:**
   ```bash
   git checkout -
   ```

The preview URL will stop serving within a minute or two after the push.

**Alternative — re-trigger the cleanup via a dummy PR event:**

If you don't want to touch `gh-pages` directly, you can re-open and immediately re-close the original PR (if it's still available). The `closed` event will re-run `preview.yml` which calls `pr-preview-action` to clean up.

---

## References

Favicon [Wind-Chime](https://favicon.io/emoji-favicons/wind-chime)

Deployment to GH Pages [Guide](https://www.linkedin.com/pulse/deploy-nextjs-app-github-pages-federico-antu%C3%B1a/)

Setting up prettier and pre-commit hooks [Guide](https://gist.github.com/primaryobjects/9ab8d2346aa58ef6959ad357bb835963)

### Github Actions

[PR Preview Action](https://github.com/rossjrw/pr-preview-action)

[Github Pages Deploy Action](https://github.com/JamesIves/github-pages-deploy-action)

### Next.js Learn More

- [Next.js Documentation](https://nextjs.org/docs) — learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) — an interactive Next.js tutorial
