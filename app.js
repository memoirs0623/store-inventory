const content = document.getElementById("content");

// ==================================================

// Inventory V7.6 完整整合版

// V7.5 + 產品主要供應商綁定 + 低庫存自動帶入叫貨

// ==================================================

const productCategories = [

  "01.盤點食材類","02.酒類","03.非盤點類","04.入庫食材",

  "05.消耗品","06.生鮮","07.個性商品","09.公務品","11.代售商品"

];

const temperatureTypes = ["低溫","常溫","越庫品","公務品","區採","生鮮"];

const costTypes = ["進貨成本","銷貨成本"];

const units = ["個","包","箱","瓶","罐","公斤"];

const productNames = [

  "可樂","雪碧","烏龍茶","綠茶","紅茶","礦泉水","柳橙汁","蘋果汁","啤酒","氣泡水",

  "牛肉","豬肉","雞肉","雞蛋","豆腐","高麗菜","青江菜","洋蔥","番茄","玉米",

  "白米","麵條","水餃","薯條","雞塊","醬油","番茄醬","辣椒醬","胡椒粉","食用油",

  "衛生紙","餐巾紙","垃圾袋","手套","吸管","紙杯","塑膠杯","筷子","湯匙","叉子"

];

function createTestProducts() {

  const list = [];

  for (let i = 1; i <= 100; i++) {

    list.push({

      id: "P" + String(i).padStart(4, "0"),

      name: productNames[(i - 1) % productNames.length] + " " + i,

      category: productCategories[(i - 1) % productCategories.length],

      temperature: temperatureTypes[(i - 1) % temperatureTypes.length],

      costType: costTypes[(i - 1) % costTypes.length],

      stock: (i * 7) % 80,

      safetyStock: 15,

      unit: i % 3 === 0 ? "箱" : i % 3 === 1 ? "個" : "包",

      supplierId: ""

    });

  }

  return list;

}

function readJSON(key, fallback) {

  try {

    const value = localStorage.getItem(key);

    return value ? JSON.parse(value) : fallback;

  } catch (error) {

    return fallback;

  }

}

let products = readJSON("inventory_products", null) || createTestProducts();

let movementRecords = readJSON("inventory_movements", []);

let orderRecords = readJSON("inventory_orders", []);

let suppliers = readJSON("inventory_suppliers", []);

products.forEach(product => {

  if (typeof product.supplierId !== "string") product.supplierId = "";

});

function saveData() {

  localStorage.setItem("inventory_products", JSON.stringify(products));

  localStorage.setItem("inventory_movements", JSON.stringify(movementRecords));

}

function saveOrders() {

  localStorage.setItem("inventory_orders", JSON.stringify(orderRecords));

}

function saveSuppliers() {

  localStorage.setItem("inventory_suppliers", JSON.stringify(suppliers));

}

function escapeHTML(value) {

  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}

function primaryButton() {

  return "padding:12px 16px;border:0;border-radius:10px;background:#087f8c;color:white;font-size:16px;font-weight:bold;";

}

function secondaryButton() {

  return "padding:12px 16px;border:1px solid #bbb;border-radius:10px;background:white;color:#222;font-size:16px;";

}

function dangerButton() {

  return "padding:12px 16px;border:0;border-radius:10px;background:#b42318;color:white;font-size:16px;font-weight:bold;";

}

function fieldStyle() {

  return "width:100%;box-sizing:border-box;padding:12px;margin:8px 0 14px;font-size:16px;";

}

function messageHTML(message) {

  if (!message) return "";

  return `<div style="padding:14px;margin-bottom:16px;border-radius:12px;background:#e3f6f3;color:#075e65;font-weight:bold;">${escapeHTML(message)}</div>`;

}

function getSupplierName(id) {

  if (!id) return "未設定";

  const supplier = suppliers.find(item => item.id === id);

  return supplier ? supplier.name : "供應商資料不存在";

}

function getActiveSupplier(id) {

  return suppliers.find(s => s.id === id && s.active);

}

function supplierOptions(selectedId = "", includeBlank = true) {

  let html = includeBlank

    ? `<option value="">未設定主要供應商</option>`

    : `<option value="">請選擇供應商</option>`;

  const selectedSupplier = suppliers.find(s => s.id === selectedId);

  if (selectedSupplier && !selectedSupplier.active) {

    html += `<option value="${escapeHTML(selectedSupplier.id)}" selected>

      ${escapeHTML(selectedSupplier.id)}｜${escapeHTML(selectedSupplier.name)}（停用）

    </option>`;

  }

  html += suppliers

    .filter(s => s.active)

    .map(s => `

      <option value="${escapeHTML(s.id)}" ${s.id === selectedId ? "selected" : ""}>

        ${escapeHTML(s.id)}｜${escapeHTML(s.name)}

      </option>

    `).join("");

  return html;

}

function showPage(page) {

  if (page === "inventory") return showInventory();

  if (page === "movement") return showMovement();

  if (page === "order") return showOrder();

  if (page === "manage") return showManage();

  showHome();

}

// ==================================================

// 首頁

// ==================================================

function showHome() {

  const lowStockCount = products.filter(

    p => Number(p.stock) <= Number(p.safetyStock)

  ).length;

  const activeOrders = orderRecords.filter(

    o => o.status !== "已入庫" && o.status !== "已取消／作廢"

  ).length;

  content.innerHTML = `

    <h2>首頁</h2>

    <div class="card">

      <h3>今日庫存</h3>

      <p>目前共有 <strong>${products.length}</strong> 筆產品</p>

    </div>

    <div class="card"

         onclick="showLowStock()"

         style="cursor:pointer;border:2px solid #087f8c;">

      <h3>低庫存</h3>

      <p>目前有 <strong>${lowStockCount}</strong> 筆產品需要注意</p>

      <div style="margin-top:12px;color:#087f8c;font-weight:bold;">

        查看低庫存 →

      </div>

    </div>

    <div class="card"

         onclick="showOrder()"

         style="cursor:pointer;">

      <h3>今日叫貨</h3>

      <p>目前 <strong>${activeOrders}</strong> 筆進行中</p>

      <div style="margin-top:12px;color:#087f8c;font-weight:bold;">

        查看叫貨 →

      </div>

    </div>

    <div class="card"

         onclick="showLowStock()"

         style="cursor:pointer;">

      <h3>異常提醒</h3>

      <p>${lowStockCount > 0 ? lowStockCount + " 筆低庫存提醒" : "目前無異常"}</p>

    </div>

  `;

}

