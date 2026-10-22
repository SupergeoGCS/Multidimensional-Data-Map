# GitHub CI 與展示部署

## 目前狀態

原始碼儲存庫維持私有。使用者於 2026-10-22 決定先完成 CI 與部署程式，暫不公開網站。
GitHub Pages 啟用 API 回覆 HTTP 422：`Your current plan does not support GitHub Pages for this repository.`
未變更儲存庫可見性，也未另建公開儲存庫。

遠端首次實跑：[Actions run 39717220298](https://github.com/SupergeoGCS/Multidimensional-Data-Map/actions/runs/39717220298)，程式提交 `e5b1f75`。test job 全部通過，含 35 項 Node、14 項 Python、展示打包與 artifact 上傳；deploy job 為 skipped，沒有公開發布網站。

## 自動流程

`.github/workflows/pages.yml` 在 push 至 main、對 main 提出 PR，或手動執行時：

1. 使用 Ubuntu、Node 22、Python 3.12 執行 Node 與 Python 測試。
2. 檢查 whitespace，打包公開示意版；失敗即停止後續步驟。
3. push／手動執行時上傳 `github-pages` artifact；PR 僅測試及打包。
4. 只有 repository variable `PUBLIC_DEMO_PAGES` 的值為 `true`，且來源為 main、非 PR 時才執行公開部署。預設未設定，部署跳過。

只有 deploy job 有 `pages: write`、`id-token: write`，使用 `github-pages` environment；部署依序執行，不中斷正在進行的部署。測試失敗時不部署新版本。

## 展示包

`tools/build_pages.py` 僅複製 `web/` 中允許的靜態副檔名，不複製 `references/`、`artifacts/`、`reports/`、Git 設定、來源模型或 BIM 產物，拒絕符號連結。輸出目錄必須尚不存在。

```powershell
python tools/build_pages.py --output artifacts/pages-preview-new
python -m http.server 8767 --bind 127.0.0.1 --directory artifacts
```

開啟 `http://127.0.0.1:8767/pages-preview-new/` 可測試子路徑；Ctrl+C 停止。
展示包內的 `site-config.js` 啟用公開示意模式，本機 `web/site-config.js` 維持關閉。

展示模式隱藏未發布的 BIM 卡片、阻止請求本機 BIM，首次無存檔時載入兩棟示意住宅並開啟 3D。示意資料不自動寫入本機儲存，已有存檔優先；保留自訂建築及瀏覽器本機檔案匯入功能。
位置與配置均為功能示意，非真實地籍或建物。底圖仍需連線至既有服務，匯入的本機檔案不會送至 GitHub。

## 日後啟用

須由使用者再次決定公開發布；目前不啟用。

1. 確認 GitHub 組織方案支援私有儲存庫 Pages，以及展示內容可以公開。
2. 在 Settings → Pages 將 Source 設為 GitHub Actions。
3. 在 Settings → Secrets and variables → Actions → Variables 設定 `PUBLIC_DEMO_PAGES=true`。
4. 在 Actions 手動執行 `Test and deploy public demo`，或推送 main。
5. 確認 test／deploy jobs 成功，再實際開啟 deployment 回傳的網址。

停用後續部署可移除上述 variable；這不會刪除已發布網站。網站若已發布且需要下架，須另於 Pages 設定取消發布。

官方參考：[Pages 自訂 Actions 流程](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Pages API](https://docs.github.com/en/rest/pages/pages)。
