# Payments QA Dashboard

A simple web dashboard to test every payment scenario for **Global Squirrels** (and **MedSquirrels**, coming soon). QA testers use it to walk through scenarios one at a time, mark each as Pass or Fail, and share results.

## What it does

- Generates every unique combination of payment options — **2,400 scenarios** for Global Squirrels.
- Lets you filter by onboarding deposit, payment method, plan type, frequency, plan basis, and budget basis.
- Tracks Pass / Fail for **1st Payment** and **2nd Payment** of each scenario, independently.
- Shows the fee for each scenario — Bank $5 flat, Card 3%, Invoicing 2%, plus a *Wise fee applies* badge for Contractor plans.
- Two views — a **grid** of scenario cards or a **mind map** decision tree with rolled-up status counts.
- **Export** and **import** test results as CSV to share with teammates.
- Optional **Save snapshot** to pause and continue later.

## How to use it

1. Open `index.html` in any modern browser, or host the folder on any static site (S3, Netlify, GitHub Pages, internal QA bucket).
2. Click the **? How it works** button in the top-right of the dashboard for a full in-app guide.

That's it — no build step, no install, no backend.

## Refresh resets

Refreshing the page clears all statuses and notes, so each QA run starts clean. Use **Save snapshot** to keep your progress, or **Export CSV** to share results.
