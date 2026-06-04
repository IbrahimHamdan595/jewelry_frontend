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
};

export default en;
