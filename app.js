const STORAGE_KEY = "personal-price-history-v1";
const RATE_STORAGE_KEY = "personal-price-history-rate-v1";
const DEFAULT_RATE = 5.35;

const CURRENCIES = {
  CNY: { label: "人民币 CNY", symbol: "¥" },
  SGD: { label: "新加坡币 SGD", symbol: "S$" },
};

const DEFAULT_CATEGORIES = [
  "食品饮料",
  "生鲜冷冻",
  "零食甜品",
  "日常用品",
  "清洁用品",
  "个护美妆",
  "家居厨房",
  "服饰鞋包",
  "数码电器",
  "药品保健",
  "宠物用品",
  "交通出行",
  "订阅服务",
  "其他",
];

const DEFAULT_UNITS = [
  "件",
  "个",
  "包",
  "盒",
  "瓶",
  "袋",
  "罐",
  "条",
  "支",
  "片",
  "卷",
  "kg",
  "g",
  "L",
  "ml",
  "lb",
  "oz",
  "次",
  "月",
];

const state = {
  records: [],
  search: "",
  category: "",
  sort: "recent-desc",
  selectedGroupKey: "",
  displayCurrency: "CNY",
  rate: {
    value: DEFAULT_RATE,
    source: "默认值",
    updatedAt: "",
  },
};

const amountFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const elements = {
  form: document.querySelector("#recordForm"),
  formTitle: document.querySelector("#formTitle"),
  recordId: document.querySelector("#recordId"),
  date: document.querySelector("#dateInput"),
  product: document.querySelector("#productInput"),
  brand: document.querySelector("#brandInput"),
  store: document.querySelector("#storeInput"),
  category: document.querySelector("#categoryInput"),
  categoryPreset: document.querySelector("#categoryPresetInput"),
  categoryCustom: document.querySelector("#categoryCustomInput"),
  categoryCustomField: document.querySelector("#categoryCustomField"),
  price: document.querySelector("#priceInput"),
  currency: document.querySelector("#currencyInput"),
  quantity: document.querySelector("#quantityInput"),
  unit: document.querySelector("#unitInput"),
  unitPreset: document.querySelector("#unitPresetInput"),
  unitCustom: document.querySelector("#unitCustomInput"),
  unitCustomField: document.querySelector("#unitCustomField"),
  discount: document.querySelector("#discountInput"),
  note: document.querySelector("#noteInput"),
  saveButton: document.querySelector("#saveButton"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  liveUnitPrice: document.querySelector("#liveUnitPrice"),
  groupsBody: document.querySelector("#groupsBody"),
  groupTemplate: document.querySelector("#groupRowTemplate"),
  detailTemplate: document.querySelector("#detailRowTemplate"),
  emptyState: document.querySelector("#emptyState"),
  search: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  sort: document.querySelector("#sortSelect"),
  productDetail: document.querySelector("#productDetail"),
  detailTitle: document.querySelector("#detailTitle"),
  detailMeta: document.querySelector("#detailMeta"),
  detailStats: document.querySelector("#detailStats"),
  detailRecordsBody: document.querySelector("#detailRecordsBody"),
  addForProduct: document.querySelector("#addForProductButton"),
  closeDetail: document.querySelector("#closeDetailButton"),
  statsGrid: document.querySelector("#statsGrid"),
  compareProduct: document.querySelector("#compareProductInput"),
  currentPrice: document.querySelector("#currentPriceInput"),
  currentCurrency: document.querySelector("#currentCurrencyInput"),
  currentQuantity: document.querySelector("#currentQuantityInput"),
  currentUnit: document.querySelector("#currentUnitInput"),
  currentUnitPreset: document.querySelector("#currentUnitPresetInput"),
  currentUnitCustom: document.querySelector("#currentUnitCustomInput"),
  currentUnitCustomField: document.querySelector("#currentUnitCustomField"),
  comparisonResult: document.querySelector("#comparisonResult"),
  rateSummary: document.querySelector("#rateSummary"),
  rateStatus: document.querySelector("#rateStatus"),
  rateInput: document.querySelector("#rateInput"),
  refreshRate: document.querySelector("#refreshRateButton"),
  displayCurrency: document.querySelector("#displayCurrencyInput"),
  productList: document.querySelector("#productList"),
  brandList: document.querySelector("#brandList"),
  storeList: document.querySelector("#storeList"),
  categoryList: document.querySelector("#categoryList"),
  unitList: document.querySelector("#unitList"),
  exportCsv: document.querySelector("#exportCsvButton"),
  exportJson: document.querySelector("#exportJsonButton"),
  importFile: document.querySelector("#importFile"),
};

let configuredCategoryOptions = [];

function todayString() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `record-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cleanText(value) {
  return String(value || "").trim();
}

function compactText(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, "");
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeCurrency(value) {
  const currency = cleanText(value).toUpperCase();
  return currency === "SGD" ? "SGD" : "CNY";
}

function getInitialCategoryOptions() {
  return [...elements.categoryPreset.querySelectorAll("option")]
    .map((option) => cleanText(option.value))
    .filter((value) => value && value !== "__custom");
}

function getBaseCategories() {
  return configuredCategoryOptions.length
    ? configuredCategoryOptions
    : DEFAULT_CATEGORIES;
}

function getKnownCategories() {
  const configuredCategories = getBaseCategories();
  const savedCategories = state.records
    .map((record) => record.category)
    .filter(Boolean)
    .filter((category) => !configuredCategories.includes(category))
    .sort((a, b) => a.localeCompare(b, "zh-CN"));
  return [...new Set(configuredCategories), ...new Set(savedCategories)];
}

function rebuildCategoryPresetOptions() {
  const currentValue = cleanText(elements.category.value);
  const categories = getKnownCategories();
  elements.categoryPreset.textContent = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "选择分类";
  elements.categoryPreset.append(placeholder);

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.categoryPreset.append(option);
  });

  const custom = document.createElement("option");
  custom.value = "__custom";
  custom.textContent = "自定义分类...";
  elements.categoryPreset.append(custom);

  setCategoryControl(currentValue);
}

function syncCategoryFromControls() {
  if (elements.categoryPreset.value === "__custom") {
    elements.category.value = cleanText(elements.categoryCustom.value);
    elements.categoryCustomField.classList.remove("hidden");
    return;
  }

  elements.category.value = elements.categoryPreset.value;
  elements.categoryCustom.value = "";
  elements.categoryCustomField.classList.add("hidden");
}

function setCategoryControl(value) {
  const category = cleanText(value);
  const knownCategories = getKnownCategories();

  elements.category.value = category;
  if (!category) {
    elements.categoryPreset.value = "";
    elements.categoryCustom.value = "";
    elements.categoryCustomField.classList.add("hidden");
    return;
  }

  if (knownCategories.includes(category)) {
    elements.categoryPreset.value = category;
    elements.categoryCustom.value = "";
    elements.categoryCustomField.classList.add("hidden");
    return;
  }

  elements.categoryPreset.value = "__custom";
  elements.categoryCustom.value = category;
  elements.categoryCustomField.classList.remove("hidden");
}

function getKnownUnits() {
  const savedUnits = state.records
    .map((record) => record.unit)
    .filter(Boolean)
    .filter((unit) => !DEFAULT_UNITS.includes(unit))
    .sort((a, b) => a.localeCompare(b, "zh-CN"));
  return [...DEFAULT_UNITS, ...new Set(savedUnits)];
}

function rebuildUnitSelect(select, currentValue = "") {
  const units = getKnownUnits();
  select.textContent = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "选择单位";
  select.append(placeholder);

  units.forEach((unit) => {
    const option = document.createElement("option");
    option.value = unit;
    option.textContent = unit;
    select.append(option);
  });

  const custom = document.createElement("option");
  custom.value = "__custom";
  custom.textContent = "自定义单位...";
  select.append(custom);

  if (currentValue && units.includes(currentValue)) {
    select.value = currentValue;
  }
}

function rebuildUnitPresetOptions() {
  const unit = cleanText(elements.unit.value) || "件";
  const currentUnit = cleanText(elements.currentUnit.value) || unit;
  rebuildUnitSelect(elements.unitPreset, unit);
  rebuildUnitSelect(elements.currentUnitPreset, currentUnit);
  setUnitControl(unit);
  setCurrentUnitControl(currentUnit);
}

function syncUnitFromControls() {
  if (elements.unitPreset.value === "__custom") {
    elements.unit.value = cleanText(elements.unitCustom.value);
    elements.unitCustomField.classList.remove("hidden");
    return;
  }

  elements.unit.value = elements.unitPreset.value || "件";
  elements.unitCustom.value = "";
  elements.unitCustomField.classList.add("hidden");
}

function setUnitControl(value) {
  const unit = cleanText(value) || "件";
  const knownUnits = getKnownUnits();

  elements.unit.value = unit;
  if (knownUnits.includes(unit)) {
    elements.unitPreset.value = unit;
    elements.unitCustom.value = "";
    elements.unitCustomField.classList.add("hidden");
    return;
  }

  elements.unitPreset.value = "__custom";
  elements.unitCustom.value = unit;
  elements.unitCustomField.classList.remove("hidden");
}

function syncCurrentUnitFromControls() {
  if (elements.currentUnitPreset.value === "__custom") {
    elements.currentUnit.value = cleanText(elements.currentUnitCustom.value);
    elements.currentUnitCustomField.classList.remove("hidden");
    return;
  }

  elements.currentUnit.value = elements.currentUnitPreset.value || "件";
  elements.currentUnitCustom.value = "";
  elements.currentUnitCustomField.classList.add("hidden");
}

function setCurrentUnitControl(value) {
  const unit = cleanText(value) || "件";
  const knownUnits = getKnownUnits();

  elements.currentUnit.value = unit;
  if (knownUnits.includes(unit)) {
    elements.currentUnitPreset.value = unit;
    elements.currentUnitCustom.value = "";
    elements.currentUnitCustomField.classList.add("hidden");
    return;
  }

  elements.currentUnitPreset.value = "__custom";
  elements.currentUnitCustom.value = unit;
  elements.currentUnitCustomField.classList.remove("hidden");
}

function groupKeyOf(record) {
  return [
    compactText(record.product),
    compactText(record.brand),
    compactText(record.unit),
  ].join("|");
}

function nativeUnitPriceOf(record) {
  const quantity = toNumber(record.quantity, 1);
  const price = toNumber(record.price, 0);
  return quantity > 0 ? price / quantity : price;
}

function convertAmount(amount, fromCurrency, toCurrency = state.displayCurrency) {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  const rate = toNumber(state.rate.value, DEFAULT_RATE);

  if (!Number.isFinite(amount)) {
    return NaN;
  }
  if (from === to) {
    return amount;
  }
  if (from === "SGD" && to === "CNY") {
    return amount * rate;
  }
  return amount / rate;
}

function displayUnitPriceOf(record, displayCurrency = state.displayCurrency) {
  return convertAmount(nativeUnitPriceOf(record), record.currency, displayCurrency);
}

function formatMoney(value, currency = state.displayCurrency) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  const normalized = normalizeCurrency(currency);
  return `${CURRENCIES[normalized].symbol}${amountFormatter.format(value)}`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return dateFormatter.format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function saveRate() {
  localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(state.rate));
}

function loadRate() {
  try {
    const saved = JSON.parse(localStorage.getItem(RATE_STORAGE_KEY) || "null");
    if (saved && toNumber(saved.value, 0) > 0) {
      state.rate = {
        value: toNumber(saved.value, DEFAULT_RATE),
        source: cleanText(saved.source) || "缓存",
        updatedAt: cleanText(saved.updatedAt),
      };
    }
  } catch {
    state.rate.value = DEFAULT_RATE;
  }
}

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    state.records = Array.isArray(saved) ? saved.map(normalizeRecord) : [];
  } catch {
    state.records = [];
  }
}

function normalizeRecord(record) {
  return {
    id: cleanText(record.id) || createId(),
    date: cleanText(record.date) || todayString(),
    product: cleanText(record.product),
    brand: cleanText(record.brand),
    store: cleanText(record.store),
    category: cleanText(record.category),
    price: toNumber(record.price),
    currency: normalizeCurrency(record.currency),
    quantity: toNumber(record.quantity, 1) || 1,
    unit: cleanText(record.unit) || "件",
    discount: cleanText(record.discount),
    note: cleanText(record.note),
    createdAt: cleanText(record.createdAt) || new Date().toISOString(),
    updatedAt: cleanText(record.updatedAt) || new Date().toISOString(),
  };
}

function getFormRecord() {
  syncCategoryFromControls();
  syncUnitFromControls();
  const existing = state.records.find(
    (record) => record.id === elements.recordId.value,
  );

  return normalizeRecord({
    id: elements.recordId.value || createId(),
    date: elements.date.value,
    product: elements.product.value,
    brand: elements.brand.value,
    store: elements.store.value,
    category: elements.category.value,
    price: elements.price.value,
    currency: elements.currency.value,
    quantity: elements.quantity.value,
    unit: elements.unit.value,
    discount: elements.discount.value,
    note: elements.note.value,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function resetForm() {
  elements.form.reset();
  elements.recordId.value = "";
  elements.date.value = todayString();
  elements.currency.value = state.displayCurrency;
  elements.quantity.value = "1";
  setUnitControl("件");
  setCategoryControl("");
  elements.formTitle.textContent = "买过的价格";
  elements.saveButton.textContent = "保存记录";
  elements.cancelEditButton.classList.add("hidden");
  updateLiveUnitPrice();
}

function fillFormFromGroup(group) {
  elements.recordId.value = "";
  elements.date.value = todayString();
  elements.product.value = group.product;
  elements.brand.value = group.brand;
  setCategoryControl(group.category);
  elements.store.value = "";
  elements.price.value = "";
  elements.currency.value = state.displayCurrency;
  elements.quantity.value = "1";
  setUnitControl(group.unit || "件");
  elements.discount.value = "";
  elements.note.value = "";
  elements.formTitle.textContent = `新增购买：${group.product}`;
  elements.saveButton.textContent = "保存这次购买";
  elements.cancelEditButton.classList.remove("hidden");
  updateLiveUnitPrice();
  elements.price.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleFormSubmit(event) {
  event.preventDefault();
  const nextRecord = getFormRecord();

  if (!nextRecord.product || nextRecord.price < 0 || nextRecord.quantity <= 0) {
    return;
  }

  const existingIndex = state.records.findIndex(
    (record) => record.id === nextRecord.id,
  );

  if (existingIndex >= 0) {
    state.records[existingIndex] = nextRecord;
  } else {
    state.records.unshift(nextRecord);
  }

  state.selectedGroupKey = groupKeyOf(nextRecord);
  saveRecords();
  resetForm();
  render();
}

function editRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) {
    return;
  }

  elements.recordId.value = record.id;
  elements.date.value = record.date;
  elements.product.value = record.product;
  elements.brand.value = record.brand;
  elements.store.value = record.store;
  setCategoryControl(record.category);
  elements.price.value = record.price;
  elements.currency.value = record.currency;
  elements.quantity.value = record.quantity;
  setUnitControl(record.unit);
  elements.discount.value = record.discount;
  elements.note.value = record.note;
  elements.formTitle.textContent = "编辑购买记录";
  elements.saveButton.textContent = "更新记录";
  elements.cancelEditButton.classList.remove("hidden");
  updateLiveUnitPrice();
  elements.price.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function duplicateRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) {
    return;
  }

  const nextRecord = normalizeRecord({
    ...record,
    id: createId(),
    date: todayString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  state.records.unshift(nextRecord);
  state.selectedGroupKey = groupKeyOf(nextRecord);
  saveRecords();
  render();
}

function deleteRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) {
    return;
  }

  const confirmed = window.confirm(`删除「${record.product}」这次购买记录吗？`);
  if (!confirmed) {
    return;
  }

  const selectedKey = groupKeyOf(record);
  state.records = state.records.filter((item) => item.id !== id);

  if (!state.records.some((item) => groupKeyOf(item) === selectedKey)) {
    state.selectedGroupKey = "";
  }

  saveRecords();
  render();
}

function matchesSearch(record, terms) {
  const haystack = [
    record.product,
    record.brand,
    record.store,
    record.category,
    record.discount,
    record.note,
    record.currency,
  ]
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

function buildGroups(records = state.records) {
  const groups = new Map();

  records.forEach((record) => {
    const key = groupKeyOf(record);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        product: record.product,
        brand: record.brand,
        unit: record.unit,
        category: record.category,
        records: [],
      });
    }
    groups.get(key).records.push(record);
  });

  return [...groups.values()].map((group) => {
    const sorted = group.records
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
    const prices = group.records.map((record) => displayUnitPriceOf(record));
    const total = prices.reduce((sum, value) => sum + value, 0);
    const bestRecord = group.records
      .slice()
      .sort((a, b) => displayUnitPriceOf(a) - displayUnitPriceOf(b))[0];
    const latestRecord = sorted[0];

    return {
      ...group,
      records: sorted,
      count: group.records.length,
      bestRecord,
      latestRecord,
      lowestUnit: bestRecord ? displayUnitPriceOf(bestRecord) : NaN,
      averageUnit: prices.length ? total / prices.length : NaN,
      category: latestRecord?.category || group.category,
    };
  });
}

function getFilteredGroups() {
  const terms = state.search
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return buildGroups()
    .filter((group) => {
      const categoryMatches =
        !state.category ||
        group.records.some((record) => record.category === state.category);
      const termsMatch =
        !terms.length ||
        group.records.some((record) => matchesSearch(record, terms));
      return categoryMatches && termsMatch;
    })
    .sort((a, b) => {
      if (state.sort === "unit-asc") {
        return a.lowestUnit - b.lowestUnit;
      }
      if (state.sort === "unit-desc") {
        return b.lowestUnit - a.lowestUnit;
      }
      if (state.sort === "name-asc") {
        return a.product.localeCompare(b.product, "zh-CN");
      }
      if (state.sort === "count-desc") {
        return b.count - a.count;
      }
      return b.latestRecord.date.localeCompare(a.latestRecord.date);
    });
}

function findGroup(key) {
  return buildGroups().find((group) => group.key === key);
}

function createTextButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

function selectGroup(key) {
  state.selectedGroupKey = key;
  const group = findGroup(key);
  if (group) {
    elements.compareProduct.value = group.product;
    setCurrentUnitControl(group.unit || "件");
  }
  render();
}

function renderGroups(groups) {
  elements.groupsBody.textContent = "";
  elements.emptyState.classList.toggle("visible", groups.length === 0);

  groups.forEach((group) => {
    const row = elements.groupTemplate.content.firstElementChild.cloneNode(true);
    const cells = row.querySelectorAll("td");
    const selected = group.key === state.selectedGroupKey;

    row.classList.toggle("selected", selected);
    row.addEventListener("click", () => selectGroup(group.key));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectGroup(group.key);
      }
    });

    cells[0].className = "product-cell";
    cells[0].innerHTML = `<strong></strong><span></span>`;
    cells[0].querySelector("strong").textContent = group.product;
    cells[0].querySelector("span").textContent = [
      group.brand || "无品牌/规格",
      group.category,
      group.unit,
    ]
      .filter(Boolean)
      .join(" · ");
    cells[1].textContent = `${group.count} 次`;
    cells[2].className = "price-cell";
    cells[2].innerHTML = `<strong></strong><span></span>`;
    cells[2].querySelector("strong").textContent =
      `${formatMoney(group.lowestUnit)} / ${group.unit}`;
    cells[2].querySelector("span").textContent = group.bestRecord
      ? `${formatDate(group.bestRecord.date)} ${group.bestRecord.store || ""}`.trim()
      : "";
    cells[3].textContent = `${formatMoney(group.averageUnit)} / ${group.unit}`;
    cells[4].textContent = formatDate(group.latestRecord.date);
    cells[5].append(
      createTextButton("查看", "text-button", () => selectGroup(group.key)),
      createTextButton("新增", "text-button", () => fillFormFromGroup(group)),
    );

    elements.groupsBody.append(row);
  });
}

function renderDetail(group) {
  elements.productDetail.classList.toggle("hidden", !group);
  elements.detailRecordsBody.textContent = "";
  elements.detailStats.textContent = "";

  if (!group) {
    return;
  }

  elements.detailTitle.textContent = group.product;
  elements.detailMeta.textContent = [
    group.brand || "无品牌/规格",
    group.category,
    `单位：${group.unit}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const stats = [
    ["购买次数", `${group.count} 次`],
    ["最低单价", `${formatMoney(group.lowestUnit)} / ${group.unit}`],
    ["平均单价", `${formatMoney(group.averageUnit)} / ${group.unit}`],
    ["最近购买", formatDate(group.latestRecord.date)],
  ];

  stats.forEach(([label, value]) => {
    const article = document.createElement("article");
    const span = document.createElement("span");
    const strong = document.createElement("strong");
    span.textContent = label;
    strong.textContent = value;
    article.append(span, strong);
    elements.detailStats.append(article);
  });

  group.records.forEach((record) => {
    const row = elements.detailTemplate.content.firstElementChild.cloneNode(true);
    const cells = row.querySelectorAll("td");
    const displayUnit = displayUnitPriceOf(record);

    cells[0].textContent = formatDate(record.date);
    cells[1].textContent = record.store || "-";
    cells[2].className = "price-cell";
    cells[2].innerHTML = `<strong></strong><span></span>`;
    cells[2].querySelector("strong").textContent = formatMoney(
      record.price,
      record.currency,
    );
    cells[2].querySelector("span").textContent =
      record.currency === state.displayCurrency
        ? ""
        : `约 ${formatMoney(convertAmount(record.price, record.currency))}`;
    cells[3].textContent = `${record.quantity} ${record.unit}`;
    cells[4].textContent = `${formatMoney(displayUnit)} / ${record.unit}`;
    cells[5].className = "discount-cell";
    cells[5].textContent = record.discount || record.note || "-";
    cells[6].append(
      createTextButton("编辑", "text-button", () => editRecord(record.id)),
      createTextButton("复制", "text-button", () => duplicateRecord(record.id)),
      createTextButton("删除", "danger-button", () => deleteRecord(record.id)),
    );

    elements.detailRecordsBody.append(row);
  });

  elements.addForProduct.onclick = () => fillFormFromGroup(group);
}

