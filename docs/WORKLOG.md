# 工作紀錄

## 2026-10-21：簡化屬性面板
- 依使用者註解，移除「屬性名稱／數值內容」表頭列，保留下方屬性鍵值、面板標題與取消選取功能。

## 2026-10-21：左下構件屬性表格
- 依頁面註解，以較大的左下浮動面板替換底部單行提示，包含表頭、可捲動雙欄表格、空狀態與取消選取；窄螢幕縮小面板，保留模型操作空間。
- 從選中 mesh／父節點擷取現有名稱、IFC 類型、原生 GUID 與 GLB extras；不推算未提供 BIM 語意，文字以 textContent 呈現、過長值截斷。
- 2 項 Node 測試及 app.js 語法檢查通過。IAB 點選 native GUID 與開源 IFCCOLUMN，各有正確來源資料；確認面板寬 380px、左下 16px 與捲動設定，取消選取正常，console error 空。保留開源模型選取示例供使用者查看。

## 2026-10-21：同頁雙 BIM 資料圖層
- 依使用者需求，兩方案各自資料卡／地圖開關／三維檢視。來源快取彼此隔離，切換檢視釋放 renderer／controls／材質副本，匯入 GLB 保留兩內建資料卡。
- 地圖 custom layer 內兩個來源 group 獨立可見，跨 2D／3D／底圖切換保留狀態；暫放明示各自置中、底部對齊，未聲稱精確套合。
- 5 項 Node 測試及語法檢查通過；IAB 完成雙來源檢視、臨時暫放、獨立開關及跨模式保留，無 console error。清除測試位置後留雙卡頁面，未取得截圖目視驗收。

## 2026-10-21：開啟原生 IFC 成果站台供使用者測試
- 增加固定 allowlist `/assets/native-str.glb` 與 `?model=native`，讀取已存在的原生內部原點 GLB，自動開三維視窗，修正原生候選／定位與品質標示。原先開源預覽入口保留。
- Browser file chooser 未觸發，改為固定本機資產路徑。主機 127.0.0.1:8765 啟動成功；瀏覽器 loading 隱藏、canvas 與原生標示確認、console error 空。截圖兩次失敗，不重試，不標記截圖目視驗收通過。
- Node 語法及 3 項 server 測試通過。使用者要立即測試，保留原生測試頁與本機服務。

## 2026-10-21：原生 IFC／GLB 轉換與兩座標基準比較
- 使用者完成共用座標版 IFC，另提供內部原點版。兩份以 IfcOpenShell 0.8.5 本機解析，IFC4、16 樓層、8,536 構件 GUID 完全一致，單位公分；共用座標大型位移、缺少 CRS 與疑似樣板經緯度已記錄，不猜 EPSG。
- 新增 convert_ifc.py 的重複 --tool-arg，實際以 --site-local-placement／--use-element-guids／2 threads 將兩份轉為獨立 GLB。兩次 exit 0／容器通過，約 25.4／23.5 秒；同一樓板 92848 的一處 opening subtraction 失敗，未標幾何通過。
- 新增 tools/audit_ifc_glb.py，實際核對第一份的 8,243 GUID nodes、約 172,172 三角形、局部範圍與梁柱板牆樣本；sidecar 留 artifacts。初步缺少 7 node 全為 Axis／Annotation，不等於實體漏轉。之後補 body-only 統計未重跑；全量頂點比較未完成。
- 保留 RESULT.md 與明確 pending 閘門。未替換站台預設、未聲稱瀏覽器原生模型驗證通過；下一步是局部樓板開口核對與候選 GLB 視覺檢查。

