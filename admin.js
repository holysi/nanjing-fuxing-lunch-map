const DRAFT_KEY = "nanjing-fuxing-places-draft-v1";
const DATA_URL = "./data/places.json?v=20260916-4";
const admin = { data: null, map: null, pin: null, dragFrom: null, editingId: null };
const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function status(message, error = false) {
  const target = $("#admin-status");
  target.textContent = message;
  target.classList.toggle("error", error);
}

function validateData(data) {
  if (!data || !Array.isArray(data.places)) throw new Error("檔案需要包含 places 店家陣列。");
  const ids = new Set();
  for (const place of data.places) {
    if (!place || typeof place.id !== "string" || !place.id.trim() || !place.name || !place.address) throw new Error("店家缺少 ID、店名或地址。");
    if (ids.has(place.id)) throw new Error(`重複的店家 ID：${place.id}`);
    ids.add(place.id);
  }
  return data;
}

function updateSummary(draft = false) {
  $("#admin-count").textContent = `目前 ${admin.data.places.length} 個地點`;
  $("#draft-label").textContent = draft ? "修改已暫存於此瀏覽器，尚未發布" : "目前以公開資料為基礎";
  $("#reset-draft").hidden = !draft;
  $("#export-json").disabled = false;
  $("#copy-json").disabled = false;
  $("#json-preview").value = exportText();
}

function exportText() {
  return JSON.stringify({ ...admin.data, updatedAt: todayInTaipei() }, null, 2) + "\n";
}

function saveDraft(message) {
  try {
    admin.data.updatedAt = todayInTaipei();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(admin.data));
    status(message || "修改已暫存於此瀏覽器；下載 JSON 後才能交給管理者發布。");
  } catch {
    status("修改已留在此分頁，請先下載 JSON；瀏覽器無法儲存草稿。", true);
  }
  updateSummary(true);
}

function renderOrder() {
  const places = admin.data.places;
  $("#order-list").innerHTML = places.map((place, index) => `<li class="order-item" data-index="${index}" draggable="true"><span class="drag-handle" aria-hidden="true">⋮⋮</span><span class="order-number">${index + 1}</span><div class="order-name"><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(place.category || "未分類")} · ${escapeHtml(place.address)}</small></div><label class="position-label">順序 <input type="number" min="1" max="${places.length}" value="${index + 1}" aria-label="${escapeHtml(place.name)}的首頁順序" /></label><button type="button" class="position-apply" data-move="position" aria-label="將${escapeHtml(place.name)}移至輸入的位置">移動</button><div class="order-arrows"><button type="button" data-move="up" aria-label="${escapeHtml(place.name)}上移" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-move="down" aria-label="${escapeHtml(place.name)}下移" ${index === places.length - 1 ? "disabled" : ""}>↓</button></div></li>`).join("");
}

function renderEditChoices() {
  const select = $("#edit-place");
  select.innerHTML = `<option value="">選擇一間店家以載入資料</option>${admin.data.places.map((place) => `<option value="${escapeHtml(place.id)}">${escapeHtml(place.name)}｜${escapeHtml(place.address)}</option>`).join("")}`;
  select.value = admin.editingId || "";
}

function movePlace(from, to) {
  const places = admin.data.places;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= places.length || to >= places.length || from === to) return;
  places.splice(to, 0, places.splice(from, 1)[0]);
  renderOrder();
  saveDraft(`已將「${places[to].name}」移至第 ${to + 1} 位。`);
}

function todayInTaipei() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function makeId() {
  let id;
  do { id = `place-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`; }
  while (admin.data.places.some((place) => place.id === id));
  return id;
}

function imagePaths(value) {
  return String(value ?? "").split(/[\n,;]/).map((path) => path.trim()).filter(Boolean);
}

function isImagePath(value) {
  return /^(https?:\/\/|\.\/images\/)/i.test(value);
}

function coverSettings(form) {
  return {
    x: Number(form.get("coverFocalX")), y: Number(form.get("coverFocalY")), zoom: Number(form.get("coverZoom"))
  };
}