function getProductMatches(productText) {
  const query = compactText(productText);
  if (!query) {
    return [];
  }

  return state.records.filter((record) =>
    [record.product, record.brand, record.category]
      .map(compactText)
      .join(" ")
      .includes(query),
  );
}

function renderStats(records) {
  const prices = records.map((record) => displayUnitPriceOf(record));
  const lowest = prices.length ? Math.min(...prices) : null;
  const average = prices.length
    ? prices.reduce((sum, value) => sum + value, 0) / prices.length
    : null;
  const latest = records
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const unit = records[0]?.unit || "";

  const stats = [
    ["购买次数", String(records.length)],
    ["最低单价", lowest === null ? "-" : `${formatMoney(lowest)} / ${unit}`],
    ["平均单价", average === null ? "-" : `${formatMoney(average)} / ${unit}`],
    ["最近购买", latest ? formatDate(latest.date) : "-"],
  ];

  elements.statsGrid.querySelectorAll("article").forEach((article, index) => {
    const [label, value] = stats[index];
    article.querySelector("span").textContent = label;
    article.querySelector("strong").textContent = value;
  });
}

function updateComparison() {
  syncCurrentUnitFromControls();
  const productText = elements.compareProduct.value || state.search;
  const matches = getProductMatches(productText);
  const currentPrice = toNumber(elements.currentPrice.value, NaN);
  const currentCurrency = normalizeCurrency(elements.currentCurrency.value);
  const currentQuantity = toNumber(elements.currentQuantity.value, NaN);
  const currentUnit =
    cleanText(elements.currentUnit.value) || matches[0]?.unit || "件";

  renderStats(productText ? matches : state.records);

  elements.comparisonResult.className = "comparison-result";

  if (!productText) {
    elements.comparisonResult.textContent = "先搜索商品，再输入这次促销的实付价。";
    return;
  }

  if (!matches.length) {
    elements.comparisonResult.textContent =
      "这个商品还没有历史记录，可以先保存一次购买价格。";
    return;
  }

  const best = matches
    .slice()
    .sort((a, b) => displayUnitPriceOf(a) - displayUnitPriceOf(b))[0];
  const bestUnitPrice = displayUnitPriceOf(best);

  if (
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(currentQuantity) ||
    currentQuantity <= 0
  ) {
    elements.comparisonResult.textContent =
      `历史最低是 ${formatMoney(bestUnitPrice)} / ${best.unit}，来自 ${formatDate(best.date)}${best.store ? ` · ${best.store}` : ""}。`;
    return;
  }

  const currentNativeUnitPrice = currentPrice / currentQuantity;
  const currentDisplayUnitPrice = convertAmount(
    currentNativeUnitPrice,
    currentCurrency,
  );
  const difference = currentDisplayUnitPrice - bestUnitPrice;
  const percent =
    bestUnitPrice > 0 ? Math.abs(difference / bestUnitPrice) * 100 : 0;

  if (difference < -0.005) {
    elements.comparisonResult.classList.add("good");
    elements.comparisonResult.textContent =
      `这次更划算：当前约 ${formatMoney(currentDisplayUnitPrice)} / ${currentUnit}，比历史最低低 ${percent.toFixed(1)}%。`;
    return;
  }

  if (difference > 0.005) {
    elements.comparisonResult.classList.add("bad");
    elements.comparisonResult.textContent =
      `这次还不算最低：当前约 ${formatMoney(currentDisplayUnitPrice)} / ${currentUnit}，比历史最低高 ${percent.toFixed(1)}%。`;
    return;
  }

  elements.comparisonResult.textContent =
    `这次接近历史最低：当前约 ${formatMoney(currentDisplayUnitPrice)} / ${currentUnit}。`;
}

