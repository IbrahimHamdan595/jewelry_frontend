export interface Translations {
  appName: string;
  appSubtitle: string;

  login: {
    email: string;
    password: string;
    signIn: string;
    signingIn: string;
  };

  nav: {
    dashboard: string;
    products: string;
    categories: string;
    qrLabels: string;
    orders: string;
    inventory: string;
    stockTake: string;
    suppliers: string;
    accountsPayable: string;
    goldPrice: string;
    zakat: string;
    settings: string;
    signOut: string;
    admin: string;
  };

  zakat: {
    title: string;
    subtitle: string;
    refresh: string;
    totalAuCardTitle: string;
    cashValue: string;
    zakatDueCardTitle: string;
    zakatDueGrams: string;
    zakatDueCash: string;
    nisabCardTitle: string;
    meetsNisab: string;
    belowNisab: string;
    nisabHint: string;
    rateLabel: string;
    sourceLabel: string;
    staleBadge: string;
    perKarat: string;
    perKaratHint: string;
    karat: string;
    products: string;
    coins: string;
    ounces: string;
    lots: string;
    totalWeight: string;
    auGrams: string;
    grandTotal: string;
    snapshotsTitle: string;
    snapshotsHint: string;
    saveSnapshot: string;
    saveSnapshotModalTitle: string;
    assessmentDate: string;
    notesOptional: string;
    save: string;
    cancel: string;
    saving: string;
    latestPerDate: string;
    allSnapshots: string;
    snapTaken: string;
    snapAssessment: string;
    snapTotalAu: string;
    snapZakatGrams: string;
    snapZakatCash: string;
    snapRate: string;
    snapSource: string;
    snapIntegrityOk: string;
    snapIntegrityBad: string;
    noSnapshotsYet: string;
    rateUnavailable: string;
  };

  dashboard: {
    todayOrders: string;
    todayRevenue: string;
    weekRevenue: string;
    goldRate24k: string;
    usdPerGram: string;
    vsLastWeek: string;
    topSellers: string;
    noSales: string;
    units: string;
    purePools: string;
    noActiveLots: string;
    lots: string;
    lot: string;
    coinsOunces: string;
    coins: string;
    ounces: string;
    types: string;
    type: string;
    belowThreshold: string;
    accountsPayable: string;
    supplierCount: (n: number) => string;
    cashOwed: string;
    goldOwed: string;
    recentOrders: string;
    orderNum: string;
    cashier: string;
    total: string;
    status: string;
    date: string;
    lotCount: (n: number) => string;
    distinctTypes: (n: number) => string;
    // Jeweler dashboard (Phases A–E)
    goldWeightSold: string;
    byKarat: string;
    soldToday: string;
    soldWeek: string;
    grams: string;
    avgInvoice: string;
    makingCharges: string;
    marketStale: string;
    rateAsOf: string;
    receivables: string;
    payables: string;
    aging0_30: string;
    aging31_60: string;
    aging61_90: string;
    aging90Plus: string;
    metalOwed: string;
    cashBank: string;
    vatPosition: string;
    vatPayable: string;
    vatRefundable: string;
    grossProfit: string;
    grossMargin: string;
    profitPerGram: string;
    since: string;
    inventoryValue: string;
    products: string;
    atMarketRate: string;
    inventoryAging: string;
    deadStock: string;
    aging0_90: string;
    aging90_180: string;
    aging180_365: string;
    aging365Plus: string;
    lossPrevention: string;
    orderVoids: string;
    rateOverrides: string;
    excessDiscounts: string;
  };

  pos: {
    pointOfSale: string;
    addBullion: string;
    addCoin: string;
    addOunceBar: string;
    liveGoldRate: string;
    signOut: string;
    buyback: string;
    sale: string;
  };

  common: {
    save: string;
    cancel: string;
    add: string;
    edit: string;
    delete: string;
    search: string;
    loading: string;
    noResults: string;
    actions: string;
    name: string;
    nameEn: string;
    nameAr: string;
    description: string;
    price: string;
    quantity: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    confirm: string;
    close: string;
    submit: string;
    back: string;
    next: string;
    yes: string;
    no: string;
    required: string;
    optional: string;
    total: string;
    subtotal: string;
    vat: string;
    cash: string;
    card: string;
    transfer: string;
    customer: string;
    customerName: string;
    checkout: string;
  };

  products: {
    stones: string;
    carats: string;
    stoneCount: string;
    certificate: string;
    stoneValue: string;
    stoneNote: string;
    stoneDetails: string;
  };

  accounting: {
    common: {
      run: string; downloadExcel: string; downloadPdf: string; statement: string; pdf: string; seed: string; record: string; create: string;
      post: string; save: string; cancel: string; noData: string; total: string; date: string;
      status: string; amount: string; code: string; name: string; type: string; account: string;
      customer: string; supplier: string; vendor: string; balance: string; currency: string;
      asOf: string; karat: string; grams: string; from: string; until: string;
      ledgerChain: string; intact: string; broken: string; fxRate: string;
    };
    landing: {
      title: string; description: string;
      groupLedger: string; groupLedgerDesc: string;
      groupMoney: string; groupMoneyDesc: string;
      groupReports: string; groupReportsDesc: string;
      groupControls: string; groupControlsDesc: string;
      coaTitle: string; coaDesc: string;
      journalTitle: string; journalDesc: string;
      trialBalanceTitle: string; trialBalanceDesc: string;
      generalLedgerTitle: string; generalLedgerDesc: string;
      receivablesTitle: string; receivablesDesc: string;
      payablesTitle: string; payablesDesc: string;
      bankTitle: string; bankDesc: string;
      expensesTitle: string; expensesDesc: string;
      taxTitle: string; taxDesc: string;
      statementsTitle: string; statementsDesc: string;
      kpisTitle: string; kpisDesc: string;
      periodsTitle: string; periodsDesc: string;
    };
    coa: {
      eyebrow: string; title: string; description: string; seedBtn: string;
      colCode: string; colName: string; colType: string; colDenom: string; colNormal: string;
      colCurrency: string; colSystemKey: string; colActive: string; empty: string;
    };
    journal: {
      eyebrow: string; title: string; description: string; recentEntries: string;
      colEntryNo: string; colDate: string; colSource: string; colMemo: string; colAccount: string;
      colDebit: string; colCredit: string; colGramsDr: string; colGramsCr: string; colKarat: string;
      memoPlaceholder: string; empty: string;
    };
    trialBalance: {
      eyebrow: string; title: string; description: string;
      colCode: string; colAccount: string; colDebit: string; colCredit: string; colMetal: string;
      totalRow: string; balanced: string; notBalanced: string; empty: string;
    };
    generalLedger: {
      eyebrow: string; title: string; description: string;
      account: string; opening: string; closing: string;
      colDate: string; colEntry: string; colMemo: string;
      colDebit: string; colCredit: string; colRunning: string;
      colGramsDr: string; colGramsCr: string; colRunningGrams: string; empty: string;
    };
    receivables: {
      eyebrow: string; title: string; description: string; newCustomer: string;
      namePlaceholder: string; creditLimitPlaceholder: string; createBtn: string;
      recordReceipt: string; amountPlaceholder: string; recordBtn: string; receiptHint: string;
      colCustomer: string; colOpenBalance: string;
      agingCurrent: string; aging3160: string; aging6190: string; aging90: string; empty: string;
    };
    payables: {
      eyebrow: string; title: string; description: string;
      colSupplier: string; colCashOwed: string; colGoldOwed: string; empty: string;
      agingCurrent: string; aging3160: string; aging6190: string; aging90: string;
    };
    bank: {
      eyebrow: string; title: string; description: string; adoptSeeded: string; newAccount: string;
      namePlaceholder: string; transfer: string; transferHint: string; amountPlaceholder: string;
      destAmountPlaceholder: string; createBtn: string;
      colAccount: string; colType: string; colCcy: string; colBalance: string;
      colUsdBase: string; colLastReconciled: string; empty: string;
    };
    expenses: {
      eyebrow: string; title: string; description: string; recordBill: string;
      vendorPlaceholder: string; amountPlaceholder: string; onCredit: string;
      paidCash: string; paidBank: string; noVat: string; recordBtn: string; byCategory: string;
      colBill: string; colVendor: string; colDate: string; colTotal: string; colPaid: string;
      colStatus: string; empty: string;
    };
    tax: {
      eyebrow: string; title: string; description: string; taxCodes: string; seedCodes: string;
      colCode: string; colName: string; colRate: string; vatReturn: string; runBtn: string;
      outputVat: string; inputVat: string; netLabel: string; cashSplitHint: string;
      colEntry: string; colDate: string; colKind: string; colVat: string; empty: string;
    };
    statements: {
      eyebrow: string; title: string; description: string;
      tabPnl: string; tabBs: string; tabCf: string; runBtn: string; downloadExcel: string;
      revenue: string; cogs: string; grossProfit: string; opex: string;
      operatingProfit: string; otherIncomeExpense: string; netProfit: string;
      assets: string; liabilities: string; equity: string; totalAssets: string;
      totalLiabilities: string; totalEquity: string; balanced: string; allCurrent: string;
      metalSchedule: string; colKarat: string; colNetGrams: string;
      openingCash: string; netChange: string; closingCash: string; reconciles: string;
    };
    kpis: {
      eyebrow: string; title: string; description: string; runBtn: string; downloadExcel: string;
      dsi: string; turnover: string; dpo: string; dso: string; ccc: string;
      grossMargin: string; netMargin: string; metalTurnover: string; currentRatio: string; quickRatio: string;
    };
    periods: {
      eyebrow: string; title: string; description: string; openPeriod: string; month: string; year: string;
      checkClose: string; closePeriod: string; blocked: string; reopen: string;
      colYear: string; colMonth: string; colStatus: string;
      yearEndClose: string; preview: string; closeYear: string; netIncome: string; alreadyClosed: string;
      colAccount: string; colDebit: string; colCredit: string;
    };
  };
}

