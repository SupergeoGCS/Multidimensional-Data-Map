# STR 原生匯出阻礙診斷與修復

日期：2026-10-21（Asia/Taipei）。本次未產生正式 IFC／GLB。

## 證據
- 14:02 左右，僅一個 Revit PID 19532，STR 副本視窗無回應；activate_window 兩次逾時。未向無回應視窗發送匯出指令。
- 程序 CPU 約 902 秒，後續只緩慢增加；journal.0001.txt 最後寫入 13:38:05，長度 1,023,360 bytes。系統約 15.7 GiB 實體記憶體、當時可用約 2.4 GiB，不能只歸因於記憶體不足。
- Revit AddIns/SteelConnections/ASSettings_Advance.xml 指定 DefaultSQLServerLocalDbInstanceName=SteelConnections2027，版本 15.0。
- SqlLocalDB versions 顯示 Microsoft SQL Server 2019 15.0.4382.1；info SteelConnections2027 回報不存在，儘管同名歷史實例資料夾仍在。
- zh-TW/DatabaseConnectionErrors.log 記錄 13:05 啟動失敗，後續反覆出現 Local Database Runtime error、specified LocalDB instance does not exist。這比單純等待模型載入提供更明確的環境阻礙。
- fsutil sectorinfo C: 回報 Access is denied，因此沒有確認磁區大小，也沒有變更磁區相關登錄設定。

## 已執行的最小修復
使用已安裝的 `C:/Program Files/Microsoft SQL Server/150/Tools/Binn/SqlLocalDB.exe`：
1. `create SteelConnections2027 15.0` 成功，版本 15.0.4382.1。
2. `start SteelConnections2027` 成功。
3. `info SteelConnections2027` 確認 Running，擁有者為目前使用者。

未刪除實例、資料庫或 Revit 元件；未修改原始 RVT。建立實例只證明 LocalDB 可啟動，不代表 Revit／幾何已修復。

## 當前阻礙與下一步
- 舊 Revit 工作階段沒有恢復，仍無回應；需在修復後環境重新開啟副本。
- 嘗試終止精確核對的 PID 19532 時，自動核准審查拒絕：強制終止會失去未儲存的升版狀態，使用者原授權尚未明確包含此動作。命令未執行，亦未另開 Revit。
- 已向使用者請求是否允許強制結束並重開副本，待回覆。不得透過其他方式繞過拒絕。
- 核准後才結束此實例、重新開啟同一副本；LocalDB 已改變，因此此次重開是有新條件的驗證。若仍失敗，停止重開，針對新日誌診斷。
- 本機目前仍未找到 IfcConvert／ifcopenshell；取得原生 IFC 後需補齊版本固定的轉換依賴。

## 官方參考
- [File opens to a grey screen in Revit](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/File-opens-to-a-grey-screen-in-Revit.html)：灰畫面與 SQLLocalDB 互動異常的關聯，並非本模型已驗證的唯一原因。
- [Revit: Hangs or Crashes Due to SQLLocalDB Issues](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Revit-Journal-records-SQLLocalDB-instance-is-malfunctioning.html)：診斷路線。磁區修正需先確認條件；本次未套用。

## 使用者核准後的接續
- 使用者明確允許強制結束並重開副本；已精確核對 PID 19532 的 Revit／STR 視窗後終止，未回存原始 RVT。
- LocalDB 實例仍 Running。新 Revit PID 3340 已進入首頁且 Responding=True，日誌 journal.0003.txt；尚未開啟 STR 副本，不能宣稱模型問題已解決。
- 試用資訊視窗的關閉按鈕被 Windows 工具拒絕，因點擊位置所屬 msedgewebview2.exe 與 Revit 主視窗不同；Escape 無法關閉、可存取樹無資料。沒有繞過工具或使用其他原生 UI 自動化。
- 已請使用者手動關閉中央試用提示，再繼續開啟同一 STR 副本。這是操作工具限制，不是再次請求終止授權。
- 等待期間已補齊 IfcConvert：依官方安裝文件的 Windows 發行連結，固定 0.9.0post1，ZIP 大小 30,341,869 bytes、SHA-256 963265186fec13ad2ba56edea614f32b715774ca1a5777fc8b84e5e5a35767ff 與 GitHub 發行 digest 相符。隔離在 artifacts/tools/ifcconvert-0.9.0post1；--version 顯示 0.9.0post1+b5e509b、--help exit 0。manifest 與 UTF-8 help 保存同報告目錄；轉換 not_run，沒有以安裝成功替代模型測試。

## 手動關閉提示後：原生模型成功顯示
- 使用者確認已關閉試用提示；於 PID 3340 重新開啟原先 STR 副本。升版再次顯示 0 錯誤／22 警告及分析模型升版資訊，保留警告繼續，未取消接合或刪除構件。
- journal.0003.txt 已通過原先停滯位置，記錄背景三維資料完成與鋼構元素更新；GUI 成功顯示多棟宿主三維結構，可見框架與樓板，原生開啟這一關已有實際畫面證據。此觀察尚非代表構件逐一完整性驗收。
- Manage Links 實際顯示 9 個 CAD 格式參照均有警告、1 個 AR RVT 卸載（overlay）；未重新連結，宿主匯出計畫排除它們。另兩個歷史註解表未完成 GUI 核對，不宣稱 12 筆全數通過。
- 目前 {3D} 視圖的 detail level=細緻、discipline=協調；phase／section box／類別等尚待核對，不能只憑可見全景當成完整匯出視圖。
- 桌面工具點選 File→Export 會將 flyout 收起。改用單次 press_key k+s 可開啟快速鍵對話框，但搜尋欄 type_text 無結果，UIA set_value 回報 wait for accessibility set value timed out waiting on channel。重選視窗後仍顯示未輸入的搜尋欄，未變更快捷鍵。
- 已停止重複嘗試相同操作，請使用者關閉「快速鍵」並手動開啟 File→Export→IFC，停在匯出視窗供後續核對；尚未匯出或轉換。這是 Windows 自動化操作限制，與原先 LocalDB 阻礙不同。
- 使用者回覆已開啟 IFC 匯出視窗後，重新選取與聚焦 Revit，工具仍只回傳宿主模型主畫面；可存取樹無資料、視窗清單沒有 IFC 對話框。無法證實對話框是否被工具聚焦操作收起，不能猜測設定或宣稱已按匯出。
- 不再重複要求只開對話框；已建立 data/ifc/revit-str-2026-10-21 與 EXPORT_NOW.md，將完整原生 IFC 匯出交接給使用者。IFC4 Reference View／內部原點／不匯出連結／不只限目前視圖均為待執行要求，不是已驗證設定；收到產物與設定證據後再記錄實際值。
