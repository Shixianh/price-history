const STORAGE_KEY = "personal-price-history-v1";

const state = {
  records: [],
  search: "",
  category: "",
  sort: "date-desc",
};

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
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
  price: document.querySelector("#priceInput"),
  quantity: document.querySelector("#quantityInput"),
  unit: document.querySelector("#unitInput"),
  discount: document.querySelector("#discountInput"),
  note: document.querySelector("#noteInput"),
  saveButton: document.querySelector("#saveButton"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  liveUnitPrice: document.querySelector("#liveUnitPrice"),
  recordsBody: document.querySelector("#recordsBody"),
  rowTemplate: document.querySelector("#recordRowTemplate"),
  emptyState: document.querySelector("#emptyState"),
  search: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  sort: document.querySelector("#sortSelect"),
  statsGrid: document.querySelector("#statsGrid"),
  compareProduct: document.querySelector("#compareProductInput"),
  currentPrice: document.querySelector("#currentPriceInput"),
  currentQuantity: document.querySelector("#currentQuantityInput"),
  currentUnit: document.querySelector("#currentUnitInput"),
  comparisonResult: document.querySelector("#comparisonResult"),
  productList: document.querySelector("#productList"),
  storeList: document.querySelector("#storeList"),
  categoryList: document.querySelector("#categoryList"),
  exportCsv: document.querySelector("#exportCsvButton"),
  exportJson: document.querySelector("#exportJsonButton"),
  importFile: document.querySelector("#importFile"),
};

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

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function unitPriceOf(record) {
  const quantity = toNumber(record.quantity, 1);
  const price = toNumber(record.price, 0);
  return quantity > 0 ? price / quantity : price;
}

function formatMoney(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return currencyFormatter.format(value);
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

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
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
    quantity: toNumber(record.quantity, 1) || 1,
    unit: cleanText(record.unit) || "件",
    discount: cleanText(record.discount),
    note: cleanText(record.note),
    createdAt: cleanText(record.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getFormRecord() {
  return normalizeRecord({
    id: elements.recordId.value || createId(),
    date: elements.date.value,
    product: elements.product.value,
    brand: elements.brand.value,
    store: elements.store.value,
    category: elements.category.value,
    price: elements.price.value,
    quantity: elements.quantity.value,
    unit: elements.unit.value,
    discount: elements.discount.value,
    note: elements.note.value,
    createdAt:
      state.records.find((record) => record.id === elements.recordId.value)
        ?.createdAt || new Date().toISOString(),
  });
}

function resetForm() {
  elements.form.reset();
  elements.recordId.value = "";
  elements.date.value = todayString();
  elements.quantity.value = "1";
  elements.unit.value = "件";
  elements.formTitle.textContent = "买过的价格";
  elements.saveButton.textContent = "保存记录";
  elements.cancelEditButton.classList.add("hidden");
  updateLiveUnitPrice();
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
  elements.category.value = record.category;
  elements.price.value = record.price;
  elements.quantity.value = record.quantity;
  elements.unit.value = record.unit;
  elements.discount.value = record.discount;
  elements.note.value = record.note;
  elements.formTitle.textContent = "编辑记录";
  elements.saveButton.textContent = "更新记录";
  elements.cancelEditButton.classList.remove("hidden");
  updateLiveUnitPrice();
  elements.product.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function duplicateRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) {
    return;
  }

  state.records.unshift(
    normalizeRecord({
      ...record,
      id: createId(),
      date: todayString(),
      createdAt: new Date().toISOString(),
    }),
  );
  saveRecords();
  render();
}

function deleteRecord(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) {
    return;
  }

  const confirmed = window.confirm(`删除「${record.product}」这条记录吗？`);
  if (!confirmed) {
    return;
  }

  state.records = state.records.filter((item) => item.id !== id);
  saveRecords();
  render();
}

function getFilteredRecords() {
  const terms = state.search
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return state.records
    .filter((record) => {
      const categoryMatches =
        !state.category || record.category === state.category;
      const haystack = [
        record.product,
        record.brand,
        record.store,
        record.category,
        record.discount,
        record.note,
      ]
        .join(" ")
        .toLowerCase();
      const termsMatch = terms.every((term) => haystack.includes(term));
      return categoryMatches && termsMatch;
    })
    .sort((a, b) => {
      if (state.sort === "unit-asc") {
        return unitPriceOf(a) - unitPriceOf(b);
      }
      if (state.sort === "unit-desc") {
        return unitPriceOf(b) - unitPriceOf(a);
      }
      if (state.sort === "name-asc") {
        return a.product.localeCompare(b.product, "zh-CN");
      }
      return b.date.localeCompare(a.date);
    });
}

function createTextButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderRecords(records) {
  elements.recordsBody.textContent = "";
  elements.emptyState.classList.toggle("visible", records.length === 0);

  records.forEach((record) => {
    const row = elements.rowTemplate.content.firstElementChild.cloneNode(true);
    const cells = row.querySelectorAll("td");

    cells[0].textContent = formatDate(record.date);
    cells[1].className = "product-cell";
    cells[1].innerHTML = `<strong></strong><span></span>`;
    cells[1].querySelector("strong").textContent = record.product;
    cells[1].querySelector("span").textContent = [record.brand, record.category]
      .filter(Boolean)
      .join(" · ");
    cells[2].textContent = record.store || "-";
    cells[3].className = "price-cell";
    cells[3].innerHTML = `<strong></strong><span></span>`;
    cells[3].querySelector("strong").textContent = formatMoney(record.price);
    cells[3].querySelector("span").textContent = record.note || "";
    cells[4].textContent = `${record.quantity} ${record.unit}`;
    cells[5].textContent = `${formatMoney(unitPriceOf(record))} / ${record.unit}`;
    cells[6].className = "discount-cell";
    cells[6].textContent = record.discount || "-";

    cells[7].append(
      createTextButton("编辑", "text-button", () => editRecord(record.id)),
      createTextButton("复制", "text-button", () => duplicateRecord(record.id)),
      createTextButton("删除", "danger-button", () => deleteRecord(record.id)),
    );

    elements.recordsBody.append(row);
  });
}

