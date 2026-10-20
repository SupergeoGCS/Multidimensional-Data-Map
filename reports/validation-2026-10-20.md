# 流程建置驗證

日期：2026-10-20。Python 3.12，標準函式庫腳本；skill 格式檢查另使用 PyYAML 6.0.3（僅安裝於被忽略的 artifacts/validation-deps）。

| 檢查 | 結果 | 範圍 |
|---|---|---|
| 真實 RVT 唯讀盤點 | passed | 四檔皆成功讀取 BasicFileInfo 與 TransmissionData、產生 SHA-256；source_stable_during_audit 全部 true |
| 內嵌預覽擷取 | passed | 四檔 RevitPreview4.0 的 PNG 保存於 reports/previews/；STR、AR 目視可見建築群三維畫面；僅快取畫面，不是本次原生開啟或構件驗收 |
| skill-creator quick_validate.py | passed | Skill is valid!；UTF-8 模式 |
| unittest discover -s tests -v | passed | 7 測試：損壞 RVT、循環 FAT、GLB 截斷／區塊越界、重複 JSON、轉換紀錄／覆寫拒絕／執行失敗、匯出交接包安全狀態與來源變更拒絕 |
| STR 原生匯出準備工具 | passed | 真實來源 SHA-256 與盤點一致；生成交接包、未知座標保留 null；環境無候選 Revit，階段狀態 awaiting_tool，未產生 IFC |
| 獨立 Luna 審查 | completed | 已修正材質盤點範圍與 GLB JSON／BIN 數量順序；審查時狀態文件尚在建立，現已補齊 |
| Revit 開啟／匯出 | not_run | 尚未取得相容原生工具環境 |
| 真實 IFC→GLB | not_run | 無 IFC 與已確認 IfcConvert；單元測試以 mock 執行器，不代表真實轉換 |
| 完整 glTF validator | not_run | 基礎腳本只驗證容器與 JSON，不驗證 accessor／buffer／材質語意 |
| 座標／構件／MapLibre 畫面與效能 | not_run | 待匯出資產與定位契約 |

初次單元測試受系統 Temp 權限阻擋，改用專案內 artifacts/test-tmp 後通過。初次 skill 驗證缺 PyYAML，補入專案驗證依賴後通過。未改動原始 RVT。

最小驗證命令：
```powershell
python -m unittest discover -s tests -v
# 官方 skill 格式檢查工具須啟用 UTF-8 並能 import yaml。
```
