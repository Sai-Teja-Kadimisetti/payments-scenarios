# Payments QA Scenario Dashboard

A static HTML/CSS/JS dashboard that lets QA walk through every payment scenario for **Global Squirrels** (and, eventually, **MedSquirrels**), mark each Pass / Fail at the 1st-payment and 2nd-payment level, and export results.

No build step. No backend. Drop the folder onto any static host (or open `index.html` directly).

---

## File structure

```
c:\Projects\Payments\
├── index.html                  Page shell. References the CSS + 2 JS files.
├── README.md                   This file.
├── assets\
│   ├── css\
│   │   └── styles.css          All styling.
│   └── js\
│       ├── data.js             Project + fee + dimension definitions (edit this to change scenarios).
│       └── app.js              State, scenario generation, filtering, rendering, events.
```

`data.js` is the only file you should normally need to edit when adding a new project or changing fee rules. `app.js` is generic — it reads from `data.js`.

---

## How to deploy

Pure static site. Any of these work:

| Target                                     | How                                            |
| ------------------------------------------ | ---------------------------------------------- |
| **Local**                                  | Double-click `index.html`. Runs offline.       |
| **Internal QA bucket / S3**                | Upload all files keeping the folder structure. |
| **Netlify / GitHub Pages / Vercel static** | Point at the folder root, no build command.    |
| **Behind nginx / Apache**                  | Serve the folder as a static site.             |

There is no environment variable, no API call, no database. Everything is in-browser.

---

## Scenario model

A **scenario** is one unique combination of 8 dimensions. Global Squirrels has **2,400 scenarios** (1,800 with onboarding deposit + 600 without).

| #   | Dimension          | Values                                                                                                                                   |
| --- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Onboarding Deposit | Yes, No                                                                                                                                  |
| 2   | Deposit Frequency  | Monthly, Semi-Monthly, Weekly &nbsp; *(only when Deposit = Yes)*                                                                         |
| 3   | Payment Type       | Prepaid, Postpaid                                                                                                                        |
| 4   | Payment Method     | Auto-pay Card, Auto-pay Bank, Paylink Bank, Paylink Card, Invoicing                                                                      |
| 5   | Plan Type          | **Employee:** Employee Plan, Managed Office Plan, Employer of Record (EOR) · **Contractor:** Contractor Plan, Contractor of Record (COR) |
| 6   | Payment Frequency  | Monthly, Semi-Monthly, Weekly                                                                                                            |
| 7   | Plan Basis         | Hourly, Monthly                                                                                                                          |
| 8   | Budget Basis       | Hourly, Monthly                                                                                                                          |

Each scenario has **two payment stages** (1st Payment and 2nd Payment) tracked independently. So total payment tests = **scenarios × 2 = 4,800**.

### Conditional rules baked in

- **Deposit Frequency** only applies when **Onboarding Deposit = Yes**. When Deposit = No, the dimension is dropped from the scenario, the chip is hidden, and the Mind Map skips that level. Implemented in `buildScenarios()` in `app.js`.

If new dependencies emerge (e.g. *"Invoicing is never Auto-pay"*), apply the same pattern: guard the inner loop in `buildScenarios()`.

---

## Fee rules

Defined in `assets/js/data.js` → `FEES`. Computed against a fixed `SAMPLE_AMOUNT = 1000`.

| Method                      | Rule                                               | Fee on $1,000 |
| --------------------------- | -------------------------------------------------- | ------------- |
| Auto-pay Bank, Paylink Bank | `kind: 'flat'`, $5                                 | $5.00         |
| Auto-pay Card, Paylink Card | `kind: 'percent'`, 3%                              | $30.00        |
| Invoicing                   | `kind: 'percent'`, 2%                              | $20.00        |
| Contractor Plan or COR      | + `Wise fee applies` badge (display-only, no math) | —             |

To change a rate: edit the `FEES` object in `data.js`. No other change required.

---

## How to add a new project (e.g. fill in MedSquirrels)

1. Open `assets/js/data.js`.
2. Edit the `medsquirrels` block. Set `enabled: true` and provide `dimensions` matching the Global Squirrels shape:

   ```js
   medsquirrels: {
     id: 'medsquirrels',
     name: 'MedSquirrels',
     code: 'MS',
     enabled: true,
     dimensions: {
       deposit:          ['Yes', 'No'],
       depositFrequency: ['Monthly', 'Weekly'],     // adjust as needed
       paymentType:      ['Prepaid', 'Postpaid'],
       paymentMethod: [
         { id: 'autopay-card', label: 'Auto-pay Card', feeKey: 'card' },
         // ...
       ],
       planType: [
         { id: '...', label: '...', category: 'Employee' or 'Contractor' },
         // ...
       ],
       paymentFrequency: ['Monthly', 'Semi-Monthly', 'Weekly'],
       planBasis:        ['Hourly', 'Monthly'],
       budgetBasis:      ['Hourly', 'Monthly']
     }
   }
   ```

