# Payments QA Dashboard

A simple web dashboard to test every payment scenario for **Global Squirrels** (and **MedSquirrels**, coming soon). QA testers use it to walk through scenarios one at a time, mark each as Pass, Fail, or In Progress, and share results.

## What it does

- Generates every unique combination of payment options — **4,800 scenarios** for Global Squirrels.
- Lets you filter by onboarding deposit, payment method, plan type, frequency, plan basis, budget basis, and profile add/invite basis.
- Tracks **Pass / Fail / In Progress** for **1st Payment** and **2nd Payment** of each scenario, independently — *In Progress* is for cases where you've done your part but the result is waiting on something else (replication, backend deploy, vendor confirmation).
- Shows the fee for each scenario — Bank $5 flat, Card 3%, Invoicing 2%, plus a *Wise fee applies* badge for Contractor plans.
- Two views — a **grid** of scenario cards or a **mind map** decision tree with rolled-up status counts.
- **Export** and **import** test results as CSV to share with teammates.
- Optional **Save snapshot** to pause and continue later.
- Two Wise tools in the header:
  - **Wise calculator** — calls the Wise quote API live; pick currencies, amounts, and rails to verify rates without leaving the dashboard.
  - **Wise converter** — opens Wise's public currency converter on `wise.com` in a new tab, pre-filled with your last-used currency pair and amount, for an independent sanity-check.

## How to use it

1. Open `index.html` in any modern browser, or host the folder on any static site (S3, Netlify, GitHub Pages, internal QA bucket).
2. Click the **? How it works** button in the top-right of the dashboard for a full in-app guide.

That's it — no build step, no install, no backend.

## Refresh resets

Refreshing the page clears all statuses and notes, so each QA run starts clean. Use **Save snapshot** to keep your progress, or **Export CSV** to share results.
