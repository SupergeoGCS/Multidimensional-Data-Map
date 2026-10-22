# GitHub CI 與展示部署

## 目前狀態

使用者已於 2026-10-22 自行將原始碼儲存庫切為公開，API 確認 `private=false`。已啟用 Pages workflow、HTTPS 及 `PUBLIC_DEMO_PAGES=true`，首次公開部署 run `39718636378`。
站台網址：[多維度空間資料檢視圖台](https://supergeogcs.github.io/Multidimensional-Data-Map/)；[原生 STR 直接入口](https://supergeogcs.github.io/Multidimensional-Data-Map/?model=native)。首次公開部署 [run 39718636378](https://github.com/SupergeoGCS/Multidimensional-Data-Map/actions/runs/39718636378) 的 test／deploy 均成功，正式 HTTPS 網址已通過瀏覽器模型載入與屬性抽點驗證。
此前私有儲存庫啟用 Pages 曾回覆 HTTP 422（方案不支援）；公開後建立成功。未另建公開儲存庫。

遠端首次實跑：[Actions run 39717220298](https://github.com/SupergeoGCS/Multidimensional-Data-Map/actions/runs/39717220298)，程式提交 `e5b1f75`。test job 全部通過，含 35 項 Node、14 項 Python、展示打包與 artifact 上傳；deploy job 為 skipped，沒有公開發布網站。

## 自動流程

`.github/workflows/pages.yml` 在 push 至 main、對 main 提出 PR，或手動執行時：

1. 使用 Ubuntu、Node 22、Python 3.12 執行 Node 與 Python 測試。
2. 檢查 whitespace，打包公開示意版；失敗即停止後續步驟。
3. push／手動執行時上傳 `github-pages` artifact；PR 僅測試及打包。
4. 只有 repository variable `PUBLIC_DEMO_PAGES` 的值為 `true`，且來源為 main、非 PR 時才執行公開部署。預設未設定，部署跳過。

只有 deploy job 有 `pages: write`、`id-token: write`，使用 `github-pages` environment；部署依序執行，不中斷正在進行的部署。測試失敗時不部署新版本。

## 展示包

`tools/build_pages.py` 複製 `web/` 中允許的靜態檔，並依使用者 2026-10-22 最新授權，加入 `web/assets/manifest.json` 列出的 STR 發布檔。不複製 `references/`、`artifacts/`、`reports/`、Git 設定、原始 RVT／IFC 或其他 BIM 產物，拒絕符號連結。輸出目錄必須尚不存在。

| 發布檔 | 大小（十進位 MB） |
|---|---:|
| assets/str.glb（開源概略模型） | 5.27 |
| assets/native-str.glb（Revit IFC 候選） | 15.66 |
| assets/native-str.attributes.json | 6.95 |
| assets/preview.png | 0.06 |

四檔合計 27,936,124 bytes（約 27.94 MB）。CI 以固定清單核對各檔 SHA-256、大小、GLB 容器與屬性綁定，並驗證原生 8,243 個幾何節點全數對應 8,536 元素字典。更新模型時須成對更新 GLB／屬性與 manifest，不能只改檔名或檔案大小。

```powershell
python tools/build_pages.py --output artifacts/pages-preview-new
python -m http.server 8767 --bind 127.0.0.1 --directory artifacts
```

開啟 `http://127.0.0.1:8767/pages-preview-new/` 可測試子路徑；Ctrl+C 停止。
展示包內的 `site-config.js` 啟用公開示意模式，本機 `web/site-config.js` 維持關閉。

展示模式顯示兩種 STR 資料卡，可展開並按「檢視模型」，原生模型支援中文構件屬性；`?model=native` 可直接開啟原生預覽。兩者與本機一致，載入並核對模型雜湊及專案定位接受紀錄後，自動套用使用者確認的 RVT 原始位置／EPSG:3826。初始只顯示目前選擇的方案，可切換兩張資料卡的顯示開關比較；定位頁可重新套用或清除。此為專案採用定位，不代表已完成測量與垂直基準驗收。開源模型約 71.2% bodies 是包圍盒，原生模型仍保留樓板 92848 一處開口轉換問題說明。
首次無存檔時另載入兩棟示意住宅並開啟 3D。示意資料不自動寫入本機儲存，已有存檔優先；保留自訂建築及瀏覽器本機檔案匯入功能。示意住宅位置與配置非真實地籍或建物。底圖仍需連線至既有服務，瀏覽器匯入的本機檔案不會送至 GitHub。
新 clone 沒有 `artifacts/` 時，本機 `serve_map.py` 亦可讀取發布的 STR 檔；主工作區仍優先使用本機 artifacts 原有版本。

## 啟用與停用

目前已依使用者完成的公開切換啟用。以下為重新設定時的操作：

1. 確認儲存庫公開或 GitHub 組織方案支援私有儲存庫 Pages，以及展示內容可以公開。
2. 在 Settings → Pages 將 Source 設為 GitHub Actions。
3. 在 Settings → Secrets and variables → Actions → Variables 設定 `PUBLIC_DEMO_PAGES=true`。
4. 在 Actions 手動執行 `Test and deploy public demo`，或推送 main。
5. 確認 test／deploy jobs 成功，再實際開啟 deployment 回傳的網址。

停用後續部署可移除上述 variable；這不會刪除已發布網站。網站若已發布且需要下架，須另於 Pages 設定取消發布。

官方參考：[Pages 自訂 Actions 流程](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Pages API](https://docs.github.com/en/rest/pages/pages)。
