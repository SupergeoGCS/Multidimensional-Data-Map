# 專案狀態

更新日：2026-10-22（Asia/Taipei）。本檔是跨對話接續入口，實際 Git 工作樹與報告為證據來源。

## 目標與判斷
MapLibre GL JS 三維模式展示 RVT 建築與結構。先 STR，再 AR，MEP／LS 後續依需求。已以 rvt-rs 0.6.0 對 STR 成功匯出 IFC／GLB 並產生本機概略預覽，但約 71.2% bodies 是包圍盒近似，尚未通過正式幾何替代驗證。實測報告見 reports/rvt-rs-str-0.6.0/RESULT.md。

## 階段
| 階段 | 狀態 | 證據／限制 |
|---|---|---|
| RVT 容器與中繼資料盤點 | passed | reports/rvt-inventory-2026-10-20.json；4 檔、SHA-256、Revit 2021、build 與連結狀態；不代表幾何驗證 |
| 開源 RVT 解析試驗 | completed_not_accepted | rvt-rs 0.6.0；8,373 建築構件、16 樓層，輸出 IFC／GLB；5,962 bodies 是包圍盒；--saved-meshes 因 2021 framing 未驗證而未生效，未替代正式流程 |
| 原生 Revit 開啟與連結核對 | in_progress | LocalDB 修復後已在 PID 3340 成功顯示 STR {3D} 宿主模型；22 筆升版警告與分析模型提示保留。Manage Links 確認 9 CAD 參照警告、1 AR 卸載，另 2 註解表未核對。尚未逐構件驗收。見 reports/revit-export-str-2026-10-21/RECOVERY.md |
| 正式 IFC 匯出 | exported_with_pending_acceptance | 使用者手動匯出共用座標／內部原點兩份 IFC4，皆 8,536 構件／16 樓層且 GUID 集合完全一致；實際內容已解析。完整設定快照／2 註解表核對仍缺少。見 reports/revit-export-str-2026-10-21/RESULT.md |
| IFC→GLB | converted_with_geometry_issue | 兩份皆以固定 IfcConvert 0.9.0post1 轉成 GLB，容器通過，8,243 nodes／8,113 meshes；同一樓板 92848 一處 opening subtraction 失敗，幾何正式驗收未通過。候選 native-internal.glb 尚未瀏覽器目視驗證 |
| 屬性對應 | passed_package_and_browser_sample | package_ifc.py 已實跑新轉換／既有 GLB 重用；8,536 元素屬性、8,243 幾何節點 GUID 全數對應，瀏覽器抽點顯示中文結構柱、材料、樓層與屬性集 |
| 座標契約 | pending | CRS、高程、共同原點、真北、控制點未知；不得猜定位 |
| 本機地圖站台與概略模型互動 | passed_preview | 已建立 web/ 與 tools/serve_map.py；IAB 實測 2D／3D、模型預覽、構件名稱點選、線框、手動暫放、GeoJSON 匯入／移除、GLB 替換，無觀測到 console error；見 docs/MAP_SITE.md |
| 精確地理套合與效能驗收 | pending | 手動暫放僅為預覽；真實位置、測量誤差、目標硬體幀率／記憶體未量測；不把站台可用等同正式 BIM 驗收 |