// ==================================================

// 庫存查詢

// ==================================================

function showInventory() {

  content.innerHTML = `

    <h2>產品庫存</h2>

    <div class="card">

      <input id="searchProduct"

             type="search"

             placeholder="搜尋產品編號或名稱"

             style="${fieldStyle()}">

      <select id="categoryFilter" style="${fieldStyle()}">

        <option value="">全部產品類別</option>

        ${productCategories.map(i =>

          `<option value="${escapeHTML(i)}">${escapeHTML(i)}</option>`

        ).join("")}

      </select>

      <select id="temperatureFilter" style="${fieldStyle()}">

        <option value="">全部溫層</option>

        ${temperatureTypes.map(i =>

          `<option value="${escapeHTML(i)}">${escapeHTML(i)}</option>`

        ).join("")}

      </select>

      <select id="costFilter" style="${fieldStyle()}">

        <option value="">全部成本分類</option>

        ${costTypes.map(i =>

          `<option value="${escapeHTML(i)}">${escapeHTML(i)}</option>`

        ).join("")}

      </select>

    </div>

    <p id="productCount"></p>

    <div id="productList"></div>

  `;

  ["searchProduct","categoryFilter","temperatureFilter","costFilter"]

    .forEach(id => {

      document.getElementById(id).addEventListener(

        id === "searchProduct" ? "input" : "change",

        filterProducts

      );

    });

  filterProducts();

}

function filterProducts() {

  const search =

    document.getElementById("searchProduct").value.trim().toLowerCase();

  const category =

    document.getElementById("categoryFilter").value;

  const temperature =

    document.getElementById("temperatureFilter").value;

  const cost =

    document.getElementById("costFilter").value;

  renderProducts(

    products.filter(p =>

      (!search ||

        p.id.toLowerCase().includes(search) ||

        p.name.toLowerCase().includes(search)) &&

      (!category || p.category === category) &&

      (!temperature || p.temperature === temperature) &&

      (!cost || p.costType === cost)

    )

  );

}

function renderProducts(list) {

  document.getElementById("productCount").textContent =

    "共 " + list.length + " 筆產品";

  const container = document.getElementById("productList");

  if (!list.length) {

    container.innerHTML =

      `<div class="card">查無符合條件的產品</div>`;

    return;

  }

  container.innerHTML = list.map(p => `

    <div class="card">

      <h3>${escapeHTML(p.name)}</h3>

      <div>編號：${escapeHTML(p.id)}</div>

      <div style="margin-top:6px;">

        庫存：

        <strong>${p.stock} ${escapeHTML(p.unit)}</strong>

        ${

          Number(p.stock) <= Number(p.safetyStock)

            ? `<strong style="margin-left:8px;color:#b42318;">低庫存</strong>`

            : ""

        }

      </div>

      <div style="margin-top:6px;">

        主要供應商：

        <strong>${escapeHTML(getSupplierName(p.supplierId))}</strong>

      </div>

      <div style="margin-top:8px;font-size:13px;opacity:.7;">

        ${escapeHTML(p.category)}｜

        ${escapeHTML(p.temperature)}｜

        ${escapeHTML(p.costType)}

      </div>

    </div>

  `).join("");

}

// ==================================================

// 庫存異動

// ==================================================

function showMovement(message = "") {

  content.innerHTML = `

    <h2>庫存異動</h2>

    ${messageHTML(message)}

    <div class="card">

      <h3>庫存盤點</h3>

      <p>比對帳面庫存與實際盤點數量，並自動記錄盤盈或盤虧。</p>

      <button type="button"

              onclick="showStockCount()"

              style="${primaryButton()}width:100%;">

        開始盤點

      </button>

    </div>

    <div class="card">

      <label>產品</label>

      <select id="movementProduct" style="${fieldStyle()}">

        ${products.map(p => `

          <option value="${escapeHTML(p.id)}">

            ${escapeHTML(p.id)}｜${escapeHTML(p.name)}｜

            庫存 ${p.stock} ${escapeHTML(p.unit)}

          </option>

        `).join("")}

      </select>

      <label>異動類型</label>

      <select id="movementType" style="${fieldStyle()}">

        <option value="in">進貨 ＋</option>

        <option value="out">出庫 －</option>

        <option value="count">盤點</option>

        <option value="adjustPlus">庫存調整 ＋</option>

        <option value="adjustMinus">庫存調整 －</option>

      </select>

      <label>數量</label>

      <input id="movementQty"

             type="number"

             min="0"

             inputmode="decimal"

             placeholder="輸入數量"

             style="${fieldStyle()}">

      <div id="movementError"></div>

      <button id="submitMovementBtn"

              type="button"

              style="${primaryButton()}width:100%;">

        確認異動

      </button>

    </div>

    <h3>最近異動紀錄</h3>

    <div id="movementHistory"></div>

  `;

  document

    .getElementById("submitMovementBtn")

    .addEventListener("click", submitMovement);

  renderMovementHistory();

}

function movementError(message) {

  const box = document.getElementById("movementError");

  if (!box) return;

  box.textContent = message;

  box.style.color = "#b42318";

  box.style.fontWeight = "bold";

  box.style.marginBottom = "12px";

}

