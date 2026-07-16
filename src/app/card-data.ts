// 多卡回饋結構化資料（cardex）
// 資料來源：src/cardInfo/*.md
//   - 星展傳說對決聯名卡.md（Cardbook 第 18–23 頁）
//   - 聯邦吉鶴卡.md（聯邦銀行官網 cardDetail202）
//   - 聯邦賴點卡.md（聯邦銀行官網 cardDetail201）
//   - 中國信託ALL_ME卡.md
//   - 台新Richart卡.md
//   - 玉山_Pi拍錢包卡.md
//   - 玉山_UBear卡.md
// 供跨卡商家／通路查詢使用。

export interface Card {
  id: string;
  name: string;
  issuer: string;
  network: string;
  tagline: string;
  period: string;
  rewardType: string;
  /** 一般消費基本回饋 */
  general: { label: string; rate: string }[];
  /** 資料來源的 MD 檔名（僅標示出處，不在執行期載入） */
  file: string;
}

export interface Offer {
  cardId: string;
  /** 顯示用商家／通路名稱 */
  merchant: string;
  /** 帳單顯示名稱／別名（搜尋用） */
  aliases?: string[];
  /** 所屬活動／類別 */
  category: string;
  /** 加碼回饋比率（保留原文寫法，如 5.5%、現折10%） */
  rate: string;
  /** 回饋上限 */
  cap?: string;
  /** 適用條件備註 */
  note?: string;
}

export const CARDS: Card[] = [
  {
    id: 'dbs',
    name: '星展傳說對決聯名卡',
    issuer: '星展銀行',
    network: '聯名卡',
    tagline: '精選通路最高 10%／海外實體 5%',
    period: '2026/07/01–2026/12/31',
    rewardType: '現金積點',
    general: [
      { label: '國內一般消費', rate: '0.2%' },
      { label: '國外一般消費', rate: '1%' },
      { label: '國內（設定 Autopay 升級）', rate: '1%' },
    ],
    file: '星展傳說對決聯名卡.md',
  },
  {
    id: 'jihe',
    name: '聯邦吉鶴卡',
    issuer: '聯邦銀行',
    network: 'JCB',
    tagline: '日本旅遊祭最高 11%／日系名店最高 5.5%',
    period: '115/7/1–115/12/31',
    rewardType: '刷卡金',
    general: [
      { label: '日幣消費', rate: '2.5%' },
      { label: '國內消費', rate: '1%' },
      { label: '國外消費', rate: '1%' },
    ],
    file: '聯邦吉鶴卡.md',
  },
  {
    id: 'laidian',
    name: '聯邦賴點卡',
    issuer: '聯邦銀行',
    network: 'VISA',
    tagline: '國內 LINE Pay 最高 11%／國外 3% 無上限',
    period: '115/7/1–115/12/31',
    rewardType: 'LINE POINTS',
    general: [
      { label: '國內一般消費', rate: '1%' },
      { label: '國外一般消費', rate: '3%' },
    ],
    file: '聯邦賴點卡.md',
  },
  {
    id: 'ctbc',
    name: '中國信託 ALL ME 卡',
    issuer: '中國信託',
    network: '信用卡',
    tagline: '掃碼／電商電信 3%／國外實體 2.2%',
    period: '115/7/1–115/12/31',
    rewardType: 'ALL ME 點',
    general: [
      { label: '國內外一般消費', rate: '1%' },
      { label: '國外實體商店消費', rate: '2.2%' },
    ],
    file: '中國信託ALL_ME卡.md',
  },
  {
    id: 'richart',
    name: '台新 Richart 卡',
    issuer: '台新銀行',
    network: 'Mastercard／Visa／JCB',
    tagline: '7＋1 大刷每日切換／Chill 刷最高 10%',
    period: '2026/7/1–2027/3/31',
    rewardType: '台新 Point',
    general: [
      { label: '一般消費（免切換）', rate: '0.3%' },
      { label: '保費（免切換免領券）', rate: '1.3%' },
      { label: '假日刷（不限通路）', rate: '2%' },
    ],
    file: '台新Richart卡.md',
  },
  {
    id: 'esun-pi',
    name: '玉山 Pi 拍錢包信用卡',
    issuer: '玉山銀行',
    network: '聯名卡',
    tagline: '月累積滿額最高 3% P幣／全家 5%',
    period: '2026/3/1–2026/8/31',
    rewardType: 'P幣',
    general: [
      { label: '基本（已申請帳單 e 化）', rate: '1%' },
      { label: '基本（未申辦帳單 e 化）', rate: '0.3%' },
      { label: '月累積滿 3 萬（加碼 2%）', rate: '最高 3%' },
    ],
    file: '玉山_Pi拍錢包卡.md',
  },
  {
    id: 'esun-ubear',
    name: '玉山 U Bear 信用卡',
    issuer: '玉山銀行',
    network: 'Mastercard',
    tagline: '網路消費 3%／指定數位訂閱 10%',
    period: '2026/3/1–2026/8/31',
    rewardType: '現金回饋／玉山 e point',
    general: [
      { label: '基本（帳單 e 化＋自動扣繳）', rate: '1%' },
      { label: '基本（兩者擇一）', rate: '0.5%' },
      { label: '網路消費（加碼 2%）', rate: '最高 3%' },
    ],
    file: '玉山_UBear卡.md',
  },
];

/** 商家寫法：'名稱' 或 ['名稱', ['別名1', '別名2']] */
type MerchantSpec = string | [string, string[]];

/** 把一整份通路清單展開成同活動、同費率的 Offer */
function group(
  cardId: string,
  category: string,
  rate: string,
  cap: string | undefined,
  note: string | undefined,
  merchants: MerchantSpec[],
): Offer[] {
  return merchants.map((m) => {
    const [merchant, aliases] = typeof m === 'string' ? [m, undefined] : m;
    return { cardId, merchant, aliases, category, rate, cap, note };
  });
}

// ---------- 星展傳說對決聯名卡：生活玩家精選通路（設定 Autopay 最高 10%） ----------
const DBS_CAP = '加碼上限 500 點／月';
const DBS_NOTE = '需設定 Autopay；含基本回饋';
function dbs(merchant: string, sub: string, aliases?: string[]): Offer {
  return {
    cardId: 'dbs',
    merchant,
    aliases,
    category: `精選通路·${sub}`,
    rate: '最高 10%',
    cap: DBS_CAP,
    note: DBS_NOTE,
  };
}

// ---------- 聯邦吉鶴卡 ----------
function jihe(
  merchant: string,
  category: string,
  rate: string,
  cap: string,
  note: string,
  aliases?: string[],
): Offer {
  return { cardId: 'jihe', merchant, aliases, category, rate, cap, note };
}
const JIHE_JP = '日本 11 大熱門商店';
const JIHE_JP_RATE = '3%';
const JIHE_JP_CAP = '活動期間 600 元';
const JIHE_JP_NOTE = '日幣或日本消費、不含網路交易';
const JIHE_STORE = '嚴選日系名店';
const JIHE_STORE_RATE = '最高 5.5%（加碼 4%）';
const JIHE_STORE_CAP = '每月 500 元';
const JIHE_STORE_NOTE = '限實體卡／感應交易，第三方支付不適用';
const JIHE_REST = '人氣餐廳現折';
const JIHE_REST_RATE = '現折最高 10%';
const JIHE_REST_NOTE = '週一至週五、出示實體卡並全額支付';

