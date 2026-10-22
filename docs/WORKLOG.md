# 工作紀錄

## 2026-10-22：修正單層檢視灰色頂面
- 診斷 custom-buildings.js render：separated 原僅判斷非地下且不是頂樓，在單層模式仍將白模減高 5cm 並放置整片 #8f969c 灰色分隔量體，造成頂樓以外皆灰。
- 增加 filter==='above' 條件，單層不生成分隔薄層、不縮減白模高度；全部模式維持分層區隔，保留 0.65 白模透明度。
- 擴充既有編輯器測試確認隔離 7 樓時無灰色分隔且高度完整，原全部模式 7 片分隔測試保留。Node 測試與 git diff --check 通過，尚未本次 WebGL 目視驗收。未提交／發布。

## 2026-10-22：補齊 Revit IFC 資料卡座標系統
- 前次僅更新 open-placement-note，原生卡沒有對應節點。本次新增 native-placement-note，兩卡統一由 setStrCoordinateNotesVisible 控制確認定位／手動暫放／清除位置時的顯示狀態。
- Node 定位及接受紀錄測試 5 項通過，app.js 語法與 git diff --check 通過；尚未本次瀏覽器目視驗收，未提交／發布。

## 2026-10-22：資料卡僅顯示適用座標系統
- 依使用者標記將 open-placement-note 改為「座標系統：TWD97 / TM2 121（EPSG:3826）」。純文字調整，git diff --check 通過，未新增測試；尚未本次瀏覽器目視驗收，未提交／發布。

## 2026-10-22：停用編輯建築切換選單
- saved-building-select 加上 disabled，標籤改「目前編輯建築」，搭配可讀的唯讀外觀；原程式仍可更新目前建築名稱，使用者由資料卡編輯指定建築。
- 執行 tests/custom-building-editor.test.mjs 既有編輯流程測試與 git diff --check 通過；局部欄位顯示調整未新增測試，尚未本次瀏覽器目視驗收。未提交／發布。

## 2026-10-22：增加定位面板操作間距
- 針對 placement-panel 增加相鄰按鈕 12px、表單上方 18px、表單套用鈕上方 6px 與底部控制列上方 18px 留白，避免確認定位與地圖指定位置按鈕緊貼。
- 純 CSS 調整，git diff --check 通過；未新增測試，尚未本次瀏覽器目視驗收。未提交／發布。

## 2026-10-22：隱藏定位面板冗長說明
- 對 placement-description 加入 hidden，保留原定位流程及狀態徽章。git diff --check 通過；局部 HTML 顯示調整未新增測試，尚未本次瀏覽器目視驗收。未提交／發布。

## 2026-10-22：環境資料來源選單符合站台風格
- 修正新增 select 未套用既有表單外觀：補滿寬、內距、14px 文字、淺色邊框、圓角與 SVG 下拉箭頭，加入滑入／鍵盤焦點及 forced-colors 原生箭頭回復。未改資料來源或選項啟用狀態。
- 純 CSS 調整；git diff --check 通過，未新增測試，尚未本次瀏覽器目視驗收。未提交／發布。

## 2026-10-22：NLSC 三維建物資料選項與有界介接查核
- 查官方服務介紹、114 年成果供應公告、三維圖台及 MapLibre 官方自訂圖層文件。新增來源選單：OSM 可用；LOD1／LOD2 disabled 並明示尚未啟用，顯示官方入口與資料條件。
- Python urllib HTTP 查核：FrontMap／NLSC Entrance 200，送 localhost Origin 時 ACAO 仍為官方域；公開設定指向 URBANXML.xml，200／332797 bytes，解析證實是 WMTS 清單而非模型端點。舊文件 I3S endpoint 404。證據詳見 reports/nlsc-building-feasibility-2026-10-22.md 與 JSON 摘要。未下載模型或複用金鑰。
- 一次把 HTML 中 JavaScript 設定當 JSON 解析失敗（JSONDecodeError，非嚴格 JSON）；此前已擷取所需 CAPABILITY URL，後續直接查核 XML，不重試相同解析方式。現有證據不足以斷言所有三維服務不支援跨域。
- HTML 結構與選項狀態檢查、既有 map-basemaps Node 測試、git diff --check 通過。模型串流、瀏覽器 CORS 與 WebGL 視覺驗收尚未完成；阻礙為缺少有效模型服務／授權樣本。未提交／發布。

## 2026-10-22：放大地圖底部狀態資訊
- 依使用者標記調整 map-footer：桌面文字 13px、窄螢幕 12px，提高文字對比與字重，增加內距、最小高度並允許換行，方便判讀座標與相機資訊。
- git diff --check 通過；純 CSS 調整未新增測試，尚未瀏覽器目視驗收。未提交／發布。

## 2026-10-22：加入資料圖層全部收折按鈕
- 在資料圖層標題與項目數旁加入「全部收折」，每次點擊查詢目前展開的卡片並觸發既有收折事件，涵蓋後續新增的自訂建築卡；保留圖層顯示勾選狀態。
- 新增按鈕樣式及無障礙名稱。node --check web/app.js 與 git diff --check 通過；此局部介面操作未另新增測試，未進行本次瀏覽器目視驗收。未提交／發布。