function submitMovement() {

  const productId =

    document.getElementById("movementProduct").value;

  const type =

    document.getElementById("movementType").value;

  const qty =

    Number(document.getElementById("movementQty").value);

  if (!Number.isFinite(qty) || qty < 0) {

    return movementError("請輸入正確數量");

  }

  const product =

    products.find(p => p.id === productId);

  if (!product) {

    return movementError("找不到產品");

  }

  const before = Number(product.stock);

  if (type === "in") {

    product.stock = before + qty;

  }

  if (type === "out") {

    if (qty > before) {

      return movementError("出庫數量不可大於目前庫存");

    }

    product.stock = before - qty;

  }

  if (type === "count") {

    product.stock = qty;

  }

  if (type === "adjustPlus") {

    product.stock = before + qty;

  }

  if (type === "adjustMinus") {

    if (qty > before) {

      return movementError("調整後庫存不可小於 0");

    }

    product.stock = before - qty;

  }

  const names = {

    in: "進貨",

    out: "出庫",

    count: "盤點",

    adjustPlus: "庫存調整＋",

    adjustMinus: "庫存調整－"

  };

  movementRecords.unshift({

    id: Date.now(),

    time: new Date().toLocaleString("zh-TW"),

    productId: product.id,

    productName: product.name,

    type: names[type],

    qty,

    before,

    after: product.stock

  });

  saveData();

  showMovement(

    product.name +

    " 異動完成：" +

    before +

    " → " +

    product.stock +

    " " +

    product.unit

  );

}

function renderMovementHistory() {

  const box =

    document.getElementById("movementHistory");

  if (!box) return;

  if (!movementRecords.length) {

    box.innerHTML =

      `<div class="card">尚無異動紀錄</div>`;

    return;

  }

  box.innerHTML =

    movementRecords.slice(0, 20).map(r => `

      <div class="card">

        <strong>${escapeHTML(r.productName)}</strong>

        <div style="margin-top:6px;">

          ${escapeHTML(r.type)}｜數量 ${r.qty}

        </div>

        <div>

          庫存：${r.before} →

          <strong>${r.after}</strong>

        </div>

        <div style="margin-top:6px;font-size:12px;opacity:.6;">

          ${escapeHTML(r.productId)}｜

          ${escapeHTML(r.time)}

        </div>

      </div>

    `).join("");

}

// ==================================================

// 盤點

// ==================================================

function showStockCount() {

  content.innerHTML = `

    <h2>庫存盤點</h2>

    <div class="card">

      <label>選擇產品</label>

      <select id="countProduct" style="${fieldStyle()}">

        ${products.map(p => `

          <option value="${escapeHTML(p.id)}">

            ${escapeHTML(p.id)}｜

            ${escapeHTML(p.name)}｜

            帳面 ${p.stock} ${escapeHTML(p.unit)}

          </option>

        `).join("")}

      </select>

      <div id="countProductInfo"

           style="padding:12px;margin-bottom:14px;border-radius:10px;background:#f3f5f5;">

      </div>

      <label>實際盤點數量</label>

      <input id="actualCount"

             type="number"

             min="0"

             inputmode="decimal"

             placeholder="輸入實際盤點數量"

             style="${fieldStyle()}">

      <div id="countDifference"></div>

      <div id="countError"></div>

      <button id="previewCountBtn"

              type="button"

              style="${primaryButton()}width:100%;margin-bottom:10px;">

        計算盤點差異

      </button>

      <button id="submitCountBtn"

              type="button"

              style="${primaryButton()}width:100%;">

        確認盤點

      </button>

    </div>

    <button type="button"

            onclick="showMovement()"

            style="${secondaryButton()}width:100%;">

      返回異動

    </button>

  `;

  document

    .getElementById("countProduct")

    .addEventListener("change", updateCountProductInfo);

  document

    .getElementById("previewCountBtn")

    .addEventListener("click", previewStockCount);

  document

    .getElementById("submitCountBtn")

    .addEventListener("click", submitStockCount);

  updateCountProductInfo();

}

function updateCountProductInfo() {

  const p = products.find(

    x => x.id === document.getElementById("countProduct").value

  );

  if (!p) return;

  document.getElementById("countProductInfo").innerHTML = `

    <strong>${escapeHTML(p.name)}</strong>

    <div style="margin-top:6px;">

      帳面庫存：

      <strong>${p.stock} ${escapeHTML(p.unit)}</strong>

    </div>

    <div style="margin-top:4px;">

      安全庫存：${p.safetyStock} ${escapeHTML(p.unit)}

    </div>

  `;

  document.getElementById("countDifference").innerHTML = "";

}

function showCountError(message) {

  const b = document.getElementById("countError");

  if (!b) return;

  b.textContent = message;

  b.style.color = "#b42318";

  b.style.fontWeight = "bold";

  b.style.marginBottom = message ? "12px" : "0";

}

function previewStockCount() {

  const p = products.find(

    x => x.id === document.getElementById("countProduct").value

  );

  const actual =

    Number(document.getElementById("actualCount").value);

  if (!p) return;

  if (!Number.isFinite(actual) || actual < 0) {

    return showCountError("請輸入正確的實際盤點數量");

  }

  const d = actual - Number(p.stock);

  let text =

    d > 0

      ? "盤盈 +" + d + " " + p.unit

      : d < 0

      ? "盤虧 " + d + " " + p.unit

      : "帳實相符，無差異";

  document.getElementById("countDifference").innerHTML = `

    <div style="padding:14px;margin-bottom:14px;border-radius:10px;background:#e3f6f3;">

      帳面：<strong>${p.stock}</strong>

      →

      實際：<strong>${actual}</strong>

      <div style="margin-top:8px;font-weight:bold;">

        ${escapeHTML(text)}

      </div>

    </div>

  `;

  showCountError("");

}