## 2026-10-21：開始正式匯出，先修復 LocalDB 阻礙
- 使用者回覆已開啟 IFC 對話框後，Windows 工具聚焦仍只取得宿主主畫面、無可用匯出對話框樹；未猜測設定或發送盲目匯出指令。已建立 IFC 輸出資料夾與 EXPORT_NOW.md 完整交接，待使用者完成手動原生匯出後再本機轉換，不反覆要求只開同一對話框。
- 使用者關閉試用提示後，重新開啟 STR 副本；LocalDB 修復後實際通過三維初始化並顯示宿主結構。Manage Links 核對 9 CAD 參照警告、1 AR 模型卸載，保留原狀。已有事前 ACCEPTANCE.md，但逐構件／IFC 尚未驗證。桌面匯出選單與快捷鍵搜尋操作失效／逾時，已請使用者手動開啟 IFC 匯出視窗；未變更快捷鍵、未匯出 IFC。
- 等待使用者關閉試用資訊期間，從 IfcOpenShell 官方文件連結取得 IfcConvert 0.9.0post1 Windows ZIP（30,341,869 bytes），官方 GitHub 發行 digest SHA-256 核對一致；工具放 artifacts/tools/ifcconvert-0.9.0post1，未改 PATH。執行 --version 得 0.9.0post1+b5e509b、--help exit 0 並確認 GLB 支援；UTF-16 stdout 轉存 UTF-8 說明與工具 manifest。沒有正式 IFC，真實轉換未執行。
- 使用者明確核准強制結束後，已終止 PID 19532，重啟 Revit PID 3340 並進入可回應首頁；LocalDB 仍 Running。試用提示屬另一 WebView 程序，Windows 工具拒絕點擊且 Escape 無效，已請使用者手動關閉後接續；尚未重開模型或產生 IFC。
- 使用者授權開始 STR IFC／GLB 階段。既有 Revit 長時間無回應，視窗啟用逾時；沒有重複發送匯出指令。
- 針對既有日誌與原生設定診斷，確認 SteelConnections2027 LocalDB 15.0 實例不存在；官方資料也記載同類灰畫面／SQLLocalDB 問題。
- 使用既有 SQL Server 2019 15.0.4382.1 工具補建並啟動指定實例，查詢 Running。未刪除資料庫或變更登錄設定；原 Revit 未恢復。
- 強制結束 PID 19532 的動作遭自動核准審查拒絕，未執行，已向使用者請求明確允許遺失未儲存升版狀態後重開副本。未另開實例、未輸出正式 IFC／GLB。接續見 reports/revit-export-str-2026-10-21/RECOVERY.md。

## 2026-10-21：Revit 安裝後接續原生匯出
- 確認 C:/Program Files/Autodesk/Revit 2027/Revit.exe，FileVersion 27.3.0.28；IFC UI DLL 同版本。已啟動 GUI，顯示 2027.3 非商用試用版、剩餘 30 天。
- 重新執行 prepare_revit_export.py，來源 STR 雜湊符合既有盤點；建立 reports/revit-export-str-2026-10-21 交接包。
- 複製 STR 至 artifacts/revit-str-2026-10-21，核對副本雜湊一致；只以副本進入 Revit 2021→2027 升級載入，未回存 references。
- 原生檔名欄 set_value 不可用，改為畫面確認焦點與鍵入路徑，成功開始升級；目前更新參考階段，尚未完成模型開啟、連結核對、IFC 匯出或幾何驗證。詳見 SESSION.md；不得將元件存在當成轉換成功。
- 後續升版出現 0 錯誤／22 警告，已保存 upgrade-warnings.html，未修復或刪除幾何；分析模型另有升級影響提示。進入 {3D} 初始化但尚無模型畫面，暫時沒有回應。程序 CPU／日誌仍推進；最新日誌出現 SQLLocalDB 鋼構功能異常警告，IFC 影響未知。保留載入作業與未提交紀錄，下一次先確認該視窗及日誌，不重複開檔。

## 2026-10-20：實作向量底圖與周邊立體建物
- 新增 map-basemaps.js、Liberty 樣式快照／來源雜湊、周邊 OSM 建物開關及向量／點陣／無底圖選單。BIM 開關明確標為「顯示 BIM 模型」。
- 官方樣式第一次以 Python 預設 UA 取得 403；改為識別本機檢視台的 UA 後成功。瀏覽器正常載入公開向量圖磚、標籤與 attribution，未改用其他資料服務。
- 採單一樣式、可見性切換；實際匯入 sample.geojson 並暫放 BIM 至操作測試座標後，依序切換點陣／無底圖／向量，保留資料與位置。BIM 關閉時 OSM 建物可繼續顯示；周邊建物關閉不會移除 BIM。
- 3 項 Node 回歸測試、10 項 Python 測試與 app.js 語法檢查通過；已測操作未觀測到 console error／warn。測試座標不代表原始模型真實位置，未寫入預設。