## 2026-10-22：落實使用者 STR 定位裁定
- 新增 web/str-placement-acceptance.js，將目前 RVT「原始位置」233312／EPSG:3826 的專案確認記為 user_decision，與原始萃取報告分開。綁定 RVT SHA、報告 SHA、位置、CRS、矩陣，資料變更時拒絕套用確認定位。
- app.js 套用前檢查接受紀錄；更新定位徽章、說明、地圖提示、套用按鈕及 STR 資料卡。開源／原生沿用既有共用矩陣與模型雜湊檢查，不重跑幾何、不改原始資料。
- 新增接受與失效條件測試；Node 執行 tests/str-placement-acceptance.test.mjs 及 tests/native-candidate-placement.test.mjs 共 5 項全通過，node --check web/app.js 通過。未重跑 Python 萃取測試（本次未改萃取器），未進行本次 WebGL 目視驗收。累積修改未提交／推送／發布。

## 2026-10-22：補完RVT獨立定位前處理與標準答案驗證
- 使用者指定RVT為唯一萃取來源，IFC只驗證。前輪520解壓錯誤來自未移除分頁校驗區；依rvt-rs0.6.0規則65249 stored／64896 payload修正後，主要partition3385 members完整解壓、0錯誤。逐member對全部剩餘資料切片的O(n²)成本改為64KiB分塊inflate，保留64MiB單member上限。
- 解析Formats定義ordinal（含inline base）、ElementHeader及宣告ID，再追ActiveGeoLocationTrackingElement→GeoLocation→GeoSite，核對InstanceInfo／SymbolInfo，讀原始12-double變換並反算公尺矩陣。不以IFC數字搜尋或回填。
- 失敗：先假設父參照全null遇747810失敗，放寬參照核對仍失敗，改診斷發現為其他歷史／連結site僅有header。改先從active／project根追相關site，其餘保留未選header。第三次233312 frame首字為0而非FFFFFFFF；停止重試、逐筆快取診斷後僅接受已觀測兩種旗標，其餘frame仍嚴格拒絕，保留raw值不猜語意。
- 從原始RVT獨立取得A18A-DD-AR、專案、原始位置、A18-1、A18A-S共5位置；有效1509。由skill/scripts入口實跑成功，輸出最終extract報告，再獨立讀共用座標IFC作標準答案。原始位置233312誤差4.69e-10m、旋轉差3.33e-16，active A18A-S高程差70.32m，明示matched_named_location_active_differs。
- CRS字串空白與美國樣板經緯度如實保留，crs:null／垂直基準未知。候選輸出鎖報告SHA、要求已匹配ID與明確CRS假設，非有效位置另加--allow-non-active。地圖改從RVT報告生成候選，不再複製IFC位移常數；保留有效位置與所選位置差異。
- 依skill-creator補入漸進式參考、5份自包含腳本、授權／聲明，與已安裝skill同步。工具／skill腳本一致性納入測試，未改其他介面metadata。
- 窄測試10項先通過；完整批次含最終skill萃取、IFC比對、候選輸出、Python27、Node40，非零即停止，成功後才同步安裝副本。第18次shell輸出收取遭loop guard限制，改定點核對最終JSON、候選存在及安裝最後7份文件內容一致，證實批次已越過全部測試閘門；未重跑或廣搜。
- 最新報告rvt-georeference-final-2026-10-22.json及rvt-georeference-final-validation-2026-10-22.json；來源RVT／IFC／GLB未改寫。幾何保真、正式地理驗收與其他RVT版本仍未完成，未提交／推送。

## 2026-10-22：獨立RVT座標萃取研究（未完成）
- 使用者指出沿用IFC不符合需求，目標改為開源讀取原始RVT的場址／共用座標，IFC僅可作獨立驗證。現行顯示候選來源不變，不宣稱已獨立萃取。
- 查核固定rvt-rs0.6.0官方source reference_points.rs，其通用欄位投影與此Revit2021實際schema不同。本機schema_json讀到GeoLocation／GeoSite／BasePoint等；decoded_elements 8519項僅材料及建築構件，定位目標0項。結果快取在artifacts，避免重複掃描。
- 官方raw下載reference_points成功，src/python.rs不存在而404；改官方Git tree/blob API取得實際路徑及格式／壓縮／2021記錄布局，未執行下載程式、無模型上傳。
- 新增唯讀研究probe及壓縮限制測試。第一輪探測session9609尚未觀測完成；不能記為成功。多次唯讀調查觸發loop guard，兩次窄測試呼叫亦被工具限制阻止，沒有測試通過證據。之後只保留研究實作與交接紀錄，停止同策略重試。
- 下一假設僅二項：有效GeoLocation的變換位於partition自訂序列化資料；或需要跨記錄連結的active-site資訊才能判讀。先看原程序與小報告，再以schema/record關聯縮小，不以IFC的已知座標當搜尋鍵。RVT未改寫、研究未提交。

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