function submitStockCount() {

  const p = products.find(

    x => x.id === document.getElementById("countProduct").value

  );

  const actual =

    Number(document.getElementById("actualCount").value);

  if (!p) {

    return showCountError("找不到產品");

  }

  if (!Number.isFinite(actual) || actual < 0) {

    return showCountError("請輸入正確的實際盤點數量");

  }

  const before = Number(p.stock);

  const d = actual - before;

  p.stock = actual;

  movementRecords.unshift({

    id: Date.now(),

    time: new Date().toLocaleString("zh-TW"),

    productId: p.id,

    productName: p.name,

    type:

      d > 0

        ? "盤點－盤盈"

        : d < 0

        ? "盤點－盤虧"

        : "盤點－帳實相符",

    qty: Math.abs(d),

    before,

    after: actual

  });

  saveData();

  showMovement(

    p.name +

    " 盤點完成：" +

    before +

    " → " +

    actual +

    " " +

    p.unit

  );

}

// ==================================================

// 低庫存

// ==================================================

function showLowStock() {

  const list = products.filter(

    p => Number(p.stock) <= Number(p.safetyStock)

  );

  content.innerHTML = `

    <h2>低庫存管理</h2>

    <div class="card">

      <h3>低庫存產品</h3>

      <p>

        目前共有

        <strong>${list.length}</strong>

        筆產品需要補貨

      </p>

    </div>

    <div id="lowStockList"></div>

    <button type="button"

            onclick="showHome()"

            style="${secondaryButton()}width:100%;margin-top:12px;">

      返回首頁

    </button>

  `;

  const c =

    document.getElementById("lowStockList");

  if (!list.length) {

    c.innerHTML =

      `<div class="card">目前沒有低庫存產品</div>`;

    return;

  }

  c.innerHTML = list.map(p => {

    const stock = Number(p.stock);

    const safety = Number(p.safetyStock);

    const qty =

      Math.max(safety * 2 - stock, 1);

    const supplierName =

      getSupplierName(p.supplierId);

    const activeSupplier =

      getActiveSupplier(p.supplierId);

    return `

      <div class="card">

        <h3>${escapeHTML(p.name)}</h3>

        <div>

          產品編號：${escapeHTML(p.id)}

        </div>

        <div style="margin-top:8px;">

          目前庫存：

          <strong>${stock} ${escapeHTML(p.unit)}</strong>

        </div>

        <div style="margin-top:6px;">

          安全庫存：

          ${safety} ${escapeHTML(p.unit)}

        </div>

        <div style="margin-top:6px;">

          主要供應商：

          <strong>${escapeHTML(supplierName)}</strong>

        </div>

        <div style="margin-top:6px;">

          建議叫貨：

          <strong>${qty} ${escapeHTML(p.unit)}</strong>

        </div>

        ${

          activeSupplier

            ? `

              <button type="button"

                      onclick="openSuggestedOrder('${escapeHTML(p.id)}',${qty})"

                      style="${primaryButton()}width:100%;margin-top:14px;">

                建立叫貨

              </button>

            `

            : `

              <button type="button"

                      onclick="showEditProduct('${escapeHTML(p.id)}')"

                      style="${secondaryButton()}width:100%;margin-top:14px;">

                設定可用主要供應商

              </button>

            `

        }

      </div>

    `;

  }).join("");

}

function openSuggestedOrder(productId, suggestedQty) {

  const p =

    products.find(x => x.id === productId);

  showOrder();

  const ps =

    document.getElementById("orderProduct");

  const qs =

    document.getElementById("orderQty");

  const ss =

    document.getElementById("orderSupplier");

  if (ps) {

    ps.value = productId;

  }

  if (qs) {

    qs.value = suggestedQty;

  }

  if (

    ss &&

    p &&

    getActiveSupplier(p.supplierId)

  ) {

    ss.value = p.supplierId;

  }

}

// ==================================================

// 叫貨

// ==================================================

function showOrder(message = "") {

  content.innerHTML = `

    <h2>叫貨管理</h2>

    ${messageHTML(message)}

    <div class="card">

      <label>供應商</label>

      <select id="orderSupplier"

              style="${fieldStyle()}">

        ${supplierOptions("", false)}

      </select>

      <label>產品</label>

      <select id="orderProduct"

              style="${fieldStyle()}">

        ${products.map(p => `

          <option value="${escapeHTML(p.id)}">

            ${escapeHTML(p.id)}｜

            ${escapeHTML(p.name)}｜

            庫存 ${p.stock} ${escapeHTML(p.unit)}

          </option>

        `).join("")}

      </select>

      <label>叫貨數量</label>

      <input id="orderQty"

             type="number"

             min="1"

             inputmode="numeric"

             placeholder="輸入叫貨數量"

             style="${fieldStyle()}">

      <div id="orderError"></div>

      <button id="createOrderBtn"

              type="button"

              style="${primaryButton()}width:100%;">

        建立叫貨單

      </button>

    </div>

    <h3>叫貨紀錄</h3>

    <div id="orderList"></div>

  `;

  document

    .getElementById("createOrderBtn")

    .addEventListener("click", createOrder);

  renderOrders();

}

function orderError(message) {

  const b =

    document.getElementById("orderError");

  if (!b) return;

  b.textContent = message;

  b.style.color = "#b42318";

  b.style.fontWeight = "bold";

  b.style.marginBottom = "12px";

}

function createOrder() {

  const supplierId =

    document.getElementById("orderSupplier").value;

  const productId =

    document.getElementById("orderProduct").value;

  const qty =

    Number(document.getElementById("orderQty").value);

  if (!supplierId) {

    return orderError("請先選擇供應商");

  }

  if (!Number.isFinite(qty) || qty <= 0) {

    return orderError("請輸入正確叫貨數量");

  }

  const supplier =

    suppliers.find(s => s.id === supplierId);

  const product =

    products.find(p => p.id === productId);

  if (!supplier) {

    return orderError("找不到供應商");

  }

  if (!supplier.active) {

    return orderError("此供應商目前已停用");

  }

  if (!product) {

    return orderError("找不到產品");

  }

  orderRecords.unshift({

    id: Date.now(),

    supplierId: supplier.id,

    supplierName: supplier.name,

    productId: product.id,

    productName: product.name,

    unit: product.unit,

    qty,

    status: "未到貨",

    createdAt: new Date().toLocaleString("zh-TW")

  });

  saveOrders();

  showOrder(

    "叫貨單建立完成：" +

    supplier.name +

    "｜" +

    product.name +

    "｜" +

    qty +

    " " +

    product.unit

  );

}

