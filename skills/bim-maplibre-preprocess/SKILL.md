---
name: bim-maplibre-preprocess
description: Audit Revit RVT sources and prepare georeferenced IFC and GLB assets for MapLibre GL JS, including export handoff, conversion logs, element identity, and visual acceptance. Use for BIM preprocessing and resuming this pipeline; does not edit native Revit geometry.
---

# BIM → MapLibre 前處理

目標是可重現、可追溯、定位正確的三維資產。區分「容器可讀」、「Revit 可開啟」、「幾何已轉換」、「地圖已驗收」；任何一項不得推論其他項已通過。

## 大型資料的本機處理原則
- 以本機 Python CLI 編排與處理為預設；若量測確認 CPU、記憶體或吞吐量瓶頸，再評估 Rust 模組或獨立 CLI。不要僅為語言選擇重寫已可用的工具。幾何解析交給相容 Revit／IfcOpenShell 等工具；改用 Rust 或 Python 不會免除 RVT 格式與工具相容性限制。
- 模型、幾何、逐構件屬性及完整日誌留在本機，不送入 LLM 上下文；代理只讀小型 manifest、統計、錯誤摘要與必要預覽。診斷時先按錯誤類型／構件 ID 篩選，再讀有限筆內容；禁止整份模型文字化、base64 輸出或逐構件工具呼叫。
- 不因處理大型檔案而上傳雲端、下載遠端模型或安裝新套件。工具安裝屬獨立依賴需求，先確認本機是否已有可用版本，記錄實際需要的依賴。
- 雜湊採區塊讀取，二進位驗證優先 seek／stream；依模型、專業或批次循序處理，並行數依量測的記憶體與 I/O 決定。不要假設原生幾何轉換器也能固定記憶體串流。
- 接續時先重用現有盤點與成功階段的 manifest，避免重跑整個資料集。重用產物須核對來源內容雜湊、工具版本／雜湊、參數與定位契約；僅大小與修改時間相同不能當成內容相同的證明。條件不明則標記未確認，必要時本機重算雜湊；失敗只重跑受影響階段。
- stdout 僅輸出狀態、數量、耗時及報告路徑；詳細結果寫入 JSON／JSONL 或其他適當本機格式。持久化每階段成功／失敗與輸入身份，之後新增批次快取／斷點工具時需測試失敗產物不會誤命中。

## 接續與來源
在專案先讀 AGENTS.md、docs/STATE.md、docs/DECISIONS.md，查看 Git 狀態與工作樹。若其他專案沒有這些文件，建立同用途紀錄並填入實際狀態。所有腳本路徑相對本 skill。

1. 執行 `python scripts/audit_rvt.py --source <RVT資料夾> --output <盤點.json>`。腳本唯讀解析 CFB 的 BasicFileInfo 與 TransmissionData，記錄 SHA-256、大小、版本、原始連結。連結狀態是上次儲存的紀錄；不能當成目前可用性證明。容器解析失敗不等於模型無法由 Revit 修復；保留錯誤並交給相容工具診斷。
2. 版本、外部連結、Revit／轉換器可用性不明時先盤點。不要憑 `-60_` 等檔名推斷樓層或內容。不要把同專業但不同檔名的 RVT 自動替換連結。

## 匯出與轉換
讀 [references/pipeline.md](references/pipeline.md) 的 Revit 匯出、座標與屬性規則。RVT 需要相容 Revit 或已驗證的合法解析工具；IfcConvert 不讀 RVT。沒有這類工具時完成盤點和匯出交接，將匯出階段標記 awaiting_tool，不得宣稱完成自動轉檔。不要為此自行上傳私有模型至雲端。

優先以 STR 單檔驗證，再加 AR；專業別只是檔名推測，須以實際開啟結果確認。Revit 在副本匯出可見三維模型為 IFC，保存版本、視圖、匯出設定、連結處理與座標證據。

使用 `python scripts/convert_ifc.py --input <model.ifc> --output <新目錄/model.glb> --ifcconvert <執行檔> --report <轉換紀錄.json>`。此腳本僅執行基礎 IFC→GLB，驗證 GLB 容器／JSON；不自動修正座標、不抽取完整屬性、不代表視覺驗收。失敗保留日誌並記錄原因；產物路徑不可覆寫。確認所用版本的 `IfcConvert --help` 後再選額外旗標，不假設所有版本支援相同選項。

## 品質閘門
依 pipeline.md 完成構件與屬性、座標、材質、效能、MapLibre 驗收。未通過或未執行的閘門明確標記。GLB 未保留的 BIM 語意另做 sidecar，至少保留來源雜湊與唯一構件識別；幾何節點無法對應 IFC GUID 時不能宣稱可查詢構件屬性。

在 docs/STATE.md 記錄階段（pending / awaiting_tool / in_progress / passed / failed）、證據檔、工具版本、阻礙、下一個可執行動作。追加工作紀錄。原始檔與大型產物不加入 Git；報告不得包含密碼、token，外部分享前檢查原始路徑等專案資訊。
