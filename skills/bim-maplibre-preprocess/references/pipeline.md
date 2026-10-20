# 前處理執行規格

## Revit 匯出交接
1. 使用來源相容的 Revit 版本，在副本開啟；有升版時記錄版本且不回存來源。確認開啟錯誤、專業別、樓層、梁／柱／樓板／牆與三維視圖。先 STR，再 AR，最後依需求加入 MEP／LS。
2. 檢查 Manage Links，對照盤點檔的 RVT／DWG 參照；另外在 Revit 盤點材質資產路徑與其他外部資源。audit JSON 僅含 TransmissionData 的外部檔案參照，並非完整材質或外部伺服器資源清單。逐一標記「已重新定位並驗證」、「不影響本次幾何且排除」、「缺少且影響交付」。不能只按同專業檔名重新連結。
3. 為每個專業建立專用三維匯出視圖。記錄 section box、phase、design option、workset、category visibility、detail level；不能把視圖隱藏誤認為模型沒有構件。移除不需要的家具／鋼筋等應在視圖層處理並記錄。
4. 各專業分開匯出，預設只匯出宿主，避免 AR 引用 STR 後又載入 STR 造成重複；需要連結時另訂明確清單與 transform。記錄 Revit build、IFC exporter 版本、IFC schema／view、屬性與數量設定、匯出視圖、連結選項、來源 SHA-256、匯出時間。IFC4 或 IFC2x3 以實際工具鏈測試選擇，不能僅憑版本較新判定較好。

## 定位契約（地圖驗收前必填，未知填 null）
每個資產保存 `placement.json`：來源 CRS（含 EPSG 或明確定義）、來源長度單位、垂直基準、內部原點／Project Base Point／Survey Point、真北旋轉、各專業到共同座標的 4×4 transform、GLB local→ENU 的 4×4 transform、anchor longitude／latitude／height、控制點清單、量測誤差與容許值。明確記錄矩陣行列順序、作用方向與軸向。

不要把 TWD97 東北坐標當作經緯度，也不要把平面地圖投影誤差當成模型尺度。先判斷 IFC 的 IfcMapConversion／IfcProjectedCRS、IfcSite 與 placements 是否有效。若只能人工定位，標記 provisional，保存控制點與方法；不能宣稱測量級定位。

渲染幾何保持接近局部原點，使用公尺，將真實位置放在 transform；避免浮點精度抖動。不可對每個專業各自取包圍盒中心後直接重疊。若轉換器改軸或單位，記錄並補償；不要重複施加 IFC 地理定位。MapLibre 使用經緯度與海拔 anchor，再以自訂圖層矩陣換到地圖座標。地形高度與模型高程需使用一致基準，確認地下室與地形遮擋符合需求。

## 幾何、語意與效能
- IFC→GLB 前後比對包圍盒、單位、構件數與樓層；至少抽查梁、柱、樓板、開口、樓梯或實際存在的代表性構件。預先記錄預期數量／容許差及排除清單，不能驗完才調整標準。
- IFC GUID、Revit UniqueId／ElementId（若匯出有保留）、類別、樓層、材料、必要屬性抽取為 sidecar。保存 `來源sha256 + 專業 + GUID` 與 GLB node／mesh／primitive／instance 的對應。不能假設 IfcConvert 預設命名一定完整保留 GUID；實際讀 GLB 與 IFC 核對。合批或簡化後若失去身份，明確標記只提供外觀展示，或另做 picking 資產。
- 檢查材質、透明度、法線、紋理；記錄 GLB 大小、節點／mesh／三角形數、耗時、瀏覽器與顯示卡、測試設備、載入時間和操作幀率。先量測，再決定是否簡化、壓縮、分樓層、分棟或 3D Tiles；不承諾特定壓縮率或檔案大小。
- 基礎轉換腳本只做容器驗證；需要完整 glTF validation 時使用版本固定的 Khronos glTF Validator，保存輸出。壓縮後確認瀏覽器 loader 與 decoder 一致並重新驗收。

## MapLibre 驗收清單
在 MapLibre GL JS 的 custom layer（renderingMode=3d）整合 Three.js／GLTFLoader，鎖定相容版本。MapLibre 渲染與 Three.js 共用 WebGL context，正確處理 renderer 狀態及資源釋放；render callback 依使用版本文件撰寫。

每個項目保存 pass/fail/not_run 與證據：
- 正常載入且無 console／CORS／資源遺失錯誤；平移、縮放、俯仰、旋轉時模型固定於同地點。
- 不同專業控制點重合；地圖位置、方向、尺寸與高程達到事先約定容許值。
- 代表構件與開口可見；地形、地下室、遮擋與深度正確。
- 若要求查詢，點選抽查構件返回正確 GUID 與屬性；MapLibre queryRenderedFeatures 不會自動辨識 Three.js mesh，需另實作 raycast／picking。
- 目標設備的載入耗時、互動幀率與記憶體符合事先約定目標；圖層移除／重加／style reload 後不洩漏資源。

## 官方依據（2026-10-20 查核）
- Revit IFC 匯出：https://help.autodesk.com/cloudhelp/2021/ENU/Revit-DocumentPresent/files/GUID-6EB68CEC-6C17-4B16-A509-30537F666C1F.htm
- IfcConvert：https://docs.ifcopenshell.org/ifcconvert/usage.html
- IfcOpenShell serializer 設定：https://docs.ifcopenshell.org/ifcopenshell/serialiser_settings.html
- MapLibre + Three.js：https://maplibre.org/maplibre-gl-js/docs/examples/globe-3d-model/
- MapLibre + 3D Tiles：https://maplibre.org/maplibre-gl-js/docs/examples/add-3d-tiles-3d-objects-and-models-using-threejs/

執行時核對安裝版本；此清單不是工具相容性的測試證據。