function renderOrders() {

  const box =

    document.getElementById("orderList");

  if (!box) return;

  if (!orderRecords.length) {

    box.innerHTML =

      `<div class="card">尚無叫貨紀錄</div>`;

    return;

  }

  box.innerHTML =

    orderRecords.map(o => {

      let actions = "";

      if (o.status === "未到貨") {

        actions += `

          <button type="button"

                  onclick="changeOrderStatus(${Number(o.id)},'待確認進貨')"

                  style="${primaryButton()}">

            到貨

          </button>

        `;

      }

      if (o.status === "待確認進貨") {

        actions += `

          <button type="button"

                  onclick="changeOrderStatus(${Number(o.id)},'已確認進貨')"

                  style="${primaryButton()}">

            確認進貨

          </button>

        `;

      }

      if (o.status === "已確認進貨") {

        actions += `

          <button type="button"

                  onclick="stockInOrder(${Number(o.id)})"

                  style="${primaryButton()}">

            入庫

          </button>

        `;

      }

      if (

        o.status !== "已入庫" &&

        o.status !== "已取消／作廢"

      ) {

        actions += `

          <button type="button"

                  onclick="showCancelOrderConfirm(${Number(o.id)})"

                  style="${dangerButton()}margin-left:8px;">

            取消／作廢

          </button>

        `;

      }

      return `

        <div class="card">

          <h3>${escapeHTML(o.productName)}</h3>

          <div>

            供應商：

            <strong>

              ${escapeHTML(o.supplierName || "舊資料未指定")}

            </strong>

          </div>

          <div style="margin-top:8px;">

            產品：

            ${escapeHTML(o.productId)}｜

            ${escapeHTML(o.productName)}

          </div>

          <div style="margin-top:6px;">

            叫貨數量：

            <strong>

              ${o.qty} ${escapeHTML(o.unit)}

            </strong>

          </div>

          <div style="margin-top:8px;">

            狀態：

            <strong>${escapeHTML(o.status)}</strong>

          </div>

          <div style="margin-top:6px;font-size:12px;opacity:.6;">

            ${escapeHTML(o.createdAt)}

          </div>

          <div style="margin-top:14px;">

            ${actions}

          </div>

        </div>

      `;

    }).join("");

}

function changeOrderStatus(id, status) {

  const o =

    orderRecords.find(

      x => Number(x.id) === Number(id)

    );

  if (!o) {

    return showOrder("找不到叫貨單");

  }

  o.status = status;

  saveOrders();

  showOrder(

    "叫貨狀態已更新為：" + status

  );

}

function stockInOrder(id) {

  const o =

    orderRecords.find(

      x => Number(x.id) === Number(id)

    );

  if (!o) {

    return showOrder("找不到叫貨單");

  }

  if (o.status !== "已確認進貨") {

    return showOrder(

      "此叫貨單尚未完成進貨確認"

    );

  }

  const p =

    products.find(x => x.id === o.productId);

  if (!p) {

    return showOrder("找不到產品");

  }

  const before =

    Number(p.stock);

  p.stock =

    before + Number(o.qty);

  o.status = "已入庫";

  o.stockedAt =

    new Date().toLocaleString("zh-TW");

  movementRecords.unshift({

    id: Date.now(),

    time: o.stockedAt,

    productId: p.id,

    productName: p.name,

    type: "叫貨入庫",

    qty: Number(o.qty),

    before,

    after: p.stock

  });

  saveData();

  saveOrders();

  showOrder(

    p.name +

    " 入庫完成：" +

    before +

    " → " +

    p.stock +

    " " +

    p.unit

  );

}

function showCancelOrderConfirm(id) {

  const o =

    orderRecords.find(

      x => Number(x.id) === Number(id)

    );

  if (!o) return;

  content.innerHTML = `

    <h2>取消／作廢叫貨單</h2>

    <div class="card">

      <h3>確定取消？</h3>

      <p>

        ${escapeHTML(o.productId)}｜

        ${escapeHTML(o.productName)}

      </p>

      <p>

        叫貨數量：

        ${o.qty} ${escapeHTML(o.unit)}

      </p>

      <p>

        目前狀態：

        <strong>${escapeHTML(o.status)}</strong>

      </p>

      <div style="display:flex;gap:10px;margin-top:18px;">

        <button id="confirmCancelOrder"

                type="button"

                style="${dangerButton()}flex:1;">

          確定作廢

        </button>

        <button type="button"

                onclick="showOrder()"

                style="${secondaryButton()}flex:1;">

          返回

        </button>

      </div>

    </div>

  `;

  document

    .getElementById("confirmCancelOrder")

    .addEventListener("click", () => {

      o.status = "已取消／作廢";

      saveOrders();

      showOrder("叫貨單已取消／作廢");

    });

}

// ==================================================

// 管理首頁

// ==================================================

function showManage() {

  content.innerHTML = `

    <h2>管理</h2>

    <div class="card">

      <h3>產品管理</h3>

      <p>

        新增、修改及管理產品基本資料與主要供應商。

      </p>

      <button type="button"

              onclick="showProductManage()"

              style="${primaryButton()}">

        進入產品管理

      </button>

    </div>

    <div class="card">

      <h3>供應商管理</h3>

      <p>

        建立及管理供應商資料。

      </p>

      <button type="button"

              onclick="showSupplierManage()"

              style="${secondaryButton()}">

        進入供應商管理

      </button>

    </div>

    <div class="card">

      <h3>資料統計</h3>

      <p>產品總數：${products.length} 筆</p>

      <p>供應商：${suppliers.length} 家</p>

      <p>異動紀錄：${movementRecords.length} 筆</p>

      <p>叫貨紀錄：${orderRecords.length} 筆</p>

    </div>

  `;

}