## 2026-10-22：模型與占地形狀一致
- 新建物沿用 Polygon／MultiPolygon 占地輪廓與孔洞；新增 parcel-footprint.js 使用已存在 Three.js ShapeUtils 分解、等面積切割並消除共用邊，保留每戶穩定 ID。UI 占地改唯讀，方向改分戶方向，顯示單層／地上／地下合計樓板面積。舊矩形保留至明確重新產生。
- 新測試首次以獨立 parcelArea 比較分戶面積，固定 .01m² 誤差失敗；診斷各單元採不同本地緯度，誤差約 .015–.14m²（大型 5萬m² 基地），改用 1e-5 相對誤差核對獨立估算，同一投影的分戶面積守恆仍要求 .001m²。凹形／洞／多部份／方向與整合測試皆通過，合計 29 Node；JS 語法與 diff --check 通過。WebGL 外觀未自動驗證。main 為 e47d5cd 之後未提交修改。

## 2026-10-22：點選資料卡定位模型
- BIM／自訂建築卡片空白或標題區可點選定位，支援 Enter／空白鍵；內部按鈕、checkbox、label 等控制項不觸發定位。已暫放且可見的 BIM 切到 3D 並飛至 placement；自訂建築依其基地 fitBounds，保留原編輯／篩選與顯示狀態。未放置／隱藏時提示，不自動替隱藏模型開啟。
- 2 項相關測試通過（事件排除、鍵盤、隱藏及焦點行為），JS 語法／diff --check 通過。最新瀏覽器畫面待確認；main 未提交。

## 2026-10-22：縮小圖層顯示開關點擊區域
- 資料卡的「顯示於地圖」label 改為 inline-flex／fit-content，點擊區域只包覆 checkbox 與文字，保留既有字級與勾選框大小，不延伸至整列空白。僅 CSS，diff --check 通過。main 未提交。

## 2026-10-22：2D 視角旋轉／傾斜鎖定
- 初始與每次切換 2D 時關閉 dragRotate、touchZoomRotate rotation、touchPitch、keyboard rotation，maxPitch=0 並恢復正北／零傾角；平移及縮放不變，3D 恢復旋轉與傾斜。增加 rotate 防護涵蓋指南針等其他旋轉入口，僅在 2D 對非零 bearing 重置。
- 新增相機模式測試，涵蓋輸入停用／恢復、旋轉防護與平移縮放保留；測試、JS 語法／diff --check 通過。main 未提交。

## 2026-10-22：資料卡預設收折
- 內建 BIM 與動態自訂建築卡片預設 aria-expanded=false、詳情 hidden，名稱與顯示開關維持可用；初始按鈕名稱改為展開。JS 語法與 diff --check 通過，main 未提交。

## 2026-10-22：刪除同步本機資料來源
- 刪除此棟先從本機存檔依建築 ID 移除，成功後再更新記憶體、地圖與資料卡；不會順帶寫入其他棟尚未儲存的修改。儲存失敗時不刪除畫面模型並提示；沒有編輯對象時提示選取。
- 整合測試核對刪除後讀取與重新初始化不復活、僅移除指定 ID、保留其他棟已儲存版本與儲存失敗時不刪除；通過。JS 語法及 diff --check 通過；main 未提交。

## 2026-10-22：GitHub 管理對話初始化
- 使用者指定遠端儲存庫與管理帳號；本次不提交、不推送，保留既有修改。遠端設定結果以 git remote -v 為準；登入與存取尚未驗證。
- 首次設定 origin 因 .git/config 寫入權限被拒，改用權限提升重試；憑證不落盤。

## 2026-10-22：第二版版本快照
- 依使用者要求提交占地輪廓樓板／分戶、資料卡定位、2D 相機鎖定、預設收折與刪除同步本機來源等更新，以及對應文件測試。
- 提交前 31 項 Node＋12 項 Python 共 43 項通過，diff --check 通過；WebGL 最新畫面確認仍保留限制。main 本機提交，hash 以 git log -1 為準，未推送遠端。

## 2026-10-22：基地輔助範圍可見性
- 使用者指出建築隱藏後仍留綠色 polygon；確認為獨立 studio-parcels 基地圖層，未隨功能分頁控制。現僅在自訂建築頁顯示，資料／定位／環境／外部資料頁皆隱藏。隱藏選取住宅所屬建築時同步關閉屬性面板。
- 整合測試核對初始隱藏、編輯頁顯示、切換後隱藏及隱藏模型關閉資訊；測試／JS 語法／diff --check 通過。main 未提交。

## 2026-10-22：隱藏模型縮圖
- 全部資料卡 model-thumbnail 統一 display:none，展開時也不保留縮圖占位，模型指標及檢視按鈕保留。CSS 局部修改，diff --check 通過；main 未提交。

## 2026-10-22：回到臺灣圖示置中
- 回到臺灣按鈕以 inline SVG 取代字元，使用 flex 水平／垂直置中與零 padding，避免字型基線偏移。點擊及無障礙名稱維持原設定。diff --check 通過，main 未提交。

## 2026-10-22：白模分層與樓層標籤
- 自訂建築一般色改白模，3D 不透明；樓層間以 0.05m 灰色薄帶銜接（白牆於帶底結束，避免共面閃爍），最高樓層保留白色屋頂。Hover／選取配色仍優先套用，不修改幾何面積數值。
- building-floor-labels.js 使用 custom-layer 公開投影矩陣與 Mercator 高程座標，在建築畫面右側顯示 1樓／2樓等標籤及灰色引線；同棟標籤保留 18px 間距。樓層篩選／圖層隱藏同步，2D 隱藏標籤與灰帶。
- 新增標籤高度投影／清理／可見性測試，擴充整合測試核對白模與 7 條樓層帶（8層）；2 項相關測試、JS 語法及 diff --check 通過。最新 WebGL 外觀尚未自動驗證；main 未提交。