function renderLists() {
  const listTargets = [
    [elements.productList, state.records.map((record) => record.product)],
    [elements.brandList, state.records.map((record) => record.brand)],
    [elements.storeList, state.records.map((record) => record.store)],
    [
      elements.categoryList,
      [...getBaseCategories(), ...state.records.map((record) => record.category)],
    ],
    [elements.unitList, [...DEFAULT_UNITS, ...state.records.map((record) => record.unit)]],
  ];

  listTargets.forEach(([list, values]) => {
    list.textContent = "";
    [...new Set(values.filter(Boolean).sort((a, b) => a.localeCompare(b, "zh-CN")))]
      .slice(0, 80)
      .forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        list.append(option);
      });
  });

  const currentCategory = state.category;
  rebuildCategoryPresetOptions();
  rebuildUnitPresetOptions();
  elements.categoryFilter.innerHTML = `<option value="">全部分类</option>`;
  [...new Set(state.records.map((record) => record.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      elements.categoryFilter.append(option);
    });
  elements.categoryFilter.value = currentCategory;
}

function renderRate() {
  const value = toNumber(state.rate.value, DEFAULT_RATE);
  const updated = formatDateTime(state.rate.updatedAt);
  elements.rateInput.value = value ? value.toFixed(4) : "";
  elements.displayCurrency.value = state.displayCurrency;
  elements.rateSummary.textContent = `SGD/CNH ${value.toFixed(4)}`;
  elements.rateStatus.textContent = updated
    ? `${state.rate.source} · ${updated}`
    : `${state.rate.source}`;
}