// ==================================================

// 產品管理

// ==================================================

function showProductManage(message = "") {

  content.innerHTML = `

    <h2>產品管理</h2>

    ${messageHTML(message)}

    <div class="card">

      <h3>新增產品</h3>

      <label>產品編號</label>

      <input id="newProductId"

             placeholder="例如 P0101"

             style="${fieldStyle()}">

      <label>產品名稱</label>

      <input id="newProductName"

             placeholder="輸入產品名稱"

             style="${fieldStyle()}">

      <label>產品類別</label>

      <select id="newProductCategory"

              style="${fieldStyle()}">

        ${productCategories.map(i =>

          `<option value="${escapeHTML(i)}">${escapeHTML(i)}</option>`

        ).join("")}

      </select>

      <label>溫層</label>

      <select id="newProductTemperature"

              style="${fieldStyle()}">

        ${temperatureTypes.map(i =>

          `<option value="${escapeHTML(i)}">${escapeHTML(i)}</option>`

        ).join("")}

      </select>

      <label>成本分類</label>

      <select id="newProductCost"

              style="${fieldStyle()}">

        ${costTypes.map(i =>

          `<option value="${escapeHTML(i)}">${escapeHTML(i)}</option>`

        ).join("")}

      </select>

      <label>初始庫存</label>

      <input id="newProductStock"

             type="number"

             min="0"

             value="0"

             style="${fieldStyle()}">

      <label>安全庫存</label>

      <input id="newProductSafetyStock"

             type="number"

             min="0"

             value="15"

             style="${fieldStyle()}">

      <label>單位</label>

      <select id="newProductUnit"

              style="${fieldStyle()}">

        ${units.map(i =>

          `<option value="${escapeHTML(i)}">${escapeHTML(i)}</option>`

        ).join("")}

      </select>

      <label>主要供應商</label>

      <select id="newProductSupplier"

              style="${fieldStyle()}">

        ${supplierOptions()}

      </select>

      <div id="productFormError"></div>

      <button id="addProductBtn"

              type="button"

              style="${primaryButton()}width:100%;">

        新增產品

      </button>

    </div>

    <h3>目前產品</h3>

    <div class="card">

      目前共有

      <strong>${products.length}</strong>

      筆產品

    </div>

    <div id="manageProductList"></div>

  `;

  document

    .getElementById("addProductBtn")

    .addEventListener("click", addProduct);

  renderManageProducts();

}

function productFormError(message) {

  const b =

    document.getElementById("productFormError");

  if (!b) return;

  b.textContent = message;

  b.style.color = "#b42318";

  b.style.fontWeight = "bold";

  b.style.marginBottom = "12px";

}

function addProduct() {

  const id =

    document.getElementById("newProductId").value.trim();

  const name =

    document.getElementById("newProductName").value.trim();

  if (!id || !name) {

    return productFormError(

      "請輸入產品編號及產品名稱"

    );

  }

  if (products.some(p => p.id === id)) {

    return productFormError(

      "產品編號已存在"

    );

  }

  const stock =

    Number(document.getElementById("newProductStock").value);

  const safetyStock =

    Number(document.getElementById("newProductSafetyStock").value);

  if (

    !Number.isFinite(stock) ||

    !Number.isFinite(safetyStock) ||

    stock < 0 ||

    safetyStock < 0

  ) {

    return productFormError(

      "庫存與安全庫存不可小於 0"

    );

  }

  products.push({

    id,

    name,

    category:

      document.getElementById("newProductCategory").value,

    temperature:

      document.getElementById("newProductTemperature").value,

    costType:

      document.getElementById("newProductCost").value,

    stock,

    safetyStock,

    unit:

      document.getElementById("newProductUnit").value,

    supplierId:

      document.getElementById("newProductSupplier").value

  });

  saveData();

  showProductManage(

    "產品新增完成：" +

    id +

    "｜" +

    name

  );

}

function renderManageProducts() {

  const c =

    document.getElementById("manageProductList");

  if (!c) return;

  c.innerHTML =

    products.map(p => `

      <div class="card">

        <h3>${escapeHTML(p.name)}</h3>

        <div>

          ${escapeHTML(p.id)}｜

          庫存 ${p.stock} ${escapeHTML(p.unit)}

        </div>

        <div style="margin-top:6px;">

          主要供應商：

          <strong>

            ${escapeHTML(getSupplierName(p.supplierId))}

          </strong>

        </div>

        <div style="display:flex;gap:10px;margin-top:14px;">

          <button type="button"

                  onclick="showEditProduct('${escapeHTML(p.id)}')"

                  style="${primaryButton()}flex:1;">

            編輯

          </button>

          <button type="button"

                  onclick="showDeleteProductConfirm('${escapeHTML(p.id)}')"

                  style="${dangerButton()}flex:1;">

            刪除

          </button>

        </div>

      </div>

    `).join("");

}