## 已完成
- 2026-10-22 使用者要求提交目前版本快照：圖台／自訂建築／雙 BIM 與屬性流程及文件。提交前 27 Node＋12 Python 共 39 項通過，diff --check 通過。最新高亮畫面與正式幾何驗收仍待確認；本次提交 hash 以 git log -1 為準，先前各條「未提交」為當時歷程。
- 高亮未呈現已補 source promoteId:'unitId'，統一文字住宅 ID 與 feature-state 的對接。測試新增來源 ID 查核並通過；最新 WebGL 效果待重整確認，若仍異常先查實際 rendered ID／state。main 未提交。
- 自訂建築支援 hover 樓層／住宅戶高亮、點擊持續選取（金色）；點空白、關閉屬性或 Escape 可取消。整合測試／JS 語法通過；最新畫面待使用者確認，main 未提交。
- 自訂建築分頁每次點選均回到頂端，2 項分頁測試通過；main 未提交。
- 手繪完成提示簡化為「手繪區域面積：… m²」，整合測試通過；main 未提交。
- 繪製中的既有轉折點可拖曳（滑鼠／觸控），範圍與面積即時更新；拖曳時暫停地圖平移並防止誤加點。整合測試通過，畫面待確認；main 未提交。
- 繪製面積標籤改為範圍中心定位，凹形使用內部備選點，隨地圖移動／縮放／resize 更新；9 項相關測試通過。main 未提交。
- 基地繪製加入起點／轉折點圓標、線段、有效範圍與估算面積（地圖／側欄同步）；完成或取消清除草稿，無效範圍提示。整合測試與語法核對通過；main 未提交。
- 左側自訂建築入口預設新增（重置基地／參數與編輯 ID），資料卡編輯才載入既有模型；新增不覆寫測試通過。main 未提交。
- 自訂建築已納入資料卡片，類型標示「自訂建築」，可見開關／收折／檢視／編輯；儲存成功切回資料頁，重新載入自動恢復本機模型與卡片，資料數量同步。相關整合測試通過；main 未提交。
- 資料圖層數量改為方形徽章「2項」，動態更新同樣使用「項」格式；JS 語法與 whitespace 通過。main 未提交。
- 功能列順序為資料、自訂建築、定位、環境、外部資料；自訂建築完整編輯器已移入左側獨立分頁，資料頁舊入口移除。2 項整合／分頁測試及語法檢查通過；main 未提交。
- 側欄底部本機資料／底圖連線說明區塊已移除；地圖 attribution 保留。main 未提交。
- 四個功能標題統一 19px／650 字重，修正定位／環境標題 span 被狀態樣式覆蓋；CSS 級聯已核對，待重整確認。main 未提交。
- 側欄改為最左側四個功能圖示分頁（資料／定位／環境／外部資料），同時只顯示一區；保留內容狀態與各區捲動，支援鍵盤與手機展開。新增分頁行為測試通過、JS 語法與 whitespace 通過；畫面待重整確認。main 未提交。
- 側欄重新分為資料／定位／環境／外部資料四個語意區塊，加入編號、淡底、邊框與留白；所有操作 ID 保留。靜態結構已核對，待使用者畫面確認。main 未提交。
- 兩張 BIM 資料卡按鈕統一為「檢視模型」，來源區分及開啟行為維持原設定。main 未提交。
- 側欄頁尾本機資料／底圖來源兩行統一 14px、1.9 行高並允許長文字換行；CSS 已檢查，待重整確認。main 未提交。
- 側欄入口說明與介紹統一 14px，資料卡來源／指標 12px、品質說明 13px；CSS 已核對，待重整確認。main 未提交。
- 定位區說明、標籤、輸入與開關放大至 14px，周邊環境與匯入說明同步提升可讀性；樣式已檢查，待重整確認。main 未提交。
- 兩張 BIM 卡片顯示開關統一為「顯示於地圖」，文字 14px、勾選框 20px，增大操作間距；靜態核對通過。main 未提交。
- 兩張 BIM 卡片的固定綠色狀態點已移除，避免誤認為驗證或載入狀態；圖層勾選框與收折按鈕保留。main 未提交。
- 資料卡收折箭頭改為 CSS chevron，依 aria-expanded 旋轉並補償幾何中心；移除受字型基線影響的字元。語法與 whitespace 核對通過，畫面待重整。
- 兩個 BIM 資料卡新增獨立收折／展開按鈕（保留名稱與顯示開關），卡片間隔 18px；JS 語法與靜態結構檢查通過，尚待畫面確認。main 未提交。
- 全站五處英文裝飾副標已移除，中文標題保留；靜態搜尋與 whitespace 檢查通過。修改於 main 未提交。
- 匯入 JSON 按鈕二次修正：找到同 specificity 的 .file-control 上邊距覆蓋問題，改以較高 specificity 清零同列 margin 並固定 44px 高度。CSS 級聯已核對，畫面待重整確認。
- 自訂建築匯入 JSON 與同列按鈕已統一圓角／間距／高度，面板按鈕 14px／44px；共用按鈕 13px／42px。CSS 已檢查，最新畫面仍待使用者重整確認（先前瀏覽器網址政策阻擋）；修改於 main 未提交。
- 自訂建築第一版：獨立工作區支援 GeoJSON／ZIP SHP 地籍、WGS84／TWD97 121／119、宗地選取、手繪與示意基地、矩形占地配置、地上分戶／地下整層、2D／3D、樓層篩選、代表點與點選資訊、多棟與本機／JSON 存取。24 項 Node、12 項 Python 通過；先前 IAB 示意量體與存檔還原成功，最新高度／地下室修正後的瀏覽器驗證被網址政策阻擋，僅整合測試通過。詳見 docs/CUSTOM_BUILDINGS.md。RVT 座標核對暫緩，下一步由使用者測試真實地籍及最新畫面。主工作區 main，尚未 commit。
- 最新屬性顯示政策：僅呈現名稱、類型、GUID、Revit ID、樓層、材料與來源；原始 Pset／Qto 及任意技術欄位隱藏，完整資料仍保存在前處理產物。3 項屬性測試及 IAB 七列抽點核對通過；修改於主工作區 main，未 commit。
- IFC 屬性已納入完整前處理入口 `skills/bim-maplibre-preprocess/scripts/package_ifc.py`：輸出 GLB、GUID 屬性 JSON 與雜湊報告；既有 GLB 必須核對成功轉換報告及來源／輸出雜湊才能重用。站台核對 GLB SHA-256 後才掛接配套屬性。真實資料與全流程測試見 `reports/revit-export-str-2026-10-21/ATTRIBUTE_RESULT.md`。9 項 Node／12 項 Python 測試通過，IAB 抽點成功且無 console error。skill 官方驗證器因目前 Python 缺 PyYAML 未能執行；未標示通過。
- 屬性表格依最新註解移除「屬性名稱／數值內容」表頭列，保留鍵值資料列。
- 三維構件屬性改成左下 380px 表格面板，分為屬性名稱／數值，可捲動、複製文字與取消選取；顯示 GLB 現有欄位，未提供 IFC 類型明示未知。兩項屬性資料測試與 JS 語法通過；IAB 分別點選兩來源構件、驗證左／下各 16px、表格資料與清除動作，無 console error。
- 雙 BIM 資料圖層：開源方案／Revit IFC 方案同頁獨立資料卡、載入快取、三維檢視與地圖可見開關，保留 BIM 主開關。5 項 Node 測試及語法通過；IAB 核對兩模型獨立載入、跨 2D／3D／底圖切換保留開關且無 console error。臨時座標已清除；各自置中比較非共同座標驗證。見 reports/dual-bim-layers-validation-2026-10-21.md。
- 原生 IFC 圖台測試入口：`http://127.0.0.1:8765/?model=native` 載入 native-internal.glb、自動開三維視窗；原網址仍為開源概略模型。實際瀏覽器確認載入完成、canvas 建立、原生標示與無 console error；截圖 API 失敗，未宣稱目視幾何驗收。Node 語法與 3 項 HTTP 路徑測試通過。應使用主機上的 localhost 伺服器，受限環境伺服器瀏覽器無法連入；本次依使用者測試需求保留本機服務執行。
- 2026-10-21 原生兩份 IFC／GLB 已產生；相同 8,536 GUID、16 樓層。第一份 GUID node 對應、包圍盒與四類構件樣本已核對；7 個初步缺 node 項目全為 Axis／Annotation 表示。阻礙縮小至樓板 ID 92848 的一處開口扣除錯誤，兩種座標匯出都存在。不重跑同條件整批；報告與候選路徑見 RESULT.md。圖台預設仍為原先概略模型，未偷偷替換。
- 2026-10-21 原生匯出阻礙診斷：Revit 指定 SteelConnections2027 LocalDB 15.0，但實例查詢不存在；已使用既有 SqlLocalDB 補建並啟動，確認 Running。舊 Revit 仍無回應，強制結束命令被自動核准審查拒絕且未執行，目前等待使用者明確允許結束未儲存升版工作階段後重開。未匯出 IFC。證據與下一個驗證見 reports/revit-export-str-2026-10-21/RECOVERY.md。
- 底圖升級：預設 OpenFreeMap Liberty 向量，保留 OSM 點陣／無底圖；周邊立體建物可獨立切換，僅向量＋3D＋縮放14以上顯示。BIM、GeoJSON 與暫放位置跨底圖切換保留。新增 3 項 Node 圖層切換測試通過，原有 10 項 Python 測試通過；實際瀏覽器三種底圖／OSM 建物／BIM 獨立控制與匯入保留已驗證。證據見 reports/vector-basemap-validation-2026-10-20.md。
- 依使用者頁面註解，站台頁首與瀏覽器分頁名稱改為「多維度空間資料檢視圖台」。
- 本機資料檢視站台：MapLibre 5.6.0／Three.js 0.169.0 固定版本與授權檔保存在 web/vendor/；本機 Python 靜態伺服器只綁 127.0.0.1。啟動地圖.cmd 可啟動並開瀏覽器。模型未預設經緯度，使用者手動暫放會持續標示未驗證。
- 本次新增 HTTP 路徑與目錄清單保護測試，合計 10 項 unittest 通過，app.js Node 語法檢查通過。UI 已於實際瀏覽器載入模型並點選到 IFCBEAM；屬性不宣稱完整 BIM 語意。手動測試位置與示意 GeoJSON 不會寫成真實基地資料。
- rvt-rs 0.6.0 僅安裝於主工作區 artifacts/tools/rvt-rs，無全域安裝；官方 CLI 壓縮包雜湊已核對。實際 STR 產物在 artifacts/rvt-rs-str-0.6.0（IFC 約 28.7 MB、GLB 約 5.27 MB），小型證據、預覽與雜湊在 reports/rvt-rs-str-0.6.0。來源雜湊仍與原盤點相同。無模型上傳。
- 依使用者「成效良好才替代」的條件，本次未更換 skill：成功產物不代表精確幾何；包圍盒比例、178 筆缺少樓層關聯診斷、6 警告及缺少獨立基準使其未通過替代判斷。
- 新增 prepare_revit_export.py 並對 STR 真實來源執行：只重算此檔 SHA-256、核對既有盤點、環境檢查、產生 export-job.json／placement.json／HANDOFF.md；無工具時明確回報 awaiting_tool。交接包不代表已匯出 IFC。
- 已確立本機 Python CLI 優先、Rust 依效能量測評估的原則，寫入 AGENTS／skill／DECISIONS。大型資料不上傳對話；沿用既有報告避免重複掃描。本次未重跑 RVT，也未新增自動快取／斷點工具。
- 建立專案 Git main、來源排除規則、前處理 skill、唯讀盤點及基礎轉換腳本。
- 原始檔 4 個合計 1,528,389,632 bytes；所有檔案格式欄位為 2021。
- 建築檔的 STR 連結 `A18A-CO-STR-ALL.rvt` 與現有 `A18A-CO-STR-60_.rvt` 名稱不同，不能自動視為同檔。
- 連結狀態是歷史儲存紀錄；缺失註解表／CAD 不必然造成宿主幾何缺漏，需逐項核對。
- 已擷取四檔內嵌 PNG 預覽至 reports/previews/；目視 STR 與 AR 可見建築群三維畫面。這只是儲存時快取，非本次重新產生的幾何或完整性證明。

