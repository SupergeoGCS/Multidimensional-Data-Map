# 國土測繪中心 LOD1／LOD2 介接查核

查核日期：2026-10-22。結論：有官方資料與標準格式供應途徑，技術上可實作；本專案尚未取得並驗證可直接使用的現行 LOD1／LOD2 服務。介面選項已加入，尚未啟用，實際仍使用 OSM。

## 官方資料依據

- [國土測繪中心圖資網路服務及應用](https://www.nlsc.gov.tw/cl.aspx?Create=1&n=15875)：官方說明發布 I3S／3D Tiles 三維國家底圖服務。
- [114 年成果供應公告，2026-07-29](https://www.moi.gov.tw/News_Content.aspx?n=9&s=339860&sms=9009)：LOD1 與都市計畫區 LOD1／LOD2 有不同更新範圍，該次供應格式為 KMZ，公告提供申購途徑。不能據此認定目前 STR 所在範圍必有 LOD2 或可免費公開重散布。
- [官方多維度圖台](https://3dmaps.nlsc.gov.tw/FrontMap/)：頁面具 KMZ、I3S、3D Tiles 申請及外部服務載入功能；「外部服務載入」不代表官方已提供本站可用的免申請端點。
- [官方建物屬性表](https://3dmaps.nlsc.gov.tw/NLSC/uploadData/三維建物模型屬性表.pdf)：MODEL_LOD 區分 1／2／3，並提供建物高度、來源等屬性；融合版不能直接當成純 LOD1 或純 LOD2。
- [MapLibre CustomLayerInterface](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/) 與 [官方範例](https://maplibre.org/maplibre-gl-js/docs/examples/)：可透過自訂三維圖層整合 Three.js 與 3D Tiles loader；本專案目前只有 OSM fill-extrusion 及 BIM GLB，尚未實作 I3S／3D Tiles 串流渲染器。

## 實際 HTTP 證據

Python 3 urllib，無登入、無憑證、GET timeout 20–25 秒；送出 Origin: http://127.0.0.1:8765 作伺服器標頭查核，並非瀏覽器實測。

| 端點 | 結果 | 能證明的範圍 |
| --- | --- | --- |
| https://3dmaps.nlsc.gov.tw/FrontMap/ | HTTP 200；Access-Control-Allow-Origin 為 https://3dmaps.nlsc.gov.tw | 官方頁面可達；此回應不允許 localhost 跨域 fetch |
| https://3dmaps.nlsc.gov.tw/FrontMap/URBANXML.xml | HTTP 200；332797 bytes；同上 CORS；根節點為 WMTS Capabilities | 是圖台設定所指的 WMTS 清單，未見 LOD1／LOD2／SceneServer／tileset 文字；不能作為三維建物端點 |
| https://i3s.nlsc.gov.tw/i3s/nlsc3dbuilding/SceneServer/layers/0?f=pjson | HTTP 404 | 舊官方研究文件列出路徑目前不可用；不代表全部官方服務不可用 |
| https://3dmaps.nlsc.gov.tw/NLSC/Entrance | HTTP 200；官方標題；同上 CORS | 入口可達，未據此取得模型使用授權 |

摘要機器紀錄：nlsc-endpoint-probe-2026-10-22.json。未掃描或猜測其他模型端點，未複用官方網頁的金鑰、登入或代理。

## 可行實作路徑與未完成條件

1. 取得官方確認可供此專案使用的 LOD1／LOD2 服務 URL 或授權圖資樣本，釐清覆蓋範圍、更新日期、額度、公開展示／快取／衍生轉檔權限。現有資料不足以宣稱必須付費或必須申請特定 API。
2. 優先驗證 3D Tiles：根 JSON、子 tileset、實際內容與壓縮解碼資源都需可載入，查核 localhost 與正式站網域 CORS、認證、座標及垂直基準。只有根 JSON 200 不算驗收通過。
3. 使用 MapLibre custom layer + Three.js + 3D Tiles loader，依相機挑選圖磚、限制記憶體與請求量、卸載圖層時釋放資源。ECEF／地理座標須轉至本圖台 Mercator 座標；不可沿用 STR 的單模型定位矩陣。
4. 若僅有 I3S，另評估 I3S loader／轉 3D Tiles；若僅有 KMZ，取得授權後以離線前處理轉成具地理定位與屬性的分塊資產。單純 fill-extrusion 無法保留 LOD2 屋頂。
5. 選取官方來源時隱藏 OSM 周邊建物，保留 BIM 與自訂建築；檢查重複量體、定位／高程、2D／3D 切換、資料覆蓋不足及載入失敗回復。使用者可見的 LOD1／LOD2 名稱需依 MODEL_LOD 或正式服務說明核實。

目前通過：官方供應途徑確認、部分 HTTP 連通性查核、來源選項介面。尚未通過：有效模型端點、模型內容下載、瀏覽器 CORS、渲染與視覺驗收、專案範圍 LOD2 覆蓋及展示授權。
