
const BANKS = ["سپه", "صادرات", "مسکن", "ملت علی"];

let db;

const request = indexedDB.open("HesabYarDB", 1);

request.onupgradeneeded = function(e) {
  const database = e.target.result;
  database.createObjectStore("transactions", {
    keyPath: "id",
    autoIncrement: true
  });
};

request.onsuccess = function(e) {
  db = e.target.result;
  initialize();
};

request.onerror = function() {
  alert("خطا در باز کردن پایگاه اطلاعات");
};

function initialize() {
  fillBanks();
  setupNavigation();
  setupForms();
  setupEvents();

  document.getElementById("reportMonth").value =
    localDate().slice(0, 7);

  document.getElementById("today").textContent =
    new Date().toLocaleDateString("fa-IR");

  renderAll();
}

function localDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateTime() {
  return new Date().toISOString();
}

function money(value) {
  return Number(value || 0).toLocaleString("fa-IR");
}

function store() {
  return db.transaction("transactions", "readonly")
    .objectStore("transactions");
}

function getAll(callback) {
  const req = store().getAll();
  req.onsuccess = () => callback(req.result);
}

function save(data, callback) {
  const tx = db.transaction("transactions", "readwrite");
  tx.objectStore("transactions").add({
    ...data,
    createdAt: dateTime()
  });
  tx.oncomplete = () => {
    renderAll();
    if (callback) callback();
  };
  tx.onerror = () => alert("ذخیره اطلاعات انجام نشد.");
}

function fillBanks() {
  const ids = [
    "incomeBank",
    "expenseBank",
    "transferFrom",
    "transferTo",
    "openingBank"
  ];

  ids.forEach(id => {
    const select = document.getElementById(id);
    select.innerHTML = "";
    BANKS.forEach(bank => {
      const option = document.createElement("option");
      option.value = bank;
      option.textContent = "بانک " + bank;
      select.appendChild(option);
    });
  });
}

function setupNavigation() {
  document.querySelectorAll(".nav button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav button")
        .forEach(b => b.classList.remove("active"));

      document.querySelectorAll(".page")
        .forEach(p => p.classList.remove("active"));

      button.classList.add("active");
      document.getElementById(button.dataset.page)
        .classList.add("active");

      renderAll();
    });
  });

  document.querySelectorAll(".tabs button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tabs button")
        .forEach(b => b.classList.remove("active"));

      document.querySelectorAll(".entry-form")
        .forEach(f => f.hidden = true);

      button.classList.add("active");
      document.getElementById(button.dataset.form).hidden = false;
    });
  });
}

function setupForms() {
  const incomeMethod = document.getElementById("incomeMethod");
  const expenseMethod = document.getElementById("expenseMethod");
  const openingAccount = document.getElementById("openingAccount");

  incomeMethod.addEventListener("change", () => {
    document.getElementById("incomeBankBox").hidden =
      incomeMethod.value !== "card";
  });

  expenseMethod.addEventListener("change", () => {
    document.getElementById("expenseBankBox").hidden =
      expenseMethod.value !== "card";
  });

  openingAccount.addEventListener("change", () => {
    document.getElementById("openingBankBox").hidden =
      openingAccount.value !== "bank";
  });

  document.getElementById("incomeForm")
    .addEventListener("submit", e => {
      e.preventDefault();

      const method = incomeMethod.value;

      save({
        type: "income",
        amount: Number(incomeAmount.value),
        method,
        bank: method === "card" ? incomeBank.value : null,
        title: incomeTitle.value.trim(),
        note: incomeNote.value.trim(),
        date: localDate()
      }, () => {
        e.target.reset();
        document.getElementById("incomeBankBox").hidden = true;
        alert("درآمد با موفقیت ثبت شد.");
      });
    });

  document.getElementById("expenseForm")
    .addEventListener("submit", e => {
      e.preventDefault();

      const method = expenseMethod.value;

      save({
        type: "expense",
        amount: Number(expenseAmount.value),
        method,
        bank: method === "card" ? expenseBank.value : null,
        category: expenseCategory.value,
        title: expenseTitle.value.trim(),
        note: expenseNote.value.trim(),
        date: localDate()
      }, () => {
        e.target.reset();
        document.getElementById("expenseBankBox").hidden = true;
        alert("هزینه ثبت شد.");
      });
    });

  document.getElementById("transferForm")
    .addEventListener("submit", e => {
      e.preventDefault();

      const from = transferFrom.value;
      const to = transferTo.value;
      const amount = Number(transferAmount.value);

      if (from === to) {
        alert("کارت مبدأ و مقصد نباید یکسان باشند.");
        return;
      }

      if (!amount || amount <= 0) {
        alert("مبلغ معتبر وارد کن.");
        return;
      }

      save({
        type: "transfer",
        amount,
        from,
        to,
        title: "انتقال وجه",
        note: transferNote.value.trim(),
        date: localDate()
      }, () => {
        e.target.reset();
        alert(
          money(amount) + " تومان از کارت " + from +
          " به کارت " + to + " منتقل شد."
        );
      });
    });

  document.getElementById("openingForm")
    .addEventListener("submit", e => {
      e.preventDefault();

      const account = openingAccount.value;

      save({
        type: "opening",
        amount: Number(openingAmount.value),
        method: account === "bank" ? "card" : "cash",
        bank: account === "bank" ? openingBank.value : null,
        title: "موجودی اولیه",
        date: localDate()
      }, () => {
        e.target.reset();
        document.getElementById("openingBankBox").hidden = true;
        alert("موجودی اولیه ثبت شد.");
      });
    });
}