## 2026-10-20：站台更名
- 依使用者頁面註解，將頁首與瀏覽器分頁標題改為「多維度空間資料檢視圖台」，同步操作說明及狀態紀錄。

## 2026-10-20：建立本機地圖資料檢視站台
- 新增 web/（MapLibre、Three.js 與本機 vendor）、tools/serve_map.py、啟動地圖.cmd、GeoJSON 操作示意與 MAP_SITE.md。
- 實際瀏覽器測試：街道圖載入、2D／3D 切換、STR 局部模型載入／線框／重設／點選、手動位置加入地圖、切回 2D、GeoJSON 匯入／移除及 GLB 替換，未觀測到 console error。點選模型回報混凝土矩形梁／IFCBEAM。
- 初次 sandbox 內啟動的 loopback server 無法被 IAB 存取，停止後改為經允許的 sandbox 外 loopback server，瀏覽器成功連線；無對外綁定。
- 10 項單元測試與 app.js 語法檢查通過。新增靜態目錄邊界／路徑穿越／明確 asset 路由保護；現有模型與原始來源均未修改。幀率與精確定位尚未驗收。
- 最後窄視窗檢查發現模型構圖裁切，改依視窗長寬與包圍球距離自動適配；重新載入並在實際窄視窗確認完整入鏡，無 console error。

## 2026-10-20：實際執行 rvt-rs 0.6.0 STR 試驗
- Python wheel（約 2.6 MB）與 Windows CLI（約 22.3 MB）下載到 artifacts/tools/rvt-rs；CLI 發行壓縮包雜湊與 GitHub 官方 release digest 一致。最初 pip 安裝遇系統 Temp 權限，改用專案 artifacts/tool-tmp 後成功，未修改全域 Python。
- Python 診斷成功；接著針對包圍盒問題提出讀取 saved meshes 的第二條件，實際執行 rvt-ifc --mode geometry --saved-meshes 與 rvt-gltf --saved-meshes。兩項 exit code=0，耗時約 17.29／8.52 秒。
- IFC 28,699,029 bytes；GLB 5,268,112 bytes，基本 GLB 結構驗證通過。依 GLB 產生並檢視本機靜態預覽；不是瀏覽器或地圖測試。
- 結構配置可辨識，但 5,962／8,373 bodies 是包圍盒；saved meshes 在此 2021 檔未生效。保存兩組 diagnostics、日誌、工具與產物雜湊及命令至 reports/rvt-rs-str-0.6.0。
- 原始 STR SHA-256 與原盤點一致。依條件未更換正式 skill，保留 preview-only 產物與正式 IFC 交接路線；禁止把試驗成功或工具 score=1.0 寫成正式幾何通過。

## 2026-10-20：執行 STR 原生匯出準備
- 使用者要求建立並執行下一階段，並確認目前沒有 Revit。
- 先查 Windows 安裝清單、執行程序、常見路徑、Revit 登錄項目與 PATH，未找到可用候選；新增可重現的 prepare_revit_export.py（PATH／標準目錄／Revit 登錄／明確指定路徑）。
- 實際對 A18A-CO-STR-60_.rvt 重算雜湊，核對既有盤點一致；生成 reports/revit-export-str-2026-10-20 的 export-job.json、placement.json、HANDOFF.md。待核對外部參照 12 筆。結果 awaiting_tool，原生幾何匯出未執行。
- 7 項單元測試通過，包含來源變更拒絕、交接包覆寫拒絕、缺工具時不宣稱匯出及未知座標保留；官方 skill 格式驗證通過。原始 RVT 未修改，無模型上傳、無新套件下載。