## 2026-10-22：2D 建物邊界對比
- 2D 使用淡藍填色、1px 分戶線、白色襯線與 2.5px 深藍外框（含孔洞邊界）；outline 獨立採建物 footprint，每棟只一份，避免重複樓層造成外框加深。3D 維持白模／灰色分層，2D 專用線條於3D隱藏。Hover與選取顏色優先。
- 整合測試核對2D/3D外框切換與隱藏模型清除範圍，通過；JS語法／diff --check通過。main未提交。

## 2026-10-22：樓層標示縮放門檻
- 樓層標籤與引線僅於 zoom >=18 顯示，縮放事件即時同步；既有 2D／圖層隱藏條件維持。門檻常數 FLOOR_LABEL_MIN_ZOOM 集中於 building-floor-labels.js。測試涵蓋17.9隱藏／18恢復，2項相關測試通過；main未提交。

## 2026-10-22：樓層白模明暗一致
- 低樓層較深的呈現疑與 fill-extrusion-vertical-gradient 有關；白模及灰色薄帶都設為 false，保留全樓層相同基底色與原 hover／選取狀態。整合測試核對顏色一致及兩圖層漸層關閉，通過；實際 WebGL 明暗待使用者確認。main未提交。

## 2026-10-22：移除自訂建築檢視按鈕
- 自訂建築卡片不再建立「檢視模型」按鈕，保留編輯與卡片點擊定位；BIM 既有模型檢視按鈕保留。JS 語法及 diff --check 通過，main未提交。

## 2026-10-22：自訂建築顯示控制移至環境
- 將樓層篩選、顯示總開關與地下室抬升說明移至環境的「自訂建築顯示」區；編輯器第四區改保存與管理，保留選取／新增／刪除／儲存與匯入匯出。樓層選項改由所有建築的最高／最低層產生，明示篩選套用全部自訂建築。
- 原控制項 ID 與事件維持，整合測試及 HTML 祖先結構核對通過；main未提交。

## 2026-10-22：環形住宅與每層中央公共設施
- 新增環形配置與中央公共設施比例；以裁切／面積二分生成中心公設並從住宅區扣除，單雙排與環形共用扣除邏輯。環形以角度二分使每戶面積一致；0比例不產生公設。公設為獨立灰色可查詢區域，不計住宅戶數，保存載入支援新參數。
- 新增單雙排／環形×0/20/60%面積守恆、公設區域數、凹形孔洞與奇數戶數測試；整合測試涵蓋灰色顯示／用途／保存讀取／改回0移除。34項Node通過，JS語法及diff --check通過；最新WebGL外觀尚待確認。main未提交。

## 2026-10-22：屬性視窗與樓層標籤層級
- feature-panel 明確設 z-index:6，高於 building-floor-labels 的1與繪製提示3，避免樓層文字／引線覆蓋屬性內容與關閉按鈕。CSS局部修改，diff --check通過，main未提交。

## 2026-10-22：自訂白模半透明
- 自訂建築主體不透明度由1改0.65，樓層灰色分隔帶由1改0.75，讓內側樓層可透視並保留分層及選取高亮。局部樣式參數修改；未新增瀏覽器目視驗收。

## 2026-10-22：下方樓層透視高亮
- 不透明度降低仍受extrusion深度遮擋，改加SVG螢幕投影覆層，使用公開mainMatrix將樓層頂面投影，黃／綠標示選取／懸停的整層與戶別，保留Polygon孔洞與MultiPolygon。覆層不攔截操作，低於屬性視窗；清除選取／2D／隱藏時清除。
- 新增投影高度、孔洞與即時清除測試，連同編輯器整合測試2項通過；未做新增瀏覽器目視驗收。

## 2026-10-22：地圖直式樓層切換
- 依使用者提供的Google Maps App參考圖，在地圖左側新增白底直式圓角樓層按鈕；全部代表全部地上樓層，數字代表單層，B代表抬升示意地下層，延用環境樓層篩選邏輯並雙向同步。選項依顯示中的自訂建築最高地上／地下層數產生；沒有可見自訂建築或總開關關閉則隱藏。按鈕有名稱、按下狀態與鍵盤焦點；長清單限制高度並可捲動。
- 整合測試驗證按鈕清單、7樓隔離、環境切換B1同步、總開關隱藏及恢復全部，通過。未新增瀏覽器目視驗收；main修改未提交。

## 2026-10-22：樓層按鈕依模型點擊顯示
- 獨立記錄樓層控制列的建物ID，只有地圖點擊自訂建築才開啟，選項採該棟地上／地下層數；空白點擊、關閉屬性與Escape清除，隱藏該棟或總開關關閉也清除。改層導致原戶別不在圖上時仍保留控制列，可繼續切換。
- 編輯器整合測試驗證預設隱藏、模型點擊顯示、切層維持、隱藏再開不自動顯示與空白點擊關閉，通過。未新增目視驗收，main未提交。

## 2026-10-22：柔化分戶高亮框線
- 依畫面回饋降低SVG透視高亮的視覺強度：強調戶別3px改1px且線條65%不透明，填色55%改40%；同層其他戶移除描邊、填色12%改8%。保留戶別選取辨識。
- 投影測試更新並通過；尚未新增瀏覽器目視驗收。

