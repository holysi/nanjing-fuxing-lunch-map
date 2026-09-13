const state = { places: [], filtered: [], map: null, cluster: null, markers: [], activeId: null, view: "map" };
const $ = (selector) => document.querySelector(selector);
const categoryClass = { "健康餐": "health", "日式": "japanese", "中式": "chinese", "異國": "international", "咖啡": "coffee", "午休": "rest" };
const categoryEmoji = { "健康餐": "🥗", "日式": "🍱", "中式": "🥟", "異國": "🍛", "咖啡": "☕", "午休": "🪑" };

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function safeUrl(value) {
  try { const url = new URL(value, location.href); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}
function photoMarkup(place, className) {
  const photo = place.photos?.[0];
  const src = photo && safeUrl(photo);
  return `<div class="${className} category-${categoryClass[place.category] || "health"}"><span aria-hidden="true">${categoryEmoji[place.category] || "🍽️"}</span>${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(place.name)}照片" loading="lazy" onerror="this.remove()">` : ""}</div>`;
}
function priceLabel(place) {
  if (!place.price) return "價格待確認";
  const { min, max } = place.price;
  if (min != null && max != null) return min === max ? `NT$${min}` : `NT$${min}–${max}`;
  if (min != null) return `NT$${min} 起`;
  return "價格待確認";
}
function hoursLabel(place, period) { return place.hours?.[period] || "營業時間待確認"; }
function navigLink(place) {
  const query = encodeURIComponent(`${place.name} ${place.address}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=walking`;
}
function matchesPrice(place, filter) {
  if (filter === "all") return true;
  if (filter === "unknown") return !place.price;
  if (!place.price) return false;
  const { min = 0, max = Infinity } = place.price;
  if (filter === "under150") return min < 150;
  if (filter === "150to250") return min <= 250 && max >= 150;
  return max > 250;
}
function applyFilters() {
  const category = $("#category-filter").value;
  const price = $("#price-filter").value;
  const day = $("#day-filter").value;
  state.filtered = state.places.filter((place) => (category === "all" || place.category === category) && matchesPrice(place, price) && (day === "all" || (!place.hoursAreDelivery && !place.closedPeriods?.includes(day) && Boolean(place.hours?.[day]))));
  render();
}
function mapCard(place) {
  const kind = categoryClass[place.category] || "health";
  return `<article class="place-card" data-id="${escapeHtml(place.id)}" tabindex="0" aria-label="查看${escapeHtml(place.name)}詳細資訊">${photoMarkup(place, "card-visual")}<div class="card-main"><div class="card-top"><span class="category-tag ${kind}">${escapeHtml(place.category)}</span><span class="card-price">${escapeHtml(priceLabel(place))}</span></div><div class="card-title">${escapeHtml(place.name)}</div><div class="card-sub">${escapeHtml(place.address)}</div>${place.peerNote ? `<div class="card-peer">同學分享・${escapeHtml(place.peerNote)}</div>` : ""}</div><button class="card-arrow" type="button" tabindex="-1" aria-hidden="true">›</button></article>`;
}
function listCard(place) {
  const kind = categoryClass[place.category] || "health";
  return `<article class="list-card" data-id="${escapeHtml(place.id)}" tabindex="0" aria-label="查看${escapeHtml(place.name)}詳細資訊">${photoMarkup(place, "list-visual")}<div class="list-body"><span class="category-tag ${kind}">${escapeHtml(place.category)}</span><h3>${escapeHtml(place.name)}</h3><p>${escapeHtml(place.summary)}</p>${place.peerNote ? `<p class="peer-snippet"><strong>同學分享</strong> ${escapeHtml(place.peerNote)}</p>` : ""}<div class="list-facts"><span>平日 ${escapeHtml(hoursLabel(place, "weekday"))}</span><span>假日 ${escapeHtml(hoursLabel(place, "weekend"))}</span></div><div class="list-bottom"><strong>${escapeHtml(priceLabel(place))}</strong><button type="button" tabindex="-1">查看詳情 →</button></div></div></article>`;
}
function render() {
  const count = state.filtered.length;
  $("#result-count").textContent = `找到 ${count} 個地點`;
  const empty = `<div class="empty-state"><strong>這個條件還沒有店家</strong><span>換個類別、預算或營業日試試。</span></div>`;
  $("#map-cards").innerHTML = count ? state.filtered.map(mapCard).join("") : empty;
  $("#list-cards").innerHTML = count ? state.filtered.map(listCard).join("") : empty;
  renderMarkers();
}
function initMap() {
  if (!window.L) { $("#map-fallback").hidden = false; return; }
  state.map = L.map("map", { scrollWheelZoom: false }).setView([25.052, 121.544], 16);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }).addTo(state.map);
  if (L.markerClusterGroup) state.cluster = L.markerClusterGroup({ maxClusterRadius: 43, spiderfyOnMaxZoom: true, iconCreateFunction: (cluster) => L.divIcon({ html: `<span>${cluster.getChildCount()}</span>`, className: "place-cluster", iconSize: [42, 42] }) }).addTo(state.map);
  const stationIcon = L.divIcon({ html: '<div class="station-pin">捷</div>', className: "", iconSize: [35,35], iconAnchor: [17,17] });
  L.marker([25.052,121.544], { icon: stationIcon, zIndexOffset: -100 }).addTo(state.map).bindPopup("捷運南京復興站 G16・BR11");
  renderMarkers();
}
function renderMarkers() {
  if (!state.map) return;
  if (state.cluster) state.cluster.clearLayers();
  else state.markers.forEach((marker) => marker.remove());
  state.markers = state.filtered.filter((place) => Array.isArray(place.coordinates) && place.coordinates.length === 2).map((place) => {
    const icon = L.divIcon({ html: `<div class="map-pin ${categoryClass[place.category] || "health"}"><span>${categoryEmoji[place.category] || "🍽️"}</span></div>`, className: "", iconSize: [34,34], iconAnchor: [17,34] });
    const marker = L.marker(place.coordinates, { icon, title: place.name });
    if (state.cluster) state.cluster.addLayer(marker);
    else marker.addTo(state.map);
    const popup = document.createElement("div");
    popup.innerHTML = `<strong>${escapeHtml(place.name)}</strong><br><span>${escapeHtml(priceLabel(place))} · ${escapeHtml(place.category)}</span>${place.peerNote ? `<br><span>同學分享：${escapeHtml(place.peerNote)}</span>` : ""}<br><button class="popup-detail" type="button">查看詳情 →</button>`;
    popup.querySelector("button").addEventListener("click", () => openDetail(place.id));
    marker.bindPopup(popup);
    marker.on("click", () => { state.activeId = place.id; });
    return marker;
  });
  const points = state.markers.map((marker) => marker.getLatLng());
  if (points.length > 1) state.map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 16 });
  else if (points.length === 1) state.map.setView(points[0], 16);
  else state.map.setView([25.052, 121.544], 16);
}
function openDetail(id, updateHash = true) {
  const place = state.places.find((item) => item.id === id);
  if (!place) return;
  state.activeId = id;
  const kind = categoryClass[place.category] || "health";
  const source = safeUrl(place.sourceUrl);
  const priceNote = place.price?.note ? `（${escapeHtml(place.price.note)}）` : "";
  $("#detail-content").innerHTML = `<button class="dialog-close" type="button" aria-label="關閉詳情">×</button>${photoMarkup(place,"detail-visual")}<div class="detail-inner"><span class="category-tag ${kind}">${escapeHtml(place.category)}</span><h2 id="detail-title">${escapeHtml(place.name)}</h2><p class="detail-description">${escapeHtml(place.description || place.summary)}</p>${place.peerNote ? `<div class="peer-note"><strong>同學分享</strong><p>${escapeHtml(place.peerNote)}</p></div>` : ""}<div class="detail-facts"><div class="detail-fact"><small>平日營業</small><strong>${escapeHtml(hoursLabel(place,"weekday"))}</strong></div><div class="detail-fact"><small>假日營業</small><strong>${escapeHtml(hoursLabel(place,"weekend"))}</strong></div><div class="detail-fact"><small>價格</small><strong>${escapeHtml(priceLabel(place))} ${priceNote}</strong></div><div class="detail-fact"><small>地址</small><strong>${escapeHtml(place.address)}</strong></div></div><div class="detail-actions"><a class="primary-action" href="${escapeHtml(navigLink(place))}" target="_blank" rel="noopener noreferrer">在 Google 地圖導航 ↗</a>${source ? `<a class="secondary-action" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">資訊來源</a>` : ""}</div><div class="detail-review"><strong>評論與照片分享　即將開放</strong><p>第二階段將提供 LINE 登入後撰寫評論與上傳照片。</p></div><p class="source-line">資料查核：${escapeHtml(place.verifiedAt || "待確認")}。店家資訊可能異動，出發前請再次確認。${place.coordinatesApproximate ? "圖釘為示意位置。" : ""}</p></div>`;
  $("#detail-content .dialog-close").addEventListener("click", () => $("#detail-dialog").close());
  if (!$("#detail-dialog").open) $("#detail-dialog").showModal();
  if (updateHash) history.replaceState(null, "", `#place=${encodeURIComponent(id)}`);
}
function setView(view) {
  state.view = view;
  const isMap = view === "map";
  $("#map-view").hidden = !isMap;
  $("#list-view").hidden = isMap;
  $("#map-tab").setAttribute("aria-selected", String(isMap));
  $("#list-tab").setAttribute("aria-selected", String(!isMap));
  if (isMap && state.map) setTimeout(() => state.map.invalidateSize(), 0);
}
function bindEvents() {
  ["#category-filter", "#price-filter", "#day-filter"].forEach((selector) => $(selector).addEventListener("change", applyFilters));
  $("#clear-filters").addEventListener("click", () => { ["#category-filter", "#price-filter", "#day-filter"].forEach((selector) => $(selector).value = "all"); applyFilters(); });
  $("#map-tab").addEventListener("click", () => setView("map"));
  $("#list-tab").addEventListener("click", () => setView("list"));
  ["#map-cards", "#list-cards"].forEach((selector) => {
    $(selector).addEventListener("click", (event) => { const card = event.target.closest("[data-id]"); if (card) openDetail(card.dataset.id); });
    $(selector).addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { const card = event.target.closest("[data-id]"); if (card) { event.preventDefault(); openDetail(card.dataset.id); } } });
  });
  $("#detail-dialog").addEventListener("click", (event) => { if (event.target === $("#detail-dialog")) $("#detail-dialog").close(); });
  $("#detail-dialog").addEventListener("close", () => { if (location.hash.startsWith("#place=")) history.replaceState(null, "", location.pathname + location.search); });
  window.addEventListener("hashchange", () => { if (location.hash.startsWith("#place=")) openDetail(decodeURIComponent(location.hash.slice(7)), false); });
}
async function start() {
  bindEvents();
  try {
    const response = await fetch("./data/places.json?v=20260913-2");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.places = Array.isArray(data.places) ? data.places : [];
    $("#hero-count").textContent = `已收錄 ${state.places.length} 個午間去處`;
    applyFilters();
    initMap();
    if (location.hash.startsWith("#place=")) openDetail(decodeURIComponent(location.hash.slice(7)), false);
  } catch (error) {
    console.error("Failed to load places", error);
    $("#data-error").hidden = false;
    $("#hero-count").textContent = "店家資料讀取失敗";
    $("#map-fallback").hidden = false;
  }
}
start();