function updateCoverPreview() {
  const form = $("#place-form");
  const image = $("#cover-preview-image");
  const source = form.elements.coverPhoto.value.trim();
  const { x, y, zoom } = coverSettings(new FormData(form));
  $("#cover-focal-x").value = `${x}%`;
  $("#cover-focal-y").value = `${y}%`;
  $("#cover-zoom").value = `${zoom}%`;
  image.hidden = !source;
  $("#cover-preview-empty").hidden = Boolean(source);
  if (!source) return;
  image.src = source;
  image.style.objectPosition = `${x}% ${y}%`;
  image.style.transform = `scale(${zoom / 100})`;
  image.style.transformOrigin = `${x}% ${y}%`;
}

function placeFromForm(form, existing = null) {
  const value = (name) => String(form.get(name) ?? "").trim();
  const name = value("name");
  const address = value("address");
  if (admin.data.places.some((place) => place.id !== existing?.id && place.name === name && place.address === address)) throw new Error("相同店名與地址已在清單中。");

  const latText = value("latitude");
  const lngText = value("longitude");
  if (Boolean(latText) !== Boolean(lngText)) throw new Error("請同時填寫緯度與經度，或兩欄都留白。");
  const latitude = latText ? Number(latText) : null;
  const longitude = lngText ? Number(lngText) : null;
  if (latText && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) throw new Error("經緯度超出有效範圍。");

  const minText = value("priceMin");
  const maxText = value("priceMax");
  if (maxText && !minText) throw new Error("填寫最高價格時，也請填最低價格。");
  const min = minText ? Number(minText) : null;
  const max = maxText ? Number(maxText) : null;
  if (min != null && (min < 0 || !Number.isInteger(min) || (max != null && (!Number.isInteger(max) || max < min)))) throw new Error("請確認價格為非負整數，且最高價格不低於最低價格。");

  const sourceUrl = value("sourceUrl");
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) throw new Error("資訊來源請填入 http 或 https 網址。");
  const coverPhoto = value("coverPhoto");
  const pricePhotos = imagePaths(form.get("pricePhotos"));
  const position = coverSettings(form);
  if (coverPhoto && !isImagePath(coverPhoto)) throw new Error("店面封面請填入 http(s) 網址或 ./images/ 路徑。");
  if (pricePhotos.some((photo) => !isImagePath(photo))) throw new Error("每張餐點／價格圖片都請填入 http(s) 網址或 ./images/ 路徑。");

  const weekendClosed = form.has("weekendClosed");
  const place = {
    ...existing,
    id: existing?.id || makeId(), name, category: value("category"), summary: value("summary"),
    description: value("description") || value("summary"), address,
    coordinates: latText ? [latitude, longitude] : null,
    coordinatesApproximate: form.has("coordinatesApproximate"),
    hours: { weekday: value("weekday") || null, weekend: weekendClosed ? "週六、日休" : value("weekend") || null },
    price: min == null ? null : { min, max, note: value("priceNote") || "請以店家現場為準" },
    photos: existing?.photos || [], sourceUrl: sourceUrl || null, verifiedAt: todayInTaipei()
  };
  if (coverPhoto) place.coverPhoto = coverPhoto; else delete place.coverPhoto;
  if (coverPhoto) place.coverPosition = position; else delete place.coverPosition;
  if (pricePhotos.length) place.pricePhotos = pricePhotos; else delete place.pricePhotos;
  if (value("peerNote")) place.peerNote = value("peerNote"); else delete place.peerNote;
  if (weekendClosed) place.closedPeriods = ["weekend"]; else delete place.closedPeriods;
  return place;
}

function resetForm() {
  const form = $("#place-form");
  form.reset();
  admin.editingId = null;
  $("#edit-place").value = "";
  $("#form-kicker").textContent = "ADD A PLACE";
  $("#add-title").textContent = "新增店家";
  $("#form-submit").textContent = "加入店家與排序清單 →";
  $("#cancel-edit").hidden = true;
  $("#place-form [name=weekend]").disabled = false;
  updateCoverPreview();
  if (admin.pin) { admin.pin.remove(); admin.pin = null; }
}