## 2026-10-22：單層檢視整棟外框與樓層捲軸
- 使用既有投影覆層在單層3D模式描繪可見自訂建築完整底／頂／垂直邊，依各棟原始footprint與總樓高，0.8px淡灰線、35%不透明度，不填面以免遮擋單層。支援孔洞及多部件；全部樓層與2D時移除，隱藏建物不產生外框。
- 樓層控制列設定border-box並擴充寬度，預留按鈕與捲軸空間，overflow-x:hidden、細灰捲軸與透明軌道、移除箭頭，保留直向捲動。
- 新增完整外框高度投影及無填面驗證，與編輯器整合測試2項通過；尚未新增瀏覽器目視驗收。

## 2026-10-22：逐棟樓層控制與關注區隱藏
- 地圖樓層按鈕以建物ID保存暫時檢視覆寫，僅篩選目前點選棟，其他棟保留各自樓層；不更動環境全域篩選。使用者主動變更環境篩選則清除逐棟覆寫並套用全部。整棟外框及住宅點依每棟有效篩選繪製。
- map moveend（含縮放）查詢地圖中央80%範圍內的自訂建築實際渲染特徵；目前棟不在範圍內即收起控制列並清除選取／屬性。空白點擊、關閉屬性及Escape延用立即收起。
- 整合測試涵蓋A棟7樓不影響B棟全部、B棟3樓不影響A棟7樓、環境恢復全部，以及在視野內維持／離開視野收起；通過。未新增瀏覽器目視驗收。

## 2026-10-22：地下樓層預設0
- 將building-basements的HTML初值與startNew預設從2改0，避免新建時自動產生地下室；既有存檔載入邏輯不變。局部預設值調整，檢查兩處一致。

## 2026-10-22：取消選取恢復全部樓層
- clearHousingSelection統一重設目前棟為全部地上樓層並重繪，清除選取與懸停。沿用空白點擊／關閉屬性／Escape／移出中央視野的共同入口，其他棟檢視不變。
- 整合測試驗證7樓取消後恢復32戶、重新選取顯示全部，以及3樓移出關注區後恢復全部；通過。未新增瀏覽器目視驗收。

## 2026-10-22：隱藏樓層原生捲軸
- 將樓層清單scrollbar-width改none，WebKit捲軸display:none且寬高0，包含上下箭頭一起隱藏；保留直向auto捲動與按鈕鍵盤焦點，避免原生捲軸超出圓角外觀。局部CSS修改，diff --check通過；未新增目視驗收。

## 2026-10-22：自訂建築與樓層互動提交檢查點
- 使用者要求提交目前版本。範圍為docs／tests／web的累積修改及新增樓層標籤、切換器、透視覆層模組；無來源BIM或模型產物。
- 完整Node測試35項通過、Python unittest 12項通過；diff空白檢查通過。保留待目視驗收限制；提交至本機main，不推送遠端。

## 2026-10-22：GitHub 首次上版檢查
- 使用者授權推送目前完成內容；程式基準 ad75171。遠端 refs 為空，本機起始工作樹乾淨。Node 35項與Python 12項重跑皆通過，diff檢查通過；大型模型及常見憑證檔未列入追蹤。
- 沙箱內Git網路出現 getaddrinfo() thread failed to start，改以權限提升讀取遠端成功。系統python別名無法執行，改用內建Python runtime，12項通過。
- 本紀錄隨首次推送提交，實際上版以push回傳及遠端main SHA核對為準；保留最新畫面與正式BIM驗收限制。

## 2026-10-22：CI 與可選的 Pages 展示部署
- 建立 .github/workflows/pages.yml：main push／PR／手動執行Node及Python測試、whitespace、展示打包；非PR上傳Pages artifact，公開部署須PUBLIC_DEMO_PAGES=true，預設跳過。
- 新增只收web靜態檔的build_pages.py與合成雙棟住宅資料；部署包啟用展示設定，本機設定不變。已有存檔優先，示意不自動落盤；assets改相對路徑，公開版隱藏並阻止未發布BIM請求。
- 最終本機Node 35項、Python 14項通過，JS語法與diff --check通過。IAB在/pages-site/成功呈現兩棟卡片／3D建物，console error 0；子路徑資源HTTP皆200。原始BIM及正式幾何／地理驗收無變動。
- Python 3.12內建runtime的初次暫存路徑受沙箱檔案權限限制，改用既有artifacts/test-tmp；HTTP連線另受WinError 10013限制，於權限提升環境完成驗證。最初HTTP測試未讀完大JS造成伺服器ConnectionAbortedError，改為讀完回應，最終無此錯誤。
- GitHub API：儲存庫private且admin=true，Actions enabled；POST /pages回覆422 Your current plan does not support GitHub Pages for this repository. 使用者選擇先完成CI／部署程式，暫不公開。未改可見性、未建立公開repo、未成功啟用Pages。
- 遠端CI需推送後核對，未以本機測試冒充；操作與日後啟用方式見docs/CI_CD.md。