function getProductMatches(productText) {
  const query = cleanText(productText).toLowerCase();
  if (!query) {
    return [];
  }

  return state.records.filter((record) =>
    [record.product, record.brand, record.category]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
}

function renderStats(records) {
  const prices = records.map(unitPriceOf).filter(Number.isFinite);
  const lowest = prices.length ? Math.min(...prices) : null;
  const average = prices.length
    ? prices.reduce((sum, value) => sum + value, 0) / prices.length
    : null;
  const latest = records
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const unit = records[0]?.unit || "";

  const stats = [
    ["记录数", String(records.length)],
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
  const productText = elements.compareProduct.value || state.search;
  const matches = getProductMatches(productText);
  const currentPrice = toNumber(elements.currentPrice.value, NaN);
  const currentQuantity = toNumber(elements.currentQuantity.value, NaN);
  const currentUnit = cleanText(elements.currentUnit.value) || matches[0]?.unit || "件";

  renderStats(productText ? matches : getFilteredRecords());

  elements.comparisonResult.className = "comparison-result";

  if (!productText) {
    elements.comparisonResult.textContent = "先搜索商品，再输入这次促销的实付价。";
    return;
  }

  if (!matches.length) {
    elements.comparisonResult.textContent = "这个商品还没有历史记录，可以先保存一次购买价格。";
    return;
  }

  const best = matches
    .slice()
    .sort((a, b) => unitPriceOf(a) - unitPriceOf(b))[0];
  const bestUnitPrice = unitPriceOf(best);

  if (!Number.isFinite(currentPrice) || !Number.isFinite(currentQuantity) || currentQuantity <= 0) {
    elements.comparisonResult.textContent = `历史最低是 ${formatMoney(bestUnitPrice)} / ${best.unit}，来自 ${formatDate(best.date)}${best.store ? ` · ${best.store}` : ""}。`;
    return;
  }

  const currentUnitPrice = currentPrice / currentQuantity;
  const difference = currentUnitPrice - bestUnitPrice;
  const percent = bestUnitPrice > 0 ? Math.abs(difference / bestUnitPrice) * 100 : 0;

  if (difference < -0.005) {
    elements.comparisonResult.classList.add("good");
    elements.comparisonResult.textContent = `这次更划算：当前约 ${formatMoney(currentUnitPrice)} / ${currentUnit}，比历史最低低 ${percent.toFixed(1)}%。`;
    return;
  }

  if (difference > 0.005) {
    elements.comparisonResult.classList.add("bad");
    elements.comparisonResult.textContent = `这次还不算最低：当前约 ${formatMoney(currentUnitPrice)} / ${currentUnit}，比历史最低高 ${percent.toFixed(1)}%。`;
    return;
  }

  elements.comparisonResult.textContent = `这次接近历史最低：当前约 ${formatMoney(currentUnitPrice)} / ${currentUnit}。`;
}

function renderLists() {
  const listTargets = [
    [elements.productList, state.records.map((record) => record.product)],
    [elements.storeList, state.records.map((record) => record.store)],
    [elements.categoryList, state.records.map((record) => record.category)],
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

function render() {
  renderLists();
  const records = getFilteredRecords();
  renderRecords(records);
  updateComparison();
}

function updateLiveUnitPrice() {
  const price = toNumber(elements.price.value, NaN);
  const quantity = toNumber(elements.quantity.value, NaN);
  const unit = cleanText(elements.unit.value) || "单位";

  if (!Number.isFinite(price) || !Number.isFinite(quantity) || quantity <= 0) {
    elements.liveUnitPrice.textContent = "单价会在保存后自动计算。";
    return;
  }

  elements.liveUnitPrice.textContent = `预计单价：${formatMoney(price / quantity)} / ${unit}`;
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
  const content = JSON.stringify(state.records, null, 2);
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
    "quantity",
    "unit",
    "unitPrice",
    "discount",
    "note",
  ];
  const rows = state.records.map((record) =>
    headers
      .map((key) =>
        csvEscape(key === "unitPrice" ? unitPriceOf(record).toFixed(4) : record[key]),
      )
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
  const imported =
    file.name.toLowerCase().endsWith(".json")
      ? JSON.parse(text).map(normalizeRecord)
      : recordsFromCsv(text);

  const byId = new Map(state.records.map((record) => [record.id, record]));
  imported.forEach((record) => byId.set(record.id, record));
  state.records = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
  saveRecords();
  render();
}

function bindEvents() {
  elements.form.addEventListener("submit", handleFormSubmit);
  elements.cancelEditButton.addEventListener("click", resetForm);
  [elements.price, elements.quantity, elements.unit].forEach((element) => {
    element.addEventListener("input", updateLiveUnitPrice);
  });

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

  [
    elements.compareProduct,
    elements.currentPrice,
    elements.currentQuantity,
    elements.currentUnit,
  ].forEach((element) => {
    element.addEventListener("input", updateComparison);
  });

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
  loadRecords();
  bindEvents();
  resetForm();
  render();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

init();