## 2026-10-20：本機處理與資源使用原則
- 依使用者建議，將本機 Python CLI、按瓶頸評估 Rust、摘要進對話及階段結果重用原則加入 skill 與專案規則。
- 檢查現有腳本：來源雜湊區塊讀取、循序盤點、GLB BIN seek 與轉換日誌落盤已具備；未宣稱原生轉換器具有固定記憶體，也未宣稱自動快取已實作。
- 本次僅調整流程文件，未重跑大型 RVT、未下載依賴或上傳模型。

## 2026-10-20
- 從只有 references/ 的資料夾建立前處理與狀態管理骨架。
- 以唯讀 CFB parser 盤點四個 RVT，記錄完整 SHA-256、版本與歷史連結狀態。原始檔未修改。
- 建立 bim-maplibre-preprocess skill、Revit 匯出交接規格、IFC→GLB 腳本與品質閘門。
- 端到端仍待 Revit 開啟／匯出、IfcConvert 真實轉檔與地圖驗收；工具可用性與座標資訊尚未確認。
- 五項單元測試與官方 skill 格式檢查通過；已建立 main 基線提交 18cbded（本機快照作者 Codex，不更動使用者全域 Git 身份）。
- skill 已安裝到使用者 skills 目錄；建立並附加受管工作樹，開發分支 codex/bim-preprocess。詳細路徑與接續方式見 WORKTREES.md。
- 擷取四檔內嵌預覽供後續對照；STR 與 AR 目視可見建築群三維畫面，但不據此判定實際幾何完整。

## 2026-10-21：屬性納入完整前處理
- 新增 package_ifc.py：編排 IFC→GLB、成功轉換報告／來源與輸出雜湊核對、GUID 屬性擷取與配套報告；既有成功幾何可重用，未知 mesh GUID／版本失配拒絕。
- 真實重用與新轉換端到端均成功：8,536 IFC 元素、8,243 幾何節點全部匹配，屬性包約 6.9 MB。入口命令與資料契約寫入 skill references/attributes.md。
- 原生圖層載入配套屬性前核對 GLB SHA-256。IAB 抽點結構柱顯示中文名稱、Revit ID、樓層、材料與 IFC 屬性／數量集；無 console error。9 項 Node、12 項 Python 測試及 JS 語法通過。
- 官方 skill 格式驗證器缺 PyYAML 而未執行完成，沒有為此下載套件。保留此限制，不標示通過。幾何正式驗收與地理座標契約仍未通過；沒有重掃或修改原始 RVT。
- 工作位置為主工作區 main，既有 codex/bim-preprocess 工作樹未合併。本次未 commit；本機服務持續供使用者測試。證據見 reports/revit-export-str-2026-10-21/ATTRIBUTE_RESULT.md。
- 已同步 SKILL.md、package_ifc.py、convert_ifc.py 與 attributes.md 到使用者已安裝 skill，逐檔 SHA-256 相同。

## 2026-10-21：精簡使用者構件屬性
- 依使用者頁面註解，面板保留資料來源、名稱、IFC 類型、GUID、Revit ID、樓層與材料；隱藏原始 Pset／Qto、單位提示及任意 GLB extras，完整前處理屬性包不變。
- 更新既有 3 項屬性測試並通過；IAB 重新載入、抽點混凝土結構柱，確認僅七個基本資訊列。工作區 main，未 commit。

## 2026-10-21：自訂建築第一版
- 新增 custom-buildings.js／CSS 工作區、custom-building-geometry.js、parcel-import.js，將基地匯入、宗地選擇、地圖繪製、地上住宅與地下室量體、本機與 JSON 存取接入既有圖台。
- 地籍支援 GeoJSON／ZIP Polygon SHP、WGS84／TWD97 121與119。保留孔洞與來源屬性，未知 CRS 拒絕猜測。矩形不越出宗地；限制頂點數與解壓大小，沒有下載套件或上傳資料。
- 初次 npm 來源查詢因受限網路失敗；申請下載被自動核准審查拒絕，改為無依賴本機解析。未繞過下載拒絕。
- IAB 前段驗證示意 8層32戶地下2層、樓層篩選、存檔／刪除／還原成功；截圖見到量體。後續發現 extrusion height 應為累計頂高，已修正並以整合測試確認；地下室改整層。最新 IAB getTab 被網址政策阻擋，未嘗試繞過，最新瀏覽器實際點選及檔案 chooser 保留未驗證。
- 全部 24 項 Node 測試、12 項 Python 測試通過；詳見 docs/CUSTOM_BUILDINGS.md。工作區 main，既有 codex/bim-preprocess 工作樹未合併，未 commit。下一步使用者以真實地籍操作驗證。