// ---------- 聯邦賴點卡 ----------
function laidian(
  merchant: string,
  category: string,
  rate: string,
  cap: string,
  note: string,
  aliases?: string[],
): Offer {
  return { cardId: 'laidian', merchant, aliases, category, rate, cap, note };
}
const LD_IP = '指定 IP／票券／影城';
const LD_IP_RATE = '5%';
const LD_IP_CAP = '每月 200 點';
const LD_IP_NOTE = '至 115/9/30';
const LD_EVEN = '偶數日 LINE Pay 指定通路';
const LD_EVEN_RATE = '5%';
const LD_EVEN_CAP = '每月 150 點';
const LD_EVEN_NOTE = 'LINE Pay 綁定、偶數日單筆滿 100 元';

// ---------- 中國信託 ALL ME 卡 ----------
/** 通路加碼 1、2 合併，每戶每月共用同一上限 */
const CTBC_CAP = '加碼上限 300 點／月（加碼 1、2 合併）';
const CTBC_SCAN = '須以 Pi 拍錢包或 Hami Pay 掃碼交易';

// ---------- 台新 Richart 卡 ----------
const RICHART_CAP = '每期加碼消費以永久信用額度 ＋ NT$30 萬為限';
const RICHART_NOTE = '需切換至本方案；限實體卡或指定 Pay（LINE Pay／全盈+Pay 不適用）';
const CHILL_NOTE = '上市期 2026/7/8–9/30；可用實體卡、台新 Pay、Apple／Google／Samsung Pay、LINE Pay';

// ---------- 玉山 U Bear 卡 ----------
const UBEAR_5_CAP = '每歸戶上限 1,200 元';
const UBEAR_5_NOTE = '限 2026/6/15–8/31 首次申辦；須帳單 e 化＋玉山臺幣帳戶自動扣繳，核卡後 60 天內';