3. Refresh the browser. The "Coming Soon" pill disappears and MedSquirrels is selectable. Scenario IDs use the `code` prefix (`MS-0001`...).

### Dimensions that look different per project

If MedSquirrels needs a dimension Global Squirrels doesn't have (or vice versa), the easiest approach is to add the value with a sensible single-element array (e.g. `['N/A']`) and keep the dashboard generic. For deeper structural divergence, gate the dimension's rendering in `renderFilters` / `renderCard` on the project.

---

## State & persistence

Everything lives in-memory in `state` (in `app.js`):

```js
state = {
  projectId,        // active project
  filters,          // { deposit: [...], ... } chip selections
  statusFilter,     // 'all' | 'pass' | 'fail' | 'partial' | 'pending'
  search,           // free-text query
  statuses,         // { 'GS-0001': { first: 'pass' | 'fail', second: ... } }
  notes,            // { 'GS-0001': 'Jira PAY-123 ...' }
  viewMode,         // 'grid' | 'mindmap'
  expandedNodes,    // Set of tree paths currently expanded
  ...
};
```

Browser refresh **resets** all of it. The only persistence is the optional **Snapshot** feature, which writes `statuses + notes + projectId` to `localStorage` under the key `payments-qa-snapshot-v1`. Refresh does not auto-load — the user must click `Load snapshot`.

---

## Feature reference

| Feature                       | UI location                | Notes                                                                                      |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------------------------------ |
| Project switcher              | Header (top-right)         | MedSquirrels is disabled until `enabled: true` in data.js                                  |
| **?** Help button             | Header                     | Opens the in-UI help panel                                                                 |
| Dimension filters             | Sidebar (left)             | 8 chip groups, multi-select. Empty = match all                                             |
| Reset filters                 | Sidebar bottom             | Clears chip selections only                                                                |
| Reset statuses & notes        | Sidebar bottom             | Clears pass/fail + notes for every scenario                                                |
| Save / Load / Clear snapshot  | Sidebar bottom             | localStorage persistence (opt-in)                                                          |
| Coverage summary              | Top of main                | Scenario count, payment-test count, pass/fail/pending, progress bar                        |
| Grid / Mind Map toggle        | Top-right of summary       | Two ways to view the same filtered data                                                    |
| Status quick filters          | Toolbar                    | All / Pending / Partial / Passed / Failed with live counts                                 |
| Search box                    | Toolbar                    | Free-text over ID, every attribute label, and notes                                        |
| Export CSV                    | Toolbar                    | Downloads currently-displayed scenarios with statuses + notes                              |
| Import CSV                    | Toolbar                    | Matches by `id` column. Merges into existing state. Detects cross-project CSVs and prompts |
| Pass / Fail / Reset per stage | Each card / each tree leaf | Two stages per scenario, independent                                                       |
| Notes per card                | Each card (Grid view)      | Saves as user types; included in Export and Snapshot                                       |

---

## Extending the dashboard

| You want to...                          | Edit                                                          |
| --------------------------------------- | ------------------------------------------------------------- |
| Change a fee rate                       | `data.js` → `FEES.<key>`                                      |
| Change the sample amount                | `data.js` → `SAMPLE_AMOUNT`                                   |
| Add a dimension value                   | `data.js` → `PROJECTS.<project>.dimensions.<dim>`             |
| Add a payment method or plan type       | Same — append a `{id, label, ...}` object                     |
| Add a new project                       | `data.js` → new entry in `PROJECTS`                           |
| Change which dimensions are conditional | `app.js` → `buildScenarios()`                                 |
| Change card layout                      | `app.js` → `renderCard()` and `styles.css` (`.card*` classes) |
| Change tree behaviour                   | `app.js` → `buildTree()` / `renderTreeNode()`                 |
| Change color palette                    | `styles.css` → CSS variables at the top of the file           |
| Adjust the >500 cards render cap        | `app.js` → `RENDER_CAP` constant                              |

---

## Browser support

Tested in modern Chromium-based browsers (Chrome, Edge) and Firefox. Uses standard ES2017+ syntax (`for...of`, arrow functions, template literals, `Map`/`Set`, `Object.entries`). No transpilation needed for current browsers.

If you need IE11 support — you don't. Don't ship to IE11.
