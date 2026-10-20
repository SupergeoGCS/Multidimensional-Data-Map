# 工作樹與狀態操作

主工作區：`C:/Users/benhs/OneDrive/文件/三維圖台`，分支 main，保存 references/ 來源。獨立工作樹的實際路徑以 `git worktree list` 為準。

新對話貼上：
> 請接續本專案；先讀 AGENTS.md、docs/STATE.md、docs/DECISIONS.md，執行 git status、git diff 與 git worktree list，依紀錄進行下一步。來源位於主工作區 references/A18-1，不要把前處理腳本測試當成實際 BIM 轉檔完成。

每次開始：
```powershell
git status --short --branch
git diff --stat
git worktree list
```

工作樹內沒有被忽略的 references/，以主工作區的絕對路徑執行盤點／匯出。各工作樹各自建立 artifacts/run-id，報告保存來源雜湊、工具版本、命令、結果與限制。避免在兩個對話同時修改同一工作樹；衝突時先保留修改、檢查差異，再整合。

每次結束：更新 STATE 與 WORKLOG，檢查 `git diff --check`，執行本次變更需要的驗證。提交只包含程式、文件與小型報告；禁止 `git add -f references`。未明確要求時不 push、不上傳資料、不刪工作樹。需要整合時先確認另一工作樹是否有未提交變更，再執行 merge；不要覆寫。

Git 可保存程式與報告，不能備份被排除的 RVT。來源雜湊只證明盤點時的檔案身份；更換模型時產生新盤點報告並更新 STATE。
