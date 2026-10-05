export interface Translations {
  appName: string;
  appSubtitle: string;

  login: {
    email: string;
    password: string;
    signIn: string;
    signingIn: string;
    roleHasNoScreens: string;
    showPassword: string;
    hidePassword: string;
    failed: string;
  };

  suppliers: {
    title: string;
    newSupplier: string;
    searchPlaceholder: string;
    includeInactive: string;
    contact: string;
    phone: string;
    terms: string;
    empty: string;
    active: string;
    inactive: string;
    deactivate: string;
    reactivate: string;
    openSupplier: (name: string) => string;
    toggleFailed: string;
    saveFailed: string;
    contactName: string;
    email: string;
    address: string;
    paymentTerms: string;
    paymentTermsPlaceholder: string;
    notes: string;
    saving: string;
    createSupplier: string;
    // Supplier detail
    backToList: string;
    cashOwed: string;
    recordCashPayment: string;
    recordCashPaymentLink: string;
    goldOwedByKarat: string;
    none: string;
    recordGoldPayment: string;
    recordGoldPaymentLink: string;
    cannotDeactivate: string;
    newPurchase: string;
    purchaseHistory: string;
    paymentHistory: string;
    noPurchases: string;
    noPayments: string;
    colDate: string;
    colMode: string;
    colCashDuePaid: string;
    colGoldDuePaid: string;
    colItems: string;
    colReceipt: string;
    colUnit: string;
    colAmount: string;
    colSourceLots: string;
    receiptLink: string;
    itemCount: (n: number) => string;
    mode: { CASH: string; GOLD: string; MIXED: string };
    unitCash: string;
    // Payment dialogs
    paymentFailed: string;
    outstanding: string;
    amountUsd: string;
    notesOptional: string;
    recordPayment: string;
    goldPaymentHint: string;
    karat: string;
    karatOwed: (karat: string, grams: string) => string;
    karatNoneOwed: (karat: string) => string;
    outstandingKarat: (karat: string) => string;
    totalPicked: string;
    pickLots: string;
    noActiveLots: (karat: string) => string;
    lotRemaining: (grams: string) => string;
    lotSource: { BUYBACK: string; MELT: string; SUPPLIER: string; SEED: string; ADJUSTMENT: string };
    gramsPlaceholder: string;
    gramsFromLot: (lot: string) => string;
    payGold: (grams: string, karat: string) => string;
  };

  supplierPurchase: {
    backTo: (name: string) => string;
    backToSupplier: string;
    title: string;
    paymentMode: string;
    mode: { CASH: string; GOLD: string; MIXED: string };
    modeHint: { CASH: string; GOLD: string; MIXED: string };
    dealSplit: string;
    totalCashDue: string;
    cashPaidNow: string;
    // "{amount}" marks where the page renders the formatted amount.
    cashDifference: string;
    totalGoldDue: string;
    tradeMarkup: string;
    goldPaidNow: string;
    karat: string;
    lot: string;
    pickLot: string;
    grams: string;
    goldLineN: (n: number) => string;
    removeGoldLine: string;
    addGoldLine: string;
    pickedVsDue: string;
    itemsReceived: string;
    addItem: string;
    noItems: string;
    itemN: (n: number) => string;
    itemKind: string;
    kind: { PURE_GOLD: string; COIN: string; OUNCE: string; PRODUCT: string };
    unitCost: string;
    removeItem: string;
    weight: string;
    itemNotes: string;
    coinType: string;
    pickCoinType: string;
    ounceType: string;
    pickOunceType: string;
    qty: string;
    // The Arabic-name field keeps an Arabic placeholder in both languages.
    nameArPlaceholder: string;
    category: string;
    margin: string;
    makingCharge: string;
    notes: string;
    saveFailed: string;
    recording: string;
    recordPurchase: string;
    loadingReceipt: string;
  };

  payables: {
    title: string;
    cashOwedStoreWide: string;
    goldOwed: string;
    none: string;
    suppliersWithDebt: string;
    empty: string;
    colSupplier: string;
    colCash: string;
    colGold: string;
    settle: string;
  };

  inventoryLedger: {
    reconcileTitle: string;
    // "{table}" marks where the page renders the table name in monospace.
    reconcileHelp: string;
    alertToggleTitle: string;
    alertOn: string;
    alertOff: string;
    running: string;
    runReconcile: string;
    reconcileFailed: string;
    allReconciled: string;
    noAlertNeeded: string;
    driftsDetected: (n: number) => string;
    discordAlerted: string;
    colSupplier: string;
    colUnit: string;
    colStored: string;
    colComputed: string;
    colDrift: string;
    unitCash: string;
    unitGold: (karat: string | null) => string;
    title: string;
    resetFilters: string;
    eventType: string;
    refType: string;
    refId: string;
    any: string;
    refIdPlaceholder: string;
    colDetails: string;
    colEvent: string;
    colRef: string;
    colActor: string;
    colOccurred: string;
    noEvents: string;
    pageSummary: (page: number, pages: number, total: number) => string;
    prev: string;
    next: string;
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
    auditLedger: string;
    settings: string;
    signOut: string;
    admin: string;
  };

  // Inventory › Pure Gold Lots (NEX-64, slice 3). Enum maps (sources, reasons)
  // are keyed by the API value; English keeps the raw code it always showed.
  lots: {
    tab: string;
    poolTitle: (karat: string) => string;
    lotCount: (n: number) => string;
    filterByKarat: string;
    allKarats: string;
    includeDepleted: string;
    newLot: string;
    karat: string;
    remainingOriginal: string;
    source: string;
    costBasis: string;
    acquired: string;
    empty: (karat: string) => string;
    sources: { BUYBACK: string; MELT: string; SUPPLIER: string; SEED: string; ADJUSTMENT: string };
    active: string;
    depleted: string;
    manualAdjustment: string;
    adjustLot: (karat: string, lotId: string) => string;
    newLotTitle: string;
    weightG: string;
    costBasisUsd: string;
    notesOptional: string;
    saving: string;
    createLot: string;
    createFailed: string;
    autoLotsHint: string;
    adjustTitle: string;
    remaining: string;
    deltaG: string;
    deltaPlaceholder: string;
    deltaHint: string;
    reason: string;
    reasons: { LOSS: string; THEFT: string; GIFT: string; SAMPLE: string; CORRECTION: string };
    notesRequired: string;
    notesPlaceholder: string;
    apply: string;
    adjustFailed: string;
  };

  // Inventory › Buybacks. `kinds` labels the filter; `kindPills` labels the
  // table pill and the empty state, where English shows the raw code.
  buybacks: {
    tab: string;
    filterByKind: string;
    allKinds: string;
    kinds: { PURE_GOLD: string; COIN: string; OUNCE: string; USED_PRODUCT: string };
    kindPills: { PURE_GOLD: string; COIN: string; OUNCE: string; USED_PRODUCT: string };
    pendingOnly: string;
    when: string;
    kind: string;
    seller: string;
    detail: string;
    pricePaid: string;
    outcome: string;
    empty: (kind: string, pendingOnly: boolean) => string;
    toLot: string;
    stock: string;
    polishedToProduct: string;
    meltedToLot: string;
    pending: string;
    polish: string;
    melt: string;
    receipt: string;
    polishRow: (seller: string, when: string) => string;
    meltRow: (seller: string, when: string) => string;
    receiptRow: (seller: string, when: string) => string;
    polishTitle: string;
    original: string;
    paid: string;
    costBasisCarries: string;
    category: string;
    marginPct: string;
    makingCharge: string;
    overrideWeightOptional: string;
    overrideKaratOptional: string;
    overrideWeight: string;
    overrideKarat: string;
    keep: (value: string) => string;
    notesOptional: string;
    polishing: string;
    polishAndList: string;
    polishFailed: string;
    meltTitle: string;
    melting: string;
    meltFailed: string;
  };

  // Products › Coins / Ounces (UnitCatalog). The per-resource block holds the
  // whole phrase for each catalog, so no sentence is assembled from a noun.
  unitCatalog: {
    coins: { search: string; newType: string; editType: string; createType: string; empty: string };
    ounces: { search: string; newType: string; editType: string; createType: string; empty: string };
    includeInactive: string;
    photo: string;
    code: string;
    karat: string;
    weight: string;
    markupMargin: string;
    onHand: string;
    min: string;
    inactive: string;
    livePrice: string;
    adjustStock: string;
    deactivate: string;
    reactivate: string;
    rowAction: (action: string, code: string) => string;
    autoGenerated: string;
    weightG: string;
    markupPerGram: string;
    marginMode: string;
    flatUsd: string;
    percent: string;
    marginUsd: string;
    marginPercent: string;
    minStockQty: string;
    none: string;
    photoPreview: string;
    removePhoto: string;
    uploading: string;
    changePhoto: string;
    uploadPhoto: string;
    uploadFailed: string;
    saving: string;
    saveChanges: string;
    saveFailed: string;
    formHint: string;
    onHandInline: string;
    deltaQty: string;
    deltaPlaceholder: string;
    wholeNumbersOnly: string;
    reason: string;
    reasons: { LOSS: string; THEFT: string; GIFT: string; SAMPLE: string; CORRECTION: string };
    notes: string;
    notesPlaceholder: string;
    apply: string;
    adjustFailed: string;
    pricing: string;
    perUnit: string;
    spot24k: string;
    effectiveRate: string;
    markupApplied: string;
    metalValue: string;
    margin: string;
    source: string;
    /** `rate_source` as the API reports it: "live" (polled feed) or "override" (set by an admin). */
    sources: { live: string; override: string };
    stale: string;
  };

  // Inventory › Reconcile. `intro` and `idleHint` are whole sentences built
  // around one styled element; each takes that element's text and places it.
  reconcile: {
    tab: string;
    title: string;
    intro: (field: string) => string;
    readOnlyNote: string;
    run: string;
    running: string;
    runAndAlert: string;
    failed: string;
    lastRun: string;
    discordAlertSent: string;
    allMatch: string;
    zeroDrift: string;
    driftCount: (n: number) => string;
    driftHint: string;
    kind: string;
    code: string;
    stored: string;
    computed: string;
    drift: string;
    kinds: { COIN: string; OUNCE: string };
    idleHint: (button: string) => string;
  };

  // Inventory › Alerts. `healthyHint` is built around one styled element too.
  stockAlerts: {
    tab: string;
    allHealthy: string;
    healthyHint: (field: string) => string;
    belowMinimum: (n: number) => string;
    adjustHint: string;
    kind: string;
    code: string;
    onHand: string;
    minimum: string;
    kinds: { COIN: string; OUNCE: string; PRODUCT: string };
    manage: string;
    manageRow: (code: string) => string;
  };

  // Admin › Categories
  categories: {
    title: string;
    addCategory: string;
    editCategory: string;
    newCategory: string;
    slug: string;
    slugPlaceholder: string;
    saving: string;
    saveFailed: string;
    empty: string;
    active: string;
    inactive: string;
    activate: string;
    deactivate: string;
    deletePermanently: string;
    deleteFailed: string;
    rowAction: (action: string, name: string) => string;
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
    saveFailed: string;
    dueFormula: (label: string) => string;
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
    recentPurchases: string;
    cashDue: string;
    receiptLink: string;
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
    // NEX-64 slice 5 — scan panel and add-coin / add-ounce dialog
    capture: string;
    step01: string;
    itemNotFound: string;
    readyToScan: string;
    scanHint: string;
    manualEntry: string;
    productCodePlaceholder: string;
    find: string;
    addCoinToCart: string;
    addOunceToCart: string;
    searchCoinTypes: string;
    searchOunceTypes: string;
    noCoinTypes: string;
    noOunceTypes: string;
    onHand: string;
    unitPrice: string;
    qty: string;
    adding: string;
    addToCart: string;
  };

  // NEX-64 slice 5 — POS buyback form and its confirmation screen
  posBuyback: {
    eyebrow: string;
    title: string;
    kinds: { PURE_GOLD: string; COIN: string; OUNCE: string; USED_PRODUCT: string };
    sellerName: string;
    phone: string;
    coinType: string;
    ounceType: string;
    selectPlaceholder: string;
    enterWeightHint: string;
    manualPriceUsd: string;
    manualPriceUsdTotal: string;
    pricePaidUsd: string;
    notes: string;
    notesOptional: string;
    /** `mark` wraps the two highlighted verbs; each language places them itself. */
    usedPieceHint: <T>(mark: (word: string) => T) => (string | T)[];
    priceModeAuto: string;
    priceModeManual: string;
    spot24k: string;
    buybackMargin: string;
    effective: string;
    paySeller: string;
    staleQuote: string;
    perUnitFormula: string;
    totalBuyPrice: string;
    rate: string;
    rateLine: (rate: string, source: string, stale: boolean) => string;
    sellerRequired: string;
    record: string;
    recording: string;
    recorded: string;
    paidTo: (amount: string, name: string) => string;
    newBuyback: string;
  };

  // NEX-64 slice 5 — cart, checkout panel, confirm dialog, sale-complete screen
  checkout: {
    currentSale: string;
    noItems: string;
    itemCount: (n: number) => string;
    scanToBegin: string;
    itemsAppearHere: string;
    customerOptional: string;
    customerNamePlaceholder: string;
    paymentMethod: string;
    /**
     * Every value the API can put on an order or a purchase: CASH / CARD / MIXED from the
     * till, CREDIT for a sale on account, GOLD for a supplier purchase settled in metal.
     */
    paymentMethods: { CASH: string; CARD: string; MIXED: string; CREDIT: string; GOLD: string };
    discountPctMax: (max: number) => string;
    vatLine: (pct: number) => string;
    discountLine: (pct: number) => string;
    /** The receipt's discount row when the order carries an amount but no percentage. */
    discount: string;
    processing: string;
    addItemsToCheckout: string;
    checkoutTotal: (total: string) => string;
    perEach: (price: string) => string;
    eachAndTotal: (unit: string, total: string) => string;
    itemKinds: { COIN: string; OUNCE: string };
    /** One set of buttons per cart line, so each names its item. */
    decreaseQty: (item: string) => string;
    increaseQty: (item: string) => string;
    removeItem: (item: string) => string;
    onlyInStock: (n: number) => string;
    confirmTitle: string;
    confirmHint: string;
    qty: string;
    walkIn: string;
    payment: string;
    backToEdit: string;
    confirmRateAbove: string;
    confirmComplete: string;
    saleComplete: string;
    thankYou: (name: string) => string;
    items: string;
    cashier: string;
    newOrder: string;
    returningToPos: string;
  };

  // NEX-64 slice 5 — printable receipt (sale, supplier purchase, buyback)
  receipt: {
    titles: { SALE: string; SUPPLIER_PURCHASE: string; BUYBACK: string };
    roles: { customer: string; supplier: string; seller: string };
    vatNumber: string;
    ref: string;
    date: string;
    cashier: string;
    phone: string;
    stonesLine: (amount: string) => string;
    total: string;
    lbpEquiv: string;
    thankYou: (store: string) => string;
    printReceipt: string;
    print: string;
    loading: string;
  };

  // NEX-64 slice 5 — live rate card, stale-rate acknowledgement, market-closed banner
  goldRate: {
    live: string;
    stale: string;
    /** `source` as the API reports it: "live" (polled feed) or "override" (set by an admin). */
    sources: { live: string; override: string };
    refresh: string;
    olderThan15: string;
    karatUsdPerGram: (karat: string) => string;
    outOfDate: string;
    lastRefreshed: (time: string) => string;
    payingOut: string;
    charging: string;
    confirmSelling: (time: string) => string;
    confirmBuying: (time: string) => string;
    marketClosedTitle: string;
    ageingTitle: string;
    marketClosedBody: (since: string) => string;
    askManager: string;
    setOverrideHint: string;
    ageingBody: (since: string) => string;
  };

  // NEX-64 slice 5 — admin gold-price page
  goldPrice: {
    marketClosedBody: (since: string) => string;
    heroLabel: string;
    liveChartTitle: string;
    realTimeData: string;
    historyTitle: string;
    ranges: { "24h": string; "7d": string; "30d": string };
    noHistory: string;
    tooltipRate: (karat: string) => string;
    overrideTitle: string;
    overrideActive: string;
    clear: string;
    noOverride: string;
    ratePlaceholder: string;
    reasonPlaceholder: string;
    rateInputLabel: string;
    reasonInputLabel: string;
    auditNote: string;
    setOverride: string;
  };

  // NEX-64 slice 5 — admin barcode-label page
  qrLabels: {
    selectProducts: string;
    selectAll: string;
    labelsSelected: (n: number) => string;
    printLabels: string;
    previewTitle: string;
    selectAProduct: string;
    formatTitle: string;
    formatHelp: string;
    /** One stepper per product row, so each names its product. */
    fewerCopies: (product: string) => string;
    moreCopies: (product: string) => string;
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

  settings: {
    accountingTab: string;
    autoPostTitle: string;
    autoPostHelp: string;
    autoPostOn: string;
    autoPostOff: string;
    autoPostUnavailable: string;
    autoPostEnableTitle: string;
    autoPostEnableWarning: string;
    autoPostEnableConfirm: string;
    autoPostDisableTitle: string;
    autoPostDisableWarning: string;
    autoPostDisableConfirm: string;
    autoPostDisableBlocked: string;
    autoPostStateUnknownBlocked: string;
    cancel: string;
    close: string;
    saving: string;
    // NEX-64 slice 5 — the rest of the settings page
    saveChanges: string;
    tabStore: string;
    tabPricing: string;
    tabReceipt: string;
    tabStaff: string;
    tabSecurity: string;
    storeName: string;
    storeNameAr: string;
    storeNameArHint: string;
    fields: {
      address: string;
      phone: string;
      vat_number: string;
      default_margin_pct: string;
      default_making_charge: string;
      vat_percent: string;
      lbp_exchange_rate: string;
      max_discount_percent: string;
    };
    pricingNotice: string;
    maxDiscountHint: string;
    buybackPricing: string;
    buybackPricingHelp: string;
    marginMode: string;
    marginModes: { USD_PER_GRAM: string; PERCENT: string };
    marginValue: string;
    maxDriftPct: string;
    markupTitle: string;
    markupHelp: string;
    markupLabel: (karat: string) => string;
    nisabHelp: string;
    nisabGrams: string;
    footerMessage: string;
    changePassword: string;
    passwordChanged: string;
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
    updatePassword: string;
    passwordsMismatch: string;
    cashiers: string;
    addCashier: string;
    staffFields: { name: string; email: string; password: string };
    staffActive: string;
    staffDisabled: string;
  };

  errors: {
    loadFailed: string;
    loadFailedHint: string;
    refreshFailed: string;
    tryAgain: string;
    retryIn: (seconds: number) => string;
    retrying: string;
    somethingWentWrong: string;
    boundaryHint: string;
    reloadPage: string;
    goToPos: string;
    goToDashboard: string;
    goToLogin: string;
    reference: string;
    notFoundTitle: string;
    notFoundHint: string;
    recordNotFound: string;
    recordNotFoundHint: string;
    rateUnavailable: string;
    lastKnownRate: string;
    rateFeedDown: string;
    rateAsOf: string;
    fetchingRate: string;
  };

  stockTake: {
    // list
    intro: string;
    introStrong: string;
    starting: string;
    startNew: string;
    startFailed: string;
    emptyTitle: string;
    emptyHint: string;
    colStarted: string;
    colClosed: string;
    colLines: string;
    colVariances: string;
    colApproved: string;
    colRejected: string;
    statusDraft: string;
    statusSubmitted: string;
    statusClosed: string;
    statusClosedRejected: string;
    // detail: header
    backToHistory: string;
    startedAt: (when: string) => string;
    closedAt: (when: string) => string;
    rejectedExplain: (n: number) => string;
    // detail: counting (draft)
    stepsTitle: string;
    saveCount: string;
    step1Body: string;
    step2Title: string;
    step2Body: string;
    step3Title: string;
    step3Body: string;
    ounceBars: string;
    linesCounted: (n: number) => string;
    submitNote: string;
    submitNoteStrong: string;
    submitting: string;
    submitForReview: string;
    colSystemSays: string;
    colCounted: string;
    countFor: (name: string) => string;
    savedCount: (n: number) => string;
    notCounted: string;
    remove: string;
    countInvalid: string;
    saveFailed: string;
    removeFailed: string;
    needOneLine: string;
    submitFailed: string;
    // detail: review (submitted)
    awaitingTitle: string;
    awaitingBody: string;
    pendingTitle: (n: number) => string;
    resolvedTitle: string;
    approveConfirm: (sentence: string, effect: string) => string;
    approveFailed: string;
    reasonRequired: string;
    rejectFailed: string;
    varianceMatch: string;
    varianceShort: (by: number) => string;
    varianceOver: (by: number) => string;
    sentenceMatch: (name: string, expected: number) => string;
    sentenceShort: (name: string, expected: number, counted: number, by: number) => string;
    sentenceOver: (name: string, expected: number, counted: number, by: number) => string;
    effectNone: string;
    effectDecrease: (expected: number, counted: number, by: number) => string;
    effectIncrease: (expected: number, counted: number, by: number) => string;
    colItem: string;
    colSystemSaid: string;
    colVariance: string;
    colVariancePlain: string;
    colAction: string;
    colRejectReason: string;
    approve: string;
    reject: string;
    resPending: string;
    resApproved: string;
    resRejected: string;
    resNoVariance: string;
    kindCoin: string;
    kindOunce: string;
    // detail: closed
    rejectedTitle: (n: number) => string;
    rejectedBody: string;
    approvedTitle: (n: number) => string;
    matchedTitle: (n: number) => string;
    matchedBody: (n: number) => string;
    // detail: reject dialog
    rejectVariance: string;
    rejectEffect: (expected: number, counted: number) => string;
    reasonLabel: string;
    reasonPlaceholder: string;
    rejecting: string;
  };

  orders: {
    // list
    title: string;
    exportCsv: string;
    tabSell: string;
    tabPurchases: string;
    tabBuybacks: string;
    showing: (from: number, to: number, total: number) => string;
    prev: string;
    statTotalOrders: string;
    statRevenue: string;
    statAvgOrder: string;
    filterAll: string;
    status: { COMPLETED: string; PARTIALLY_REFUNDED: string; REFUNDED: string; VOIDED: string };
    colItems: string;
    emptySell: string;
    view: string;
    receipt: string;
    colMode: string;
    colCashDue: string;
    colGoldDue: string;
    purchaseMode: { CASH: string; GOLD: string; MIXED: string };
    emptyPurchases: string;
    colSeller: string;
    colKind: string;
    colKaratWeight: string;
    colQty: string;
    colPaid: string;
    buybackKind: { PURE_GOLD: string; COIN: string; OUNCE: string; USED_PRODUCT: string };
    emptyBuybacks: string;
    // detail
    cashierLine: (name: string) => string;
    customerLine: (name: string) => string;
    printReceipt: string;
    voidOrder: string;
    voidReason: string;
    confirmVoid: string;
    dismiss: string;
    voidedStamp: string;
    colItem: string;
    colRateAtSale: string;
    itemKind: { PRODUCT: string; COIN: string; OUNCE: string };
    refundedLine: (refunded: number, quantity: number, amount: string) => string;
    refund: string;
    discountPct: (pct: number) => string;
    lbpEquivalent: string;
    paymentMethod: string;
    payment: { CASH: string; CARD: string; MIXED: string; CREDIT: string };
    refundTotalsNote: string;
    refundItem: string;
    refundQty: (max: number) => string;
    unitReturnsToStock: string;
    lineWillRefund: string;
    returnedToCustomer: string;
    refundIncl: (vatPct: number, discountPct: number) => string;
    returnsUnits: (n: number) => string;
    refundFailed: string;
    refunding: string;
    confirmRefund: string;
    voidReasonRequired: string;
    voidFailed: string;
    voiding: string;
  };

  deleteDialog: {
    title: string;
    irreversible: (word: string) => string;
    irreversibleWord: string;
    deleting: string;
    confirm: string;
  };

  products: {
    stones: string;
    carats: string;
    stoneCount: string;
    certificate: string;
    stoneValue: string;
    stoneNote: string;
    stoneDetails: string;
    stoneCost: string;
    hasStones: string;
    itemCode: string;
    category: string;
    selectCategory: string;
    categoryPlaceholder: string;
    karat: string;
    weightGrams: string;
    marginPct: string;
    makingUsd: string;
    qtyOnHand: string;
    lowStockAlert: string;
    noAlert: string;
    certPlaceholder: string;
    notePlaceholder: string;
    productImages: string;
    uploading: string;
    dropHint: string;
    fileHint: string;
    uploadFailed: string;
    hero: string;
    setAsHero: string;
    removePhoto: string;
    saving: string;
    saveProduct: string;
    livePreview: string;
    productName: string;
    marketRate24k: string;
    purityRate: string;
    markup: string;
    effectiveRate: string;
    metalValue: string;
    margin: string;
    makingCharge: string;
    retailPrice: string;
    previewHint: string;
    perGram: string;
    addProduct: string;
    newProduct: string;
    searchPlaceholder: string;
    allCategories: string;
    colImage: string;
    colWeight: string;
    colStock: string;
    colLivePrice: string;
    usedBadge: string;
    status: { AVAILABLE: string; SOLD: string; MELTED: string; RESERVED: string; INACTIVE: string };
    lowStock: string;
    activate: string;
    deactivate: string;
    deleteFailed: string;
    product: string;
    usedProduct: string;
    used: string;
    costBasis: string;
    sourceFrom: (ref: string) => string;
    caratUnit: string;
    certificateLabel: string;
    stoneValueLabel: string;
    noteLabel: string;
    meltTitle: string;
    meltHint: (karat: string, weight: string) => string;
    meltOnlyWhen: (status: string) => string;
    melt: string;
    meltFailed: string;
    meltHeading: (code: string) => string;
    meltCurrent: (karat: string, weight: string) => string;
    meltStatusNote: (status: string) => string;
    overrideWeight: string;
    overrideKarat: string;
    keep: (value: string) => string;
    melting: string;
    confirmMelt: string;
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
      title: string;
      descriptionOn: string; descriptionOff: string; descriptionUnknown: string;
      stateTitle: string; entriesLabel: string; chainLabel: string; autoPostLabel: string;
      noEntriesYet: string; couldNotVerify: string; on: string; off: string; notReported: string; openSettings: string;
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
    // Strings for the tax, KPI, journal and period screens and the action bar
    // (NEX-64). Appended as one block rather than inside those blocks.
    extra: {
      hintArrow: string;
      quarter: (n: number) => string;
      quarterLabel: string;
      vatDirection: { PAYABLE: string; REFUNDABLE: string; NIL: string };
      notAvailable: string;
      daysSuffix: string;
      kpiWindow: (start: string, end: string, days: number) => string;
      moneyBalance: (debit: string, credit: string) => string;
      posted: (entryNo: string) => string;
      months: readonly string[];
      periodStatus: { OPEN: string; CLOSED: string };
      yearClosed: (year: number, entryNo: string, opened: number, nextYear: number) => string;
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
    roleHasNoScreens: "This role has no screens yet. Ask an admin to change it.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    failed: "Login failed",
  },

  suppliers: {
    title: "Suppliers",
    newSupplier: "New Supplier",
    searchPlaceholder: "Search suppliers…",
    includeInactive: "Include inactive",
    contact: "Contact",
    phone: "Phone",
    terms: "Terms",
    empty: "No suppliers yet",
    active: "Active",
    inactive: "Inactive",
    deactivate: "Deactivate",
    reactivate: "Reactivate",
    openSupplier: (name) => `Open ${name}`,
    toggleFailed: "Toggle failed",
    saveFailed: "Save failed",
    contactName: "Contact name",
    email: "Email",
    address: "Address",
    paymentTerms: "Payment terms",
    paymentTermsPlaceholder: "e.g. \"net 30, gold-for-gold preferred\"",
    notes: "Notes",
    saving: "Saving…",
    createSupplier: "Create Supplier",
    // Supplier detail
    backToList: "Back to suppliers",
    cashOwed: "Cash owed",
    recordCashPayment: "Record cash payment",
    recordCashPaymentLink: "Record cash payment →",
    goldOwedByKarat: "Gold owed (grams by karat)",
    none: "None",
    recordGoldPayment: "Record gold payment",
    recordGoldPaymentLink: "Record gold payment →",
    cannotDeactivate: "Cannot deactivate while debt is outstanding.",
    newPurchase: "New Purchase",
    purchaseHistory: "Purchase history",
    paymentHistory: "Payment history",
    noPurchases: "No purchases yet",
    noPayments: "No payments yet",
    colDate: "Date",
    colMode: "Mode",
    colCashDuePaid: "Cash due / paid",
    colGoldDuePaid: "Gold due / paid",
    colItems: "Items",
    colReceipt: "Receipt",
    colUnit: "Unit",
    colAmount: "Amount",
    colSourceLots: "Source lots",
    receiptLink: "Receipt →",
    itemCount: (n) => `${n} item${n !== 1 ? "s" : ""}`,
    mode: { CASH: "CASH", GOLD: "GOLD", MIXED: "MIXED" },
    unitCash: "CASH",
    // Payment dialogs
    paymentFailed: "Payment failed",
    outstanding: "Outstanding:",
    amountUsd: "Amount (USD)",
    notesOptional: "Notes (optional)",
    recordPayment: "Record Payment",
    goldPaymentHint: "Choose which lot(s) the gold leaves from.",
    karat: "Karat",
    karatOwed: (karat, grams) => `${karat} (owe ${grams}g)`,
    karatNoneOwed: (karat) => `${karat} (none owed)`,
    outstandingKarat: (karat) => `Outstanding ${karat}:`,
    totalPicked: "Total picked:",
    pickLots: "Pick lot(s)",
    noActiveLots: (karat) => `No active ${karat} lots`,
    lotRemaining: (grams) => `remaining ${grams}g`,
    lotSource: { BUYBACK: "BUYBACK", MELT: "MELT", SUPPLIER: "SUPPLIER", SEED: "SEED", ADJUSTMENT: "ADJUSTMENT" },
    gramsPlaceholder: "grams",
    gramsFromLot: (lot) => `Grams from lot ${lot}`,
    payGold: (grams, karat) => `Pay ${grams}g ${karat}`,
  },

  supplierPurchase: {
    backTo: (name) => `Back to ${name}`,
    backToSupplier: "Back to supplier",
    title: "New supplier purchase",
    paymentMode: "Payment mode",
    mode: { CASH: "CASH", GOLD: "GOLD", MIXED: "MIXED" },
    modeHint: {
      CASH: "Pay supplier in USD only",
      GOLD: "Pay supplier in gold (from your lots)",
      MIXED: "Cash + gold combined",
    },
    dealSplit: "Deal split",
    totalCashDue: "Total cash due (USD)",
    cashPaidNow: "Cash paid now",
    // "{amount}" marks where the page renders the formatted amount.
    cashDifference: "Difference ({amount}) becomes cash debt.",
    totalGoldDue: "Total gold due (grams per karat)",
    tradeMarkup: "Trade markup per gram (USD, audit info only — optional)",
    goldPaidNow: "Gold paid now (pick lots)",
    karat: "Karat",
    lot: "Lot",
    pickLot: "— pick lot —",
    grams: "grams",
    goldLineN: (n) => `Gold payment line ${n}`,
    removeGoldLine: "Remove gold payment line",
    addGoldLine: "+ Add gold payment line",
    pickedVsDue: "Picked vs due:",
    itemsReceived: "Items received",
    addItem: "Add item",
    noItems: "No items yet. Add at least one item the supplier delivered.",
    itemN: (n) => `Item ${n}`,
    itemKind: "Item type",
    kind: {
      PURE_GOLD: "PURE_GOLD (creates a new lot)",
      COIN: "COIN (increments coin stock)",
      OUNCE: "OUNCE (increments ounce stock)",
      PRODUCT: "PRODUCT (creates a new product)",
    },
    unitCost: "Unit cost USD",
    removeItem: "Remove item",
    weight: "weight g",
    itemNotes: "notes",
    coinType: "Coin type",
    pickCoinType: "— pick coin type —",
    ounceType: "Ounce type",
    pickOunceType: "— pick ounce type —",
    qty: "qty",
    // The Arabic-name field keeps an Arabic placeholder in both languages.
    nameArPlaceholder: "الاسم",
    category: "Category",
    margin: "margin %",
    makingCharge: "making charge",
    notes: "Notes",
    saveFailed: "Save failed",
    recording: "Recording…",
    recordPurchase: "Record Purchase",
    loadingReceipt: "Loading receipt…",
  },

  payables: {
    title: "Accounts Payable",
    cashOwedStoreWide: "Cash owed (store-wide)",
    goldOwed: "Gold owed",
    none: "None",
    suppliersWithDebt: "Suppliers with debt",
    empty: "No outstanding supplier debt",
    colSupplier: "Supplier",
    colCash: "Cash",
    colGold: "Gold",
    settle: "Settle →",
  },

  inventoryLedger: {
    reconcileTitle: "Supplier balance reconciliation",
    // "{table}" marks where the page renders the table name in monospace.
    reconcileHelp: "Replays purchases and payments to verify the running {table} projection. Mismatch indicates either a bug or out-of-band data edits.",
    alertToggleTitle: "Toggle Discord alert on drift",
    alertOn: "Alert on drift",
    alertOff: "Silent",
    running: "Running…",
    runReconcile: "Run reconcile",
    reconcileFailed: "Reconcile failed",
    allReconciled: "All supplier balances reconcile against purchase + payment history.",
    noAlertNeeded: "(no alert needed)",
    driftsDetected: (n) => `${n} drift${n !== 1 ? "s" : ""} detected.`,
    discordAlerted: "Discord alerted.",
    colSupplier: "Supplier",
    colUnit: "Unit",
    colStored: "Stored",
    colComputed: "Computed",
    colDrift: "Drift",
    unitCash: "CASH",
    // The API sends the karat already prefixed ("K21").
    unitGold: (karat) => (karat ? `GOLD ${karat}` : "GOLD"),
    title: "Audit ledger",
    resetFilters: "Reset filters",
    eventType: "Event type",
    refType: "Ref type",
    refId: "Ref id",
    any: "any",
    refIdPlaceholder: "exact UUID",
    colDetails: "Details",
    colEvent: "Event",
    colRef: "Ref",
    colActor: "Actor",
    colOccurred: "Occurred",
    noEvents: "No events match these filters.",
    pageSummary: (page, pages, total) => `Page ${page} of ${pages} · ${total} events`,
    prev: "← Prev",
    next: "Next →",
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
    auditLedger: "Audit Ledger",
    settings: "Settings",
    signOut: "Sign out",
    admin: "Admin",
  },

  lots: {
    tab: "Pure Gold Lots",
    poolTitle: (karat) => `${karat} pool`,
    lotCount: (n) => `${n} lot${n !== 1 ? "s" : ""}`,
    filterByKarat: "Filter by karat",
    allKarats: "All karats",
    includeDepleted: "Include depleted",
    newLot: "New Lot",
    karat: "Karat",
    remainingOriginal: "Remaining / Original",
    source: "Source",
    costBasis: "Cost basis",
    acquired: "Acquired",
    empty: (karat) => (karat ? `No lots in ${karat}` : "No lots yet"),
    sources: { BUYBACK: "BUYBACK", MELT: "MELT", SUPPLIER: "SUPPLIER", SEED: "SEED", ADJUSTMENT: "ADJUSTMENT" },
    active: "Active",
    depleted: "Depleted",
    manualAdjustment: "Manual adjustment",
    adjustLot: (karat, lotId) => `Manual adjustment: ${karat} lot ${lotId}`,
    newLotTitle: "New Pure-Gold Lot",
    weightG: "Weight (g)",
    costBasisUsd: "Cost basis (USD)",
    notesOptional: "Notes (optional)",
    saving: "Saving…",
    createLot: "Create Lot",
    createFailed: "Failed to create lot",
    autoLotsHint: "Lots from buybacks, supplier purchases, and melts are created automatically by those flows — only SEED or ADJUSTMENT origin allowed here.",
    adjustTitle: "Adjust lot",
    remaining: "remaining",
    deltaG: "Delta (g)",
    deltaPlaceholder: "e.g. -2.500",
    deltaHint: "Negative reduces, positive adds.",
    reason: "Reason",
    reasons: { LOSS: "LOSS", THEFT: "THEFT", GIFT: "GIFT", SAMPLE: "SAMPLE", CORRECTION: "CORRECTION" },
    notesRequired: "Notes (required)",
    notesPlaceholder: "What happened?",
    apply: "Apply",
    adjustFailed: "Adjustment failed",
  },

  buybacks: {
    tab: "Buybacks",
    filterByKind: "Filter by kind",
    allKinds: "All kinds",
    kinds: { PURE_GOLD: "Pure gold", COIN: "Coin", OUNCE: "Ounce", USED_PRODUCT: "Used product" },
    kindPills: { PURE_GOLD: "PURE_GOLD", COIN: "COIN", OUNCE: "OUNCE", USED_PRODUCT: "USED_PRODUCT" },
    pendingOnly: "Pending polish/melt only",
    when: "When",
    kind: "Kind",
    seller: "Seller",
    detail: "Detail",
    pricePaid: "Price paid",
    outcome: "Outcome",
    empty: (kind, pendingOnly) => `No buybacks${kind ? ` of kind ${kind}` : ""}${pendingOnly ? " pending action" : ""}.`,
    toLot: "→ lot",
    stock: "stock",
    polishedToProduct: "polished → product",
    meltedToLot: "melted → lot",
    pending: "pending",
    polish: "Polish",
    melt: "Melt",
    receipt: "Receipt →",
    polishRow: (seller, when) => `Polish: ${seller}, ${when}`,
    meltRow: (seller, when) => `Melt: ${seller}, ${when}`,
    receiptRow: (seller, when) => `Receipt: ${seller}, ${when}`,
    polishTitle: "Polish used buyback into a product",
    original: "Original:",
    paid: "paid",
    costBasisCarries: "(cost basis carries to product)",
    category: "Category",
    marginPct: "Margin %",
    makingCharge: "Making charge ($)",
    overrideWeightOptional: "Override weight (g) — optional",
    overrideKaratOptional: "Override karat — optional",
    overrideWeight: "Override weight (g)",
    overrideKarat: "Override karat",
    keep: (value) => `(keep ${value})`,
    notesOptional: "Notes (optional)",
    polishing: "Polishing…",
    polishAndList: "Polish & list",
    polishFailed: "Polish failed",
    meltTitle: "Melt used buyback into a pure-gold lot",
    melting: "Melting…",
    meltFailed: "Melt failed",
  },

  unitCatalog: {
    coins: { search: "Search coin types…", newType: "New Coin Type", editType: "Edit Coin Type", createType: "Create Coin Type", empty: "No coin types yet" },
    ounces: { search: "Search ounce types…", newType: "New Ounce Type", editType: "Edit Ounce Type", createType: "Create Ounce Type", empty: "No ounce types yet" },
    includeInactive: "Include inactive",
    photo: "Photo",
    code: "Code",
    karat: "Karat",
    weight: "Weight",
    markupMargin: "Markup / Margin",
    onHand: "On hand",
    min: "Min",
    inactive: "inactive",
    livePrice: "Live price",
    adjustStock: "Adjust stock",
    deactivate: "Deactivate",
    reactivate: "Reactivate",
    rowAction: (action, code) => `${action}: ${code}`,
    autoGenerated: "auto-generated",
    weightG: "Weight (g)",
    markupPerGram: "Markup / g (±)",
    marginMode: "Margin mode",
    flatUsd: "Flat USD",
    percent: "Percent",
    marginUsd: "Margin (USD)",
    marginPercent: "Margin (%)",
    minStockQty: "Min stock qty",
    none: "(none)",
    photoPreview: "Preview",
    removePhoto: "Remove photo",
    uploading: "Uploading…",
    changePhoto: "Change photo",
    uploadPhoto: "Upload photo",
    uploadFailed: "Upload failed",
    saving: "Saving…",
    saveChanges: "Save Changes",
    saveFailed: "Save failed",
    formHint: "Stock changes go through the adjust button — the catalog form only edits type definitions.",
    onHandInline: "on hand",
    deltaQty: "Delta (qty)",
    deltaPlaceholder: "e.g. -2 or 10",
    wholeNumbersOnly: "Whole numbers only.",
    reason: "Reason",
    reasons: { LOSS: "LOSS", THEFT: "THEFT", GIFT: "GIFT", SAMPLE: "SAMPLE", CORRECTION: "CORRECTION" },
    notes: "Notes",
    notesPlaceholder: "What happened?",
    apply: "Apply",
    adjustFailed: "Adjustment failed",
    pricing: "Pricing…",
    perUnit: "per unit",
    spot24k: "Spot 24K",
    effectiveRate: "Effective rate",
    markupApplied: "(markup applied)",
    metalValue: "Metal value",
    margin: "Margin",
    source: "Source",
    sources: { live: "live", override: "override" },
    stale: "(stale)",
  },

  reconcile: {
    tab: "Reconcile",
    title: "Coin & Ounce Stock Reconciliation",
    intro: (field) => `Replays every event that mutates ${field} (supplier purchases, walk-in buybacks, manual adjustments, completed & refunded sales) and compares the result against the stored quantity. Drift means the stored value disagrees with what the audit history implies.`,
    readOnlyNote: "Read-only. Resolving drift is a separate step — find the missing event in code, or run a physical stock-take and post a manual adjustment for the variance.",
    run: "Run Reconcile",
    running: "Running…",
    runAndAlert: "Run & alert on drift",
    failed: "Reconcile failed",
    lastRun: "Last run:",
    discordAlertSent: "Discord alert sent.",
    allMatch: "All coin & ounce stock matches the ledger replay.",
    zeroDrift: "Zero drift across every active type.",
    driftCount: (n) => `${n} type${n !== 1 ? "s" : ""} with stock drift`,
    driftHint: "Stored on-hand quantity disagrees with the replayed event history.",
    kind: "Kind",
    code: "Code",
    stored: "Stored",
    computed: "Computed",
    drift: "Drift",
    kinds: { COIN: "COIN", OUNCE: "OUNCE" },
    idleHint: (button) => `Click ${button} to compute the current state.`,
  },

  stockAlerts: {
    tab: "Alerts",
    allHealthy: "All stock above thresholds",
    healthyHint: (field) => `Coin and ounce types you've set ${field} on are healthy.`,
    belowMinimum: (n) => `${n} item${n !== 1 ? "s" : ""} at or below minimum stock`,
    adjustHint: "Adjust stock through buybacks, supplier purchases, or manual adjustments.",
    kind: "Kind",
    code: "Code",
    onHand: "On hand",
    minimum: "Minimum",
    kinds: { COIN: "COIN", OUNCE: "OUNCE", PRODUCT: "PRODUCT" },
    manage: "Manage →",
    manageRow: (code) => `Manage: ${code}`,
  },

  categories: {
    title: "Categories",
    addCategory: "Add Category",
    editCategory: "Edit Category",
    newCategory: "New Category",
    slug: "Slug",
    slugPlaceholder: "auto-generated from name",
    saving: "Saving…",
    saveFailed: "Save failed",
    empty: "No categories yet",
    active: "Active",
    inactive: "Inactive",
    activate: "Activate",
    deactivate: "Deactivate",
    deletePermanently: "Delete permanently",
    deleteFailed: "Delete failed",
    rowAction: (action, name) => `${action}: ${name}`,
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
    saveFailed: "Failed to save snapshot",
    dueFormula: (label) => `2.5% × ${label}`,
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
    recentPurchases: "Recent supplier purchases",
    cashDue: "Cash due",
    receiptLink: "Receipt →",
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
    // NEX-64 slice 5 — scan panel and add-coin / add-ounce dialog
    capture: "Capture",
    step01: "Step 01",
    itemNotFound: "Item not found",
    readyToScan: "Ready to scan",
    scanHint: "Point scanner at barcode or enter code below",
    manualEntry: "Manual entry",
    productCodePlaceholder: "Product code…",
    find: "Find",
    addCoinToCart: "Add coin to cart",
    addOunceToCart: "Add ounce bar to cart",
    searchCoinTypes: "Search coin types…",
    searchOunceTypes: "Search ounce types…",
    noCoinTypes: "No coin types found",
    noOunceTypes: "No ounce types found",
    onHand: "on hand:",
    unitPrice: "Unit price",
    qty: "Qty",
    adding: "Adding…",
    addToCart: "Add to cart",
  },

  // NEX-64 slice 5 — POS buyback form and its confirmation screen
  posBuyback: {
    eyebrow: "Buy back",
    title: "Customer is selling gold",
    kinds: { PURE_GOLD: "Pure gold", COIN: "Coin", OUNCE: "Ounce bar", USED_PRODUCT: "Used piece" },
    sellerName: "Seller name",
    phone: "Phone",
    coinType: "Coin type",
    ounceType: "Ounce bar type",
    selectPlaceholder: "— select —",
    enterWeightHint: "Enter weight to see the live quote.",
    manualPriceUsd: "Manual price (USD)",
    manualPriceUsdTotal: "Manual price (USD, total)",
    pricePaidUsd: "Price paid (USD)",
    notes: "Notes",
    notesOptional: "Notes (optional)",
    usedPieceHint: (mark) => [
      "Used pieces are priced by hand. Admin can later ",
      mark("polish"),
      " them into the catalog or ",
      mark("melt"),
      " them into a pure-gold lot.",
    ],
    priceModeAuto: "Auto (spot − margin)",
    priceModeManual: "Manual price",
    spot24k: "Spot 24K",
    buybackMargin: "Buyback margin",
    effective: "Effective",
    paySeller: "Pay seller",
    staleQuote: "⚠️ This quote is based on an out-of-date rate.",
    perUnitFormula: "Per unit (formula)",
    totalBuyPrice: "Total buy price",
    rate: "Rate",
    rateLine: (rate, source, stale) => `$${rate}/g (24K) · ${source}${stale ? " (stale)" : ""}`,
    sellerRequired: "Seller name and phone are required.",
    record: "Record buy back",
    recording: "Recording…",
    recorded: "Buy back recorded",
    paidTo: (amount, name) => `Paid ${amount} to ${name}`,
    newBuyback: "New buy back",
  },

  // NEX-64 slice 5 — cart, checkout panel, confirm dialog, sale-complete screen
  checkout: {
    currentSale: "Current Sale",
    noItems: "No items yet",
    itemCount: (n) => `${n} item${n === 1 ? "" : "s"}`,
    scanToBegin: "Scan an item to begin",
    itemsAppearHere: "Items added will appear here",
    customerOptional: "Customer (optional)",
    customerNamePlaceholder: "Customer name",
    paymentMethod: "Payment method",
    paymentMethods: { CASH: "CASH", CARD: "CARD", MIXED: "MIXED", CREDIT: "CREDIT", GOLD: "GOLD" },
    discountPctMax: (max) => `Discount % (max ${max}%)`,
    vatLine: (pct) => `VAT ${pct}%`,
    discountLine: (pct) => `Discount ${pct}%`,
    discount: "Discount",
    processing: "PROCESSING…",
    addItemsToCheckout: "ADD ITEMS TO CHECKOUT",
    checkoutTotal: (total) => `CHECKOUT · ${total}`,
    perEach: (price) => `${price}/ea`,
    eachAndTotal: (unit, total) => `${unit} ea · ${total}`,
    itemKinds: { COIN: "COIN", OUNCE: "OUNCE" },
    decreaseQty: (item) => `Decrease quantity of ${item}`,
    increaseQty: (item) => `Increase quantity of ${item}`,
    removeItem: (item) => `Remove ${item}`,
    onlyInStock: (n) => `Only ${n} in stock`,
    confirmTitle: "Confirm this order?",
    confirmHint: "Review the items and quantities before completing the sale.",
    qty: "Qty",
    walkIn: "Walk-in",
    payment: "Payment",
    backToEdit: "Back to edit",
    confirmRateAbove: "CONFIRM THE RATE ABOVE",
    confirmComplete: "CONFIRM & COMPLETE",
    saleComplete: "SALE COMPLETE",
    thankYou: (name) => `Thank you, ${name}`,
    items: "Items",
    cashier: "Cashier",
    newOrder: "+ New Order",
    returningToPos: "Returning to POS in 30 seconds…",
  },

  // NEX-64 slice 5 — printable receipt (sale, supplier purchase, buyback)
  receipt: {
    titles: { SALE: "SALES RECEIPT", SUPPLIER_PURCHASE: "PURCHASE RECEIPT", BUYBACK: "BUYBACK RECEIPT" },
    roles: { customer: "CUSTOMER", supplier: "SUPPLIER", seller: "SELLER" },
    vatNumber: "VAT:",
    ref: "REF",
    date: "DATE",
    cashier: "CASHIER",
    phone: "PHONE",
    stonesLine: (amount) => `Stones: ${amount}`,
    total: "TOTAL",
    lbpEquiv: "LBP Equiv.",
    thankYou: (store) => `Thank you — ${store}`,
    printReceipt: "Print Receipt",
    print: "Print",
    loading: "Loading receipt…",
  },

  // NEX-64 slice 5 — live rate card, stale-rate acknowledgement, market-closed banner
  goldRate: {
    live: "LIVE",
    stale: "STALE",
    sources: { live: "live", override: "override" },
    refresh: "Refresh",
    olderThan15: "Gold rate is older than 15 minutes",
    karatUsdPerGram: (karat) => `${karat} · USD/g`,
    outOfDate: "The gold rate is out of date.",
    lastRefreshed: (time) => `It last refreshed at ${time} and the feed has not recovered since.`,
    payingOut: "You are paying out on this price.",
    charging: "You are charging on this price.",
    confirmSelling: (time) => `I confirm selling on the rate from ${time}.`,
    confirmBuying: (time) => `I confirm buying on the rate from ${time}.`,
    marketClosedTitle: "Market closed / gold feed down",
    ageingTitle: "Gold rate is ageing",
    marketClosedBody: (since) => `The rate hasn't refreshed since ${since}. Sales and buybacks now need an on-screen confirmation before they complete.`,
    askManager: "Ask a manager to set a manual override if this continues.",
    setOverrideHint: "Set a manual override on the Gold Price page to price deliberately instead.",
    ageingBody: (since) => `Last refreshed ${since}. Still trading on it; no action needed yet.`,
  },

  // NEX-64 slice 5 — admin gold-price page
  goldPrice: {
    marketClosedBody: (since) => `The rate hasn't refreshed since ${since}. Customers are being served the last known rate. Set a manual override below if you need to trade.`,
    heroLabel: "24K Gold — USD/gram",
    liveChartTitle: "XAU/USD — Live Chart (TradingView)",
    realTimeData: "Real-time market data",
    historyTitle: "Polled Rate History",
    ranges: { "24h": "24H", "7d": "7D", "30d": "30D" },
    noHistory: "No polled rates for this period",
    tooltipRate: (karat) => `${karat} rate`,
    overrideTitle: "Manual Override",
    overrideActive: "Override active:",
    clear: "Clear",
    noOverride: "No override active — using live feed",
    ratePlaceholder: "Enter rate USD/g…",
    reasonPlaceholder: "Reason (required, recorded in audit log)…",
    rateInputLabel: "Override rate (USD/g)",
    reasonInputLabel: "Reason for the override",
    auditNote: "Every override is logged with actor, rate, prior rate, and reason. Reason is mandatory.",
    setOverride: "Set Override",
  },

  // NEX-64 slice 5 — admin barcode-label page
  qrLabels: {
    selectProducts: "Select Products",
    selectAll: "Select all",
    labelsSelected: (n) => `${n} label${n !== 1 ? "s" : ""} selected`,
    printLabels: "Print Labels",
    previewTitle: "Label Preview (80×40mm)",
    selectAProduct: "Select a product",
    formatTitle: "Format: CODE128 (1D)",
    formatHelp: "Compatible with any standard 1D barcode scanner. The cashier scans the bars; the product code below is a fallback for manual entry.",
    fewerCopies: (product) => `Fewer copies of ${product}`,
    moreCopies: (product) => `More copies of ${product}`,
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

  settings: {
    accountingTab: "Accounting",
    autoPostTitle: "Post sales to the books automatically",
    autoPostHelp: "When this is on, each sale, purchase, buyback and payment is written to the general ledger as a balanced journal entry the moment it happens. When it is off, the shop keeps trading and the inventory ledger records it, but the accounting books stay empty.",
    autoPostOn: "On",
    autoPostOff: "Off",
    autoPostUnavailable: "Not available yet: the server doesn't report this setting. It needs the backend change (NEX-52) before it can be switched from here.",
    autoPostEnableTitle: "Start posting to the books?",
    autoPostEnableWarning: "From now on, every sale, purchase, buyback and payment will be written to the ledger. Anything sold before this moment stays out of the books unless it is posted separately — agree the start date with your accountant first.",
    autoPostEnableConfirm: "Turn on",
    autoPostDisableTitle: "Stop posting to the books?",
    autoPostDisableWarning: "New sales will stop reaching the ledger. The books are empty right now, so nothing is left behind.",
    autoPostDisableConfirm: "Turn off",
    autoPostDisableBlocked: "The ledger already has entries. Turning auto-posting off now would leave a gap in the books, so it can't be switched off from here. Ask your accountant how to close the books instead.",
    autoPostStateUnknownBlocked: "The ledger's state couldn't be checked, so auto-posting can't be switched off from here right now. Try again in a moment.",
    cancel: "Cancel",
    close: "Close",
    saving: "Saving…",
    // NEX-64 slice 5 — the rest of the settings page
    saveChanges: "Save Changes",
    tabStore: "Store Info",
    tabPricing: "Default Pricing",
    tabReceipt: "Receipt",
    tabStaff: "Staff",
    tabSecurity: "Security",
    storeName: "Store name",
    storeNameAr: "Store name (Arabic)",
    storeNameArHint: "Printed on receipts when the language is Arabic. Leave blank to fall back to the English name.",
    fields: {
      address: "Address",
      phone: "Phone",
      vat_number: "VAT number",
      default_margin_pct: "Default margin pct",
      default_making_charge: "Default making charge",
      vat_percent: "VAT percent",
      lbp_exchange_rate: "LBP exchange rate",
      max_discount_percent: "Max discount percent",
    },
    pricingNotice: "Existing products are not affected. Editing a product overrides these defaults.",
    maxDiscountHint: "Maximum order-level discount a cashier may apply at checkout. 0 disables discounts.",
    buybackPricing: "Buyback Pricing",
    buybackPricingHelp: "Default spread the shop applies when buying gold back from customers. Per-transaction override is available on the buyback POS form.",
    marginMode: "Margin Mode",
    marginModes: { USD_PER_GRAM: "USD per gram", PERCENT: "Percent" },
    marginValue: "Margin Value",
    maxDriftPct: "Max Drift %",
    markupTitle: "Per-Karat Gold Markup (USD / gram)",
    markupHelp: "Added to the karat purity rate before calculating metal value. Example: K21 markup = $5 means the K21 rate used in pricing is (market × 87.5%) + $5/g.",
    markupLabel: (karat) => `${karat} Markup`,
    nisabHelp: "Threshold (in grams of pure gold) above which zakat is due. Conventionally ~85g. Editable so the owner can match the rule their scholar prescribes.",
    nisabGrams: "Nisab (grams)",
    footerMessage: "Footer Message",
    changePassword: "Change Password",
    passwordChanged: "Password changed successfully.",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    updatePassword: "Update Password",
    passwordsMismatch: "New passwords do not match",
    cashiers: "Cashiers",
    addCashier: "Add Cashier",
    staffFields: { name: "name", email: "email", password: "password" },
    staffActive: "Active",
    staffDisabled: "Disabled",
  },

  errors: {
    loadFailed: "Couldn't load this data",
    loadFailedHint: "The server didn't respond. Check the connection and try again.",
    refreshFailed: "Couldn't refresh — showing the last data received",
    tryAgain: "Try again",
    retryIn: (seconds) => `Try again in ${seconds}s`,
    retrying: "Retrying…",
    somethingWentWrong: "Something went wrong",
    boundaryHint: "This screen hit a problem it couldn't recover from on its own. Your sign-in and any items in the cart are unaffected.",
    reloadPage: "Reload page",
    goToPos: "Back to the register",
    goToDashboard: "Back to the dashboard",
    goToLogin: "Go to sign in",
    reference: "Reference",
    notFoundTitle: "Page not found",
    notFoundHint: "That address doesn't match any screen in this system.",
    recordNotFound: "Not found",
    recordNotFoundHint: "This record doesn't exist or has been deleted.",
    rateUnavailable: "Rate unavailable",
    lastKnownRate: "Showing the last known rate",
    rateFeedDown: "Feed down",
    rateAsOf: "as of",
    fetchingRate: "Fetching rate…",
  },

  stockTake: {
    intro: "Physically count coin and ounce stock; submit for review; approve or reject each variance.",
    introStrong: "Nothing touches inventory until you click Approve on a specific line.",
    starting: "Starting…",
    startNew: "Start new count",
    startFailed: "Failed to start stock-take",
    emptyTitle: "No stock-takes yet",
    emptyHint: "Click \"Start new count\" to begin a physical count.",
    colStarted: "Started",
    colClosed: "Closed",
    colLines: "Lines",
    colVariances: "Variances",
    colApproved: "Approved",
    colRejected: "Rejected",
    statusDraft: "Draft",
    statusSubmitted: "Awaiting review",
    statusClosed: "Closed",
    statusClosedRejected: "Closed with rejection",
    backToHistory: "Back to history",
    startedAt: (when) => `Started ${when}`,
    closedAt: (when) => `Closed ${when}`,
    rejectedExplain: (n) => `${n} variance${n !== 1 ? "s" : ""} were rejected — system stays knowingly different from physical count on those lines.`,
    stepsTitle: "Two distinct steps",
    saveCount: "Save count",
    step1Body: "per row — records what you physically counted. Does NOT change inventory.",
    step2Title: "Submit for review",
    step2Body: "— freezes the count and computes variances. Still does NOT change inventory.",
    step3Title: "Approve each variance",
    step3Body: "on the next screen — this is the ONLY step that mutates on-hand quantity. Each approval is recorded as a fully-audited adjustment.",
    ounceBars: "Ounce bars",
    linesCounted: (n) => `${n} ${n === 1 ? "line" : "lines"} counted so far`,
    submitNote: "Submitting will freeze these counts and compute variances. You'll then review each variance on the next screen and approve or reject individually.",
    submitNoteStrong: "Inventory is NOT changed by submit — only by approving variances afterwards.",
    submitting: "Submitting…",
    submitForReview: "Submit count for review",
    colSystemSays: "System says",
    colCounted: "Counted",
    countFor: (name) => `Counted quantity for ${name}`,
    savedCount: (n) => `Saved (count = ${n})`,
    notCounted: "Not yet counted",
    remove: "Remove",
    countInvalid: "Counted quantity must be a non-negative integer.",
    saveFailed: "Failed to save count",
    removeFailed: "Failed to remove line",
    needOneLine: "Add at least one counted line before submitting.",
    submitFailed: "Failed to submit",
    awaitingTitle: "Variances awaiting decision",
    awaitingBody: "Each variance is described in plain words below (e.g. \"short by 2\", \"over by 1\"). Approving applies the adjustment to inventory; rejecting leaves the system knowingly different from your physical count and records the reason. Both actions are permanent and audited.",
    pendingTitle: (n) => `${n} pending variance${n !== 1 ? "s" : ""}`,
    resolvedTitle: "Already resolved",
    approveConfirm: (sentence, effect) => `Approve this variance?\n\n${sentence}\n\n${effect}\n\nThis writes a permanent adjustment to the audit ledger.`,
    approveFailed: "Approve failed",
    reasonRequired: "Reason is required (min 3 characters).",
    rejectFailed: "Reject failed",
    varianceMatch: "matches",
    varianceShort: (by) => `short by ${by}`,
    varianceOver: (by) => `over by ${by}`,
    sentenceMatch: (name, expected) => `${name}: physical count matches system (${expected}).`,
    sentenceShort: (name, expected, counted, by) => `${name}: system says ${expected}, you counted ${counted} — short by ${by}.`,
    sentenceOver: (name, expected, counted, by) => `${name}: system says ${expected}, you counted ${counted} — over by ${by}.`,
    effectNone: "No change (already matches).",
    effectDecrease: (expected, counted, by) => `Approving will decrease on-hand quantity from ${expected} to ${counted} (−${by}). A "lost / shrinkage" adjustment will be recorded.`,
    effectIncrease: (expected, counted, by) => `Approving will increase on-hand quantity from ${expected} to ${counted} (+${by}). A "found / correction" adjustment will be recorded.`,
    colItem: "Item",
    colSystemSaid: "System said",
    colVariance: "Variance",
    colVariancePlain: "Variance (plain)",
    colAction: "Action",
    colRejectReason: "Reason for rejecting",
    approve: "Approve",
    reject: "Reject",
    resPending: "Pending",
    resApproved: "Approved",
    resRejected: "Rejected",
    resNoVariance: "No variance",
    kindCoin: "Coin",
    kindOunce: "Ounce",
    rejectedTitle: (n) => `${n} variance${n !== 1 ? "s" : ""} were rejected — inventory stays knowingly different from physical count`,
    rejectedBody: "These differences were physically observed but not corrected in the system. They will continue to surface in Inventory → Reconcile as drift until a future stock-take approves an adjustment or the underlying issue is fixed.",
    approvedTitle: (n) => `${n} approved adjustment${n !== 1 ? "s" : ""}`,
    matchedTitle: (n) => `${n} matched (no variance)`,
    matchedBody: (n) => `Physical count matched system on these ${n} items — no action needed.`,
    rejectVariance: "Reject variance",
    rejectEffect: (expected, counted) => `Rejecting leaves the system at ${expected} (not ${counted}). This drift will continue to show up on Inventory → Reconcile until resolved.`,
    reasonLabel: "Reason (required, recorded in audit log)",
    reasonPlaceholder: "e.g. acceptable shrinkage, suspected miscount — investigating",
    rejecting: "Rejecting…",
  },

  orders: {
    title: "Transactions",
    exportCsv: "Export CSV",
    tabSell: "Sell",
    tabPurchases: "Supplier Purchases",
    tabBuybacks: "Buybacks",
    showing: (from, to, total) => `Showing ${from}–${to} of ${total}`,
    prev: "Prev",
    statTotalOrders: "Total Orders",
    statRevenue: "Revenue",
    statAvgOrder: "Avg Order Value",
    filterAll: "All",
    status: { COMPLETED: "completed", PARTIALLY_REFUNDED: "partially refunded", REFUNDED: "refunded", VOIDED: "voided" },
    colItems: "Items",
    emptySell: "No orders for this period",
    view: "View",
    receipt: "Receipt",
    colMode: "Mode",
    colCashDue: "Cash Due",
    colGoldDue: "Gold Due",
    purchaseMode: { CASH: "CASH", GOLD: "GOLD", MIXED: "MIXED" },
    emptyPurchases: "No supplier purchases for this period",
    colSeller: "Seller",
    colKind: "Kind",
    colKaratWeight: "Karat / Weight",
    colQty: "Qty",
    colPaid: "Paid",
    buybackKind: { PURE_GOLD: "PURE GOLD", COIN: "COIN", OUNCE: "OUNCE", USED_PRODUCT: "USED PRODUCT" },
    emptyBuybacks: "No buybacks for this period",
    cashierLine: (name) => `Cashier: ${name}`,
    customerLine: (name) => `Customer: ${name}`,
    printReceipt: "Print Receipt",
    voidOrder: "Void Order",
    voidReason: "Reason for voiding…",
    confirmVoid: "Confirm Void",
    dismiss: "Cancel",
    voidedStamp: "VOIDED",
    colItem: "Item",
    colRateAtSale: "Rate at Sale",
    itemKind: { PRODUCT: "PRODUCT", COIN: "COIN", OUNCE: "OUNCE" },
    refundedLine: (refunded, quantity, amount) => `Refunded ${refunded}/${quantity} · −${amount} to customer`,
    refund: "Refund",
    discountPct: (pct) => `Discount ${pct}%`,
    lbpEquivalent: "LBP Equivalent",
    paymentMethod: "Payment Method",
    payment: { CASH: "CASH", CARD: "CARD", MIXED: "MIXED", CREDIT: "CREDIT" },
    refundTotalsNote: "Totals reflect remaining (un-refunded) items. VAT recalculated on the new subtotal.",
    refundItem: "Refund item",
    refundQty: (max) => `Quantity to refund (max ${max})`,
    unitReturnsToStock: "This unit will be returned to stock.",
    lineWillRefund: "This line will be refunded.",
    returnedToCustomer: "Returned to customer ≈",
    refundIncl: (vatPct, discountPct) => `(incl. ${vatPct}% VAT${discountPct > 0 ? `, less ${discountPct}% discount` : ""})`,
    returnsUnits: (n) => `returns ${n} unit(s) to stock.`,
    refundFailed: "Refund failed",
    refunding: "Refunding…",
    confirmRefund: "Confirm Refund",
    voidReasonRequired: "Enter a reason for voiding this order.",
    voidFailed: "Void failed",
    voiding: "Voiding…",
  },

  deleteDialog: {
    title: "Permanently delete?",
    irreversible: (word) => `This action is ${word}. The record will be permanently removed from the database.`,
    irreversibleWord: "irreversible",
    deleting: "Deleting…",
    confirm: "Delete permanently",
  },

  products: {
    stones: "Stones",
    carats: "Carats",
    stoneCount: "Stone count",
    certificate: "Certificate #",
    stoneValue: "Stone value (USD)",
    stoneNote: "Stone note",
    stoneDetails: "Stone / Diamond Details",
    stoneCost: "Stone cost (USD)",
    hasStones: "Has diamonds / stones",
    itemCode: "Item Code",
    category: "Category",
    selectCategory: "Select a category…",
    categoryPlaceholder: "Bracelets, Rings, Necklaces…",
    karat: "Karat",
    weightGrams: "Weight (g)",
    marginPct: "Margin %",
    makingUsd: "Making (USD)",
    qtyOnHand: "Quantity on hand",
    lowStockAlert: "Low-stock alert at (optional)",
    noAlert: "No alert",
    certPlaceholder: "GIA-123456 (optional)",
    notePlaceholder: "e.g. VS1 clarity, G colour (optional)",
    productImages: "Product Images",
    uploading: "Uploading…",
    dropHint: "Click or drag images here",
    fileHint: "JPG, PNG, WEBP — max 10 MB each",
    uploadFailed: "Upload failed",
    hero: "Hero",
    setAsHero: "Set as hero",
    removePhoto: "Remove",
    saving: "Saving…",
    saveProduct: "Save Product",
    livePreview: "Live Preview",
    productName: "Product name",
    marketRate24k: "24K market rate",
    purityRate: "Purity rate",
    markup: "Markup",
    effectiveRate: "Effective rate",
    metalValue: "Metal value",
    margin: "Margin",
    makingCharge: "Making charge",
    retailPrice: "Retail Price",
    previewHint: "Enter weight and rates to see price",
    perGram: "/g",
    addProduct: "Add Product",
    newProduct: "New Product",
    searchPlaceholder: "Search by name or code…",
    allCategories: "All categories",
    colImage: "Image",
    colWeight: "Weight",
    colStock: "Stock",
    colLivePrice: "Live Price",
    usedBadge: "USED",
    status: { AVAILABLE: "AVAILABLE", SOLD: "SOLD", MELTED: "MELTED", RESERVED: "RESERVED", INACTIVE: "INACTIVE" },
    lowStock: "low",
    activate: "Activate",
    deactivate: "Deactivate",
    deleteFailed: "Delete failed",
    product: "Product",
    usedProduct: "Used Product",
    used: "Used",
    costBasis: "Cost basis",
    sourceFrom: (ref) => `from ${ref}`,
    caratUnit: "ct",
    certificateLabel: "Certificate",
    stoneValueLabel: "Stone value",
    noteLabel: "Note",
    meltTitle: "Melt this piece into a pure-gold lot",
    meltHint: (karat, weight) => `Reduces the piece to ${karat} weight ${weight}g and creates a new lot.`,
    meltOnlyWhen: (status) => `Only AVAILABLE or INACTIVE products can be melted (status: ${status}).`,
    melt: "Melt",
    meltFailed: "Melt failed",
    meltHeading: (code) => `Melt ${code}`,
    meltCurrent: (karat, weight) => `Current: ${karat} · ${weight}g.`,
    meltStatusNote: (status) => `Product status will flip to ${status}; a new lot is created.`,
    overrideWeight: "Override weight (g)",
    overrideKarat: "Override karat",
    keep: (value) => `(keep ${value})`,
    melting: "Melting…",
    confirmMelt: "Confirm melt",
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
      descriptionOn: "The books for Fawaz El Namel. Every sale, purchase, and payment is recorded here as double-entry accounting. Start with the section you need — each page explains what it's for.",
      descriptionOff: "The books for Fawaz El Namel. Auto-posting is off, so sales are not being written to the books yet — the shop's trading is recorded in the inventory ledger only. An admin can turn it on under Settings › Accounting.",
      descriptionUnknown: "The books for Fawaz El Namel. The server does not report whether sales post here automatically; check Settings › Accounting once that is available.",
      stateTitle: "Ledger state",
      entriesLabel: "Journal entries",
      chainLabel: "Chain",
      autoPostLabel: "Auto-posting",
      noEntriesYet: "No entries yet",
      couldNotVerify: "Couldn't verify",
      on: "On",
      off: "Off",
      notReported: "Not reported by the server",
      openSettings: "Open Settings",
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
    extra: {
      hintArrow: "↳",
      quarter: (n) => `Q${n}`,
      quarterLabel: "Quarter",
      vatDirection: { PAYABLE: "PAYABLE", REFUNDABLE: "REFUNDABLE", NIL: "NIL" },
      notAvailable: "n/a",
      daysSuffix: " d",
      kpiWindow: (start, end, days) => `Window: ${start} → ${end} (${days} days)`,
      moneyBalance: (debit, credit) => `Balance (USD): DR ${debit} / CR ${credit}`,
      posted: (entryNo) => `Posted ${entryNo}`,
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      periodStatus: { OPEN: "OPEN", CLOSED: "CLOSED" },
      yearClosed: (year, entryNo, opened, nextYear) => `Year ${year} closed — entry ${entryNo}. Opened ${opened} periods for ${nextYear}.`,
    },
  },
};

export default en;