function showEditProduct(productId) {

  const p =

    products.find(x => x.id === productId);

  if (!p) return;

  content.innerHTML = `

    <h2>編輯產品</h2>

    <div class="card">

      <p>

        產品編號：

        <strong>${escapeHTML(p.id)}</strong>

      </p>

      <label>產品名稱</label>

      <input id="editName"

             value="${escapeHTML(p.name)}"

             style="${fieldStyle()}">

      <label>產品類別</label>

      <select id="editCategory"

              style="${fieldStyle()}">

        ${productCategories.map(i => `

          <option value="${escapeHTML(i)}"

                  ${i === p.category ? "selected" : ""}>

            ${escapeHTML(i)}

          </option>

        `).join("")}

      </select>

      <label>溫層</label>

      <select id="editTemperature"

              style="${fieldStyle()}">

        ${temperatureTypes.map(i => `

          <option value="${escapeHTML(i)}"

                  ${i === p.temperature ? "selected" : ""}>

            ${escapeHTML(i)}

          </option>

        `).join("")}

      </select>

      <label>成本分類</label>

      <select id="editCost"

              style="${fieldStyle()}">

        ${costTypes.map(i => `

          <option value="${escapeHTML(i)}"

                  ${i === p.costType ? "selected" : ""}>

            ${escapeHTML(i)}

          </option>

        `).join("")}

      </select>

      <label>目前庫存</label>

      <input id="editStock"

             type="number"

             min="0"

             value="${p.stock}"

             style="${fieldStyle()}">

      <label>安全庫存</label>

      <input id="editSafetyStock"

             type="number"

             min="0"

             value="${p.safetyStock}"

             style="${fieldStyle()}">

      <label>單位</label>

      <select id="editUnit"

              style="${fieldStyle()}">

        ${units.map(i => `

          <option value="${escapeHTML(i)}"

                  ${i === p.unit ? "selected" : ""}>

            ${escapeHTML(i)}

          </option>

        `).join("")}

      </select>

      <label>主要供應商</label>

      <select id="editSupplier"

              style="${fieldStyle()}">

        ${supplierOptions(p.supplierId)}

      </select>

      <div id="editProductError"></div>

      <div style="display:flex;gap:10px;">

        <button id="saveEditProduct"

                type="button"

                style="${primaryButton()}flex:1;">

          儲存修改

        </button>

        <button type="button"

                onclick="showProductManage()"

                style="${secondaryButton()}flex:1;">

          取消

        </button>

      </div>

    </div>

  `;

  document

    .getElementById("saveEditProduct")

    .addEventListener(

      "click",

      () => saveEditedProduct(productId)

    );

}

function saveEditedProduct(productId) {

  const p =

    products.find(x => x.id === productId);

  if (!p) return;

  const name =

    document.getElementById("editName").value.trim();

  const stock =

    Number(document.getElementById("editStock").value);

  const safetyStock =

    Number(document.getElementById("editSafetyStock").value);

  const error =

    document.getElementById("editProductError");

  if (

    !name ||

    !Number.isFinite(stock) ||

    !Number.isFinite(safetyStock) ||

    stock < 0 ||

    safetyStock < 0

  ) {

    error.textContent =

      "請確認產品名稱、庫存及安全庫存";

    error.style.color = "#b42318";

    error.style.fontWeight = "bold";

    return;

  }

  p.name = name;

  p.category =

    document.getElementById("editCategory").value;

  p.temperature =

    document.getElementById("editTemperature").value;

  p.costType =

    document.getElementById("editCost").value;

  p.stock = stock;

  p.safetyStock = safetyStock;

  p.unit =

    document.getElementById("editUnit").value;

  p.supplierId =

    document.getElementById("editSupplier").value;

  saveData();

  showProductManage(

    "產品修改完成：" +

    p.id +

    "｜" +

    p.name

  );

}

function showDeleteProductConfirm(productId) {

  const p =

    products.find(x => x.id === productId);

  if (!p) return;

  content.innerHTML = `

    <h2>刪除產品</h2>

    <div class="card">

      <h3>確定刪除這項產品？</h3>

      <p>

        <strong>${escapeHTML(p.id)}</strong>

      </p>

      <p>${escapeHTML(p.name)}</p>

      <div style="display:flex;gap:10px;margin-top:18px;">

        <button id="confirmDeleteProduct"

                type="button"

                style="${dangerButton()}flex:1;">

          確定刪除

        </button>

        <button type="button"

                onclick="showProductManage()"

                style="${secondaryButton()}flex:1;">

          取消

        </button>

      </div>

    </div>

  `;

  document

    .getElementById("confirmDeleteProduct")

    .addEventListener(

      "click",

      () => deleteProductNow(productId)

    );

}

function deleteProductNow(productId) {

  const i =

    products.findIndex(x => x.id === productId);

  if (i === -1) return;

  const p = products[i];

  products.splice(i, 1);

  saveData();

  showProductManage(

    "產品已刪除：" +

    p.id +

    "｜" +

    p.name

  );

}

// ==================================================

// 供應商管理

// ==================================================

function showSupplierManage(message = "") {

  content.innerHTML = `

    <h2>供應商管理</h2>

    ${messageHTML(message)}

    <div class="card">

      <h3>新增供應商</h3>

      <label>供應商編號</label>

      <input id="supplierId"

             placeholder="例如 S001"

             style="${fieldStyle()}">

      <label>供應商名稱</label>

      <input id="supplierName"

             placeholder="輸入供應商名稱"

             style="${fieldStyle()}">

      <label>聯絡人</label>

      <input id="supplierContact"

             placeholder="輸入聯絡人"

             style="${fieldStyle()}">

      <label>電話</label>

      <input id="supplierPhone"

             type="tel"

             placeholder="輸入聯絡電話"

             style="${fieldStyle()}">

      <label>備註</label>

      <textarea id="supplierNote"

                placeholder="輸入備註"

                style="${fieldStyle()}min-height:80px;"></textarea>

      <div id="supplierError"></div>

      <button id="addSupplierBtn"

              type="button"

              style="${primaryButton()}width:100%;">

        新增供應商

      </button>

    </div>

    <h3>供應商清單</h3>

    <div class="card">

      目前共有

      <strong>${suppliers.length}</strong>

      家供應商

    </div>

    <div id="supplierList"></div>

    <button type="button"

            onclick="showManage()"

            style="${secondaryButton()}width:100%;">

      返回管理

    </button>

  `;

  document

    .getElementById("addSupplierBtn")

    .addEventListener("click", addSupplier);

  renderSuppliers();

}

function supplierError(message) {

  const b =

    document.getElementById("supplierError");

  if (!b) return;

  b.textContent = message;

  b.style.color = "#b42318";

  b.style.fontWeight = "bold";

  b.style.marginBottom = "12px";

}