export const OFFERS: Offer[] = [
  // ===== 星展 精選通路 =====
  dbs('App Store', '娛樂無限', ['APPLE.COM']),
  dbs('Google Play', '娛樂無限', ['Google']),
  dbs('Garena', '娛樂無限', ['競舞娛樂']),
  dbs('GASH', '娛樂無限', ['樂點']),
  dbs('MyCard', '娛樂無限', ['智冠科技']),
  dbs('Nintendo', '娛樂無限', ['任天堂']),
  dbs('Play Station', '娛樂無限', ['PlayStation', 'PS']),
  dbs('Steam', '娛樂無限'),
  dbs('Logitech', '娛樂無限', ['羅技']),
  dbs('NOVA', '娛樂無限'),
  dbs('三創生活園區', '娛樂無限', ['三創']),
  dbs('寬宏售票', '娛樂無限', ['寬宏']),
  dbs('KKTIX', '娛樂無限'),
  dbs('年代售票', '娛樂無限', ['ERACOM', '年代']),
  dbs('拓元售票', '娛樂無限', ['TIXCRAFT', '拓元']),
  dbs('巴哈姆特', '娛樂無限', ['BAHAMUT', '巴哈']),
  dbs('Animate', '潮玩動漫', ['安利美特']),
  dbs('野獸國', '潮玩動漫', ['BEASTKINGDOM']),
  dbs('POPMART', '潮玩動漫', ['泡泡瑪特']),
  dbs('鼎美玩具', '潮玩動漫', ['鼎美']),
  dbs('KHTOY', '潮玩動漫'),
  dbs('TOYSNAP', '潮玩動漫'),
  dbs('東海模型', '潮玩動漫'),
  dbs('Youtube Premium', '影音充電', ['YouTube', 'YT']),
  dbs('Netflix', '影音充電'),
  dbs('Disney+', '影音充電', ['迪士尼']),
  dbs('Spotify', '影音充電'),
  dbs('Twitch', '影音充電'),
  dbs('愛奇藝', '影音充電', ['IQIYI']),
  dbs('Catchplay', '影音充電'),
  dbs('KKBOX', '影音充電'),
  dbs('KKTV', '影音充電'),
  dbs('LiTV', '影音充電'),
  dbs('Tiktok', '影音充電', ['抖音']),
  dbs('Uber Eats', '生活補給', ['優食', '優步']),
  dbs('foodpanda', '生活補給', ['熊貓', 'FP']),
  dbs('麥當勞', '生活補給', ["McDonald's"]),
  dbs('肯德基', '生活補給', ['KFC']),
  dbs('摩斯漢堡', '生活補給', ['MOS', '安心食品']),
  dbs('21 世紀', '生活補給', ['21世紀', '風味館']),
  dbs('美墨炸雞', '生活補給'),
  dbs('拿坡里', '生活補給'),
  dbs('Pizzahut', '生活補給', ['必勝客']),
  dbs('蝦皮', '生活補給', ['SHOPEE']),
  dbs('淘寶', '生活補給', ['TAOBAO']),

  // ===== 聯邦吉鶴卡：日本 11 大熱門商店 3% =====
  jihe('7-ELEVEN', JIHE_JP, JIHE_JP_RATE, JIHE_JP_CAP, JIHE_JP_NOTE, ['SEVEN-ELEVEN', '小七', '超商']),
  jihe('FamilyMart', JIHE_JP, JIHE_JP_RATE, JIHE_JP_CAP, JIHE_JP_NOTE, ['全家', '超商']),
  jihe('LAWSON', JIHE_JP, JIHE_JP_RATE, JIHE_JP_CAP, JIHE_JP_NOTE, ['羅森', '超商']),
  jihe('東京迪士尼', JIHE_JP, JIHE_JP_RATE, JIHE_JP_CAP, JIHE_JP_NOTE, ['TOKYO DISNEY RESORT', 'Disney']),
  jihe('大阪環球影城', JIHE_JP, JIHE_JP_RATE, JIHE_JP_CAP, JIHE_JP_NOTE, ['USJ', '環球影城']),
  jihe('永旺 AEON', JIHE_JP, JIHE_JP_RATE, JIHE_JP_CAP, JIHE_JP_NOTE, ['AEON', '永旺']),
  jihe('三越', JIHE_JP, JIHE_JP_RATE, JIHE_JP_CAP, JIHE_JP_NOTE, ['MITSUKOSHI']),
  jihe('高島屋', JIHE_JP, JIHE_JP_RATE, JIHE_JP_CAP, JIHE_JP_NOTE, ['TAKASHIMAYA']),
  jihe('BIC CAMERA', JIHE_JP, JIHE_JP_RATE, JIHE_JP_CAP, JIHE_JP_NOTE),
  jihe('Yodobashi', JIHE_JP, JIHE_JP_RATE, JIHE_JP_CAP, JIHE_JP_NOTE, ['友都八喜']),
  jihe('唐吉訶德', JIHE_JP, JIHE_JP_RATE, JIHE_JP_CAP, JIHE_JP_NOTE, ['DONQUIJOTE', 'DONKI', '驚安殿堂']),

  // ===== 聯邦吉鶴卡：嚴選日系名店 最高 5.5% =====
  jihe('DAISO 大創百貨', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE, ['大創']),
  jihe('Standard Products', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('THREEPPY', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('日藥本舖', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('松本清', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe("三友藥妝 Tomod's", JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE, ['Tomods']),
  jihe('札幌藥妝', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('TSUTAYA BOOKSTORE', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE, ['蔦屋']),
  jihe('UNIQLO', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE, ['優衣庫']),
  jihe('GU', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('思夢樂', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE, ['Shimamura']),
  jihe('GLOBAL WORK', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('niko and …', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('LOWRYS FARM', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('LAKOLE', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('studio CLIP', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('repipi armario', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('HARE', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('Heather', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('PAGEBOY', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('RAGEBLUE', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('LEPSIM', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),
  jihe('JEANASIS', JIHE_STORE, JIHE_STORE_RATE, JIHE_STORE_CAP, JIHE_STORE_NOTE),

  // ===== 聯邦吉鶴卡：人氣餐廳現折最高 10% =====
  jihe('涮乃葉', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE, ['壽司涮乃葉', '涮之華']),
  jihe('燒肉 Smile', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE),
  jihe('定食 8', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE),
  jihe('勝博殿', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE),
  jihe('欣葉日本料理', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE, ['彩膳楽亭']),
  jihe('吉豚屋', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE),
  jihe('一風堂', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE),
  jihe('麵屋武藏', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE),
  jihe('YAYOI 彌生軒', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE, ['彌生軒']),
  jihe('壽司美登利', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE),
  jihe('屯京拉麵', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE),
  jihe('千葉火鍋', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE, ['享千葉', '新千葉', '極千葉']),
  jihe('Ramen Nagi 凪', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE, ['ラーメン凪']),
  jihe('Mo-Mo-Paradise', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE),
  jihe('天吉屋', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE, ['吉天麩羅']),
  jihe('BELLINI', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE, ['BELLINI CAFFÈ', 'Pasta Pasta']),
  jihe('MOLINO 手工義大利麵', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE),
  jihe('嵐山熟成牛かつ專売', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE),
  jihe('大河屋 燒肉丼串燒', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE),
  jihe('樂麵屋', JIHE_REST, JIHE_REST_RATE, '—', JIHE_REST_NOTE),
  jihe('金子半之助', JIHE_REST, JIHE_REST_RATE, '—', '限週一至週四、出示實體卡'),
  jihe('新宿內臟燒肉', JIHE_REST, JIHE_REST_RATE, '—', '限週一至週四、出示實體卡'),

  // ===== 聯邦吉鶴卡：日本三大交通卡儲值 1.5% =====
  jihe('SUICA', '日本三大交通卡儲值', '1.5%', '每月限量 10,000 名', '需當月完成登錄；非一般消費', ['西瓜卡']),
  jihe('ICOCA', '日本三大交通卡儲值', '1.5%', '每月限量 10,000 名', '需當月完成登錄；非一般消費'),
  jihe('PASMO', '日本三大交通卡儲值', '1.5%', '每月限量 10,000 名', '需當月完成登錄；非一般消費'),

  // ===== 聯邦賴點卡：指定 IP／票券／影城 5% =====
  laidian('CHIIKAWA SHOP inTAIPEI', LD_IP, LD_IP_RATE, LD_IP_CAP, LD_IP_NOTE, ['吉伊卡哇', '台北常設店']),
  laidian('CHIIKAWA DAYS', LD_IP, LD_IP_RATE, LD_IP_CAP, LD_IP_NOTE, ['吉伊卡哇', '特展商店']),
  laidian('OPENTIX 兩廳院', LD_IP, LD_IP_RATE, LD_IP_CAP, LD_IP_NOTE, ['OPENTIX']),
  laidian('tixCraft 拓元', LD_IP, LD_IP_RATE, LD_IP_CAP, LD_IP_NOTE, ['拓元']),
  laidian('寬宏售票', LD_IP, LD_IP_RATE, LD_IP_CAP, LD_IP_NOTE, ['寬宏']),
  laidian('年代線上售票', LD_IP, LD_IP_RATE, LD_IP_CAP, LD_IP_NOTE, ['年代']),
  laidian('KKTIX', LD_IP, LD_IP_RATE, LD_IP_CAP, LD_IP_NOTE),
  laidian('威秀影城', LD_IP, LD_IP_RATE, LD_IP_CAP, LD_IP_NOTE, ['威秀']),
  laidian('秀泰影城', LD_IP, LD_IP_RATE, LD_IP_CAP, LD_IP_NOTE, ['秀泰']),

  // ===== 聯邦賴點卡：偶數日 LINE Pay 指定通路 5% =====
  laidian('王品集團', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['王品']),
  laidian('三商集團', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['三商']),
  laidian('輕井澤集團', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['輕井澤']),
  laidian('海底撈', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('築間', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('春水堂', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('壽司郎', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('爭鮮', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('八方雲集', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('麥當勞', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ["McDonald's"]),
  laidian('肯德基', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['KFC']),
  laidian('摩斯漢堡', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['MOS']),
  laidian('漢堡王', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['Burger King']),
  laidian('星巴克', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['Starbucks']),
  laidian('路易莎', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['Louisa']),
  laidian('cama', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('50 嵐', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['50嵐']),
  laidian('得正', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('麻古茶坊', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['麻古']),
  laidian('可不可熟成紅茶', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['可不可']),
  laidian('屈臣氏', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['Watsons']),
  laidian('寶雅', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['POYA']),
  laidian('唐吉訶德', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['DONKI', '驚安殿堂']),
  laidian('大樹藥局', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['大樹']),
  laidian('杏一', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('丁丁藥局', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['丁丁']),
  laidian('佑全', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('躍獅', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('IKEA', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['宜家']),
  laidian('Hola', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['和樂']),
  laidian('小北百貨', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('汪喵星球', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('東森寵物', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('咕咕 G', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('魚中魚', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('寵物公園', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('迪卡儂', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['Decathlon']),
  laidian('鞋全家福', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE),
  laidian('摩曼頓', LD_EVEN, LD_EVEN_RATE, LD_EVEN_CAP, LD_EVEN_NOTE, ['MOMENTUM']),

  // ===== 聯邦賴點卡：萊爾富天天現折 5% =====
  laidian('萊爾富', '萊爾富超商', '天天現折 5%', '不限金額', '實體卡／行動支付；非一般消費', ['Hi-Life']),

  // ===== 中國信託 ALL ME 卡：通路加碼 1（Pi 拍錢包／Hami Pay 掃碼 3%）=====
  // 四大超商為本行不回饋項目，故以「加碼 3%」補足（基本 0% ＋ 加碼 3%）
  ...group('ctbc', '通路加碼 1·超商超市', '3%', CTBC_CAP, '四大超商屬不回饋項目，以加碼 3% 補足；須掃碼交易', [
    ['7-ELEVEN', ['小七', '超商', '統一超商']],
    ['全家便利商店', ['全家', '超商']],
    ['萊爾富便利商店', ['萊爾富', 'Hi-Life', '超商']],
    ['OK 超商', ['OK', 'OK mart', '超商']],
  ]),
  ...group('ctbc', '通路加碼 1·超商超市', '3%', CTBC_CAP, CTBC_SCAN, [
    '美廉社',
    ['小北百貨', ['小北']],
    '心樸市集',
    ['棉花田生機園地', ['棉花田']],
    '新東陽',
  ]),
  ...group('ctbc', '通路加碼 1·交通運輸', '3%', CTBC_CAP, CTBC_SCAN, [
    ['台灣大車隊', ['大車隊', '55688']],
    ['臺鐵', ['台鐵', '臺灣鐵路', '火車']],
    ['嘟嘟房', ['Times', 'DODOME']],
    '歐特儀',
    '正好停',
    ['俥亭', ['車亭']],
  ]),
  ...group('ctbc', '通路加碼 1·交通運輸', '3%', CTBC_CAP, '限以 ALL ME 卡綁定至 Pi 拍錢包 App 內繳費功能支付', [
    ['縣市路邊停車費', ['路邊停車', '停車費']],
    ['台北市路外公有停車費', ['路外停車', '公有停車場']],
  ]),
  ...group('ctbc', '通路加碼 1·生活百貨', '3%', CTBC_CAP, CTBC_SCAN, [
    ['屈臣氏', ['Watsons']],
    ['康是美', ['Cosmed']],
    ['POYA 寶雅', ['寶雅', 'POYA']],
    '松本清',
    '日藥本舖',
    ['特力屋', ['Test Rite']],
    '全國電子',
    ['三井 3C', ['三井3C']],
    ['丁丁連鎖藥妝', ['丁丁', '丁丁藥局']],
  ]),
  ...group('ctbc', '通路加碼 1·區域百貨', '3%', CTBC_CAP, '非全門市／櫃位適用掃碼付款，以現場公告為主', [
    ['京站時尚廣場', ['京站']],
    ['美麗華百樂園', ['美麗華']],
    '宏匯廣場',
    ['三創生活園區', ['三創']],
    '京站森林時光',
    '中友百貨',
    ['屏東太平洋百貨', ['太平洋百貨']],
  ]),
  ...group('ctbc', '通路加碼 1·綜合生活', '3%', CTBC_CAP, CTBC_SCAN, [
    'FunNow',
    ['九乘九文具專家', ['九乘九']],
    ['卡多摩嬰童館', ['卡多摩']],
    'Wstyle',
    '寵物公園',
    ['讀墨電子書 READMOO', ['讀墨', 'READMOO']],
    ['智冠 Mycard', ['MyCard', '智冠科技']],
  ]),
  ...group('ctbc', '通路加碼 1·綜合生活', '3%', CTBC_CAP, '限以 ALL ME 卡綁定至 Pi 拍錢包支付方得回饋', [
    '拍享券',
    '一起寄',
  ]),
  ...group('ctbc', '通路加碼 1·餐飲美食', '3%', CTBC_CAP, CTBC_SCAN, [
    '屋馬燒肉',
    ['85 度 C', ['85度C', '85℃']],
    ['漢堡王', ['Burger King']],
    '鬍鬚張',
    '勝博殿',
    '大戶屋',
    ['bb.q CHICKEN', ['BBQ CHICKEN']],
    '金色三麥',
    ['赤鬼炙燒牛排', ['赤鬼']],
    '金韓食',
    ['欣葉', ['欣葉小聚', '欣葉日本料理', '欣葉台菜', '欣葉呷哺呷哺', 'NAGOMI']],
    ['築間集團', ['築間', '築間幸福鍋物', '本格和牛燒肉放題', '燒肉 Smile', '有之和牛鍋物放題', '築間燒肉本命', '芡芳', '築間酸菜魚', '朴庶韓國烤肉公社', '絵馬別邸', '紫木槿韓餐酒館']],
    ['雞湯大叔集團', ['雞湯大叔', '雞湯桑']],
  ]),
  // ===== 中國信託 ALL ME 卡：通路加碼 2（電商／電信刷卡 3%）=====
  ...group('ctbc', '通路加碼 2·電信', '3%', CTBC_CAP, '分期消費不適用；中華電信、神腦國際不含繳納電信費用', [
    ['中華電信集團', ['中華電信', 'CHT']],
    ['神腦國際', ['神腦']],
  ]),
  ...group('ctbc', '通路加碼 2·電商', '3%', CTBC_CAP, '分期消費不適用；可刷卡或綁定 Hami Pay／Pi 拍錢包／PChome 24h 支付', [
    ['網家集團', ['PChome', 'PChome 24h', '網家', '露天']],
  ]),
  ...group('ctbc', 'Pi 拍錢包滿額現折', '現折 100 元', '限量前 1 萬筆訂單', '7-ELEVEN 單筆實付滿 1,111 元；須以 Pi 拍錢包付款碼支付，不含 P 幣折抵', [
    ['7-ELEVEN', ['小七', '超商']],
  ]),

  // ===== 台新 Richart 卡：Chill 刷（最高 10%）=====
  ...group('richart', 'Chill 刷·歡聚微醺', '10%', RICHART_CAP, CHILL_NOTE, [
    ['詹記麻辣火鍋', ['詹記']],
    '萬客什鍋',
    '海底撈',
    '屋馬燒肉',
    '茶六燒肉堂',
    '新村站著吃',
    '燒肉政宗',
    '碳佐麻里',
    '雞湯大叔',
    ['gonna 共樂遊', ['gonna']],
    ['BRUN 不然', ['BRUN']],
    'CAFE ACME',
    'The Antipodean',
    '貳樓',
    ['樂子 the Diner', ['樂子']],
    'Fake Sober',
    'Draft Land',
    ['臺虎精釀', ['台虎', '啜飲室']],
    ['ABV 系列', ['ABV']],
    'Bar TCRC',
    'Bar Home',
    'Phowa',
    'MOONROCK',
  ]),
  ...group('richart', 'Chill 刷·日常續命', '10%', RICHART_CAP, CHILL_NOTE, [
    ['50 嵐', ['50嵐']],
    '得正',
    '八曜和茶',
    '五桐號',
    '龜記',
    '茶之魔手',
    'UG TEA',
    '叮哥茶飲',
    'CAFE!N',
    ['%Arabica', ['Arabica']],
    'COMPOSE COFFEE',
  ]),
  ...group('richart', 'Chill 刷·約會犒賞', '5%', RICHART_CAP, CHILL_NOTE, [
    ['饗饗 INPARADISE', ['饗饗', 'INPARADISE']],
    'NAGOMI',
  ]),
  ...group('richart', 'Chill 刷·應援追星', '5%', RICHART_CAP, CHILL_NOTE, [
    'WEVERSE',
    'K-MONSTAR',
    '微樂客',
    '五大唱片',
    '仙女樹',
    'FANME',
    'NOL',
  ]),
  ...group('richart', 'Chill 刷·熬夜追更', '5%', RICHART_CAP, CHILL_NOTE, [
    ['巴哈姆特', ['BAHAMUT', '巴哈']],
    'BOOK WALKER',
    ['Animate', ['安利美特']],
    ['樂天 KOBO', ['KOBO']],
    ['Readmoo 讀墨', ['讀墨', 'Readmoo']],
    'Netflix',
    ['Disney+', ['迪士尼']],
    '愛爾達',
  ]),
  ...group('richart', 'Chill 刷·數位外掛', '3.3%', RICHART_CAP, CHILL_NOTE, [
    ['Apple 直營（含官網）', ['Apple', 'App Store']],
    'Studio A',
    'DJI',
    'Insta360',
    'GoPro',
    ['蝦皮', ['SHOPEE']],
    ['淘寶', ['TAOBAO']],
    ['酷澎', ['Coupang']],
    ['Uber Eats', ['優食', '優步']],
  ]),
  ...group('richart', 'Chill 刷·營養補給', '5%', RICHART_CAP, CHILL_NOTE, [
    '好好生醫',
    ['POPCARE 好在乎', ['POPCARE', '好在乎']],
    '營養師輕食',
    'VITABOX',
    'MYPROTEIN',
    ['UrMart 優馬選品', ['UrMart', '優馬選品']],
  ]),
  ...group('richart', 'Chill 刷·體態養成', '5%', RICHART_CAP, CHILL_NOTE, [
    'Anytime Fitness',
    '健身工廠',
    'World Gym',
    ['超核心 Hypercore', ['Hypercore', '超核心']],
    'KX PILATES',
    ['虎鐵健身 × 器械皮拉提斯', ['虎鐵健身', '虎鐵']],
    '17FIT',
  ]),
  ...group('richart', 'Chill 刷·運動品牌', '5%', RICHART_CAP, CHILL_NOTE, [
    ['Adidas', ['愛迪達']],
    'New Balance',
    'PUMA',
    'Onitsuka Tiger',
    ['Nike', ['耐吉']],
    'HOKA',
    'Salomon',
    'lululemon',
  ]),
  // ===== 台新 Richart 卡：Pay 著刷 =====
  ...group('richart', 'Pay 著刷·台新 Pay', '3.8%', RICHART_CAP, '須以台新 Pay／台新 Pay+ 綁定支付', [
    ['全家', ['全家便利商店', '超商']],
    ['7-11', ['7-ELEVEN', '小七', '超商']],
    '新光三越',
    'Richart Mart',
    ['康是美', ['Cosmed']],
    ['IKEA', ['宜家']],
    'NET',
  ]),
  ...group('richart', 'Pay 著刷·台新 Pay（TWQR／台灣 Pay）', '3.8%', RICHART_CAP, '須以台新 Pay 經 TWQR／台灣 Pay 支付', [
    ['神腦', ['神腦國際']],
    '燦坤',
    '全國電子',
    ['麥當勞', ["McDonald's"]],
    '美廉社',
    ['大樹藥局', ['大樹']],
  ]),
  ...group('richart', 'Pay 著刷·台新 Pay+（日韓免手續費）', '3.8%＋免 1.5% 國外交易手續費', RICHART_CAP, '日韓交易以台新 Pay+ 支付', [
    ['LAWSON', ['羅森']],
    ['BicCamera', ['BIC CAMERA']],
    'GS25',
    ['DAISO', ['大創']],
  ]),
  ...group('richart', 'Pay 著刷·LINE Pay／全盈+Pay', '2.3%', RICHART_CAP, '以 LINE Pay 或全盈+Pay 綁定支付', [
    'LINE Pay',
    ['全盈+Pay', ['全盈']],
  ]),
  // ===== 台新 Richart 卡：天天刷（3.3%）=====
  ...group('richart', '天天刷·日常採買', '3.3%', RICHART_CAP, '兩大超商（全家、7-11）限以台新 Pay 支付', [
    ['全家', ['全家便利商店', '超商']],
    ['7-11', ['7-ELEVEN', '小七', '超商']],
    '萬家福',
    '樂家康',
    '大買家',
    ['唐吉訶德', ['DONKI', '驚安殿堂']],
    'LOPIA',
    '智生活',
  ]),
  ...group('richart', '天天刷·通勤交通', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['臺鐵', ['台鐵', '火車']],
    '高鐵',
    ['台灣大車隊', ['大車隊', '55688']],
    'LINE GO',
    'Yoxi',
    'Uber',
    '台灣 Bolt',
  ]),
  ...group('richart', '天天刷·加油充電', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['中油直營', ['中油']],
    '全國加油',
    '全國特急電',
    ['源點 EVOASIS', ['EVOASIS', '源點']],
    ['華城電能 EVALUE', ['EVALUE', '華城']],
    'USPACE',
    ['Autopass（車麻吉）', ['車麻吉', 'Autopass']],
  ]),
  ...group('richart', '天天刷·藥妝藥局', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['寶雅', ['POYA']],
    ['康是美', ['Cosmed']],
    ['屈臣氏', ['Watsons']],
    ['杏一醫療', ['杏一']],
    ['大樹藥局', ['大樹']],
    ['丁丁藥局', ['丁丁']],
    ['佑全保健藥妝', ['佑全']],
    '健康人生藥局',
  ]),
  // ===== 台新 Richart 卡：大筆刷（3.3%）=====
  ...group('richart', '大筆刷·指定百貨', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['新光三越（含 skm pay）', ['新光三越', 'skm pay']],
    '遠東百貨',
    ['遠東 SOGO', ['SOGO']],
    '漢神巨蛋',
    '漢神百貨',
    '漢神洲際',
    '微風',
    '台北 101',
    '遠東巨城',
    '廣三 SOGO',
    '南紡購物中心',
    ['誠品生活（含線上）', ['誠品']],
    '京站',
    '三創生活',
    '夢時代',
    ['統一時代（含 DREAM PLAZA）', ['統一時代', 'DREAM PLAZA']],
    '中友百貨',
    ['Mitsui Shopping Park LaLaport（南港／台中）', ['LaLaport', '三井']],
  ]),
  ...group('richart', '大筆刷·指定 Outlet', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['MITSUI OUTLET PARK（林口／台中港／台南）', ['MITSUI OUTLET', '三井 Outlet']],
    '華泰名品城',
    ['SKM Park Outlets', ['SKM Park']],
  ]),
  ...group('richart', '大筆刷·居家裝修', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['IKEA', ['宜家']],
    '特力屋',
    ['HOLA', ['和樂']],
    '宜得利',
    '瑪黑家居',
  ]),
  ...group('richart', '大筆刷·時尚品味', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['UNIQLO', ['優衣庫']],
    'GU',
    'ZARA',
    'NET',
    'lululemon',
  ]),
  // ===== 台新 Richart 卡：好饗刷（3.3%）=====
  ...group('richart', '好饗刷·全臺餐飲', '3.3%', RICHART_CAP, '不含餐券', [
    '全臺餐飲',
    ['王品瘋 Pay', ['王品']],
  ]),
  ...group('richart', '好饗刷·外送平台', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['Uber Eats', ['優食', '優步']],
    ['Foodpanda', ['foodpanda', '熊貓']],
  ]),
  ...group('richart', '好饗刷·購票娛樂', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['拓元售票', ['拓元', 'TIXCRAFT']],
    'KKTIX',
    ['年代售票', ['年代', 'ERACOM']],
    ['寬宏售票', ['寬宏']],
    ['OPENTIX 兩廳院文化生活', ['OPENTIX', '兩廳院']],
    'FunNow',
  ]),
  ...group('richart', '好饗刷·指定 KTV', '3.3%', RICHART_CAP, RICHART_NOTE, [
    '錢櫃',
    '好樂迪',
    'ONCOR',
    'sing!go',
    '享溫馨',
  ]),
  ...group('richart', '好饗刷·指定飯店', '3.3%', RICHART_CAP, '不含餐券、住宿券；完整品牌詳 MD 附錄', [
    ['晶華國際酒店集團', ['晶華', '晶英', '捷絲旅', '君品']],
    ['雲朗觀光', ['雲品', '翰品', '兆品', '品文旅']],
    ['台灣萬豪國際集團旗下飯店', ['萬豪', 'W HOTEL', '喜來登', '雅樂軒', '威斯汀', '艾美', '萬怡', '萬麗']],
    ['煙波國際觀光集團', ['煙波']],
    ['老爺酒店集團', ['老爺']],
    ['福華集團', ['福華']],
    ['漢來飯店事業群', ['漢來']],
    ['台北君悅酒店', ['君悅']],
    ['高雄洲際酒店', ['洲際']],
    ['臺中勤美洲際酒店', ['勤美', '洲際']],
    ['礁溪寒沐酒店', ['寒沐']],
  ]),
  // ===== 台新 Richart 卡：數趣刷（3.3%）=====
  ...group('richart', '數趣刷·網購平台', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['蝦皮', ['SHOPEE']],
    'momo',
    ['酷澎（Coupang）', ['酷澎', 'Coupang']],
    'PChome',
    ['淘寶', ['TAOBAO']],
    ['Amazon', ['亞馬遜']],
    '東森',
    '博客來',
    'Richart Mart',
    'PayEasy',
    'iHerb',
    'SHEIN',
    'Farfetch',
    'Olive Young',
  ]),
  ...group('richart', '數趣刷·線上課程', '3.3%', RICHART_CAP, RICHART_NOTE, [
    '知識衛星',
    'Amazing Talker',
    'Tutor ABC',
    'Hahow',
    'PressPlay',
  ]),
  ...group('richart', '數趣刷·遊戲影音', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['MyCard', ['智冠科技']],
    '遊戲橘子',
    'Steam',
    ['PlayStation', ['PS', 'Play Station']],
    ['Nintendo', ['任天堂']],
    'Netflix',
    ['Disney+', ['迪士尼']],
  ]),
  ...group('richart', '數趣刷·AI 服務', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['ChatGPT', ['OpenAI']],
    'Notion',
    'Canva',
    'Perplexity',
    'Claude',
  ]),
  // ===== 台新 Richart 卡：玩旅刷（3.3%）=====
  ...group('richart', '玩旅刷·海外消費', '3.3%', RICHART_CAP, '含實體及線上、歐洲國家交易', [
    ['海外消費', ['國外', '歐洲']],
  ]),
  ...group('richart', '玩旅刷·航空公司', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['中華', ['中華航空', '華航']],
    ['長榮', ['長榮航空']],
    ['星宇', ['星宇航空']],
    '台灣虎航',
    ['國泰', ['國泰航空']],
    ['華信', ['華信航空']],
    ['立榮', ['立榮航空']],
    ['樂桃', ['樂桃航空']],
    ['阿聯酋', ['阿聯酋航空']],
    '亞洲航空',
    '酷航',
    '捷星',
    '新加坡航空',
    '日本航空',
    '越捷',
  ]),
  ...group('richart', '玩旅刷·海外交通／網路', '3.3%', RICHART_CAP, RICHART_NOTE, [
    'Uber',
    'Grab',
    ['SUICA', ['西瓜卡']],
    'ICOCA',
    'PASMO',
    'WOWPASS',
    'AIRSIM',
  ]),
  ...group('richart', '玩旅刷·訂房平台', '3.3%', RICHART_CAP, RICHART_NOTE, [
    'Klook',
    'KKday',
    'Agoda',
    'Booking.com',
    'Trip.com',
    'Airbnb',
    'Hotels.com',
    'Expedia',
  ]),
  ...group('richart', '玩旅刷·旅行社', '3.3%', RICHART_CAP, RICHART_NOTE, [
    ['雄獅', ['雄獅旅遊']],
    '易遊網',
    '東南',
    '可樂',
    '長汎',
    '五福',
    '喜鴻',
    '易飛',
    '燦星',
    '加利利',
    '鳳凰國際',
    '山富',
    '行健',
  ]),
  ...group('richart', '假日刷', '2%', RICHART_CAP, '國內節假日不限通路（含保費）；含 LINE Pay、全盈+Pay 綁定', [
    ['國內節假日不限通路', ['假日', '不限通路']],
  ]),

  // ===== 玉山 Pi 拍錢包信用卡 =====
  ...group('esun-pi', 'Pi 拍錢包加碼', '5% P幣', '每月每卡上限 100 P幣', '須綁定 Pi 拍錢包 App 支付；不列入加碼回饋／滿額贈累積計算', [
    ['全家便利商店', ['全家', '超商']],
  ]),
  ...group('esun-pi', '綁定 Pi 拍錢包單筆滿 399', '最高 5% P幣（含基本 1%）', '每月每卡上限 100 P幣', '須登錄，限量各 10,000 名；單筆滿 399 元', [
    ['Pi 拍錢包通路', ['Pi 拍錢包', 'Pi錢包']],
  ]),
  ...group('esun-pi', '盛夏超給利·活動一', '單筆滿 3,500 元贈 100 P幣', '每人每月 1 次，上限 100 P幣', '限 Pi 拍錢包綁定本卡；依實付金額計算', [
    ['主婦聯盟消費合作社', ['主婦聯盟']],
    '拍享券',
    '棉花田',
    ['智冠 Mycard', ['MyCard', '智冠']],
  ]),
  ...group('esun-pi', '盛夏超給利·活動二', '單筆滿 10,000 元贈 500 P幣', '每人每月 1 次，上限 500 P幣', '限 Pi 拍錢包綁定本卡；依實付金額計算', [
    '比比昂',
    '露天市集',
    '東森購物',
    ['神腦數位', ['神腦']],
  ]),
  ...group('esun-pi', 'PChome 24h fun 暑價', '單筆滿 10,000 元贈 500 P幣', '每人每月 1 次，上限 500 P幣', '限週一、週三；PChome 儲值與電子票券不適用', [
    ['PChome 24h 購物', ['PChome']],
  ]),
  ...group('esun-pi', '陪您環遊世界·活動一（日韓）', '最高加碼 1.5% 玉山 e point', '上限 3,000 點', '國外實體消費，須正卡人登錄；國外網路交易不列入', [
    ['日本', ['JPN']],
    ['韓國', ['KOR']],
  ]),
  ...group('esun-pi', '陪您環遊世界·活動二（歐美紐澳加）', '最高加碼 1.5% 玉山 e point', '上限 8,000 點', '國外實體消費，須正卡人登錄；國外網路交易不列入', [
    ['歐盟', ['歐洲', 'EU']],
    ['英國', ['GBR']],
    ['美國', ['USA']],
    ['澳洲', ['AUS']],
    ['加拿大', ['CAN']],
    ['紐西蘭', ['NZL']],
  ]),
  ...group('esun-pi', '保費', '1.2% P幣', '無上限', '限國內新臺幣計價首續期保費（不含躉繳）；分期則不享 P幣', [
    ['保費', ['保險']],
  ]),

  // ===== 玉山 U Bear 信用卡 =====
  ...group('esun-ubear', '熊好刷·網路消費', '最高 3%（基本 1% ＋ 加碼 2%）', '加碼每期上限 150 元', '須綁定帳單 e 化；超商、保費、指定數位訂閱平台不列入', [
    ['行動支付', ['全支付', 'LINE Pay', '街口支付']],
    ['momo', ['momo購物網']],
    ['蝦皮', ['SHOPEE']],
    ['淘寶', ['TAOBAO']],
    ['線上訂房', ['訂房']],
    ['高鐵線上購票', ['高鐵']],
  ]),
  ...group('esun-ubear', '熊潮流·指定數位訂閱平台', '最高 10%', '每期上限 100 元', '須於原平台消費；透過 Google、PayPal 代扣繳不回饋。不列入基本／網路消費回饋', [
    'Netflix',
    ['ChatGPT', ['OpenAI']],
    ['Gemini', ['Google Gemini', 'Google One', 'Google Services']],
    'Steam',
    ['Nintendo', ['任天堂']],
    ['PlayStation', ['PS']],
  ]),
  ...group('esun-ubear', '五大通路·娛樂補給站', '新卡加碼 10%', UBEAR_5_CAP, UBEAR_5_NOTE, [
    ['Apple 媒體服務', ['Apple Music', 'Apple TV', 'App Store', 'iCloud', 'Apple']],
    'Google Play',
    ['YouTube Premium', ['YouTube', 'YT']],
  ]),
  ...group('esun-ubear', '五大通路·玩家戰力站', '新卡加碼 10%', UBEAR_5_CAP, UBEAR_5_NOTE, [
    'Steam',
    ['Epic Games Store', ['Epic']],
    ['GASH', ['樂點']],
    ['MyCard', ['智冠科技']],
  ]),
  ...group('esun-ubear', '五大通路·裝備升級站', '新卡加碼 10%', UBEAR_5_CAP, UBEAR_5_NOTE, [
    'MSI Store',
    ['蝦皮購物', ['蝦皮', 'SHOPEE']],
    'momo',
    'PChome',
    ['樂天市場購物網', ['樂天市場', '樂天']],
  ]),
  ...group('esun-ubear', '五大通路·應援續航站', '新卡加碼 10%', UBEAR_5_CAP, UBEAR_5_NOTE, [
    ['tixcraft 拓元', ['拓元', 'TIXCRAFT']],
    'KKTIX',
    ['Ticket Plus 遠大', ['Ticket Plus', '遠大']],
    ['OPENTIX 兩廳院', ['OPENTIX', '兩廳院']],
    ['寬宏售票', ['寬宏']],
    ['ibon 售票', ['ibon']],
    'Grab',
    'Booking.com',
  ]),
  ...group('esun-ubear', '五大通路·AI 創作站', '新卡加碼 10%', UBEAR_5_CAP, UBEAR_5_NOTE, [
    ['ChatGPT', ['OpenAI']],
    ['Google Gemini', ['Gemini']],
    'Claude',
    'Canva',
    'Gamma',
    'Speak',
  ]),
  ...group('esun-ubear', '享鑽生活（icash Pay）', '加碼 11% OPENPOINT', '上限 1,000 點，每用戶限 1 次', 'icash Pay 首次綁定玉山信用卡，指定通路累計滿 5,000 元', [
    ['icash Pay 指定通路', ['icash', 'icash Pay']],
  ]),
  ...group('esun-ubear', '7-ELEVEN 消費登錄', '6% OPENPOINT', '每歸戶每月上限 200 點，每月限量 6,000 名', 'icash Pay 綁本卡於 7-ELEVEN 實體門市消費並登錄', [
    ['7-ELEVEN', ['小七', '超商']],
  ]),
  ...group('esun-ubear', '中油 Pay 加油', '最高 6%', '每月每歸戶上限 100 點玉山 e point', '綁定中油 Pay 於台灣中油直營站累積滿 3,000 元並登錄', [
    ['台灣中油直營站', ['中油', '中油Pay']],
  ]),
  ...group('esun-ubear', 'OPEN 錢包', '加碼 10% OPENPOINT', '每會員每月上限 60 點', 'OPEN 錢包綁本卡於指定通路單筆滿 300 元，免登錄', [
    ['OPEN 錢包指定通路', ['OPEN 錢包', 'OPENPOINT']],
  ]),
  ...group('esun-ubear', '7 月網購活動', '各通路分期／滿額回饋', '詳見各活動', '與網路消費最高 10% 回饋同享；詳細門檻見 MD', [
    ['蝦皮購物', ['蝦皮', 'SHOPEE']],
    ['momo 購物網', ['momo']],
    ['PChome 線上購物', ['PChome']],
    ['酷澎 Coupang', ['酷澎', 'Coupang']],
    ['淘寶網', ['淘寶', 'TAOBAO']],
    ['Yahoo 購物中心', ['Yahoo']],
    'Google Play',
    ['樂天市場', ['樂天']],
  ]),
  ...group('esun-ubear', '陪您環遊世界·活動一（日韓）', '最高加碼 1.5% 玉山 e point', '上限 3,000 點', '國外實體消費；國外網路交易不列入', [
    ['日本', ['JPN']],
    ['韓國', ['KOR']],
  ]),
  ...group('esun-ubear', '陪您環遊世界·活動二（歐美紐澳加）', '最高加碼 1.5% 玉山 e point', '上限 8,000 點', '國外實體消費；國外網路交易不列入', [
    ['歐盟', ['歐洲', 'EU']],
    ['英國', ['GBR']],
    ['美國', ['USA']],
    ['澳洲', ['AUS']],
    ['加拿大', ['CAN']],
    ['紐西蘭', ['NZL']],
  ]),
];

// ================= 國碼查詢（星展存戶升級 5% 加碼國家）=================
// 來源：星展傳說對決聯名卡.md「三、存戶升級活動注意事項」第 5 點
//   「日本／韓國／泰國／新加坡／美洲／歐洲實體消費加碼國家及地區列舉（國碼 + 國名）」
// MD 只列出「國碼 + 國名」，未逐國標註所屬地區；region 依 MD 第 3 點的回饋公式分組
// （公式將「日本、韓國、泰國、新加坡、美洲地區」與「歐洲地區」分列兩項計算）對照地理歸屬填入。

export interface Country {
  /** 三碼國別碼（依 MD 原文，例：ROM 為 MD 寫法，非 ISO 的 ROU） */
  code: string;
  name: string;
  /** 回饋公式分組：日本／韓國／泰國／新加坡／美洲／歐洲 */
  region: string;
}

/** 歐洲以外地區：基本 1% ＋ 加碼 4% */
export const DBS_RATE_NON_EU = '5%（國外一般消費 1% ＋ 加碼 4%）';
/** 歐洲實體不列入一般消費，故 0% 基本 ＋ 加碼 5% */
export const DBS_RATE_EU = '5%（歐洲實體不計一般消費，加碼 5%）';

export const DBS_COUNTRY_NOTE =
  '須設定 Autopay，且以實體卡或 Apple Pay／Samsung Pay 於當地實體門市面對面消費；' +
  '交易商店國別須為指定地區、非以新臺幣為交易幣別，並於帳單同時列示國外交易手續費。' +
  '加碼每人每月上限 500 點。電子票證儲值（如 PASMO／SUICA）不符加碼資格。';

export const DBS_COUNTRIES: Country[] = [
  { code: 'JPN', name: '日本', region: '日本' },
  { code: 'KOR', name: '韓國', region: '韓國' },
  { code: 'THA', name: '泰國', region: '泰國' },
  { code: 'SGP', name: '新加坡', region: '新加坡' },
  // ----- 美洲 -----
  { code: 'ARG', name: '阿根廷', region: '美洲' },
  { code: 'BLZ', name: '貝里斯', region: '美洲' },
  { code: 'BRA', name: '巴西', region: '美洲' },
  { code: 'CAN', name: '加拿大', region: '美洲' },
  { code: 'CHL', name: '智利', region: '美洲' },
  { code: 'COL', name: '哥倫比亞', region: '美洲' },
  { code: 'DOM', name: '多明尼加共和國', region: '美洲' },
  { code: 'ECU', name: '厄瓜多', region: '美洲' },
  { code: 'GTM', name: '瓜地馬拉', region: '美洲' },
  { code: 'GUF', name: '法屬圭亞那', region: '美洲' },
  { code: 'GUM', name: '關島', region: '美洲' },
  { code: 'HND', name: '宏都拉斯', region: '美洲' },
  { code: 'KNA', name: '聖克里斯多福及尼維斯', region: '美洲' },
  { code: 'LCA', name: '聖盧西亞', region: '美洲' },
  { code: 'MEX', name: '墨西哥', region: '美洲' },
  { code: 'PER', name: '秘魯', region: '美洲' },
  { code: 'PRI', name: '波多黎各', region: '美洲' },
  { code: 'PRY', name: '巴拉圭', region: '美洲' },
  { code: 'SLV', name: '薩爾瓦多', region: '美洲' },
  { code: 'USA', name: '美國', region: '美洲' },
  { code: 'VIR', name: '美屬維爾京群島', region: '美洲' },
  // ----- 歐洲 -----
  { code: 'ALB', name: '阿爾巴尼亞', region: '歐洲' },
  { code: 'AUT', name: '奧地利', region: '歐洲' },
  { code: 'BEL', name: '比利時', region: '歐洲' },
  { code: 'BGR', name: '保加利亞', region: '歐洲' },
  { code: 'BIH', name: '波士尼亞', region: '歐洲' },
  { code: 'CHE', name: '瑞士', region: '歐洲' },
  { code: 'CYP', name: '塞浦勒斯', region: '歐洲' },
  { code: 'CZE', name: '捷克', region: '歐洲' },
  { code: 'DEU', name: '德國', region: '歐洲' },
  { code: 'DNK', name: '丹麥', region: '歐洲' },
  { code: 'ESP', name: '西班牙', region: '歐洲' },
  { code: 'EST', name: '愛沙尼亞', region: '歐洲' },
  { code: 'FIN', name: '芬蘭', region: '歐洲' },
  { code: 'FRA', name: '法國', region: '歐洲' },
  { code: 'FRO', name: '法羅群島', region: '歐洲' },
  { code: 'GBR', name: '英國', region: '歐洲' },
  { code: 'GIB', name: '直布羅陀', region: '歐洲' },
  { code: 'GRC', name: '希臘', region: '歐洲' },
  { code: 'HRV', name: '克羅埃西亞', region: '歐洲' },
  { code: 'HUN', name: '匈牙利', region: '歐洲' },
  { code: 'IRL', name: '愛爾蘭', region: '歐洲' },
  { code: 'ISL', name: '冰島', region: '歐洲' },
  { code: 'ITA', name: '義大利', region: '歐洲' },
  { code: 'LTU', name: '立陶宛', region: '歐洲' },
  { code: 'LUX', name: '盧森堡', region: '歐洲' },
  { code: 'LVA', name: '拉脫維亞', region: '歐洲' },
  { code: 'MCO', name: '摩納哥', region: '歐洲' },
  { code: 'MLT', name: '馬爾他', region: '歐洲' },
  { code: 'MNE', name: '蒙特內哥羅', region: '歐洲' },
  { code: 'NLD', name: '荷蘭', region: '歐洲' },
  { code: 'NOR', name: '挪威', region: '歐洲' },
  { code: 'POL', name: '波蘭', region: '歐洲' },
  { code: 'PRT', name: '葡萄牙', region: '歐洲' },
  { code: 'ROM', name: '羅馬尼亞', region: '歐洲' },
  { code: 'SMR', name: '聖馬利諾', region: '歐洲' },
  { code: 'SVK', name: '斯洛伐克', region: '歐洲' },
  { code: 'SVN', name: '斯洛維尼亞', region: '歐洲' },
  { code: 'SWE', name: '瑞典', region: '歐洲' },
  { code: 'TUR', name: '土耳其', region: '歐洲' },
  { code: 'UKR', name: '烏克蘭', region: '歐洲' },
  { code: 'VAT', name: '梵蒂岡教廷', region: '歐洲' },
];
