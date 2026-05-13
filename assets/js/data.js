// Payments QA Scenario Dashboard — data definitions
// Plain ES5-safe globals; loaded before app.js.

const SAMPLE_AMOUNT = 1000;

// Wise quote API — used by the in-dashboard fee calculator
const WISE_API = {
  url: 'https://api.denkenites.com/wise/quotes',
  tenantAppUrl: 'https://globalsquirrelsqa.denkenites.com'
};

// Currencies offered in the Wise calculator dropdowns. Edit freely.
const WISE_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'JPY', 'CNY', 'HKD', 'SGD',
  'NZD', 'INR', 'PHP', 'IDR', 'VND', 'THB', 'MYR',
  'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN',
  'ZAR', 'KES', 'NGN', 'EGP', 'MAD',
  'AED', 'SAR', 'TRY', 'ILS',
  'PLN', 'CZK', 'HUF', 'RON', 'NOK', 'SEK', 'DKK',
  'RUB', 'UAH'
];

const WISE_PAYIN_OPTIONS = [
  'BANK_TRANSFER', 'BALANCE', 'VISA_CREDIT', 'VISA_DEBIT', 'INTERNATIONAL_CREDIT'
];

const WISE_PAYOUT_OPTIONS = [
  'BANK_TRANSFER', 'BALANCE', 'SWIFT'
];

const FEES = {
  bank:    { kind: 'flat',    amount: 5,    label: 'Bank $5 flat' },
  card:    { kind: 'percent', rate: 0.03,   label: 'Card 3%' },
  invoice: { kind: 'percent', rate: 0.02,   label: 'Invoice 2%' },
  contractorSurcharge: 'Wise fee applies'
};

const FILTER_GROUPS = [
  {
    title: 'Onboarding & Payment Setup',
    dimensions: ['deposit', 'depositFrequency', 'paymentType', 'paymentMethod']
  },
  {
    title: 'Plan & Budget',
    dimensions: ['planType', 'paymentFrequency', 'planBasis', 'budgetBasis']
  }
];

const DIMENSION_LABELS = {
  deposit:          'Onboarding Deposit',
  depositFrequency: 'Deposit Frequency',
  paymentType:      'Payment Type',
  paymentMethod:    'Payment Method',
  planType:         'Plan Type',
  paymentFrequency: 'Payment Frequency',
  planBasis:        'Plan Basis',
  budgetBasis:      'Budget Basis'
};

const PROJECTS = {
  globalsquirrels: {
    id: 'globalsquirrels',
    name: 'Global Squirrels',
    code: 'GS',
    enabled: true,
    dimensions: {
      deposit:           ['Yes', 'No'],
      depositFrequency:  ['Monthly', 'Semi-Monthly', 'Weekly'],
      paymentType:       ['Prepaid', 'Postpaid'],
      paymentMethod: [
        { id: 'autopay-card',  label: 'Auto-pay Card',  feeKey: 'card' },
        { id: 'autopay-bank',  label: 'Auto-pay Bank',  feeKey: 'bank' },
        { id: 'paylink-bank',  label: 'Paylink Bank',   feeKey: 'bank' },
        { id: 'paylink-card',  label: 'Paylink Card',   feeKey: 'card' },
        { id: 'invoicing',     label: 'Invoicing',      feeKey: 'invoice' }
      ],
      planType: [
        { id: 'employee-plan',   label: 'Employee Plan',              category: 'Employee'   },
        { id: 'managed-office',  label: 'Managed Office Plan',        category: 'Employee'   },
        { id: 'eor',             label: 'Employer of Record (EOR)',   category: 'Employee'   },
        { id: 'contractor-plan', label: 'Contractor Plan',            category: 'Contractor' },
        { id: 'cor',             label: 'Contractor of Record (COR)', category: 'Contractor' }
      ],
      paymentFrequency:  ['Monthly', 'Semi-Monthly', 'Weekly'],
      planBasis:         ['Hourly', 'Monthly'],
      budgetBasis:       ['Hourly', 'Monthly']
    }
  },
  medsquirrels: {
    id: 'medsquirrels',
    name: 'MedSquirrels',
    code: 'MS',
    enabled: false,
    dimensions: null
  }
};