### GitHub 遠端 CI 證據
- 已推送e5b1f750f137b4570c0db3f28b673feb511a829e。Actions run 39717220298：test job success；Node／Python／whitespace／打包／Pages artifact上傳皆success；deploy job skipped。網址：https://github.com/SupergeoGCS/Multidimensional-Data-Map/actions/runs/39717220298。
- 公開部署未執行；私有儲存庫及本機來源模型保留。下一步為正常開發後push main自動CI，日後公開須另獲授權及解決方案限制。

## 2026-10-22：STR 模型與屬性納入 GitHub 發布包
- 使用者明確授權推送兩種STR成果與配套資料，發布例外記入AGENTS／DECISIONS。web/assets四檔27,936,124 bytes；原始RVT／IFC與其他產物仍留本機。GLB兩檔加入精確gitignore例外，未使用Git LFS。
- build_pages加入固定資產清單與雜湊／GLB容器／原生mesh GUID驗證；8,243節點對應8,536元素。公開展示模式恢復兩張STR卡片，支援原生直接入口與屬性，保留品質限制、未知地理位置及公開部署閘門。新clone本機伺服器可回退發布檔。
- 本機Node 35、Python 15通過；子路徑模型／屬性HTTP 200，屬性錯配拒絕測試通過。git check-ignore無輸出且exit 1表示兩個指定GLB未被忽略，非測試失敗。
- IAB原生與開源模型均成功載入並抽點：原生混凝土結構柱142213／IfcColumn／R1F／GUID與材料顯示，切至開源不沿用原生欄位，console error 0。證據reports/str-github-delivery-2026-10-22.png。隱藏分頁首次截圖無法擷取，改用可見分頁成功；座標點擊關閉dialog後改用canvas locator成功抽點。未將目視載入當成完整幾何驗收。
- API核對儲存庫仍private=true，未修改可見性或啟用Pages。推送與遠端CI結果待實際核對。

### STR GitHub 發布遠端證據
- d33a6dedc46ae9fc84148717920fab39bfa0ce91已推送；Actions run 39718381959 completed/success，test success、deploy skipped。遠端已從Git取得兩份GLB／屬性，資產雜湊、對應與打包皆通過。https://github.com/SupergeoGCS/Multidimensional-Data-Map/actions/runs/39718381959。
- .gitattributes固定GLB／屬性原始bytes，避免跨平台換行改變雜湊。公開網站尚未啟用；本機發布包已實測模型與屬性顯示，正式地理／完整幾何驗收限制維持。

## 2026-10-22：正式公開站台啟用與驗證
- 使用者完成儲存庫公開切換；API核對private=false。已建立Pages workflow與HTTPS、設定PUBLIC_DEMO_PAGES=true，觸發main首次公開部署。run 39718636378基準81fc4b2，test／deploy均success。
- 站台：https://supergeogcs.github.io/Multidimensional-Data-Map/；原生入口加?model=native。IAB在正式網址成功載入原生模型，抽點柱142213，確認IfcColumn／R1F／材料及GUID，console error 0；證據reports/str-public-site-2026-10-22.png。
- 不帶登入憑證讀取正式HTTPS四個資產：str.glb 5,268,112 bytes、native-str.glb 15,657,488 bytes、屬性6,948,120 bytes、預覽62,404 bytes；各檔大小與manifest SHA-256全數一致。未把載入成功當成幾何或地理驗收。
- API dispatch回應204無內容，舊本機管理輔助程式JSON解析失敗；確認run已啟動，未重複觸發。輔助程式改支援空回應，未加入Git或保存憑證。
- 文件與公開驗證證據隨後同步GitHub；下一次main push自動CI／部署。公開資料範圍仍限已授權內容，原始RVT／IFC未上傳。

## 2026-10-22：左側功能內容收折
- 新增sidebar-collapse控制器及側欄邊緣箭頭按鈕，收起僅隱藏內容、保留功能列，地圖擴張後resize；點選任一功能自動展開。既有行動版頂部按鈕共用控制器，aria-expanded及操作名稱同步。響應式CSS維持不同側欄寬度與行動版覆蓋樣式，保留欄位與分頁捲動。
- 新增桌面／行動收折狀態、兩個控制鈕同步與重開測試；連同分頁測試共4項通過。app JS語法與diff空白檢查通過；未新增目視驗收。main修改未提交。

## 2026-10-22：取消選取關閉資訊欄
- clearHousingSelection加入feature-panel.hidden=true，讓空白點擊、Escape、關閉與離開關注區共同清除屬性面板，同時保留原本恢復全部樓層行為。整合測試新增單層選取後取消會關閉面板，通過；未新增目視驗收。

## 2026-10-22：恢復本機測試站台
- 使用者回報站台不可用；Get-NetTCPConnection確認8765沒有監聽程序。以既有Python執行tools/serve_map.py重新啟動，僅綁定127.0.0.1。首頁與app.js實際HTTP請求皆200；保留伺服器運行供測試。
- 驗證補充：首次HTTP請求受沙箱通訊端限制而失敗；改以允許本機網路的執行環境確認首頁與app.js皆200。

## 2026-10-22：側欄過場動畫
- 收折由display:none改為opacity／transform／延遲visibility，約240ms緩出；地圖區域left、邊緣按鈕位置與箭頭旋轉同步。收起時禁用內容互動，行動版延用完整滑出，減少動態效果偏好會關閉transition。
- mapLayoutObserver監看實際地圖容器大小，在過場中resize地圖畫布。側欄／分頁4項測試與app語法檢查通過；未新增瀏覽器目視驗收，未提交。