## 下一步（按依賴）
站台已可供檢視：主工作區執行 `啟動地圖.cmd`；工作樹啟動加 `--data-root` 指向主工作區（參見 MAP_SITE.md）。測試伺服器在 QA 後停止，使用者啟動檔可自行重啟。模型與圖層狀態僅存在分頁記憶體。
0. 不要重跑相同的 rvt-rs 0.6.0 條件；預設與 --saved-meshes 已比較且未改善。若使用者接受概略近似，可明確另行走 preview-only GLB 展示分支；地理定位仍須另確認，不將正式幾何階段標記 passed。若要求準確結構，繼續以下正式路線。
1. 不要重匯整批：兩份原生 IFC 已取得並轉換。接續 RESULT.md，針對樓板 Revit ID 92848／GUID 1wj3$2YBX81ubIDkAMUbiG 的開口扣除失敗做局部核對；保留原始模型。不要將缺少 Axis-only node 誤當實體漏轉。
2. 候選 artifacts/revit-str-2026-10-21/native-internal.glb 可由現有圖台本機載入；先做原生幾何與洞口視覺驗證，再考慮替換預設模型。原始 IFC 公分、GLB 公尺、GLB Y-up；IFC 地理經緯度疑似樣板，EPSG 未知，不能自動套地圖。全量幾何等價、Khronos validator、效能與正式地理驗收尚未執行。
3. 屬性包與抽點顯示已完成；新增 IFC 時依 skill references/attributes.md 執行 package_ifc.py。後續填入定位契約、驗證更多代表構件及效能；現有 MapLibre 預覽不代表正式地理驗收。

## 工作樹與接續
主資料目錄：`C:/Users/benhs/OneDrive/文件/三維圖台/references/A18-1`。
開發工作樹：`C:/Users/benhs/.codex/worktrees/bim-preprocess/三維圖台`，分支 `codex/bim-preprocess`，已附加於本聊天；主工作區維持 main。
使用者 skill 已安裝於 `C:/Users/benhs/.codex/skills/bim-maplibre-preprocess`，repository 的 skills/ 是版本來源。新對話可用 `$bim-maplibre-preprocess`；是否立即出現在目前對話的 skill 清單取決於 app 重新載入，亦可直接讀專案內 SKILL.md。
以 `git worktree list` 取得目前工作樹與分支；docs/WORKTREES.md 記錄操作方式。新對話先讀本檔與 DECISIONS，再看 git status、git diff；不要重跑盤點除非來源有變。

## 驗證紀錄
驗證結果見 reports/validation-2026-10-20.md；未執行的原生匯出、真實 IFC 轉換與畫面驗收一律保持 pending。
本次新增準備工具後，7 項單元測試與 skill 格式檢查通過。匯出準備的成功僅證明來源核對及交接建立，不代表原生幾何匯出。