## 2026-10-21：修正自訂建築按鈕樣式
- 匯入 JSON 的 label 按鈕原本繼承 file-control 上邊距且沒有原生 button 圓角，造成與匯出按鈕不齊；統一列內邊距、伸展、圓角與置中，保留透明檔案選擇器覆蓋及鍵盤焦點提示。
- 自訂建築按鈕文字提高為 14px、最小高度 44px；共用主要按鈕提高為 13px／42px，小螢幕模型操作按鈕提高為 12px。CSS 局部修改，未新增測試；git diff --check 核對，瀏覽器因先前網址政策阻擋未再嘗試。main 未提交。

## 2026-10-21：匯入按鈕高度二次修正
- 前次 row 子元素 margin:0 被後面的 .file-control margin-top:9px 以相同 specificity 覆蓋，造成同列按鈕仍有高度差。改用 .building-editor .studio-button-row > .button 明確統一 margin:0、height/min-height:44px 與 flex 對齊。已核對 CSS 級聯，git diff --check 通過；畫面待使用者重整確認。

## 2026-10-21：移除英文裝飾副標
- 依使用者要求移除頁首 SPATIAL DATA WORKSPACE、側欄 WORKSPACE / 01、屬性 FEATURE INSPECTOR、模型 MODEL EXPLORER、自訂建築 BUILDING STUDIO / 01；中文標題及資料來源／檔案格式名稱保留。靜態搜尋確認無殘留，git diff --check 通過。main 未提交。

## 2026-10-21：資料卡片收折與間距
- 兩個 BIM 資料卡加入獨立收折／展開按鈕、aria-expanded 及 aria-controls；收折時保留名稱與圖層顯示開關，不更動地圖可見狀態。卡片間距增加為 18px。JS 語法、HTML 包覆與 whitespace 檢查通過；未執行新瀏覽器驗證。main 未提交。

## 2026-10-21：收折箭頭置中
- 移除字元箭頭，改 CSS 偽元素以兩段邊框繪製 chevron；由 aria-expanded 切換旋轉，使用幾何中心補償 2px，避免字型基線偏移。保留按鈕 accessible name，JS 語法與 diff --check 通過。main 未提交。

## 2026-10-21：移除資料卡綠色狀態點
- 依使用者要求，移除兩張 BIM 資料卡中未連動真實狀態的綠點；保留圖層顯示開關與收折操作。靜態核對無程式依賴該點；main 未提交。

## 2026-10-21：資料卡顯示開關可讀性
- 兩張 BIM 卡片文字統一為「顯示於地圖」；文字 14px、checkbox 20×20px、列高至少 36px。局部 CSS 不影響其他開關。靜態核對與 diff --check 通過，main 未提交。

## 2026-10-21：側欄定位文字可讀性
- 定位說明、欄位標籤、數字輸入與相關控制調為 14px，標題 15px；周邊環境說明及開關同步放大，匯入說明與側欄頁尾至少 12px。僅樣式修改，git diff --check 通過；main 未提交。

## 2026-10-21：統一側欄說明字級
- 自訂建築入口說明與側欄介紹統一 14px／1.8 行高；資料卡來源與指標標籤 12px、品質說明 13px，避免其他說明仍過小。僅 CSS，diff --check 通過；main 未提交。

## 2026-10-21：側欄底部文字放大
- 本機資料與底圖來源兩行說明統一為 14px／1.9 行高，覆寫 muted 子元素字級並保留長來源名稱換行空間；diff --check 通過。main 未提交。

## 2026-10-21：統一模型檢視按鈕文案
- 兩張 BIM 資料卡的按鈕皆改為「檢視模型」，保留各自來源與既有開啟行為。靜態核對及 diff --check 通過；main 未提交。