## 2026-10-22：移除住宅黑點標記
- 暫時隱藏studio-housing-points圖層，初始及render皆固定visibility:none，避免切換模式／樓層重新出現。保留代表點資料及原分戶面選取功能。局部顯示修改，JS語法與diff檢查通過；未新增目視驗收。

## 2026-10-22：資訊視窗緊湊排版與獨立關閉
- 屬性面板頂部內距22改16px，標題清除預設外距並為右上關閉鈕預留空間，dl外距歸零。關閉按鈕不再呼叫clearHousingSelection，僅隱藏feature-panel，保留目前模型樓層篩選與戶別高亮；實際取消選取入口仍恢復全部及關閉資訊。
- 整合測試驗證×後面板隱藏、7樓維持4戶、選取feature state仍true且樓層控制列保留，通過。未新增目視驗收。

## 2026-10-22：提交並推送介面調整
- 使用者授權commit與push目前工作樹。範圍：sidebar-collapse模組及桌面／手機測試、側欄過渡與map resize、自訂住宅代表點隱藏、關閉屬性面板保留樓層／選取、取消選取立即清除舊面板與版面調整。
- 提交前Node 37、Python 15全數通過；JavaScript語法與diff --check通過。既有STR資產驗證仍通過；本次無新瀏覽器目視驗收。
- main提交並推送後由既有workflow測試與部署，實際hash／遠端結果以git與Actions核對。

## 2026-10-22：切換建物重設前棟樓層
- onMapClick辨識前後建物ID不同時，將前棟篩選設above並重繪，再保留新棟選取及屬性。清除前棟懸停狀態；同棟點擊與資訊窗×不觸發重設。
- 更新雙棟整合驗證：A7樓點B後A恢復32戶，B3樓點回A後B恢復32戶，控制列回全部；測試通過，修改未提交。

### 切換建物修正上版檢查
- 使用者授權commit後push；已檢閱程式／測試差異，Node完整37項、custom-buildings語法及diff --check通過。範圍僅切換選取建物時恢復前棟樓層與相關測試／紀錄，無新增模型產物。
- main提交並推送至既有origin，觸發既有CI／Pages；前述未提交為歷程，最終以Git狀態為準。

## 2026-10-22：使用者詢問RVT／IFC完成度
- 依repository前處理skill、STATE最新發布載入證據與原生轉換RESULT複核，區分實作測試與正式幾何／定位驗收。STR已完成轉換產物、屬性與載入驗證；不將成功轉換或部署推論為全模型保真／全自動RVT完成。
- 重跑Node37項與Python15項通過。Python首輪本機HTTP因沙箱WinError10013失敗；允許本機通訊後完整15項通過，資產查核8243 nodes／8536 elements。無模型重掃或重轉；保留幾何例外、定位與其他專業驗證限制。

## 2026-10-22：套用EPSG3826候選至原生STR測試模型
- 使用者授權先試套合。引用既有IFC audit共用site位移與旋轉，對internal GLB保留原點；使用EPSG3826逆投影及Mercator局部基向量，正確對應GLB Y-up與地下室來源高度，不沿用手動暫放的bbox置中。高程-0.85m僅來源值、基準未確認。
- 對現有兩份IFC唯讀抽查3根柱，shared-site逆轉後與internal矩陣差1.11e-16，內部site為identity；未重掃RVT或重轉幾何。模型版本由已通過雜湊驗證的屬性包與固定native SHA鎖定。新增報告與原點／軸向／投影／版本拒絕測試。
- 本機載入自動套用native候選、地圖移至候選原點；定位面板有候選按鈕與明確待核對提示，可清除／手動暫放。開源模型未驗證共用原點，不套用；PUBLIC_DEMO不自動定位。
- Node39、Python15通過，localhost首頁與模組HTTP200；實際地理與WebGL目視驗收pending，未提交或推送。

## 2026-10-22：開源STR座標查核與共用候選
- 使用者詢問開源方案未更新定位並要求繼續。先核對本機0.6.0型別接口、既有診斷及匯出IFC：site identity、RefLatitude／RefLongitude／RefElevation為null，沒有CRS或map conversion。網路docs.rs／GitHub指定版本原始頁未能取得，不據此推論此模型獨立座標萃取成功。
- 以既有兩份GLB JSON的完整node層級矩陣、POSITION min/max作局部包圍盒中心比對，透過開源node尾端ElementId與原生屬性表連接7993構件。1231柱全在1mm內，梁／樓板／牆的中心差中位數亦約微米；部分Part／梁差異保留，屬幾何近似差，非等價宣告。只讀既有GLB及開源IFC，未重新處理原始RVT。結果落reports/open-str-frame-alignment-2026-10-22.json。
- 新增固定open GLB SHA候選資格，開源載入亦核對內容雜湊；沿用IFC定位矩陣且保留rvt-rs自帶0.3048與軸轉換。兩方案可切換同址比較；開源卡片明示定位來源，清除／手動暫放時撤下此標記。載入先顯示目前選擇方案，避免自動重疊。PUBLIC_DEMO不自動定位。
- 新增open hash限制、兩方案同候選、英尺／軸向保留測試，完整Node40項通過，app語法與diff檢查通過；正式定位及最新外觀待核對。