function setupEvents() {
  document.getElementById("search")
    .addEventListener("input", renderHistory);

  document.getElementById("filter")
    .addEventListener("change", renderHistory);

  document.getElementById("reportMonth")
    .addEventListener("change", renderReport);

  document.getElementById("backupBtn")
    .addEventListener("click", backup);

  document.getElementById("restoreBtn")
    .addEventListener("click", restore);

  document.getElementById("exportReport")
    .addEventListener("click", exportReport);
}

function renderAll() {
  getAll(items => {
    renderDashboard(items);
    renderHistoryWith(items);
    renderReportWith(items);
  });
}

function renderDashboard(items) {
  const today = localDate();

  const daily = items.filter(x => x.date === today);

  const incomes = daily.filter(x => x.type === "income");
  const expenses = daily.filter(x => x.type === "expense");

  const totalIncome = sum(incomes);
  const totalExpense = sum(expenses);

  const cash = sum(incomes.filter(x => x.method === "cash"));
  const card = sum(incomes.filter(x => x.method === "card"));

  setText("todayIncome", money(totalIncome));
  setText("todayExpense", money(totalExpense));
  setText("todayCash", money(cash));
  setText("todayCard", money(card));
  setText("todayBalance", money(totalIncome - totalExpense) + " تومان");

  renderBanks(items);

  const recent = [...items].sort((a,b) =>
    b.createdAt.localeCompare(a.createdAt)
  ).slice(0, 5);

  renderItems("recent", recent, false);
}