function render() {
  renderLists();
  renderRate();

  const groups = getFilteredGroups();
  if (
    state.selectedGroupKey &&
    !buildGroups().some((group) => group.key === state.selectedGroupKey)
  ) {
    state.selectedGroupKey = "";
  }

  const selectedGroup = state.selectedGroupKey
    ? findGroup(state.selectedGroupKey)
    : null;
  renderGroups(groups);
  renderDetail(selectedGroup);
  updateComparison();
}

function updateLiveUnitPrice() {
  const price = toNumber(elements.price.value, NaN);
  const quantity = toNumber(elements.quantity.value, NaN);
  const unit = cleanText(elements.unit.value) || "单位";
  const currency = normalizeCurrency(elements.currency.value);

  if (!Number.isFinite(price) || !Number.isFinite(quantity) || quantity <= 0) {
    elements.liveUnitPrice.textContent = "单价会在保存后自动计算。";
    return;
  }

  const nativeUnit = price / quantity;
  const convertedUnit = convertAmount(nativeUnit, currency);
  const convertedText =
    currency === state.displayCurrency
      ? ""
      : ` · 约 ${formatMoney(convertedUnit)} / ${unit}`;
  elements.liveUnitPrice.textContent =
    `预计单价：${formatMoney(nativeUnit, currency)} / ${unit}${convertedText}`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportJson() {
  const content = JSON.stringify(
    {
      records: state.records,
      rate: state.rate,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
  downloadFile(`price-history-${todayString()}.json`, content, "application/json");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function exportCsv() {
  const headers = [
    "date",
    "product",
    "brand",
    "store",
    "category",
    "price",
    "currency",
    "quantity",
    "unit",
    "unitPrice",
    "displayCurrency",
    "displayUnitPrice",
    "discount",
    "note",
  ];
  const rows = state.records.map((record) =>
    headers
      .map((key) => {
        if (key === "unitPrice") {
          return csvEscape(nativeUnitPriceOf(record).toFixed(4));
        }
        if (key === "displayCurrency") {
          return csvEscape(state.displayCurrency);
        }
        if (key === "displayUnitPrice") {
          return csvEscape(displayUnitPriceOf(record).toFixed(4));
        }
        return csvEscape(record[key]);
      })
      .join(","),
  );
  downloadFile(
    `price-history-${todayString()}.csv`,
    [headers.join(","), ...rows].join("\n"),
    "text/csv;charset=utf-8",
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows.filter((items) => items.some((item) => item.trim()));
}

function recordsFromCsv(text) {
  const [headerRow, ...rows] = parseCsv(text);
  if (!headerRow) {
    return [];
  }
  const headers = headerRow.map((header) => header.trim());
  return rows.map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || "";
    });
    return normalizeRecord(record);
  });
}

async function importFile(file) {
  const text = await file.text();
  const parsed = file.name.toLowerCase().endsWith(".json")
    ? JSON.parse(text)
    : recordsFromCsv(text);
  const importedRecords = Array.isArray(parsed)
    ? parsed.map(normalizeRecord)
    : Array.isArray(parsed.records)
      ? parsed.records.map(normalizeRecord)
      : [];

  if (!importedRecords.length) {
    throw new Error("No records");
  }

  if (!Array.isArray(parsed) && parsed.rate?.value) {
    state.rate = {
      value: toNumber(parsed.rate.value, state.rate.value),
      source: cleanText(parsed.rate.source) || "导入",
      updatedAt: cleanText(parsed.rate.updatedAt),
    };
    saveRate();
  }

  const byId = new Map(state.records.map((record) => [record.id, record]));
  importedRecords.forEach((record) => byId.set(record.id, record));
  state.records = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
  saveRecords();
  render();
}

function extractYahooRate(data) {
  const result = data?.chart?.result?.[0];
  const metaPrice = toNumber(result?.meta?.regularMarketPrice, NaN);
  if (Number.isFinite(metaPrice) && metaPrice > 0) {
    return metaPrice;
  }

  const closes = result?.indicators?.quote?.[0]?.close || [];
  const latest = closes.filter((value) => Number.isFinite(value)).pop();
  if (Number.isFinite(latest) && latest > 0) {
    return latest;
  }

  throw new Error("No rate");
}

async function fetchYahooRate(symbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Rate request failed");
  }
  return extractYahooRate(await response.json());
}

