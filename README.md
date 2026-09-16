# 午間漫步｜南京復興午餐地圖

公開網址：[https://holysi.github.io/nanjing-fuxing-lunch-map/](https://holysi.github.io/nanjing-fuxing-lunch-map/)

可直接放在 GitHub Pages 的靜態網站。第一階段提供地圖、列表、店家詳細資料、類別／價格／平假日篩選及 Google 地圖步行導航。資料保存在 [`data/places.json`](data/places.json)，不需要資料庫。

地圖預設以南京復興站為中心、約 50 公尺比例尺探索附近店家。比例尺會隨縮放更新；套用篩選時保留目前地圖位置與縮放，不會自動跳到遠方店家。

## 本機預覽

在專案資料夾執行 `node dev-server.js`，再開啟 `http://127.0.0.1:8000/`。請使用本機伺服器，直接用 `file://` 開啟會使瀏覽器無法讀取 JSON。

## 發布到 GitHub Pages

1. 建立一個 GitHub repository，將本專案所有檔案推送到 `main` 分支。
2. 在 repository 的 **Settings → Pages → Build and deployment**，選擇 **Deploy from a branch**、`main`、`/(root)`，然後儲存。
3. 等待 GitHub 完成發布。網址通常是 `https://<使用者名稱>.github.io/<repository名稱>/`。本專案使用相對路徑，能在專案型 Pages 網址正常載入。

更新 `main` 的檔案後，Pages 會重新發布。這個版本沒有建置步驟，也不需要 API 金鑰。

## 新增或修改店家

開啟 [店家資料管理頁](admin.html)，可新增店家、選擇既有店家載入後修改、在地圖點選座標，以及拖曳或輸入位置來調整首頁順序。修改會暫存在目前瀏覽器，也能匯入先前下載的 JSON 繼續。完成後按「下載 places.json」，或複製並檢查完整 JSON，由管理者以檔案取代專案中的 `data/places.json`，提交並推送到 GitHub。這個管理頁沒有登入、審核或直接發布功能；任何人都能在自己的瀏覽器編輯副本，但不能修改公開網站。

同一個瀏覽器開啟首頁時，會自動讀取該瀏覽器的管理頁草稿，並顯示「正在預覽本機草稿」。這可用來測試新店與圖釘；其他使用者及公開網站不會看到草稿，直到資料檔被更新並發布。

首頁的地圖右側卡片和列表均依 `places` 陣列順序顯示。沒有座標的新店仍可在卡片和列表出現，但地圖不會顯示圖釘；請在管理頁選點並核對位置後再發布。

編輯 `data/places.json` 的 `places` 陣列。每間店都需有不重複的 `id`、`name`、`category`、`summary`、`description`、`address`、`hours`、`price`、`photos`、`sourceUrl`、`verifiedAt`。`category` 使用 `健康餐`、`日式`、`中式`、`異國`、`咖啡` 或 `午休`。同學的主觀推薦可另外放在 `peerNote`，網站會清楚標示「同學分享」；`sourceUrl` 則是店名、地址等公開資訊的查核來源。`hours.weekday`、`hours.weekend` 填入午餐營業時段字串；不知道時填 `null`，該店便不會出現在該營業日的篩選結果。確知假日休息時可填 `"weekend": "週六、日休"` 並加 `"closedPeriods": ["weekend"]`。如果時段僅供外送參考，請加 `"hoursAreDelivery": true`，使平假日營業篩選不把它當作現場營業。`price` 可填 `{"min": 140, "max": 199, "note": "官網部分餐點定價"}`；不知道時填 `null`。價格篩選依價格範圍是否相交判斷。

照片放在 `images/`，例如 `images/my-lunch.jpg`，並在 `photos` 填入 `["./images/my-lunch.jpg"]`。請使用自己拍攝或取得授權的照片；沒有照片時網站會顯示料理插圖。`coordinates` 採 `[緯度, 經度]` 格式，確認精確位置後將 `coordinatesApproximate` 設為 `false`。目前首批圖釘是示意座標；Google 地圖導航使用地址搜尋。

修改店家資訊時，也請更新 `verifiedAt` 與 `sourceUrl`。營業時間與價格會變動，發布前應向店家再次確認。對不上目前門牌或店名的同學推薦，先記在 [`data/pending-recommendations.md`](data/pending-recommendations.md)，不要直接在地圖放示意店家。

## 第二階段規劃

GitHub Pages 只有靜態檔案，無法安全地直接儲存使用者資料或 LINE 密鑰。第二階段需新增後端或雲端服務：LINE Login 驗證、評論文字與照片儲存、投稿待審清單、管理者審核與刊登。審核通過的店家才能進入公開資料；評論與照片須經基本濫用防護。前端目前只顯示「即將開放」，不會假裝已送出資料。

各階段的功能、資料流程與完成標準見 [`ROADMAP.md`](ROADMAP.md)。

## 資料與地圖

首批與同學推薦資訊於 2026-09-13 根據店家、外送平台或公開頁面整理，來源可在各店詳情開啟。部分營業時間、價格及精確座標尚待實地確認，介面會明確標示。精確圖釘參考 OpenStreetMap 的店家地點資料；地址可確認但無精確座標時使用附近示意位置。地圖使用 [Leaflet](https://leafletjs.com/) 與 [OpenStreetMap](https://www.openstreetmap.org/copyright) 圖資；顯示地圖需要網路連線。
