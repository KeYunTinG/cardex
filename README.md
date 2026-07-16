<div align="center">

# 💳 Cardex

**刷哪張卡最划算？**

跨卡信用卡回饋查詢 — 輸入商家、通路或國碼，一次問出七張卡的回饋方案。

[![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Deploy](https://img.shields.io/badge/GitHub_Pages-Actions-222?logo=githubpages&logoColor=white)](#-部署)
[![Runtime deps](https://img.shields.io/badge/執行期相依-僅_Angular-4c1)](#-設計取捨)

`7 張卡` · `553 項優惠` · `66 個加碼國碼` · `純前端，無後端`

</div>

---

## 這是什麼

各家銀行的信用卡權益手冊動輒數十頁，「這家店我該刷哪張卡」卻沒人回答得了。
Cardex 把七張卡的權益條文整理成結構化資料，讓你用**一個輸入框**問出答案：

```
輸入「淘寶」   →  星展 最高 10%／台新 3.3%／玉山 U Bear 最高 3%
輸入「麥當勞」 →  星展 最高 10%／聯邦賴點 5%／台新 3.8%
輸入「JPN」    →  JPN 日本 · 列入星展加碼國家 · 5%（一般消費 1% ＋ 加碼 4%）
輸入「歐洲」   →  41 個歐洲國碼 · 5%（歐洲實體不計一般消費，加碼 5%）
```

查詢會**跨所有卡片**比對商家名稱、帳單顯示別名與活動類別，再依卡片分組，
把「屬於哪個活動、回饋幾 %、上限多少、有什麼條件」一次列出來。

## ✨ 特色

- **🔍 跨卡查詢** — 一次比對 7 張卡、553 項優惠，依卡片分組呈現
- **🏷️ 別名比對** — 認得帳單上的鬼名字：`APPLE.COM` → App Store、`TIXCRAFT` → 拓元、`驚安殿堂` → 唐吉訶德
- **🌏 國碼查詢** — 輸入 `JPN`／`日本`／`歐洲`，查星展存戶升級 5% 加碼國家（66 國，直接取自權益手冊列舉）
- **⚠️ 條件同時呈現** — 回饋率旁邊就是上限與限制（需綁 Autopay？限實體卡？第三方支付不算？），避免只看數字踩雷
- **⚡ 純靜態** — 沒有後端、沒有 API、沒有執行期資料抓取，一個 bundle 打完收工

## 🚀 快速開始

需要 **Node.js 20+**。

```bash
npm ci          # 安裝相依套件
npm start       # 開發伺服器 → http://localhost:4200/
npm run build   # production build → dist/
npm test        # 單元測試（Karma）
```

## 📁 專案結構

```
src/
├─ app/
│  ├─ card-data.ts   # ⭐ 結構化資料：CARDS / OFFERS / DBS_COUNTRIES
│  ├─ app.ts         # 查詢邏輯（Angular signals + computed）
│  ├─ app.html       # 單頁介面
│  └─ app.css        # 樣式
└─ cardInfo/         # 📄 原始權益手冊 MD（資料來源，不打包進網站）
```

## 🧩 資料模型

三個型別撐起整個查詢，全部在 [`src/app/card-data.ts`](src/app/card-data.ts)：

```ts
interface Card {                 // 卡片本身與基本回饋
  id: string; name: string; issuer: string;
  general: { label: string; rate: string }[];
  file: string;                  // 出處 MD（僅標示來源）
}

interface Offer {                // 一個商家 × 一個活動 = 一筆
  cardId: string;
  merchant: string;
  aliases?: string[];            // 帳單顯示名稱／別名，供搜尋比對
  category: string;              // 所屬活動，如「精選通路·娛樂無限」
  rate: string;                  // 保留原文寫法，如「最高 10%」「現折 100 元」
  cap?: string;                  // 回饋上限
  note?: string;                 // 適用條件
}

interface Country {              // 星展加碼國家（66 國）
  code: string;                  // 三碼國別碼，依手冊原文
  name: string;
  region: string;                // 日本／韓國／泰國／新加坡／美洲／歐洲
}
```

`rate` 刻意存**字串而非數字** — 因為原文寫法本身就帶資訊：
`1.5%` 是固定回饋，`最高 10%` 要達成條件才拿得到，`現折最高 10%` 是折抵而非回饋，
而 `現折 100 元` 根本不是百分比。硬轉成 `number` 會把這些差異壓平，反而失真。

## 📖 資料怎麼來的

`src/cardInfo/*.md` 是各卡權益手冊／官網頁面的整理稿，
再由人工抽取成 `card-data.ts` 的結構化資料。**MD 不會被打包進網站**，
它只是資料來源與日後對照的依據。

有一個例外值得一提：**國碼清單是唯一能從 MD 直接對照驗證的部分** —
星展手冊裡原文就逐一列舉了「國碼 + 國名」，66 筆全部照抄，
可以用腳本跟 MD 比對確認沒有漏抄或改名。

`Country.region` 則是**推論而非原文**：手冊只列了國碼與國名，沒有標註各國屬於哪個地區，
因此依手冊的回饋計算公式（把「日本、韓國、泰國、新加坡、美洲地區」與「歐洲地區」分列兩項）
加上地理歸屬填入。這點在程式碼註解中也有標明，避免被誤認為原始資料。

<details>
<summary>為什麼歐洲和其他地區都是 5%，卻要分開算？</summary>

<br>

因為組成不同。歐洲地區實體消費**不列入一般消費**，所以是 `0% 基本 + 5% 加碼`；
日／韓／泰／新／美洲則是 `1% 基本 + 4% 加碼`。兩者總和都是 5%，但計算基礎不一樣，
所以介面上會分別標示，而不是含糊地寫一個「5%」。

</details>

## 🤔 設計取捨

- **資料寫死在 TS，而非執行期讀 MD** — 早期版本會在啟動時 `fetch` 全部 MD 做全文搜尋，
  後來拿掉了：查詢要的是結構化答案（哪張卡、幾 %、什麼條件），全文搜尋只能給你一段文字，
  還得自己讀。移除後也順帶少了 `marked` 相依與約 **49 KB** bundle。
- **別名是一等公民** — 帳單上不會寫「App Store」而是 `APPLE.COM`。
  沒有別名比對，這類查詢全部落空，所以 `aliases` 直接進搜尋欄位。
- **上限與條件跟回饋率並列** — 「最高 10%」如果沒寫「需設定 Autopay、每月上限 500 點」，
  對使用者其實是誤導。

## 🚢 部署

推上 `main` 會觸發 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：
build（`--base-href /cardex/`）→ 複製 `index.html` 為 `404.html`（SPA fallback）→ 推到 `gh-pages` 分支。

> [!IMPORTANT]
> Workflow 會把成品推上 `gh-pages`，但**還需要在 repo 啟用 GitHub Pages 才會對外服務**：
> **Settings → Pages → Source 選「Deploy from a branch」→ Branch 選 `gh-pages` / `(root)`**。
> 在啟用之前網址會是 404 —— 這不是 build 失敗。

## ⚠️ 免責聲明

本專案僅供**查詢參考**。信用卡活動內容、回饋比率與適用條件變動頻繁，
實際權益一律以**各發卡銀行官方公告**為準。資料整理自各卡權益手冊與官網頁面，
不保證即時、完整或正確，請勿作為理財決策的唯一依據。

> 謹慎理財，信用至上。