function sum(items) {
  return items.reduce((total, item) =>
    total + Number(item.amount || 0), 0);
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderBanks(items) {
  const container = document.getElementById("bankBalances");
  container.innerHTML = "";

  BANKS.forEach(bank => {
    let balance = 0;

    items.forEach(x => {
      if (x.type === "opening" && x.method === "card" && x.bank === bank)
        balance += x.amount;

      if (x.type === "income" && x.method === "card" && x.bank === bank)
        balance += x.amount;

      if (x.type === "expense" && x.method === "card" && x.bank === bank)
        balance -= x.amount;

      if (x.type === "transfer") {
        if (x.from === bank) balance -= x.amount;
        if (x.to === bank) balance += x.amount;
      }
    });

    const row = document.createElement("div");
    row.className = "bank-row";

    const name = document.createElement("span");
    name.textContent = "بانک " + bank;

    const amount = document.createElement("strong");
    amount.textContent = money(balance) + " تومان";

    row.append(name, amount);
    container.appendChild(row);
  });
}

function renderHistory() {
  getAll(renderHistoryWith);
}

function renderHistoryWith(items) {
  const query = document.getElementById("search").value.trim();
  const filter = document.getElementById("filter").value;

  let filtered = items.filter(x => {
    const matchesType = filter === "all" || x.type === filter;

    const text = [
      x.title, x.note, x.category, x.bank, x.from, x.to, x.amount
    ].join(" ");

    return matchesType && text.includes(query);
  });

  filtered.sort((a,b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  renderItems("historyList", filtered, true);
}

function renderItems(id, items, allowDelete) {
  const container = document.getElementById(id);
  container.innerHTML = "";

  if (!items.length) {
    container.textContent = "هنوز اطلاعاتی ثبت نشده است.";
    return;
  }

  items.forEach(item => {
    const box = document.createElement("div");
    box.className = "item";

    let title = item.title || "";
    let detail = "";

    if (item.type === "income") {
      detail = item.method === "cash"
        ? "دریافت نقدی"
        : "واریزی به کارت " + item.bank;
    }

    if (item.type === "expense") {
      detail = "هزینه " + item.category +
        " | پرداخت " + (item.method === "cash" ? "نقدی" : "بانک " + item.bank);
    }

    if (item.type === "transfer") {
      detail = "از " + item.from + " به " + item.to;
      title = money(item.amount) + " تومان منتقل شد";
    }

    if (item.type === "opening") {
      detail = "موجودی اولیه " +
        (item.method === "cash" ? "نقدی" : "بانک " + item.bank);
    }

    const top = document.createElement("div");
    top.className = "itemTop";

    const name = document.createElement("strong");
    name.textContent = title;

    const amount = document.createElement("strong");
    amount.textContent = money(item.amount) + " تومان";

    top.append(name, amount);

    const info = document.createElement("small");
    const time = new Date(item.createdAt).toLocaleString("fa-IR");
    info.textContent = detail + " | " + time +
      (item.note ? " | " + item.note : "");

    box.append(top, info);

    if (allowDelete) {
      const del = document.createElement("button");
      del.textContent = "حذف";
      del.addEventListener("click", () => {
        if (confirm("از حذف این تراکنش مطمئنی؟")) {
          const tx = db.transaction("transactions", "readwrite");
          tx.objectStore("transactions").delete(item.id);
          tx.oncomplete = renderAll;
        }
      });
      box.appendChild(del);
    }

    container.appendChild(box);
  });
}

function renderReport() {
  getAll(renderReportWith);
}

function renderReportWith(items) {
  const month = document.getElementById("reportMonth").value;

  const monthly = items.filter(x =>
    x.date && x.date.startsWith(month)
  );

  const incomes = monthly.filter(x => x.type === "income");
  const expenses = monthly.filter(x => x.type === "expense");

  const income = sum(incomes);
  const expense = sum(expenses);

  setText("monthIncome", money(income) + " تومان");
  setText("monthExpense", money(expense) + " تومان");
  setText("monthBalance", money(income - expense) + " تومان");

  setText("monthCash", money(sum(
    incomes.filter(x => x.method === "cash")
  )));

  setText("monthCard", money(sum(
    incomes.filter(x => x.method === "card")
  )));
}

function backup() {
  getAll(items => {
    const blob = new Blob(
      [JSON.stringify(items, null, 2)],
      {type: "application/json"}
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "HesabYar-Backup-" + localDate() + ".json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

function restore() {
  const file = document.getElementById("restoreFile").files[0];

  if (!file) {
    alert("ابتدا فایل پشتیبان را انتخاب کن.");
    return;
  }

  if (!confirm("اطلاعات فعلی با اطلاعات پشتیبان جایگزین شوند؟")) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const items = JSON.parse(reader.result);

      if (!Array.isArray(items) ||
          !items.every(x =>
            x && typeof x.amount === "number" &&
            ["income","expense","transfer","opening"].includes(x.type)
          )) {
        throw new Error("invalid backup");
      }

      const tx = db.transaction("transactions", "readwrite");
      const objectStore = tx.objectStore("transactions");

      objectStore.clear();

      items.forEach(item => {
        const copy = {...item};
        delete copy.id;
        objectStore.add(copy);
      });

      tx.oncomplete = () => {
        alert("بازیابی انجام شد.");
        renderAll();
      };
    } catch {
      alert("فایل پشتیبان معتبر نیست.");
    }
  };

  reader.readAsText(file);
}

function exportReport() {
  getAll(items => {
    const month = document.getElementById("reportMonth").value;

    const filtered = items.filter(x =>
      x.date && x.date.startsWith(month)
    );

    const lines = [
      "گزارش حساب‌یار",
      "ماه: " + month,
      "---------------------"
    ];

    filtered.forEach(x => {
      lines.push(
        x.date + " | " + x.title + " | " +
        money(x.amount) + " تومان"
      );
    });

    lines.push("---------------------");
    lines.push("تعداد تراکنش‌ها: " + filtered.length);

    const blob = new Blob(
      ["\uFEFF" + lines.join("\n")],
      {type: "text/plain;charset=utf-8"}
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Report-" + month + ".txt";
    a.click();
    URL.revokeObjectURL(url);
  });
}