async function refreshRate({ silent = false } = {}) {
  if (!silent) {
    elements.rateStatus.textContent = "正在刷新汇率...";
  }

  try {
    const value = await fetchYahooRate("SGDCNH=X");
    state.rate = {
      value,
      source: "Yahoo Finance SGDCNH=X",
      updatedAt: new Date().toISOString(),
    };
  } catch {
    try {
      const value = await fetchYahooRate("SGDCNY=X");
      state.rate = {
        value,
        source: "Yahoo Finance SGDCNY=X",
        updatedAt: new Date().toISOString(),
      };
    } catch {
      if (!silent) {
        elements.rateStatus.textContent = "自动刷新失败，已保留当前汇率。";
      }
      return;
    }
  }

  saveRate();
  render();
}

function bindEvents() {
  elements.form.addEventListener("submit", handleFormSubmit);
  elements.cancelEditButton.addEventListener("click", resetForm);
  [elements.price, elements.quantity, elements.unit, elements.currency].forEach(
    (element) => {
      element.addEventListener("input", updateLiveUnitPrice);
      element.addEventListener("change", updateLiveUnitPrice);
    },
  );

  elements.unitPreset.addEventListener("change", () => {
    syncUnitFromControls();
    updateLiveUnitPrice();
    if (elements.unitPreset.value === "__custom") {
      elements.unitCustom.focus();
    }
  });

  elements.unitCustom.addEventListener("input", () => {
    syncUnitFromControls();
    updateLiveUnitPrice();
  });

  elements.categoryPreset.addEventListener("change", () => {
    syncCategoryFromControls();
    if (elements.categoryPreset.value === "__custom") {
      elements.categoryCustom.focus();
    }
  });

  elements.categoryCustom.addEventListener("input", syncCategoryFromControls);

  elements.search.addEventListener("input", () => {
    state.search = elements.search.value;
    if (!elements.compareProduct.value) {
      elements.compareProduct.value = state.search;
    }
    render();
  });

  elements.categoryFilter.addEventListener("change", () => {
    state.category = elements.categoryFilter.value;
    render();
  });

  elements.sort.addEventListener("change", () => {
    state.sort = elements.sort.value;
    render();
  });

  elements.closeDetail.addEventListener("click", () => {
    state.selectedGroupKey = "";
    render();
  });

  [
    elements.compareProduct,
    elements.currentPrice,
    elements.currentCurrency,
    elements.currentQuantity,
    elements.currentUnit,
    elements.currentUnitPreset,
    elements.currentUnitCustom,
  ].forEach((element) => {
    element.addEventListener("input", updateComparison);
    element.addEventListener("change", updateComparison);
  });

  elements.currentUnitPreset.addEventListener("change", () => {
    syncCurrentUnitFromControls();
    updateComparison();
    if (elements.currentUnitPreset.value === "__custom") {
      elements.currentUnitCustom.focus();
    }
  });

  elements.currentUnitCustom.addEventListener("input", () => {
    syncCurrentUnitFromControls();
    updateComparison();
  });

  elements.displayCurrency.addEventListener("change", () => {
    state.displayCurrency = elements.displayCurrency.value;
    elements.currency.value = state.displayCurrency;
    elements.currentCurrency.value = state.displayCurrency;
    updateLiveUnitPrice();
    render();
  });

  elements.rateInput.addEventListener("change", () => {
    const value = toNumber(elements.rateInput.value, 0);
    if (value <= 0) {
      renderRate();
      return;
    }
    state.rate = {
      value,
      source: "手动输入",
      updatedAt: new Date().toISOString(),
    };
    saveRate();
    render();
  });

  elements.refreshRate.addEventListener("click", () => refreshRate());
  elements.exportJson.addEventListener("click", exportJson);
  elements.exportCsv.addEventListener("click", exportCsv);
  elements.importFile.addEventListener("change", async () => {
    const [file] = elements.importFile.files;
    if (!file) {
      return;
    }
    try {
      await importFile(file);
    } catch {
      window.alert("导入失败，请确认文件来自这个网页导出的 JSON 或 CSV。");
    } finally {
      elements.importFile.value = "";
    }
  });
}

function init() {
  elements.date.value = todayString();
  configuredCategoryOptions = getInitialCategoryOptions();
  loadRate();
  loadRecords();
  bindEvents();
  resetForm();
  elements.displayCurrency.value = state.displayCurrency;
  elements.currentCurrency.value = state.displayCurrency;
  render();
  refreshRate({ silent: true });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

init();
