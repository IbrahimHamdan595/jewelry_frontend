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
    suppliers: string;
    accountsPayable: string;
    goldPrice: string;
    settings: string;
    signOut: string;
    admin: string;
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
  appName: "MAISON ZAHAB",
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
    suppliers: "Suppliers",
    accountsPayable: "Accounts Payable",
    goldPrice: "Gold Price",
    settings: "Settings",
    signOut: "Sign out",
    admin: "Admin",
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