function addSupplier() {

  const id =

    document.getElementById("supplierId").value.trim();

  const name =

    document.getElementById("supplierName").value.trim();

  if (!id || !name) {

    return supplierError(

      "請輸入供應商編號及供應商名稱"

    );

  }

  if (suppliers.some(s => s.id === id)) {

    return supplierError(

      "供應商編號已存在"

    );

  }

  suppliers.push({

    id,

    name,

    contact:

      document.getElementById("supplierContact").value.trim(),

    phone:

      document.getElementById("supplierPhone").value.trim(),

    note:

      document.getElementById("supplierNote").value.trim(),

    active: true,

    createdAt:

      new Date().toLocaleString("zh-TW")

  });

  saveSuppliers();

  showSupplierManage(

    "供應商新增完成：" +

    id +

    "｜" +

    name

  );

}

function renderSuppliers() {

  const c =

    document.getElementById("supplierList");

  if (!c) return;

  if (!suppliers.length) {

    c.innerHTML =

      `<div class="card">目前尚無供應商資料</div>`;

    return;

  }

  c.innerHTML =

    suppliers.map(s => `

      <div class="card">

        <h3>${escapeHTML(s.name)}</h3>

        <div>

          編號：${escapeHTML(s.id)}

        </div>

        <div style="margin-top:6px;">

          聯絡人：

          ${s.contact ? escapeHTML(s.contact) : "－"}

        </div>

        <div style="margin-top:6px;">

          電話：

          ${s.phone ? escapeHTML(s.phone) : "－"}

        </div>

        <div style="margin-top:6px;">

          狀態：

          <strong>${s.active ? "啟用" : "停用"}</strong>

        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;">

          <button type="button"

                  onclick="showEditSupplier('${escapeHTML(s.id)}')"

                  style="${primaryButton()}">

            編輯

          </button>

          <button type="button"

                  onclick="toggleSupplier('${escapeHTML(s.id)}')"

                  style="${secondaryButton()}">

            ${s.active ? "停用" : "啟用"}

          </button>

          <button type="button"

                  onclick="showDeleteSupplierConfirm('${escapeHTML(s.id)}')"

                  style="${dangerButton()}grid-column:1 / -1;">

            刪除

          </button>

        </div>

      </div>

    `).join("");

}

function showEditSupplier(id) {

  const s =

    suppliers.find(x => x.id === id);

  if (!s) return;

  content.innerHTML = `

    <h2>編輯供應商</h2>

    <div class="card">

      <p>

        供應商編號：

        <strong>${escapeHTML(s.id)}</strong>

      </p>

      <label>供應商名稱</label>

      <input id="editSupplierName"

             value="${escapeHTML(s.name)}"

             style="${fieldStyle()}">

      <label>聯絡人</label>

      <input id="editSupplierContact"

             value="${escapeHTML(s.contact || "")}"

             style="${fieldStyle()}">

      <label>電話</label>

      <input id="editSupplierPhone"

             value="${escapeHTML(s.phone || "")}"

             style="${fieldStyle()}">

      <label>備註</label>

      <textarea id="editSupplierNote"

                style="${fieldStyle()}min-height:80px;">${escapeHTML(s.note || "")}</textarea>

      <div id="editSupplierError"></div>

      <div style="display:flex;gap:10px;">

        <button id="saveSupplierEdit"

                type="button"

                style="${primaryButton()}flex:1;">

          儲存修改

        </button>

        <button type="button"

                onclick="showSupplierManage()"

                style="${secondaryButton()}flex:1;">

          取消

        </button>

      </div>

    </div>

  `;

  document

    .getElementById("saveSupplierEdit")

    .addEventListener(

      "click",

      () => saveSupplierEdit(id)

    );

}

function saveSupplierEdit(id) {

  const s =

    suppliers.find(x => x.id === id);

  if (!s) return;

  const name =

    document.getElementById("editSupplierName").value.trim();

  if (!name) {

    const e =

      document.getElementById("editSupplierError");

    e.textContent =

      "供應商名稱不可空白";

    e.style.color = "#b42318";

    e.style.fontWeight = "bold";

    return;

  }

  s.name = name;

  s.contact =

    document.getElementById("editSupplierContact").value.trim();

  s.phone =

    document.getElementById("editSupplierPhone").value.trim();

  s.note =

    document.getElementById("editSupplierNote").value.trim();

  saveSuppliers();

  showSupplierManage(

    "供應商資料修改完成：" +

    s.name

  );

}

function toggleSupplier(id) {

  const s =

    suppliers.find(x => x.id === id);

  if (!s) return;

  s.active = !s.active;

  saveSuppliers();

  showSupplierManage(

    s.name +

    (s.active ? " 已啟用" : " 已停用")

  );

}

function showDeleteSupplierConfirm(id) {

  const s =

    suppliers.find(x => x.id === id);

  if (!s) return;

  content.innerHTML = `

    <h2>刪除供應商</h2>

    <div class="card">

      <h3>確定刪除這家供應商？</h3>

      <p>

        <strong>${escapeHTML(s.id)}</strong>

      </p>

      <p>${escapeHTML(s.name)}</p>

      <div style="display:flex;gap:10px;margin-top:18px;">

        <button id="confirmDeleteSupplier"

                type="button"

                style="${dangerButton()}flex:1;">

          確定刪除

        </button>

        <button type="button"

                onclick="showSupplierManage()"

                style="${secondaryButton()}flex:1;">

          取消

        </button>

      </div>

    </div>

  `;

  document

    .getElementById("confirmDeleteSupplier")

    .addEventListener(

      "click",

      () => deleteSupplier(id)

    );

}

function deleteSupplier(id) {

  const i =

    suppliers.findIndex(x => x.id === id);

  if (i === -1) return;

  const s = suppliers[i];

  suppliers.splice(i, 1);

  saveSuppliers();

  showSupplierManage(

    "供應商已刪除：" +

    s.name

  );

}

// ==================================================

// 啟動

// ==================================================

showHome();