function loadPlaceForEdit(id) {
  const place = admin.data.places.find((item) => item.id === id);
  if (!place) return resetForm();
  const form = $("#place-form");
  admin.editingId = place.id;
  form.elements.name.value = place.name || "";
  form.elements.category.value = place.category || "健康餐";
  form.elements.address.value = place.address || "";
  form.elements.summary.value = place.summary || "";
  form.elements.description.value = place.description || "";
  form.elements.peerNote.value = place.peerNote || "";
  form.elements.weekday.value = place.hours?.weekday || "";
  const closed = Boolean(place.closedPeriods?.includes("weekend"));
  form.elements.weekendClosed.checked = closed;
  form.elements.weekend.value = closed ? "" : place.hours?.weekend || "";
  form.elements.weekend.disabled = closed;
  form.elements.priceMin.value = place.price?.min ?? "";
  form.elements.priceMax.value = place.price?.max ?? "";
  form.elements.priceNote.value = place.price?.note || "";
  form.elements.sourceUrl.value = place.sourceUrl || "";
  form.elements.coverPhoto.value = place.coverPhoto || place.photos?.[0] || "";
  form.elements.coverFocalX.value = place.coverPosition?.x ?? 50;
  form.elements.coverFocalY.value = place.coverPosition?.y ?? 50;
  form.elements.coverZoom.value = place.coverPosition?.zoom ?? 100;
  form.elements.pricePhotos.value = (place.pricePhotos || []).join("\n");
  form.elements.latitude.value = place.coordinates?.[0] ?? "";
  form.elements.longitude.value = place.coordinates?.[1] ?? "";
  form.elements.coordinatesApproximate.checked = Boolean(place.coordinatesApproximate);
  $("#edit-place").value = place.id;
  $("#form-kicker").textContent = "EDIT A PLACE";
  $("#add-title").textContent = `修改：${place.name}`;
  $("#form-submit").textContent = "儲存店家修改 →";
  $("#cancel-edit").hidden = false;
  if (place.coordinates) setPin(place.coordinates[0], place.coordinates[1], true);
  else if (admin.pin) { admin.pin.remove(); admin.pin = null; }
  updateCoverPreview();
}

function setPin(latitude, longitude, pan = false) {
  if (!admin.map || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
  if (admin.pin) admin.pin.setLatLng([latitude, longitude]);
  else admin.pin = L.marker([latitude, longitude]).addTo(admin.map);
  if (pan) admin.map.panTo([latitude, longitude]);
}

function initPicker() {
  if (!window.L) { $("#picker-fallback").hidden = false; return; }
  admin.map = L.map("picker-map", { scrollWheelZoom: false }).setView([25.052, 121.544], 17);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }).addTo(admin.map);
  admin.map.on("click", ({ latlng }) => {
    $("#place-form [name=latitude]").value = latlng.lat.toFixed(7);
    $("#place-form [name=longitude]").value = latlng.lng.toFixed(7);
    setPin(latlng.lat, latlng.lng);
  });
  ["latitude", "longitude"].forEach((name) => $("#place-form [name=" + name + "]").addEventListener("change", () => {
    const latitude = Number($("#place-form [name=latitude]").value);
    const longitude = Number($("#place-form [name=longitude]").value);
    if ($("#place-form [name=latitude]").value && $("#place-form [name=longitude]").value) setPin(latitude, longitude, true);
  }));
}

