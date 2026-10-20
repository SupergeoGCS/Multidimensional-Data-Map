# 專案狀態

更新日：2026-10-20（Asia/Taipei）。本檔是跨對話接續入口，實際 Git 工作樹與報告為證據來源。

## 目標與判斷
MapLibre GL JS 三維模式展示 RVT 建築與結構。先 STR，再 AR，MEP／LS 後續依需求。已以 rvt-rs 0.6.0 對 STR 成功匯出 IFC／GLB 並產生本機概略預覽，但約 71.2% bodies 是包圍盒近似，尚未通過正式幾何替代驗證。實測報告見 reports/rvt-rs-str-0.6.0/RESULT.md。

## 階段
| 階段 | 狀態 | 證據／限制 |
|---|---|---|
| RVT 容器與中繼資料盤點 | passed | reports/rvt-inventory-2026-10-20.json；4 檔、SHA-256、Revit 2021、build 與連結狀態；不代表幾何驗證 |
| 開源 RVT 解析試驗 | completed_not_accepted | rvt-rs 0.6.0；8,373 建築構件、16 樓層，輸出 IFC／GLB；5,962 bodies 是包圍盒；--saved-meshes 因 2021 framing 未驗證而未生效，未替代正式流程 |
| 原生 Revit 開啟與連結核對 | awaiting_tool | 使用者確認目前沒有 Revit；已執行 PATH、標準安裝目錄、HKLM/HKCU 32/64 位元 Revit 登錄項目檢查，未找到候選工具；見 reports/revit-export-str-2026-10-20/export-job.json |
| 正式 IFC 匯出 | awaiting_tool | 已有 rvt-rs 試驗 IFC，但不符合正式幾何要求；原生匯出交接包仍有效，12 筆歷史外部參照仍待核對；原生開啟／匯出未執行 |
| IFC→GLB | awaiting_tool | PATH 無 IfcConvert；已備轉換腳本，尚無真實 IFC 可測 |
| 屬性對應與座標契約 | pending | CRS、高程、共同原點、真北、控制點未知；不得猜定位 |
| 本機地圖站台與概略模型互動 | passed_preview | 已建立 web/ 與 tools/serve_map.py；IAB 實測 2D／3D、模型預覽、構件名稱點選、線框、手動暫放、GeoJSON 匯入／移除、GLB 替換，無觀測到 console error；見 docs/MAP_SITE.md |
| 精確地理套合與效能驗收 | pending | 手動暫放僅為預覽；真實位置、測量誤差、目標硬體幀率／記憶體未量測；不把站台可用等同正式 BIM 驗收 |

## 已完成
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
1. 本機目前無 Revit；由模型持有人使用 reports/revit-export-str-2026-10-20/HANDOFF.md 執行原生匯出，或未來取得相容且可用授權的 Revit 後接續。需回傳 STR IFC、填妥 export-job.json、placement.json 及匯出設定；先確認構件可見與連結影響。不得僅因交接包存在就直接進入已通過的 IFC 階段。
2. 將合格 IFC 放主工作區 data/ifc/，使用指定版本 IfcConvert 輸出新的 artifacts/ run 目錄，報告放 reports/。rvt-rs 的 preview-only GLB 已直接輸出，不需為這份概略預覽額外執行 IFC→GLB；正式 IFC→GLB 工具鏈仍未測。
3. 填入定位契約，抽查代表構件與 IFC GUID；再建最小 MapLibre 展示並設定驗收目標。

## 工作樹與接續
主資料目錄：`C:/Users/benhs/OneDrive/文件/三維圖台/references/A18-1`。
開發工作樹：`C:/Users/benhs/.codex/worktrees/bim-preprocess/三維圖台`，分支 `codex/bim-preprocess`，已附加於本聊天；主工作區維持 main。
使用者 skill 已安裝於 `C:/Users/benhs/.codex/skills/bim-maplibre-preprocess`，repository 的 skills/ 是版本來源。新對話可用 `$bim-maplibre-preprocess`；是否立即出現在目前對話的 skill 清單取決於 app 重新載入，亦可直接讀專案內 SKILL.md。
以 `git worktree list` 取得目前工作樹與分支；docs/WORKTREES.md 記錄操作方式。新對話先讀本檔與 DECISIONS，再看 git status、git diff；不要重跑盤點除非來源有變。

## 驗證紀錄
驗證結果見 reports/validation-2026-10-20.md；未執行的原生匯出、真實 IFC 轉換與畫面驗收一律保持 pending。
本次新增準備工具後，7 項單元測試與 skill 格式檢查通過。匯出準備的成功僅證明來源核對及交接建立，不代表原生幾何匯出。