const en: Translations = {
  appName: "Fawaz El Namel",
  appSubtitle: "GOLD JEWELLERY",

  login: {
    email: "Email",
    password: "Password",
    signIn: "SIGN IN",
    signingIn: "SIGNING IN…",
  },

  nav: {
    dashboard: "Dashboard",
    products: "Products",
    categories: "Categories",
    qrLabels: "QR Labels",
    orders: "Orders",
    inventory: "Inventory",
    stockTake: "Stock-take",
    suppliers: "Suppliers",
    accountsPayable: "Accounts Payable",
    goldPrice: "Gold Price",
    zakat: "Zakat",
    settings: "Settings",
    signOut: "Sign out",
    admin: "Admin",
  },

  zakat: {
    title: "Zakat & Pure Gold",
    subtitle: "Live total Au held across products, coins, ounces, and pure-gold lots.",
    refresh: "Refresh",
    totalAuCardTitle: "Total Pure Au On Hand",
    cashValue: "Cash value",
    zakatDueCardTitle: "Zakat Due (2.5%)",
    zakatDueGrams: "Grams of pure Au",
    zakatDueCash: "Cash equivalent",
    nisabCardTitle: "Nisab Threshold",
    meetsNisab: "Meets nisab — zakat is due",
    belowNisab: "Below nisab — zakat not due",
    nisabHint: "Edit nisab from Settings → Default Pricing → Zakat.",
    rateLabel: "Gold rate (24K)",
    sourceLabel: "Source",
    staleBadge: "stale",
    perKarat: "Per-Karat Breakdown",
    perKaratHint: "Every gram counted, by karat and by where it sits in inventory.",
    karat: "Karat",
    products: "Products",
    coins: "Coins",
    ounces: "Ounces",
    lots: "Lots",
    totalWeight: "Total weight (g)",
    auGrams: "Au (g)",
    grandTotal: "Total",
    snapshotsTitle: "Snapshots",
    snapshotsHint: "Save a dated, immutable snapshot for annual assessment.",
    saveSnapshot: "Save snapshot",
    saveSnapshotModalTitle: "Save zakat snapshot",
    assessmentDate: "Assessment date",
    notesOptional: "Notes (optional)",
    save: "Save",
    cancel: "Cancel",
    saving: "Saving…",
    latestPerDate: "Latest per date",
    allSnapshots: "All snapshots",
    snapTaken: "Taken",
    snapAssessment: "Assessment",
    snapTotalAu: "Total Au (g)",
    snapZakatGrams: "Zakat (g)",
    snapZakatCash: "Zakat (USD)",
    snapRate: "Rate (USD/g)",
    snapSource: "Source",
    snapIntegrityOk: "OK",
    snapIntegrityBad: "TAMPERED",
    noSnapshotsYet: "No snapshots yet.",
    rateUnavailable: "Gold rate is unavailable. The poller may be down or no rate has ever been recorded.",
  },

  dashboard: {
    todayOrders: "Today's Orders",
    todayRevenue: "Today's Revenue",
    weekRevenue: "7-Day Revenue",
    goldRate24k: "Gold Rate 24K",
    usdPerGram: "USD / gram",
    vsLastWeek: "vs last week",
    topSellers: "Top Sellers This Week",
    noSales: "No sales yet",
    units: "units",
    purePools: "Pure-Gold Pools",
    noActiveLots: "No active lots",
    lots: "lots",
    lot: "lot",
    coinsOunces: "Coins & Ounces",
    coins: "Coins",
    ounces: "Ounces",
    types: "types",
    type: "type",
    belowThreshold: "below threshold",
    accountsPayable: "Accounts Payable",
    supplierCount: (n) => `${n} supplier${n !== 1 ? "s" : ""}`,
    cashOwed: "Cash owed",
    goldOwed: "Gold owed",
    recentOrders: "Recent Orders",
    orderNum: "Order #",
    cashier: "Cashier",
    total: "Total",
    status: "Status",
    date: "Date",
    lotCount: (n) => `${n} lot${n !== 1 ? "s" : ""}`,
    distinctTypes: (n) => `${n} type${n !== 1 ? "s" : ""}`,
    // Jeweler dashboard (Phases A–E)
    goldWeightSold: "Gold Weight Sold",
    byKarat: "by karat",
    soldToday: "Sold today",
    soldWeek: "This week",
    grams: "g",
    avgInvoice: "Avg. Invoice Value",
    makingCharges: "Making Charges Earned",
    marketStale: "Gold rate may be stale",
    rateAsOf: "Rate as of",
    receivables: "Receivables (AR)",
    payables: "Payables (AP)",
    aging0_30: "0–30d",
    aging31_60: "31–60d",
    aging61_90: "61–90d",
    aging90Plus: "90d+",
    metalOwed: "Gold owed",
    cashBank: "Cash & Bank",
    vatPosition: "VAT Position",
    vatPayable: "Payable",
    vatRefundable: "Refundable",
    grossProfit: "Gross Profit",
    grossMargin: "Gross Margin",
    profitPerGram: "Profit / gram",
    since: "since",
    inventoryValue: "Inventory Value",
    products: "Products",
    atMarketRate: "at market (24K)",
    inventoryAging: "Inventory Aging",
    deadStock: "Dead stock",
    aging0_90: "0–90d",
    aging90_180: "90–180d",
    aging180_365: "180–365d",
    aging365Plus: "365d+",
    lossPrevention: "Loss Prevention",
    orderVoids: "Voided orders",
    rateOverrides: "Rate overrides",
    excessDiscounts: "Excess-discount orders",
  },

  pos: {
    pointOfSale: "Point of Sale",
    addBullion: "Add bullion",
    addCoin: "Add coin",
    addOunceBar: "Add ounce bar",
    liveGoldRate: "Live gold rate",
    signOut: "Sign out",
    buyback: "Buyback",
    sale: "Sale",
  },

  common: {
    save: "Save",
    cancel: "Cancel",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    search: "Search",
    loading: "Loading…",
    noResults: "No results",
    actions: "Actions",
    name: "Name",
    nameEn: "Name (English)",
    nameAr: "Name (Arabic)",
    description: "Description",
    price: "Price",
    quantity: "Quantity",
    status: "Status",
    createdAt: "Created At",
    updatedAt: "Updated At",
    confirm: "Confirm",
    close: "Close",
    submit: "Submit",
    back: "Back",
    next: "Next",
    yes: "Yes",
    no: "No",
    required: "Required",
    optional: "Optional",
    total: "Total",
    subtotal: "Subtotal",
    vat: "VAT",
    cash: "Cash",
    card: "Card",
    transfer: "Transfer",
    customer: "Customer",
    customerName: "Customer Name",
    checkout: "Checkout",
  },

  products: {
    stones: "Stones",
    carats: "Carats",
    stoneCount: "Stone count",
    certificate: "Certificate",
    stoneValue: "Stone value",
    stoneNote: "Note",
    stoneDetails: "Stone / Diamond Details",
  },

  accounting: {
    common: {
      run: "Run", downloadExcel: "Download Excel", downloadPdf: "Download PDF", statement: "Statement", pdf: "PDF", seed: "Seed", record: "Record", create: "Create",
      post: "Post", save: "Save", cancel: "Cancel", noData: "Nothing here yet.", total: "Total",
      date: "Date", status: "Status", amount: "Amount", code: "Code", name: "Name", type: "Type",
      account: "Account", customer: "Customer", supplier: "Supplier", vendor: "Vendor",
      balance: "Balance", currency: "Currency", asOf: "As of", karat: "Karat", grams: "g",
      from: "From", until: "Until", ledgerChain: "Ledger chain", intact: "intact", broken: "broken", fxRate: "FX rate",
    },
    landing: {
      title: "Accounting",
      description: "The books for Fawaz El Namel. Every sale, purchase, and payment is recorded here as double-entry accounting. Start with the section you need — each page explains what it's for.",
      groupLedger: "Ledger",
      groupLedgerDesc: "The core books — accounts, entries, and the balance proof.",
      groupMoney: "Money",
      groupMoneyDesc: "Who owes you, who you owe, cash, expenses, and tax.",
      groupReports: "Reports",
      groupReportsDesc: "Financial statements and health metrics.",
      groupControls: "Controls",
      groupControlsDesc: "Locking the books at month- and year-end.",
      coaTitle: "Chart of Accounts",
      coaDesc: "The master list of accounts money & gold flow through.",
      journalTitle: "Journal Entries",
      journalDesc: "Every financial event as a balanced debit/credit entry.",
      trialBalanceTitle: "Trial Balance",
      trialBalanceDesc: "Point-in-time proof the books balance.",
      generalLedgerTitle: "General Ledger",
      generalLedgerDesc: "Trace every posting to one account, with a running balance.",
      receivablesTitle: "Accounts Receivable",
      receivablesDesc: "Customers who bought on credit and owe you.",
      payablesTitle: "Accounts Payable",
      payablesDesc: "What you owe suppliers — cash and gold.",
      bankTitle: "Cash & Bank",
      bankDesc: "Cash/bank accounts, transfers, reconciliation.",
      expensesTitle: "Expenses",
      expensesDesc: "Rent, salaries, utilities — bills and payments.",
      taxTitle: "Tax / VAT",
      taxDesc: "Tax codes and the quarterly VAT return.",
      statementsTitle: "Financial Statements",
      statementsDesc: "P&L, Balance Sheet, Cash Flow — with Excel export.",
      kpisTitle: "Financial KPIs",
      kpisDesc: "Turnover, margins, days-to-pay/collect.",
      periodsTitle: "Periods",
      periodsDesc: "Open/close months; year-end closing.",
    },
    coa: {
      eyebrow: "The master account list",
      title: "Chart of Accounts",
      description: "Every account is a labelled bucket that money or gold flows through — Cash, Sales Revenue, Metal Inventory, and so on. Each has a type (asset, liability, equity, income, expense) that decides how it behaves. Seed the standard set once to get started.",
      seedBtn: "Seed system accounts",
      colCode: "Code", colName: "Name", colType: "Type", colDenom: "Denom.", colNormal: "Normal",
      colCurrency: "Currency", colSystemKey: "System key", colActive: "Active",
      empty: "No accounts yet — seed the system accounts to begin.",
    },
    journal: {
      eyebrow: "The raw double-entry log",
      title: "Journal Entries",
      description: "Every financial event is recorded as a journal entry — a set of lines where total debits must equal total credits (and gold grams must balance per karat too). Most entries are posted automatically by sales and purchases; you can post a manual one here.",
      recentEntries: "Recent entries",
      colEntryNo: "Entry no", colDate: "Date", colSource: "Source", colMemo: "Memo",
      colAccount: "Account", colDebit: "Debit (USD)", colCredit: "Credit (USD)",
      colGramsDr: "Grams DR", colGramsCr: "Grams CR", colKarat: "Karat",
      memoPlaceholder: "Memo", empty: "No entries posted yet.",
    },
    trialBalance: {
      eyebrow: "The balance proof",
      title: "Trial Balance",
      description: "A snapshot of every account's balance as of a date. If the books are healthy, total debits equal total credits — and gold grams net to zero per karat. Pick a date and run it.",
      colCode: "Code", colAccount: "Account", colDebit: "Debit (USD)", colCredit: "Credit (USD)",
      colMetal: "Metal (g/karat)", totalRow: "Total",
      balanced: "Balanced — debits = credits ✓", notBalanced: "Out of balance ✗",
      empty: "Pick a date and run the trial balance.",
    },
    generalLedger: {
      eyebrow: "Account drill-down",
      title: "General Ledger",
      description: "Every posting to one account over a period, with a running balance. Pick an account and date range to trace exactly what moved and when. Dual accounts also show running grams.",
      account: "Account", opening: "Opening balance", closing: "Closing balance",
      colDate: "Date", colEntry: "Entry", colMemo: "Memo",
      colDebit: "Debit (USD)", colCredit: "Credit (USD)", colRunning: "Running balance",
      colGramsDr: "Grams Dr", colGramsCr: "Grams Cr", colRunningGrams: "Running grams",
      empty: "Pick an account and date range, then run.",
    },
    receivables: {
      eyebrow: "Money owed to you",
      title: "Accounts Receivable",
      description: "Customers who bought on credit and still owe you. Record a receipt when a customer pays — it's applied to their oldest unpaid invoices first. The aging columns show how overdue each balance is.",
      newCustomer: "New customer",
      namePlaceholder: "Name", creditLimitPlaceholder: "Credit limit (blank = unlimited)",
      createBtn: "Create", recordReceipt: "Record a receipt", amountPlaceholder: "Amount",
      recordBtn: "Record receipt", receiptHint: "pays off oldest invoices first",
      colCustomer: "Customer", colOpenBalance: "Open balance",
      agingCurrent: "Current", aging3160: "31–60d", aging6190: "61–90d", aging90: "90d+",
      empty: "No customers with a balance.",
    },
    payables: {
      eyebrow: "What you owe suppliers",
      title: "Accounts Payable",
      description: "What you owe your gold suppliers — both cash and gold (by karat). The aging columns show how overdue each balance is. This ties out to the supplier balances on the operations side.",
      colSupplier: "Supplier", colCashOwed: "Cash owed", colGoldOwed: "Gold owed",
      empty: "You don't owe any supplier right now.",
      agingCurrent: "Current", aging3160: "31–60d", aging6190: "61–90d", aging90: "90d+",
    },
    bank: {
      eyebrow: "Cash & bank accounts",
      title: "Cash & Bank",
      description: "Your cash and bank accounts, transfers between them, and reconciling them against real bank statements. Seed the standard cash/bank accounts once, then add more as needed.",
      adoptSeeded: "Adopt seeded accounts", newAccount: "New account", namePlaceholder: "Name",
      transfer: "Transfer", transferHint: "moves money between two accounts",
      amountPlaceholder: "Amount (from ccy)", destAmountPlaceholder: "Dest amount (cross-ccy)",
      createBtn: "Create",
      colAccount: "Account", colType: "Type", colCcy: "Ccy", colBalance: "Balance",
      colUsdBase: "USD base", colLastReconciled: "Last reconciled",
      empty: "No bank accounts yet — adopt the seeded ones to begin.",
    },
    expenses: {
      eyebrow: "Running costs",
      title: "Expenses",
      description: "Day-to-day business costs — rent, salaries, utilities, marketing. Record a bill (paid now in cash/bank, or on credit), optionally with input VAT. The report shows where the money went.",
      recordBill: "Record an expense / bill",
      vendorPlaceholder: "Vendor", amountPlaceholder: "Amount",
      onCredit: "On credit (Vendor AP)", paidCash: "Paid — Cash", paidBank: "Paid — Bank",
      noVat: "No VAT", recordBtn: "Record", byCategory: "Expense by category",
      colBill: "Bill", colVendor: "Vendor", colDate: "Date", colTotal: "Total", colPaid: "Paid",
      colStatus: "Status", empty: "No bills recorded yet.",
    },
    tax: {
      eyebrow: "Lebanon VAT (11%)",
      title: "Tax / VAT",
      description: "Lebanon's VAT is 11%. Set up your tax codes once, then run the quarterly VAT return — it nets the VAT you charged on sales (output) against the VAT you paid on purchases (input). A positive net is what you owe the government.",
      taxCodes: "Tax codes", seedCodes: "Seed standard codes",
      colCode: "Code", colName: "Name", colRate: "Rate %",
      vatReturn: "VAT return", runBtn: "Run",
      outputVat: "Output VAT (on sales)", inputVat: "Input VAT (on purchases)", netLabel: "Net",
      cashSplitHint: "Lebanon: pay 75% cash + 25% by transfer to BdL.",
      colEntry: "Entry", colDate: "Date", colKind: "Kind", colVat: "VAT",
      empty: "Run a quarter to see the return.",
    },
    statements: {
      eyebrow: "The financial reports",
      title: "Financial Statements",
      description: "The three core reports for any period — Profit & Loss (did you make money?), Balance Sheet (what you own vs owe), and Cash Flow (where cash moved). Pick a period and export to Excel if you need.",
      tabPnl: "P&L", tabBs: "Balance Sheet", tabCf: "Cash Flow",
      runBtn: "Run", downloadExcel: "Download Excel",
      revenue: "Revenue", cogs: "COGS", grossProfit: "Gross profit", opex: "Operating expenses",
      operatingProfit: "Operating profit", otherIncomeExpense: "Other income/(expense)",
      netProfit: "Net profit", assets: "Assets", liabilities: "Liabilities", equity: "Equity",
      totalAssets: "Total assets", totalLiabilities: "Total liabilities", totalEquity: "Total equity",
      balanced: "Assets = Liabilities + Equity", allCurrent: "all assets treated as current",
      metalSchedule: "Metal position (grams per karat)", colKarat: "Karat", colNetGrams: "Net grams",
      openingCash: "Opening cash", netChange: "Net change", closingCash: "Closing cash",
      reconciles: "reconciles to cash balance",
    },
    kpis: {
      eyebrow: "Business health metrics",
      title: "Financial KPIs",
      description: "Health metrics derived from the books — how fast inventory sells, your margins, and how quickly you pay suppliers and collect from customers. Pick a period and run.",
      runBtn: "Run", downloadExcel: "Download Excel",
      dsi: "Days Sales of Inventory", turnover: "Inventory Turnover", dpo: "Days Payable Outstanding",
      dso: "Days Sales Outstanding", ccc: "Cash Conversion Cycle", grossMargin: "Gross Margin",
      netMargin: "Net Margin", metalTurnover: "Metal Turnover (grams)", currentRatio: "Current Ratio",
      quickRatio: "Quick Ratio",
    },
    periods: {
      eyebrow: "Locking the books",
      title: "Accounting Periods",
      description: "Months are 'periods' you lock once they're done so no one can change past numbers. Run the pre-close checklist before closing a month; at year-end, close the year to roll profit into retained earnings.",
      openPeriod: "Open period", month: "Month", year: "Year",
      checkClose: "Check & Close", closePeriod: "Close period", blocked: "Blocked", reopen: "Reopen",
      colYear: "Year", colMonth: "Month", colStatus: "Status",
      yearEndClose: "Year-End Close", preview: "Preview", closeYear: "Close Year",
      netIncome: "Net income", alreadyClosed: "already closed",
      colAccount: "Account", colDebit: "Debit", colCredit: "Credit",
    },
  },
};

export default en;