## 2026-10-21：側欄四區分組
- 以語意 section／中文標題將自訂建築與 BIM 卡片歸為「資料」，另分「定位」「環境」「外部資料」。每區加入編號、淡底、邊框、標題分隔線及區塊留白，保留所有控制項 ID 與圖層操作。保持資料卡來源及原本收折功能；資料入口說明字級維持 14px。靜態 HTML 結構與 diff --check 核對，未宣稱瀏覽器畫面驗收。main 未提交。

## 2026-10-21：左側功能圖示列
- 四區改為最左側常駐圖示分頁（資料／定位／環境／外部資料），一次只顯示對應內容；使用本機 inline SVG 並保留中文標籤與 title。
- 分頁僅切換 hidden，不重建控制項或地圖；保留設定、卡片收折及各區捲動位置。支援方向鍵、Home／End；小螢幕點擊功能圖示才開啟面板。
- 新增 sidebar-tabs.js 與針對單一面板顯示、控制項保留、捲動與鍵盤操作的測試，1 項通過；app.js 語法與 diff --check 通過。未重新嘗試先前被網址政策阻擋的瀏覽器操作，畫面待使用者重整確認。main 未提交。

## 2026-10-21：功能模組標題字級一致
- 定位／環境的標題包在 span，原先被 .panel-label>span 的狀態字級覆蓋；針對 block-heading-title 提高 specificity，統一為與資料／外部資料一致的 19px／650 字重，狀態徽章維持原字級。diff --check 通過；main 未提交。

## 2026-10-21：移除側欄底部說明
- 依使用者要求移除 sidebar-footer（本機資料與底圖連線說明）整個區塊，地圖原有來源 attribution 保留。diff --check 通過；main 未提交。

## 2026-10-21：自訂建築獨立功能
- 功能列在資料下方新增「自訂建築」圖示，完整編輯器移入左側 tabpanel；資料頁移除原入口按鈕及說明，避免重複入口。切換其他功能時取消繪製，既有建築與輸入保留。
- 自訂建築面板改為側欄正常排版，窄欄按鈕可換行等高；地圖縮放改用對稱留白，不再預留右側浮動面板空間。
- 分頁與建築整合測試 2 項通過，JS 語法及 whitespace 檢查通過；畫面待使用者確認。main 未提交。

## 2026-10-21：圖層數量徽章
- 資料圖層右側改為小圓角方形徽章「2項」，同步調整匯入／移除時數量文字格式，不再補前置零。JS 語法與 diff --check 通過；main 未提交。

## 2026-10-21：自訂建築納入資料清單
- 自訂建築生成／載入後同步到「資料」卡片，標示類型「自訂建築」、樓層／住宅戶數；具獨立顯示開關、收折、檢視模型與編輯功能。點選住宅屬性同樣顯示類型「自訂建築」。
- 本機儲存成功後切回資料頁；地圖準備好時自動讀取既有本機設定並建立圖層與卡片。JSON 匯入／刪除同步清單；可見狀態納入存檔。
- 資料頁數量統計內建 BIM＋自訂建築，外部 GeoJSON 仍歸外部資料，不計入此區。來源資料均留本機。
- 擴充整合測試，核對類型、戶數、獨立隱藏／檢視、重新初始化自動還原與穩定 ID；2 項相關測試、JS 語法與 diff --check 通過。未執行最新瀏覽器驗證。main 未提交。

## 2026-10-21：自訂建築入口預設新增
- 功能列點選自訂建築時清除目前編輯身份／基地，重置參數並顯示新增模式；既有建築仍保留於資料與地圖。資料卡編輯改為先切分頁，再載入指定建築，維持明確的編輯入口。擴充整合測試確認新增後為兩個不同 ID、原模型未覆寫；測試／JS 語法／diff --check 通過。main 未提交。

## 2026-10-21：繪製轉折點與面積
- 新增獨立繪製圖層，從第一點顯示轉折圓點（實心起點），兩點顯示線段，三點後顯示有效多邊形與估算面積。面積同步呈現在地圖浮動資訊與側欄；交叉或重複頂點提示無效，完成／取消時清除草稿標記。最多 500 點。
- 整合測試涵蓋一點／三點標記、面積與完成清理，通過；JS 語法與 diff --check 通過，最新畫面尚未自動驗證。main 未提交。

