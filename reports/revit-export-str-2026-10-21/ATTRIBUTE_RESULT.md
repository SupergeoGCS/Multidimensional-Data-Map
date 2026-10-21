# IFC 屬性配套驗證（2026-10-21）

- 入口：`skills/bim-maplibre-preprocess/scripts/package_ifc.py`，本機 Python／IfcOpenShell 0.8.5；新幾何轉換使用 IfcConvert 0.9.0post1。
- 真實既有 GLB 重用：`native-attribute-package.json` 核對原始 IFC／GLB SHA-256 後產生 `artifacts/revit-str-2026-10-21/native-internal.attributes.json`（6,948,120 bytes）。8,536 IFC 元素，8,243 GLB mesh-bearing nodes 全數對應 GUID。
- 新轉換端到端：`package-e2e.json` 與 `package-e2e-conversion.json`。新目錄 `artifacts/native-package-e2e-2026-10-21/` 產生 GLB／屬性；同為 8,536 元素與 8,243 匹配節點。容器與屬性配對成功，不代表所有幾何已通過驗收。
- 9 項 Node 測試、12 項 Python unittest、app.js 語法與 git diff --check 通過。涵蓋來源／GLB 雜湊失配拒絕、GUID 節點要求、中文屬性、配套版本及伺服器 allowlist。
- IAB 實際重新載入 `http://127.0.0.1:8765/?model=native`，點擊 canvas 中央：GUID `3_h01_B617Du0GXgCl2FSG` 顯示「混凝土-結構柱:90X50cm:142213」、IfcColumn、Revit ID 142213、R1F、混凝土 - 現場澆灌及 Pset／Qto。觀測 console errors 為空。這是抽點顯示驗證，非全量屬性語意或幾何驗收。
- 屬性值保留 IFC 來源單位，圖台有提示；未宣稱數量值均為公尺。
- skill 官方 quick_validate.py 啟動時缺少 PyYAML（ModuleNotFoundError: yaml），未完成官方格式驗證；未為此下載套件。腳本與真實資料流程已驗證。
- 模型／逐構件屬性留在被忽略的本機目錄；無上傳、無重掃 RVT。保留本機服務供使用者檢視。