function bindEvents() {
  $("#place-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const existing = admin.editingId ? admin.data.places.find((place) => place.id === admin.editingId) : null;
      const place = placeFromForm(new FormData(event.currentTarget), existing);
      if (existing) admin.data.places.splice(admin.data.places.indexOf(existing), 1, place);
      else admin.data.places.unshift(place);
      renderOrder();
      renderEditChoices();
      saveDraft(existing ? `「${place.name}」的修改已暫存。下載 JSON 並更新 GitHub 後才會公開。` : `「${place.name}」已加入第 1 位。下載 JSON 並更新 GitHub 後才會公開。`);
      resetForm();
      $("#place-form [name=name]").focus();
    } catch (error) { status(error.message, true); }
  });
  $("#edit-place").addEventListener("change", (event) => loadPlaceForEdit(event.target.value));
  $("#cancel-edit").addEventListener("click", () => {
    resetForm();
    status("已切換為新增店家。未儲存的修改不會套用。");
  });
  $("#place-form [name=weekendClosed]").addEventListener("change", (event) => {
    const weekend = $("#place-form [name=weekend]");
    weekend.disabled = event.target.checked;
    if (event.target.checked) weekend.value = "";
  });
  ["coverPhoto", "coverFocalX", "coverFocalY", "coverZoom"].forEach((name) => $("#place-form [name=" + name + "]").addEventListener("input", updateCoverPreview));
  $("#order-list").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-move]");
    if (!button) return;
    const row = button.closest("li");
    const index = Number(row.dataset.index);
    if (button.dataset.move === "position") {
      const target = Number(row.querySelector("input[type=number]").value);
      if (!Number.isInteger(target) || target < 1 || target > admin.data.places.length) {
        status(`順序請填 1 到 ${admin.data.places.length}。`, true);
        renderOrder();
        return;
      }
      movePlace(index, target - 1);
    } else movePlace(index, index + (button.dataset.move === "up" ? -1 : 1));
  });
  $("#order-list").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("input[type=number]")) {
      event.preventDefault();
      event.target.closest("li").querySelector(".position-apply").click();
    }
  });
  $("#order-list").addEventListener("dragstart", (event) => {
    const row = event.target.closest("li[data-index]");
    if (!row) return;
    admin.dragFrom = Number(row.dataset.index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(admin.dragFrom));
  });
  $("#order-list").addEventListener("dragover", (event) => {
    const row = event.target.closest("li[data-index]");
    if (!row) return;
    event.preventDefault();
    row.classList.add("drop-target");
  });
  $("#order-list").addEventListener("dragleave", (event) => {
    const row = event.target.closest("li[data-index]");
    if (row && !row.contains(event.relatedTarget)) row.classList.remove("drop-target");
  });
  $("#order-list").addEventListener("drop", (event) => {
    const row = event.target.closest("li[data-index]");
    if (!row) return;
    event.preventDefault();
    movePlace(admin.dragFrom, Number(row.dataset.index));
    admin.dragFrom = null;
    row.classList.remove("drop-target");
  });
  $("#order-list").addEventListener("dragend", () => {
    admin.dragFrom = null;
    $("#order-list").querySelectorAll(".drop-target").forEach((row) => row.classList.remove("drop-target"));
  });
  $("#export-json").addEventListener("click", () => {
    const blob = new Blob([exportText()], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "places.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status("已下載 places.json。請由管理者取代專案檔案並提交到 GitHub，網站才會更新。");
  });
  $("#copy-json").addEventListener("click", async () => {
    const content = exportText();
    try {
      await navigator.clipboard.writeText(content);
      status("已複製完整 JSON。請由管理者貼到 GitHub 的 data/places.json 並提交，網站才會更新。");
    } catch {
      $("#json-preview").closest("details").open = true;
      $("#json-preview").focus();
      $("#json-preview").select();
      status("瀏覽器未允許直接複製；已選取下方 JSON，請手動複製。", true);
    }
  });
  $("#import-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      admin.data = validateData(JSON.parse(await file.text()));
      renderOrder();
      resetForm();
      renderEditChoices();
      saveDraft(`已匯入「${file.name}」，目前 ${admin.data.places.length} 個地點。`);
    } catch (error) { status(`匯入失敗：${error.message}`, true); }
    event.target.value = "";
  });
  $("#reset-draft").addEventListener("click", async () => {
    if (!confirm("確定捨棄這個瀏覽器的草稿，重新載入網站上的店家資料嗎？")) return;
    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      admin.data = validateData(await response.json());
      localStorage.removeItem(DRAFT_KEY);
      renderOrder();
      resetForm();
      renderEditChoices();
      updateSummary(false);
      status("已重新載入目前公開資料。");
    } catch (error) { status(`無法重新載入：${error.message}`, true); }
  });
}

async function start() {
  bindEvents();
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const published = validateData(await response.json());
    let draft;
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) draft = validateData(JSON.parse(stored));
    } catch { status("瀏覽器草稿格式有誤，已改用公開資料；你仍可匯入有效的 JSON。", true); }
    admin.data = draft || published;
    renderOrder();
    renderEditChoices();
    updateSummary(Boolean(draft));
    if (draft) status("已還原這個瀏覽器保存的草稿。需要最新公開資料時，請按「重新載入公開資料」。");
    initPicker();
  } catch (error) {
    status(`店家資料讀取失敗：${error.message}。可匯入有效的 places.json 繼續編輯。`, true);
    $("#admin-count").textContent = "資料尚未載入";
    initPicker();
  }
}

start();