## 2026-10-21：面積標籤置於多邊形中心
- 有效繪製範圍以面積質心定位面積標籤；凹形質心落在外部時，選取範圍內靠近中心的位置。標籤依 map.project 對應畫面座標，隨 move／resize 更新。不足三點／無效範圍仍顯示上方提示，側欄保留點數與面積資訊。
- 新增矩形質心／凹形內部定位測試，整合測試核對標籤座標；9 項相關測試與 diff --check 通過。main 未提交。

## 2026-10-21：拖曳繪製轉折點
- 繪製中的圓點可滑鼠／觸控拖曳，移動同步更新多邊形、面積與標籤；拖曳暫停 dragPan 並在結束還原原狀態，處理視窗外放開／失焦與取消，抑制放開時誤新增頂點。
- 整合測試核對拖動座標造成面積更新、地圖平移停用／還原、放開不增加頂點，通過；語法與 diff --check 通過，最新滑鼠瀏覽器畫面未自動驗證。main 未提交。

## 2026-10-21：簡化手繪完成面積資訊
- 手繪基地完成後的 parcel-info 僅顯示「手繪區域面積：數值 m²」，來源座標等資訊仍保存在資料中，匯入地籍說明維持原設定。整合測試核對文案通過。main 未提交。

## 2026-10-21：自訂建築入口回到頂端
- 自訂建築分頁每次選取時捲動位置設為 0，不再還原舊捲動位置；其他分頁仍保留原行為。2 項分頁測試通過。main 未提交。

## 2026-10-22：自訂建築 hover 與點選高亮
- 自訂住宅以穩定 unitId 作為 GeoJSON feature id，2D／3D 色彩依 feature-state 呈現。Hover 樓層淡綠、目前戶亮綠；點擊後該戶金色、所屬樓層淡金並保留，滑鼠移開只清除 hover。點其他戶切換選取，空白地圖／關閉屬性／Escape 可取消。
- 繪製／拖曳轉折點時不觸發住宅 hover。樓層篩選或移除模型時清除不可見住宅的高亮身份，避免其他模型誤亮。
- 整合測試核對穩定 ID、同層與單戶 hover、移開後點選狀態保留；測試、JS 語法與 diff --check 通過。最新 WebGL 畫面尚未自動驗證，main 未提交。

## 2026-10-22：高亮未呈現的 ID 對接修正
- 使用者回報 hover／點選色彩未呈現。檢查發現來源未宣告 promoteId，而住宅 id 是 UUID 衍生文字；在 studio-housing GeoJSON source 明確設定 promoteId:'unitId'，使 tile／feature-state 共用同一識別欄位。
- 先前 mock 僅接收狀態，未檢查 source ID 對接，因此不能證明渲染有效。本次加強 mock：缺少 promoteId 或狀態 ID 不對應來源住宅時直接失敗；整合測試與 JS 語法通過。
- 依據 MapLibre 官方來源定義 https://maplibre.org/maplibre-style-spec/sources/ 的 promoteId 規格。最新 WebGL 畫面仍未自動驗證，待使用者重整實測；若仍失敗，下一步需取得實際 rendered feature id／feature-state 與 console 證據，不重複盲改顏色。main 未提交。

## 2026-10-22：版本快照提交
- 使用者要求先 commit 一版，提交目前圖台、自訂建築／地籍匯入、雙 BIM 與 IFC 屬性流程、測試及小型報告文件。原始 RVT／IFC、GLB 與 artifacts/data 產物維持忽略。
- 提交前完整檢查：27 項 Node、12 項 Python（合計 39）通過，git diff --check 通過；既有 geometry acceptance 與最新高亮 WebGL 視覺確認仍未通過，未擴大宣稱。
- 工作分支 main；提交識別以 git log -1 為準，未推送遠端。其他工作樹未變更。
- 提交後的完整新增檔檢查另發現 ifcconvert-help.txt 有 CRCRLF 換行造成 whitespace 診斷；已僅正規化換行並去除行尾空白，修正納入同一筆本機提交。
