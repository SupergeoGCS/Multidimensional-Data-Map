# 從原始 RVT 獨立萃取共用座標

目的：RVT 是唯一萃取輸入；原生 IFC 是獨立驗證答案，不能用來搜尋已知數值、補缺欄位或替換有效位置。

## 實測支援與輸出

- `rvt-rs 0.6.0` Python bindings、Revit 2021：唯讀解析 Formats schema，移除串流分頁校驗區，逐 gzip member 有界解壓；用 ElementHeader、宣告 ID、InstanceInfo／SymbolInfo frame 與有效位置追蹤建立記錄關聯。
- 輸出 GeoLocation 命名位置、ActiveGeoLocationTrackingElement 的有效／專案位置、GeoSite 經緯度與原始 CRS 字串、來源 SHA-256、記錄偏移及局部→共用 4×4 公尺矩陣。
- 保留其他場址的未選取 header；不把歷史／連結場址缺 body 當成有效場址。相關場址缺失、歧義、非剛體矩陣或未知 schema 必須失敗，不回退單位矩陣。
- 目前不解譯非空 CRS 字串為 EPSG，不取得垂直基準。空字串輸出 `crs:null`，數值看似 TWD97 仍只能作使用者指定假設。
- 這是「定位記錄萃取」，不代表 RVT 幾何完整、地圖精確定位或所有 Revit 2021 檔案都支援。其他 Revit／reader 版本明確拒絕，需新增 profile 與真實樣本驗證。

## 執行

在有相依套件的本機執行；每次使用新的報告路徑，不覆寫證據。沒有現成 reader 時先回報依賴，勿上傳模型。

```powershell
python scripts/extract_rvt_georeference.py --source <原始.rvt> --module-dir <rvt-0.6.0-python目錄> --output <rvt-座標.json>
python scripts/verify_rvt_georeference.py --extracted <rvt-座標.json> --ifc <原生共用座標.ifc> --module-dir <IfcOpenShell目錄> --output <比對.json>
```

兩個程序分開：第一步沒有 IFC 參數、沒有已知座標輸入，也不讀之前的候選定位報告。第二步比較 IFC site placement 與各筆 RVT 矩陣，平移容許值預設 1 mm，旋轉矩陣最大元素差 1e-8；記錄兩份輸入雜湊，不改寫萃取結果。

要交付地圖候選時，可執行 `scripts/export_rvt_placement.py --extracted <報告> --validation <比對> --location-id <已核對ID> --assume-crs EPSG:3826 --output <候選.js>`。這一步從 RVT 報告取矩陣，IFC 比對只作閘門；報告雜湊不符或選取位置未匹配即拒絕。非有效位置需額外加 `--allow-non-active` 明示選擇；這不會改寫 RVT 或提升地理驗收狀態。CRS 假設與來源缺 CRS 分開記錄。

## 判讀與下游閘門

- `extracted_crs_not_confirmed`：已從 RVT 取得記錄與轉換，仍缺已確認 CRS。不能自動當真實地理位置。
- `matched_active_location`：RVT 有效位置符合 IFC；仍需獨立核對 CRS、垂直基準與控制點。
- `matched_named_location_active_differs`：某命名位置符合 IFC，但目前有效位置不同。列明名稱／ID與差值，要求釐清選用哪筆，不自動換有效位置。
- `no_matching_location` 或非零退出：不可交付為已驗證定位。保存錯誤與來源版本，針對記錄／單位／位置選擇診斷，不改值湊答案。

本專案實測：STR 的「原始位置」ID 233312 與原生 IFC 相符；RVT 有效位置「A18A-S」ID 1509 的平面與旋轉一致，但高度相差 70.32 m。RVT GeoSite 的 CRS 字串空白、經緯度為美國樣板值，因此 EPSG:3826 與真實基地仍須核對，不能因數值吻合就升格驗收。

## 維護

本專案 `tools/` 為開發入口；相同版本腳本隨 skill 的 `scripts/` 一起交付，更新時同步並核對內容。`probe_rvt_coordinates.py` 僅研究工具，其無身分的數值候選不得作正式萃取結果。

串流與 schema 規則參考 rvt-rs v0.6.0（Apache-2.0）；授權與聲明見 [rvt-rs-LICENSE.txt](rvt-rs-LICENSE.txt)、[rvt-rs-NOTICE.txt](rvt-rs-NOTICE.txt)。