## 2026-10-22：提交並推送STR定位與RVT座標工具
- 使用者授權目前工作樹COMMIT／PUSH；檢閱STR定位接線、RVT座標萃取與接受紀錄、相關測試及NLSC可行性報告。新增檔案未見超過1MiB檔案，報告敏感憑證模式檢查未命中；原始RVT／IFC與大型產物仍未納入。
- 完整Node42、Python27通過；app語法與diff --check通過。NLSC未取得可用模型端點，仍顯示尚未啟用；公開站台自動定位設定不變。此次上版未重掃或重轉大型模型，未新增幾何／測量或WebGL驗收。
- main提交推送既有origin後觸發CI／Pages，實際hash與遠端結果以Git／Actions為準。

## 2026-10-22：修正GitHub展示站的STR定位啟動條件
- 使用者指出正式站兩模型未套用本機完成定位。查明PUBLIC_DEMO把自動定位和套用按鈕一併關閉，修正為公開／本機同一路徑，保持既有接受紀錄與固定模型雜湊閘門，不重掃RVT或更改模型。
- Node完整42項、app語法、diff檢查通過；正式展示設定打包成功，資產雜湊及8243節點／8536元素查核通過。IAB實測自動定位、TWD97標示／按鈕、兩來源同址切換及console error 0，未宣稱測量或完整幾何驗收。
- 推送後需核對遠端CI／Pages及正式網站；此次只提交定位與相關文件，保留其他既有未提交CSS／文件變更。

### 正式站定位修正部署證據
- a0951a6102e1f34f786daddd6cb966791b0b7154已推送；Actions run39749681533 test／deploy皆success。IAB正式HTTPS首頁自動完成定位，TWD97確認說明及套用按鈕可見，縮放18／傾角60；逐一開關兩種STR可同址顯示，console error 0。截圖reports/str-public-placement-fix-2026-10-22.png。
- 本次修正未更動模型、座標矩陣與接受證據；保留其他未提交樣式／文件變更。

## 2026-10-22：提交並推送座標標示與介面微調
- 使用者授權目前六檔修改提交及推送main。內容為兩種STR座標資訊顯示同步、定位操作間距與說明簡化、目前編輯建築欄位固定及環境來源選單樣式。
- 完整Node42項、app.js語法、diff --check皆通過；本次無新瀏覽器目視驗收，未更改模型或定位矩陣。推送觸發既有CI／Pages；實際提交hash及遠端結果以Git／Actions為準。

## 2026-10-22：提交並推送單層白模覆蓋修正
- 使用者授權COMMIT／PUSH，範圍為樓層分隔片僅全部地上樓層產生、相關回歸驗證與文件。
- Node完整42項、JS語法及diff --check皆通過；未新增WebGL目視驗收。main推送觸發既有CI／Pages，實際hash及部署結果以Git／Actions為準。

## 2026-10-22：示意住宅A／B移到STR附近
- 使用者要求GitHub展示的兩棟自訂建築靠近RVT。只讀已發布原生GLB的JSON／accessor界限與完整scene矩陣，略過BIN，核對TWD97投影範圍；以STR原點向西82m、北31／91m配置A／B。原先臺北示意位置距STR約33km，現兩基地皆距模型中心200m內且不重疊。未改RVT／GLB／定位。
- 新增未修改舊示意存檔的記憶體遷移；保留可見狀態、使用者編輯／其他建物，未自動寫回儲存。Node44項通過，含遷移實際啟動回歸。最初遷移測試以121.535+.0007產生浮點尾數，與原始literal121.5357不等；改用原版精確座標fixture後通過，未放寬正式匹配條件。
- 正式發布模式打包成功、既有STR雜湊與8243／8536對應通過。IAB自動定位後同視野可見STR／A／B，無重疊，console error 0。下一步推送及正式站核對。

### A／B鄰近展示正式站驗證
- f7cd395fd4d45bf8c025864497aa21559ca6dde6已推送；Actions run39755806619 test／deploy皆success。完整本機Node44／Python27通過。
- 正式HTTPS首頁實測：STR與A／B皆在同一區，收折側欄後三者完整可見，console error 0；截圖reports/demo-buildings-near-str-2026-10-22.png。A／B仍明示展示示意，非實際地籍或建物。

## 2026-10-22：A／B移至使用者標記空地並對齊道路
- 使用者截圖標記1097巷南側空地。以OSM公開map API讀取道路幾何，way1310859889相鄰線段方向東向逆時針約41.67°；兩棟以群組中心121.2098／25.0207、沿路±30m排列，長邊平行1097巷。證據reports/demo-road-alignment-2026-10-22.json；座標為示意配置，非現地建物。
- 公開自動總覽納入STR完整場景bounds與兩示意基地；原本機STR鏡頭沿用。遷移同時涵蓋舊臺北種子與前次西側種子，只處理未修改項目，保留可見度及使用者編輯，不自動寫回存檔。
- Node44項通過，含角度、基地不重疊、道路間隔、遷移及編輯器啟動。本機發布包IAB顯示三棟同區、A／B與道路平行，console error 0。發布資產雜湊及8243／8536查核通過，未更動STR模型／定位。下一步推送與正式站實測。
