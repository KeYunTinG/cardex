// 問答機器人的規則式引擎（cardex）
//
// 純 TypeScript、不依賴 Angular、不呼叫任何 API、不做執行期資料抓取，
// 完全沿用 card-data.ts 的 CARDS / OFFERS / DBS_COUNTRIES。
//
// 運作方式：
//   1. 正規化問句（全形→半形、小寫、去空白）
//   2. 以「正向最長比對」從字典切出實體：卡片／發卡行／支付方式／國家／主題／商家／活動
//   3. 依實體組合決定意圖（哪張卡刷 X、去某國、某卡有什麼、用某 Pay…）
//   4. 從結構化資料組出答案區塊（QaBlock），交給元件渲染
//
// 沒有任何機器學習；能答的範圍就是資料收錄的範圍。

import {
  CARDS,
  Card,
  Country,
  DBS_COUNTRIES,
  DBS_COUNTRY_NOTE,
  DBS_RATE_EU,
  DBS_RATE_NON_EU,
  Offer,
  OFFERS,
} from '../card-data';

// ================= 對外型別 =================

/** 命中的星展加碼國家，附上該地區適用的回饋率 */
export interface CountryHit extends Country {
  rate: string;
}
/** 依卡片分組的優惠；best 為該組最高回饋率數值（無法解析為 % 則為 null） */
export interface OfferGroup {
  card: Card;
  offers: Offer[];
  best: number | null;
  expanded: boolean;
}
/** 卡片一般消費回饋的一筆 */
export interface GeneralHit {
  card: Card;
  label: string;
  rate: string;
  value: number | null;
}
/** 一張卡的一個活動摘要（通路清單收斂成一行） */
export interface CategorySummary {
  card: Card;
  category: string;
  rate: string;
  cap?: string;
  note?: string;
  merchants: string[];
  value: number | null;
}

export type QaBlock =
  | { kind: 'text'; text: string; tone?: 'crown' | 'muted' }
  | { kind: 'offers'; groups: OfferGroup[]; crown: boolean; query?: string }
  | { kind: 'categories'; items: CategorySummary[] }
  | { kind: 'generals'; items: GeneralHit[]; crown: boolean }
  | { kind: 'countries'; items: CountryHit[]; rates: string[]; note: string }
  | { kind: 'cards'; items: Card[] };

export interface QaAnswer {
  blocks: QaBlock[];
  suggestions: string[];
}
/** 對話脈絡：上一題的主題（商家／國家／主題名稱）與其未過濾的優惠，供「上限呢」「那台新呢」接話 */
export interface QaContext {
  topic?: string;
  offers?: Offer[];
  card?: Card;
}
export interface QaResult {
  answer: QaAnswer;
  context: QaContext;
}

/** 對話中用的卡片簡稱 */
export const CARD_SHORT: Record<string, string> = {
  dbs: '星展',
  jihe: '聯邦吉鶴',
  laidian: '聯邦賴點',
  ctbc: '中信 ALL ME',
  richart: '台新 Richart',
  'esun-pi': '玉山 Pi',
  'esun-ubear': '玉山 U Bear',
};

export const DEFAULT_SUGGESTIONS = [
  '麥當勞刷哪張卡',
  '去日本要帶哪張卡',
  'Netflix 用哪張最划算',
  '星展卡有什麼優惠',
  '國外消費哪張最高',
  '有哪些卡',
];

// ================= 基礎工具 =================

/** 正規化：全形轉半形、小寫、去所有空白（比對用，不用於顯示） */
export function norm(s: string): string {
  return s
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** 從 rate 原文抽出第一個百分比數值；「現折 100 元」等非百分比回傳 null */
export function rateValue(rate: string): number | null {
  const m = /(\d+(?:\.\d+)?)\s*%/.exec(rate);
  return m ? parseFloat(m[1]) : null;
}

const isAscii = (s: string): boolean => /^[\x21-\x7e]+$/.test(s);
const isAlnum = (c: string | undefined): boolean => !!c && /[a-z0-9]/.test(c);
const uniq = <T>(xs: T[]): T[] => [...new Set(xs)];
const short = (c: Card): string => CARD_SHORT[c.id] ?? c.name;
const cardById = (id: string): Card => CARDS.find((c) => c.id === id)!;
const byValueDesc = <T extends { value: number | null }>(a: T, b: T): number =>
  (b.value ?? -1) - (a.value ?? -1);

/**
 * text 是否含 term。短的純 ASCII 詞（≤3 字，如 PS、GU、OK、NET）要求前後不是英數，
 * 避免 LEPSIM 命中 PS、Netflix 命中 NET。
 */
function has(text: string, term: string): boolean {
  if (!(isAscii(term) && term.length <= 3)) return text.includes(term);
  let i = text.indexOf(term);
  while (i >= 0) {
    if (!isAlnum(text[i - 1]) && !isAlnum(text[i + term.length])) return true;
    i = text.indexOf(term, i + 1);
  }
  return false;
}

/**
 * 商家鍵值是否對得上查詢詞：ASCII 詞交給 has()；中文詞只接受「完全相同」或「以該詞開頭」
 * （東森 → 東森購物 ✓、全家 → 全家便利商店 ✓，但 全家 → 鞋全家福 ✗）。
 */
function keyMatch(key: string, term: string): boolean {
  return isAscii(term) ? has(key, term) : key === term || key.startsWith(term);
}

// ================= 資料索引 =================

interface OfferIx {
  offer: Offer;
  /** 商家名稱＋別名（正規化） */
  keys: string[];
  /** 商家＋別名＋活動（正規化、以 | 分隔） */
  text: string;
  /** 再加上上限與備註 */
  full: string;
}

const OFFER_IX: OfferIx[] = OFFERS.map((o) => {
  const names = [o.merchant, ...(o.aliases ?? [])];
  return {
    offer: o,
    keys: names.map(norm),
    text: norm([...names, o.category].join('|')),
    full: norm([...names, o.category, o.cap ?? '', o.note ?? ''].join('|')),
  };
});

// ---------- 字典：卡片 ----------
const CARD_KEYS: Record<string, string[]> = {
  dbs: ['星展傳說對決聯名卡', '星展傳說對決', '傳說對決', '星展卡', '星展', 'dbs'],
  jihe: ['聯邦吉鶴卡', '聯邦吉鶴', '吉鶴卡', '吉鶴'],
  laidian: ['聯邦賴點卡', '聯邦賴點', '賴點卡', '賴點'],
  ctbc: [
    '中國信託 all me 卡', '中國信託 all me', '中信 all me 卡', '中信 all me',
    'all me 卡', 'all me', 'allme', '中國信託', '中信',
  ],
  richart: ['台新 richart 卡', '台新 richart', 'richart 卡', 'richart', '台新卡', '台新', '理查'],
  'esun-pi': [
    '玉山 pi 拍錢包信用卡', '玉山 pi 拍錢包卡', '玉山 pi 拍錢包', 'pi 拍錢包信用卡',
    'pi 拍錢包卡', '拍錢包信用卡', '拍錢包卡', '玉山 pi', 'pi 卡',
  ],
  'esun-ubear': [
    '玉山 u bear 信用卡', '玉山 u bear 卡', '玉山 u bear', 'u bear 卡', 'u bear',
    'ubear', '熊卡', 'u 熊卡', 'u 熊',
  ],
};
const ISSUER_KEYS: Record<string, string[]> = {
  玉山: ['esun-pi', 'esun-ubear'],
  聯邦: ['jihe', 'laidian'],
};

// ---------- 字典：支付方式 ----------
interface Pay {
  id: string;
  label: string;
  keys: string[];
  /** 在優惠全文（含備註）中比對的詞 */
  terms: string[];
}
const PAYS: Pay[] = [
  { id: 'linepay', label: 'LINE Pay', keys: ['line pay', 'linepay', '賴 pay'], terms: ['linepay'] },
  { id: 'tspay', label: '台新 Pay', keys: ['台新 pay+', '台新 pay', '台新pay'], terms: ['台新pay'] },
  { id: 'applepay', label: 'Apple Pay', keys: ['apple pay', 'applepay'], terms: ['applepay', 'apple/google/samsungpay'] },
  { id: 'googlepay', label: 'Google Pay', keys: ['google pay', 'googlepay'], terms: ['googlepay', 'apple/google/samsungpay'] },
  { id: 'samsungpay', label: 'Samsung Pay', keys: ['samsung pay', 'samsungpay', '三星 pay'], terms: ['samsungpay'] },
  { id: 'jkopay', label: '街口支付', keys: ['街口支付', '街口', 'jkopay', 'jko pay'], terms: ['街口'] },
  { id: 'pxpay', label: '全支付', keys: ['全支付', 'pxpay'], terms: ['全支付'] },
  { id: 'plus', label: '全盈+Pay', keys: ['全盈+pay', '全盈 pay', '全盈'], terms: ['全盈'] },
  { id: 'pi', label: 'Pi 拍錢包', keys: ['pi 拍錢包', '拍錢包', 'pi 錢包', 'pi wallet'], terms: ['pi拍錢包', '拍錢包', 'pi錢包'] },
  { id: 'hami', label: 'Hami Pay', keys: ['hami pay', 'hamipay', 'hami'], terms: ['hamipay'] },
  { id: 'icash', label: 'icash Pay', keys: ['icash pay', 'icashpay', 'icash', '愛金卡'], terms: ['icash'] },
  { id: 'open', label: 'OPEN 錢包', keys: ['open 錢包', 'openpoint', 'open point'], terms: ['open錢包', 'openpoint'] },
  { id: 'cpcpay', label: '中油 Pay', keys: ['中油 pay'], terms: ['中油pay'] },
  { id: 'twqr', label: 'TWQR／台灣 Pay', keys: ['twqr', '台灣 pay'], terms: ['twqr', '台灣pay'] },
  { id: 'skm', label: 'skm pay', keys: ['skm pay', 'skmpay'], terms: ['skmpay'] },
  { id: 'autopay', label: 'Autopay', keys: ['autopay', 'auto pay', '自動扣繳'], terms: ['autopay', '自動扣繳'] },
  { id: 'scan', label: '掃碼支付', keys: ['掃碼支付', '掃碼', 'qr code', 'qrcode'], terms: ['掃碼'] },
  {
    id: 'mobile', label: '行動支付', keys: ['行動支付', '手機支付', '電子支付'],
    terms: ['行動支付', '指定pay', '台新pay', 'linepay', 'pi拍錢包', 'icash', '街口', '全支付'],
  },
];

// ---------- 字典：國家／地區 ----------
interface CountryRef {
  name: string;
  code?: string;
  /** 在優惠（商家／別名／活動）中比對的詞 */
  terms: string[];
  /** 在卡片一般回饋標籤中比對的詞 */
  generalTerms: string[];
}
const NON_EU = new Set([
  '英國', '瑞士', '挪威', '冰島', '土耳其', '烏克蘭', '阿爾巴尼亞', '波士尼亞',
  '蒙特內哥羅', '直布羅陀', '法羅群島', '摩納哥', '聖馬利諾', '梵蒂岡教廷',
]);
const COUNTRY_SYNONYMS: Record<string, string[]> = {
  日本: ['東京', '大阪', '京都', '北海道', '沖繩', '福岡', '名古屋', '九州', '關西', '日幣', '日圓', '日元', 'japan', 'tokyo', 'osaka'],
  韓國: ['南韓', '首爾', '釜山', '濟州', 'korea', 'seoul'],
  泰國: ['曼谷', '清邁', '普吉', 'thailand', 'bangkok'],
  新加坡: ['星國', 'singapore'],
  美國: ['紐約', '洛杉磯', '舊金山', '拉斯維加斯', '夏威夷', '西雅圖', '美金', 'america'],
  加拿大: ['溫哥華', '多倫多', 'canada'],
  英國: ['倫敦', 'uk', 'england', 'britain', 'london'],
  法國: ['巴黎', 'france', 'paris'],
  德國: ['柏林', '慕尼黑', 'germany'],
  義大利: ['羅馬', '米蘭', '威尼斯', 'italy'],
  西班牙: ['巴塞隆納', '馬德里', 'spain'],
  荷蘭: ['阿姆斯特丹', 'netherlands'],
  瑞士: ['switzerland'],
  奧地利: ['維也納', 'austria'],
  捷克: ['布拉格'],
  希臘: ['雅典'],
  葡萄牙: ['里斯本'],
  土耳其: ['伊斯坦堡'],
  歐洲: ['歐盟', 'eu', 'europe', '歐元'],
  關島: ['guam'],
  墨西哥: ['mexico'],
  巴西: ['brazil'],
  多明尼加共和國: ['多明尼加'],
  梵蒂岡教廷: ['梵蒂岡'],
  澳洲: ['澳大利亞', '雪梨', '墨爾本', 'australia', 'aus'],
  紐西蘭: ['奧克蘭', 'new zealand', 'nzl'],
};
const COUNTRY_REFS: CountryRef[] = (() => {
  const refs = new Map<string, CountryRef>();
  const add = (name: string, code?: string, region?: string) => {
    const terms = [name, ...(code ? [code.toLowerCase()] : []), '國外', '海外'];
    const generalTerms = ['國外', '海外', '國內外'];
    if (region === '歐洲') terms.push('歐洲', ...(NON_EU.has(name) ? [] : ['歐盟']));
    if (name === '日本') {
      terms.push('日韓');
      generalTerms.push('日幣');
    }
    if (name === '韓國') terms.push('日韓');
    refs.set(name, { name, code, terms: uniq(terms), generalTerms });
  };
  for (const c of DBS_COUNTRIES) add(c.name, c.code, c.region);
  add('美洲');
  add('歐洲', undefined, '歐洲');
  add('澳洲');
  add('紐西蘭');
  return [...refs.values()];
})();

// ---------- 字典：主題（口語 → 資料裡的搜尋詞）----------
interface Topic {
  id: string;
  label: string;
  keys: string[];
  /** 在優惠（商家／別名／活動）中比對的詞 */
  terms: string[];
  /** 在卡片一般回饋標籤中比對的詞 */
  generalTerms?: string[];
}
const TOPICS: Topic[] = [
  { id: 'abroad', label: '國外消費', keys: ['國外消費', '海外消費', '國外', '海外', '出國', '境外', '外幣', '東南亞', '亞洲'], terms: ['海外', '國外'], generalTerms: ['國外', '海外', '國內外', '日幣'] },
  { id: 'domestic', label: '國內一般消費', keys: ['國內一般消費', '國內消費', '一般消費', '基本回饋', '基本消費', '國內', '一般', '基本', '平常'], terms: [], generalTerms: ['國內', '一般', '基本'] },
  { id: 'insurance', label: '保費', keys: ['繳保費', '保費', '保險'], terms: ['保費'], generalTerms: ['保費'] },
  { id: 'holiday', label: '假日消費', keys: ['國定假日', '例假日', '假日刷', '假日', '週末', '周末', '節日'], terms: ['假日'], generalTerms: ['假日'] },
  { id: 'online', label: '網購／網路消費', keys: ['線上購物', '網路消費', '網購平台', '購物網', '網購', '網路', '線上', '電商', '網拍'], terms: ['網購', '網路消費', '電商', '蝦皮', 'momo', 'pchome', '淘寶', '酷澎', '樂天市場'], generalTerms: ['網路'] },
  { id: 'cvs', label: '超商', keys: ['便利商店', '便利店', '超商', 'cvs'], terms: ['超商'] },
  { id: 'delivery', label: '外送', keys: ['外送平台', '叫外送', '外送'], terms: ['外送', 'ubereats', 'foodpanda'] },
  { id: 'streaming', label: '影音串流／訂閱', keys: ['訂閱', '串流', '影音', '追劇', '看劇'], terms: ['影音', '訂閱', 'netflix', 'disney+', 'spotify', 'youtube', 'kkbox', '愛奇藝'] },
  { id: 'game', label: '遊戲', keys: ['遊戲點數', '儲值遊戲', '打遊戲', '遊戲', '課金'], terms: ['遊戲', 'steam', 'playstation', 'nintendo', 'mycard', 'gash', 'garena', 'epic'] },
  { id: 'ai', label: 'AI 服務', keys: ['ai 服務', 'ai 工具', '人工智慧', 'ai'], terms: ['ai服務', 'ai創作站', 'chatgpt', 'claude', 'gemini'] },
  { id: 'gas', label: '加油／充電', keys: ['電動車充電', '加油充電', '充電站', '加油', '油錢', '汽油'], terms: ['加油充電', '中油', '加油'] },
  { id: 'drink', label: '手搖飲', keys: ['手搖飲', '手搖', '飲料店', '飲料', '奶茶', '珍奶'], terms: ['日常續命', '50嵐', '得正', '麻古', '可不可'] },
  { id: 'coffee', label: '咖啡', keys: ['咖啡廳', '咖啡', 'cafe', 'coffee'], terms: ['星巴克', '路易莎', 'cama', 'cafe', 'coffee', 'arabica'] },
  { id: 'drugstore', label: '藥妝／藥局', keys: ['藥妝藥局', '藥妝店', '藥妝', '藥局', '藥房', '買藥'], terms: ['藥妝', '藥局', '屈臣氏', '康是美', '寶雅', '松本清', '日藥本舖', '大樹', '杏一', '丁丁', '佑全'] },
  { id: 'dept', label: '百貨公司', keys: ['百貨公司', '購物中心', '百貨', '商場', 'mall'], terms: ['百貨', '新光三越', 'sogo', '遠東', '微風', '夢時代', '京站', '購物中心'] },
  { id: 'outlet', label: 'Outlet', keys: ['暢貨中心', 'outlet'], terms: ['outlet'] },
  { id: 'hotpot', label: '火鍋', keys: ['火鍋', '吃鍋', '鍋物'], terms: ['火鍋', '海底撈', '築間', '千葉', '萬客什鍋', 'mo-mo-paradise', '涮乃葉', '鍋物'] },
  { id: 'bbq', label: '燒肉', keys: ['燒肉', '燒烤', '烤肉'], terms: ['燒肉'] },
  { id: 'ramen', label: '拉麵', keys: ['日式拉麵', '拉麵'], terms: ['拉麵', '一風堂', '麵屋武藏', 'ramen', '樂麵屋'] },
  { id: 'restaurant', label: '餐廳', keys: ['餐廳', '吃飯', '餐飲', '聚餐', '美食', '吃東西'], terms: ['餐廳', '餐飲'] },
  { id: 'fastfood', label: '速食', keys: ['速食', '漢堡', '炸雞', '披薩'], terms: ['麥當勞', '肯德基', '摩斯', '漢堡王', 'pizzahut', '拿坡里', '美墨炸雞', '21世紀', 'bb.qchicken'] },
  { id: 'transit', label: '交通', keys: ['通勤交通', '交通', '通勤', '搭車', '車票'], terms: ['交通', '通勤'] },
  { id: 'taxi', label: '計程車／叫車', keys: ['計程車', '叫車', '小黃', 'taxi'], terms: ['台灣大車隊', 'linego', 'yoxi', 'bolt', 'uber'] },
  { id: 'parking', label: '停車', keys: ['停車費', '停車場', '停車'], terms: ['停車', '嘟嘟房', 'uspace', '歐特儀', '正好停', '俥亭'] },
  { id: 'flight', label: '機票／航空', keys: ['航空公司', '買機票', '機票', '航空', '飛機'], terms: ['航空'] },
  { id: 'hotel', label: '訂房／飯店', keys: ['訂房平台', '指定飯店', '訂飯店', '訂房', '飯店', '住宿', '旅館', '酒店'], terms: ['訂房', '飯店', 'agoda', 'booking.com', 'airbnb', 'hotels.com', 'expedia', 'trip.com', 'klook', 'kkday'] },
  { id: 'agency', label: '旅行社', keys: ['旅行社', '跟團'], terms: ['旅行社'] },
  { id: 'travel', label: '旅遊', keys: ['旅遊', '旅行', '出遊'], terms: ['玩旅刷', '旅行社', '訂房', '航空'], generalTerms: ['國外', '海外', '國內外', '日幣'] },
  { id: 'gym', label: '健身', keys: ['健身房', '健身', '運動中心', '皮拉提斯'], terms: ['健身', '體態養成'] },
  { id: 'sports', label: '運動品牌', keys: ['運動品牌', '運動用品', '運動服', '球鞋'], terms: ['運動品牌', '迪卡儂'] },
  { id: 'movie', label: '電影', keys: ['看電影', '電影院', '電影', '影城'], terms: ['影城'] },
  { id: 'ticket', label: '演唱會／票券', keys: ['購票娛樂', '演唱會', '票券', '售票', '買票', '門票', '看展', '演出'], terms: ['售票', '票券', 'kktix', '拓元', 'opentix', 'ticketplus', 'ibon售票', '購票娛樂'] },
  { id: 'ktv', label: 'KTV', keys: ['指定 ktv', 'ktv', '唱歌', '唱 k'], terms: ['ktv', '錢櫃', '好樂迪'] },
  { id: 'home', label: '居家／家具', keys: ['家具', '傢俱', '居家', '家飾', '裝修'], terms: ['居家', 'ikea', 'hola', '宜得利', '特力屋'] },
  { id: '3c', label: '3C', keys: ['3c', '電腦', '手機', '筆電', '相機', '家電'], terms: ['3c', 'apple', 'studioa', '燦坤', '全國電子', 'nova', 'dji', 'gopro', 'insta360', '神腦'] },
  { id: 'telecom', label: '電信', keys: ['電信費', '手機費', '網路費', '電信'], terms: ['電信'] },
  { id: 'pet', label: '寵物', keys: ['寵物用品', '毛小孩', '寵物'], terms: ['寵物', '汪喵', '魚中魚', '咕咕g', '東森寵物'] },
  { id: 'fashion', label: '服飾', keys: ['買衣服', '服飾', '衣服', '穿搭', '時尚'], terms: ['時尚品味', 'uniqlo', 'gu', 'zara', 'net', '日系名店', 'lululemon'] },
  { id: 'ebook', label: '電子書／書店', keys: ['電子書', '書店', '買書', '看書'], terms: ['讀墨', 'readmoo', 'kobo', 'bookwalker', '博客來', '蔦屋', '誠品'] },
  { id: 'course', label: '線上課程', keys: ['線上課程', '課程', '上課', '學英文', '補習'], terms: ['線上課程'] },
  { id: 'anime', label: '動漫／潮玩', keys: ['動漫', '公仔', '玩具', '模型', '潮玩', '扭蛋'], terms: ['潮玩動漫', 'animate', '野獸國', 'popmart', '鼎美', 'toysnap', 'khtoy', '東海模型'] },
  { id: 'supplement', label: '保健食品', keys: ['保健食品', '營養品', '蛋白粉', '維他命', '保健'], terms: ['營養補給'] },
  { id: 'supermarket', label: '超市／量販', keys: ['日常採買', '大賣場', '超市', '量販', '賣場'], terms: ['超商超市', '美廉社', '日常採買', '萬家福', '大買家', 'lopia'] },
  { id: 'transitcard', label: '交通卡儲值', keys: ['西瓜卡', '交通卡', '儲值'], terms: ['suica', 'icoca', 'pasmo'] },
];

// ---------- 字典：商家同義詞（互相等價，任一命中即展開整組）----------
const EQUIV: string[][] = [
  ['7-11', '711', '7-eleven', '7eleven', 'seven', '小七', '統一超商'],
  ['全家', 'familymart', 'family mart'],
  ['麥當勞', "mcdonald's", 'mcdonalds', 'mcdonald', '麥當當'],
  ['肯德基', 'kfc'],
  ['摩斯漢堡', '摩斯', 'mos'],
  ['蝦皮', 'shopee'],
  ['淘寶', 'taobao'],
  ['唐吉訶德', '唐吉軻德', 'donki', '驚安殿堂', 'don quijote', 'donquijote'],
  ['大創', 'daiso'],
  ['優衣庫', 'uniqlo'],
  ['星巴克', 'starbucks'],
  ['屈臣氏', 'watsons'],
  ['康是美', 'cosmed'],
  ['寶雅', 'poya'],
  ['ikea', '宜家'],
  ['迪士尼', 'disney'],
  ['任天堂', 'nintendo', 'switch'],
  ['playstation', 'ps5', 'ps4', 'ps'],
  ['網飛', 'netflix'],
  ['chatgpt', 'openai', 'gpt'],
  ['youtube', 'yt'],
  ['apple', '蘋果', 'app store', 'appstore'],
  ['google play', 'googleplay'],
  ['高鐵', 'thsr'],
  ['臺鐵', '台鐵', '火車'],
  ['中油', 'cpc'],
  ['foodpanda', '熊貓'],
  ['uber eats', 'ubereats', '優食'],
  ['pchome', '網家'],
  ['酷澎', 'coupang'],
  ['lawson', '羅森'],
  ['bic camera', 'biccamera'],
  ['sogo', '崇光'],
  ['新光三越', '新光'],
  ['拓元', 'tixcraft'],
].map((g) => g.map(norm));
const EQUIV_OF = new Map<string, string[]>();
for (const g of EQUIV) for (const k of g) EQUIV_OF.set(k, g);

// ---------- 合併字典，正向最長比對 ----------
type EntityType = 'card' | 'issuer' | 'pay' | 'country' | 'topic' | 'merchant' | 'category';
interface Entry {
  key: string;
  type: EntityType;
  ref: string;
}
interface Hit extends Entry {
  start: number;
}
/** 同一個 key 出現在多種字典時的優先序（數字小者勝） */
const PRIORITY: Record<EntityType, number> = {
  card: 0, issuer: 1, pay: 2, country: 3, topic: 4, merchant: 5, category: 6,
};

let DICT: Map<string, Entry> | null = null;
let DICT_LENGTHS: number[] = [];

function dictionary(): Map<string, Entry> {
  if (DICT) return DICT;
  const map = new Map<string, Entry>();
  const put = (rawKey: string, type: EntityType, ref: string) => {
    const key = norm(rawKey);
    if (key.length < 2) return;
    const prev = map.get(key);
    if (!prev || PRIORITY[type] < PRIORITY[prev.type]) map.set(key, { key, type, ref });
  };
  for (const [id, keys] of Object.entries(CARD_KEYS)) for (const k of keys) put(k, 'card', id);
  for (const [issuer, ids] of Object.entries(ISSUER_KEYS)) put(issuer, 'issuer', ids.join(','));
  for (const p of PAYS) for (const k of p.keys) put(k, 'pay', p.id);
  for (const c of COUNTRY_REFS) {
    put(c.name, 'country', c.name);
    if (c.code) put(c.code, 'country', c.name);
    for (const s of COUNTRY_SYNONYMS[c.name] ?? []) put(s, 'country', c.name);
  }
  for (const t of TOPICS) for (const k of t.keys) put(k, 'topic', t.id);
  for (const ix of OFFER_IX) for (const k of ix.keys) put(k, 'merchant', k);
  for (const g of EQUIV) for (const k of g) put(k, 'merchant', k);
  for (const o of OFFERS) {
    put(o.category, 'category', norm(o.category));
    for (const part of o.category.split('·')) {
      if (!/^活動/.test(part)) put(part, 'category', norm(part));
    }
  }
  DICT = map;
  DICT_LENGTHS = uniq([...map.keys()].map((k) => k.length)).sort((a, b) => b - a);
  return map;
}

/** 正向最長比對：每個位置取字典裡最長的 key，命中即跳過該段 */
function tokenize(q: string): Hit[] {
  const dict = dictionary();
  const hits: Hit[] = [];
  let i = 0;
  while (i < q.length) {
    let matched: Entry | undefined;
    for (const len of DICT_LENGTHS) {
      if (i + len > q.length) continue;
      const e = dict.get(q.slice(i, i + len));
      if (!e) continue;
      if (isAscii(e.key) && (isAlnum(q[i - 1]) || isAlnum(q[i + len]))) continue;
      matched = e;
      break;
    }
    if (matched) {
      hits.push({ ...matched, start: i });
      i += matched.key.length;
    } else {
      i++;
    }
  }
  return hits;
}

// ================= 查詢與整理 =================

function offersByKeys(keys: string[]): Offer[] {
  const terms = uniq(keys.flatMap((k) => EQUIV_OF.get(k) ?? [k]));
  return OFFER_IX.filter((ix) => ix.keys.some((k) => terms.some((t) => keyMatch(k, t)))).map((ix) => ix.offer);
}

/** 顯示用的商家名稱：依序找「名稱就是 key」「別名就是 key」「同義詞完全相同」「以 key 開頭」 */
function labelForKeys(keys: string[]): string {
  const labels = keys.map((k) => {
    const terms = EQUIV_OF.get(k) ?? [k];
    const hit =
      OFFER_IX.find((ix) => ix.keys[0] === k) ??
      OFFER_IX.find((ix) => ix.keys.includes(k)) ??
      OFFER_IX.find((ix) => ix.keys.some((x) => terms.includes(x))) ??
      OFFER_IX.find((ix) => ix.keys.some((x) => terms.some((t) => keyMatch(x, t))));
    return hit?.offer.merchant ?? k;
  });
  return uniq(labels).slice(0, 3).join('、');
}

function offersByTerms(terms: string[], field: 'text' | 'full' = 'text'): Offer[] {
  return OFFER_IX.filter((ix) => terms.some((t) => has(ix[field], t))).map((ix) => ix.offer);
}

/** 國家詞只比對活動名稱與「以該詞開頭」的商家鍵，避免「欣葉日本料理」被當成日本店 */
function offersByCountryTerms(terms: string[]): Offer[] {
  return OFFER_IX.filter((ix) =>
    terms.some((t) => norm(ix.offer.category).includes(t) || ix.keys.some((k) => keyMatch(k, t))),
  ).map((ix) => ix.offer);
}

function offersByCategory(keys: string[]): Offer[] {
  return OFFERS.filter((o) => keys.some((k) => norm(o.category).includes(k)));
}

function generalsByTerms(terms: string[], cards: Card[] = CARDS): GeneralHit[] {
  return cards
    .flatMap((card) =>
      card.general
        .filter((g) => terms.some((t) => norm(g.label).includes(norm(t))))
        .map((g) => ({ card, label: g.label, rate: g.rate, value: rateValue(g.rate) })),
    )
    .sort(byValueDesc);
}

function groupOffers(offers: Offer[], cards: Card[] = CARDS): OfferGroup[] {
  return cards
    .map((card) => {
      const os = offers
        .filter((o) => o.cardId === card.id)
        .map((o) => ({ o, value: rateValue(o.rate) }))
        .sort(byValueDesc)
        .map((x) => x.o);
      return { card, offers: os, best: os.length ? rateValue(os[0].rate) : null, expanded: false };
    })
    .filter((g) => g.offers.length > 0)
    .sort((a, b) => (b.best ?? -1) - (a.best ?? -1));
}

/** 把優惠依（卡片 × 活動）收斂成一行摘要 */
function summarizeByCategory(offers: Offer[]): CategorySummary[] {
  const map = new Map<string, CategorySummary>();
  for (const o of offers) {
    const key = `${o.cardId}|${o.category}`;
    const cur = map.get(key);
    if (cur) {
      cur.merchants.push(o.merchant);
      if (!cur.rate.split('／').includes(o.rate)) cur.rate += `／${o.rate}`;
    } else {
      map.set(key, {
        card: cardById(o.cardId), category: o.category, rate: o.rate, cap: o.cap, note: o.note,
        merchants: [o.merchant], value: rateValue(o.rate),
      });
    }
  }
  return [...map.values()].map((s) => ({ ...s, merchants: uniq(s.merchants) })).sort(byValueDesc);
}

/** 卡片的活動依「·」前的大類收斂 */
function topCategoriesOf(card: Card): CategorySummary[] {
  const map = new Map<string, CategorySummary>();
  for (const o of OFFERS.filter((x) => x.cardId === card.id)) {
    const top = o.category.split('·')[0];
    const cur = map.get(top);
    const v = rateValue(o.rate);
    if (cur) {
      cur.merchants.push(o.merchant);
      if (!cur.rate.split('／').includes(o.rate)) cur.rate += `／${o.rate}`;
      if (v !== null && (cur.value === null || v > cur.value)) cur.value = v;
    } else {
      map.set(top, {
        card, category: top, rate: o.rate, cap: o.cap, note: o.note, merchants: [o.merchant], value: v,
      });
    }
  }
  return [...map.values()].map((s) => ({ ...s, merchants: uniq(s.merchants) }));
}

const text = (t: string, tone?: 'crown' | 'muted'): QaBlock => ({ kind: 'text', text: t, tone });
const rankLine = (groups: OfferGroup[]): string =>
  groups.map((g) => `${short(g.card)} ${g.offers[0].rate}`).join('　›　');
const crownLine = (g: OfferGroup): QaBlock => {
  const o = g.offers[0];
  return text(
    `👑 最划算：${g.card.name}「${o.category}」${o.rate}` +
      (o.cap ? `｜上限 ${o.cap}` : '') +
      (o.note ? `｜${o.note}` : ''),
    'crown',
  );
};
const missingCards = (groups: OfferGroup[]): Card[] =>
  CARDS.filter((c) => !groups.some((g) => g.card.id === c.id));

function reply(blocks: QaBlock[], suggestions: string[], context: QaContext): QaResult {
  return { answer: { blocks, suggestions }, context };
}

function listOffers(offers: Offer[]): string {
  return uniq(offers.map((o) => `${short(cardById(o.cardId))}「${o.category}」${o.rate}`)).join('；');
}

type PayStatus = 'ok' | 'no' | 'unknown';
const NEGATIVE = /不適用|不回饋|不含|不列入|不計|除外/;
/**
 * 這筆優惠對某支付方式是「註明適用」「註明不適用」還是「未註明」。
 * 否定詞只看「提到該支付方式的那個子句」，避免「分期不適用；可綁 Pi 拍錢包」被誤判成不適用。
 */
function payStatus(o: Offer, pay: Pay): PayStatus {
  const ix = OFFER_IX.find((x) => x.offer === o)!;
  const clauses = (o.note ?? '').split(/[；;。，,、]/);
  const mentioned = clauses.filter((c) => pay.terms.some((t) => has(norm(c), t)));
  if (mentioned.some((c) => NEGATIVE.test(c))) return 'no';
  return pay.terms.some((t) => has(ix.full, t)) ? 'ok' : 'unknown';
}

// ================= 意圖處理 =================

/** 「刷 X 哪張卡最划算」 */
function answerMerchant(offers: Offer[], label: string, lead: string | null, pay: Pay | undefined): QaResult {
  const blocks: QaBlock[] = [];
  if (lead) blocks.push(text(lead, 'muted'));
  const context: QaContext = { topic: label, offers };
  if (!offers.length) {
    blocks.push(text(`查無「${label}」的加碼通路，${CARDS.length} 張卡都只能拿一般消費回饋。`));
    return reply(blocks, ['國內一般消費哪張最高', '有哪些卡', ...DEFAULT_SUGGESTIONS.slice(0, 2)], context);
  }
  if (pay) {
    const ok = offers.filter((o) => payStatus(o, pay) === 'ok');
    const unknown = offers.filter((o) => payStatus(o, pay) === 'unknown');
    const no = offers.filter((o) => payStatus(o, pay) === 'no');
    blocks.push(text(`用「${pay.label}」刷「${label}」：`));
    const groups = groupOffers(ok);
    if (groups.length) {
      blocks.push(text(rankLine(groups)));
      if (groups[0].best !== null) blocks.push(crownLine(groups[0]));
      blocks.push({ kind: 'offers', groups, crown: true, query: label });
    } else {
      blocks.push(text(`沒有活動明確註明適用 ${pay.label}。`, 'muted'));
    }
    if (unknown.length) blocks.push(text(`未註明支付方式（依各卡一般規則）：${listOffers(unknown)}`, 'muted'));
    if (no.length) blocks.push(text(`註明 ${pay.label} 不適用：${listOffers(no)}`, 'muted'));
    return reply(blocks, [`${label} 刷哪張卡`, `${label} 的上限與條件`, `用 ${pay.label} 刷哪張卡`], context);
  }
  const groups = groupOffers(offers);
  blocks.push(text(`刷「${label}」，${groups.length} 張卡有收錄加碼：\n${rankLine(groups)}`));
  if (groups[0].best !== null) blocks.push(crownLine(groups[0]));
  blocks.push({ kind: 'offers', groups, crown: true, query: label });
  const missing = missingCards(groups);
  if (missing.length) blocks.push(text(`其餘 ${missing.length} 張卡未收錄此通路，只有一般消費回饋。`, 'muted'));
  const suggestions = [`${label} 的上限與條件`];
  if (missing.length) suggestions.push(`那${short(missing[0])}呢`);
  suggestions.push('去日本要帶哪張卡', '有哪些卡');
  return reply(blocks, suggestions, context);
}

/** 「X 在某張卡有回饋嗎」 */
function answerMerchantOnCards(offers: Offer[], label: string, cards: Card[]): QaResult {
  const ids = new Set(cards.map((c) => c.id));
  const mine = offers.filter((o) => ids.has(o.cardId));
  const others = groupOffers(offers.filter((o) => !ids.has(o.cardId)));
  const names = cards.map((c) => c.name).join('、');
  const blocks: QaBlock[] = [];
  const context: QaContext = { topic: label, offers, card: cards.length === 1 ? cards[0] : undefined };
  if (mine.length) {
    const groups = groupOffers(mine, cards);
    blocks.push(text(`「${label}」在${names}的加碼：`));
    blocks.push({ kind: 'offers', groups, crown: false, query: label });
    if (others.length && (others[0].best ?? -1) > (groups[0].best ?? -1)) {
      blocks.push(text(`其他卡更高：${rankLine(others)}`, 'muted'));
    }
  } else {
    blocks.push(text(`${names}沒有收錄「${label}」的加碼通路，只能拿一般消費回饋：`));
    blocks.push({ kind: 'generals', items: generalsByTerms([''], cards), crown: false });
    if (others.length) blocks.push(text(`有收錄的卡：${rankLine(others)}`, 'muted'));
  }
  return reply(
    blocks,
    [`${label} 刷哪張卡最划算`, `${short(cards[0])} 有什麼優惠`, `${label} 的上限與條件`],
    context,
  );
}

/** 「某張卡有什麼優惠」 */
function answerCardOverview(card: Card): QaResult {
  const tops = topCategoriesOf(card);
  const total = OFFERS.filter((o) => o.cardId === card.id).length;
  const blocks: QaBlock[] = [
    text(`${card.name}｜${card.issuer}・${card.network}\n${card.tagline}\n活動期間 ${card.period}・回饋形式 ${card.rewardType}`),
    text('一般消費回饋：', 'muted'),
    { kind: 'generals', items: generalsByTerms([''], [card]), crown: false },
    text(`加碼活動共 ${total} 項，分 ${tops.length} 大類（點下方問題可展開通路）：`, 'muted'),
    { kind: 'categories', items: tops },
  ];
  const suggestions = tops.slice(0, 3).map((t) => `${short(card)} ${t.category} 有哪些通路`);
  suggestions.push(`${short(card)} 一般消費幾 %`);
  return reply(blocks, suggestions, { card });
}

/** 「某活動有哪些通路」 */
function answerCategory(keys: string[], cards: Card[]): QaResult {
  let offers = offersByCategory(keys);
  if (cards.length) {
    const ids = new Set(cards.map((c) => c.id));
    offers = offers.filter((o) => ids.has(o.cardId));
  }
  const label = keys
    .map((k) => {
      const cat = OFFERS.find((o) => norm(o.category).includes(k))?.category;
      return cat?.split('·').find((p) => norm(p).includes(k)) ?? cat ?? k;
    })
    .join('、');
  if (!offers.length) {
    return reply([text(`「${label}」沒有符合的活動。`)], DEFAULT_SUGGESTIONS.slice(0, 4), {});
  }
  const items = summarizeByCategory(offers);
  const blocks: QaBlock[] = [
    text(`「${label}」共 ${uniq(offers.map((o) => o.merchant)).length} 個通路、${items.length} 個子活動：`),
    { kind: 'categories', items },
  ];
  const card = cardById(offers[0].cardId);
  const single = uniq(offers.map((o) => o.cardId)).length === 1;
  return reply(blocks, [`${short(card)} 有什麼優惠`, `${offers[0].merchant} 刷哪張卡`, '有哪些卡'], {
    topic: label, offers, card: single ? card : undefined,
  });
}

/** 「去某國刷哪張」 */
function answerCountry(names: string[], cards: Card[]): QaResult {
  const refs = names.map((n) => COUNTRY_REFS.find((r) => r.name === n)!);
  const label = names.join('、');
  const dbsHits: CountryHit[] = DBS_COUNTRIES.filter((c) =>
    refs.some((r) => r.name === c.name || r.name === c.region || (r.code !== undefined && r.code === c.code)),
  ).map((c) => ({ ...c, rate: c.region === '歐洲' ? DBS_RATE_EU : DBS_RATE_NON_EU }));
  const scope = cards.length ? cards : CARDS;
  const ids = new Set(scope.map((c) => c.id));
  const generals = generalsByTerms(uniq(refs.flatMap((r) => r.generalTerms)), scope);
  if (dbsHits.length && ids.has('dbs')) {
    generals.unshift({
      card: cardById('dbs'),
      label: `存戶升級加碼國家（${uniq(dbsHits.map((c) => c.region)).join('／')}實體消費）`,
      rate: dbsHits[0].rate,
      value: rateValue(dbsHits[0].rate),
    });
  }
  generals.sort(byValueDesc);
  const offers = offersByCountryTerms(uniq(refs.flatMap((r) => r.terms))).filter((o) => ids.has(o.cardId));
  const items = summarizeByCategory(offers);
  const blocks: QaBlock[] = [text(`去「${label}」刷卡，各卡回饋由高到低：`)];
  if (generals.length) blocks.push({ kind: 'generals', items: generals, crown: true });
  if (items.length) {
    blocks.push(text('相關加碼活動／指定通路：', 'muted'));
    blocks.push({ kind: 'categories', items });
  }
  if (dbsHits.length) {
    blocks.push({ kind: 'countries', items: dbsHits, rates: uniq(dbsHits.map((c) => c.rate)), note: DBS_COUNTRY_NOTE });
  } else if (ids.has('dbs')) {
    blocks.push(text(`「${label}」不在星展存戶升級的 ${DBS_COUNTRIES.length} 個加碼國家清單內。`, 'muted'));
  }
  return reply(
    blocks,
    ['歐洲有哪些加碼國家', '國外消費哪張最高', '星展卡有什麼優惠', `${label} 的上限與條件`],
    { topic: label, offers, card: cards.length === 1 ? cards[0] : undefined },
  );
}

/** 「用某 Pay 刷哪張」 */
function answerPay(pay: Pay, cards: Card[]): QaResult {
  const scope = cards.length ? cards : CARDS;
  const ids = new Set(scope.map((c) => c.id));
  const all = offersByTerms(pay.terms, 'full').filter((o) => ids.has(o.cardId));
  const ok = all.filter((o) => payStatus(o, pay) === 'ok');
  const no = all.filter((o) => payStatus(o, pay) === 'no');
  const generals = generalsByTerms(pay.terms, scope);
  const taglines = scope.filter((c) => pay.terms.some((t) => has(norm(c.tagline), t)));
  const blocks: QaBlock[] = [];
  if (!ok.length && !generals.length && !taglines.length) {
    blocks.push(text(`沒有活動特別註明「${pay.label}」。`));
    if (no.length) blocks.push(text(`註明不適用：${listOffers(no)}`, 'muted'));
    return reply(blocks, DEFAULT_SUGGESTIONS.slice(0, 4), {});
  }
  const groups = groupOffers(ok, scope);
  blocks.push(text(`用「${pay.label}」付款，這些活動有註明適用：`));
  if (taglines.length) blocks.push(text(taglines.map((c) => `${c.name}：${c.tagline}`).join('\n'), 'muted'));
  if (generals.length) blocks.push({ kind: 'generals', items: generals, crown: false });
  if (groups.length) {
    blocks.push(text(rankLine(groups)));
    if (groups[0].best !== null) blocks.push(crownLine(groups[0]));
    blocks.push({ kind: 'offers', groups, crown: true });
  }
  if (no.length) {
    const cats = uniq(no.map((o) => `${short(cardById(o.cardId))}「${o.category.split('·')[0]}」`));
    blocks.push(text(`注意：${cats.join('、')} 註明 ${pay.label} 不適用。`, 'muted'));
  }
  return reply(blocks, [`用 ${pay.label} 刷全家`, `用 ${pay.label} 刷麥當勞`, '有哪些卡'], { topic: pay.label, offers: ok });
}

/** 主題（網購／保費／國外…）：搜尋詞 → 優惠＋一般回饋 */
function answerTopic(topic: Topic, cards: Card[], lead: string | null): QaResult {
  const scope = cards.length ? cards : CARDS;
  const ids = new Set(scope.map((c) => c.id));
  const offers = offersByTerms(topic.terms).filter((o) => ids.has(o.cardId));
  let generals = generalsByTerms(topic.generalTerms ?? [], scope);
  if (topic.id === 'domestic') {
    generals = generals.filter((g) => !(g.label.includes('國外') && !g.label.includes('國內外')));
  }
  const blocks: QaBlock[] = [];
  if (lead) blocks.push(text(lead, 'muted'));
  const card = cards.length === 1 ? cards[0] : undefined;
  if (!offers.length && !generals.length) {
    blocks.push(text(`「${topic.label}」在${cards.length ? `「${scope.map((c) => c.name).join('、')}」` : '目前資料'}沒有對應的加碼。`));
    if (cards.length) blocks.push({ kind: 'generals', items: generalsByTerms([''], scope), crown: false });
    return reply(blocks, DEFAULT_SUGGESTIONS.slice(0, 4), { card });
  }
  const groups = groupOffers(offers, scope);
  const bestGeneral = generals[0]?.value ?? -1;
  const bestOffer = groups[0]?.best ?? -1;
  blocks.push(text(`「${topic.label}」${cards.length ? `在「${scope.map(short).join('、')}」` : '各卡'}的回饋由高到低：`));
  if (generals.length) {
    blocks.push(text('一般回饋：', 'muted'));
    blocks.push({ kind: 'generals', items: generals, crown: bestGeneral >= 0 && bestGeneral >= bestOffer });
  }
  if (topic.id === 'abroad' && ids.has('dbs')) {
    blocks.push(text(`星展存戶升級：${DBS_COUNTRIES.length} 個指定國家實體消費 5%（需 Autopay）— 直接問「去日本刷哪張」看細節。`, 'muted'));
  }
  if (groups.length) {
    blocks.push(text(`加碼活動（${rankLine(groups)}）：`, 'muted'));
    if (bestOffer >= 0 && bestOffer > bestGeneral) blocks.push(crownLine(groups[0]));
    blocks.push({ kind: 'offers', groups, crown: !generals.length });
  }
  const suggestions = groups.length ? [`${groups[0].offers[0].merchant} 刷哪張卡`] : [];
  suggestions.push(`${topic.label} 的上限與條件`, '去日本要帶哪張卡', '有哪些卡');
  return reply(blocks, suggestions, { topic: topic.label, offers, card });
}

/** 「上限多少」「有什麼條件」：把上一題的優惠逐項列出 */
function answerDetails(ctx: QaContext): QaResult {
  if (!ctx.offers?.length) {
    return reply(
      [text('先告訴我商家、國家或卡片，我再列出上限與條件。例如「麥當勞刷哪張卡」之後再問「上限多少」。')],
      DEFAULT_SUGGESTIONS.slice(0, 4),
      ctx,
    );
  }
  const card = ctx.card;
  const scoped = card ? ctx.offers.filter((o) => o.cardId === card.id) : ctx.offers;
  const lines = (scoped.length ? scoped : ctx.offers).map(
    (o) => `• ${short(cardById(o.cardId))}｜${o.merchant}｜${o.rate}\n　上限：${o.cap ?? '未註明'}\n　條件：${o.note ?? '未註明'}`,
  );
  return reply(
    [text(`「${ctx.topic}」各項優惠的上限與條件：`), text(lines.join('\n'))],
    [`${ctx.topic} 刷哪張卡`, '有哪些卡', ...DEFAULT_SUGGESTIONS.slice(1, 3)],
    ctx,
  );
}

function answerCards(): QaResult {
  return reply(
    [
      text(`目前收錄 ${CARDS.length} 張卡、${OFFERS.length} 項優惠、${DBS_COUNTRIES.length} 個星展加碼國碼：`),
      { kind: 'cards', items: CARDS },
    ],
    CARDS.slice(0, 4).map((c) => `${short(c)} 有什麼優惠`),
    {},
  );
}

function answerHelp(): QaResult {
  return reply(
    [
      text(
        '我能回答的問題類型：\n' +
          '• 刷哪張卡：「麥當勞刷哪張卡」「Netflix 用哪張最划算」「UNIQLO 有回饋嗎」\n' +
          '• 出國：「去日本要帶哪張卡」「歐洲有哪些加碼國家」「JPN」\n' +
          '• 某張卡：「星展卡有什麼優惠」「台新一般消費幾 %」「Richart Chill 刷有哪些通路」\n' +
          '• 支付方式：「用 LINE Pay 刷哪張」「Pi 拍錢包掃碼有哪些通路」\n' +
          '• 主題：「網購刷哪張」「保費」「超商」「加油」「訂閱」\n' +
          '• 接著問：「上限多少」「有什麼條件」「那台新呢」\n' +
          `範圍只有已收錄的 ${CARDS.length} 張卡、${OFFERS.length} 項優惠，不會上網查資料。`,
      ),
    ],
    DEFAULT_SUGGESTIONS,
    {},
  );
}

function answerUnknown(raw: string): QaResult {
  return reply(
    [
      text(`我還聽不懂「${raw.trim()}」😅`),
      text(
        '試著換個問法：直接打商家名（麥當勞、UNIQLO）、國家（日本、JPN）、卡名（星展、台新）或主題（網購、超商、保費）。輸入「說明」可看完整用法。',
        'muted',
      ),
    ],
    DEFAULT_SUGGESTIONS,
    {},
  );
}

// ================= 主入口 =================

/** 開場白（元件初始訊息） */
export function welcome(): QaAnswer {
  return {
    blocks: [
      text(
        '嗨！我是 Cardex 問答機器人 🤖\n直接問我「麥當勞刷哪張卡」「去日本要帶哪張」「星展卡有什麼優惠」「用 LINE Pay 刷哪張」，也可以接著問「上限多少」「那台新呢」。\n' +
          `我只認得已收錄的 ${CARDS.length} 張卡、${OFFERS.length} 項優惠與 ${DBS_COUNTRIES.length} 個加碼國碼，不會上網查資料。`,
      ),
    ],
    suggestions: DEFAULT_SUGGESTIONS,
  };
}

const STOP_WORDS =
  /請問|我想|想問|想知道|知道|一下|哪一張卡|哪張卡|哪一張|哪張|哪個|哪些|那張|信用卡|刷卡|最划算|划算|回饋|優惠|加碼|有沒有|沒有|什麼|多少|怎麼|如何|可以|能不能|推薦|建議|比較|適合|應該|要帶|消費|付款|結帳|購買|使用/g;
const STOP_CHARS = /[刷卡有嗎呢的要用去吧喔啊哦呀嘛了在到和跟與及或是我你他們就都也還很好買吃喝玩看聽做得會想幾帶%?!,.、:;()"'「」『』|\-~]/g;

/** 剩餘片段 → 關鍵字／二字詞模糊搜尋 */
function fallbackSearch(q: string, hits: Hit[]): { offers: Offer[]; term: string } | null {
  let rest = q;
  for (const h of hits) {
    rest = rest.slice(0, h.start) + '|'.repeat(h.key.length) + rest.slice(h.start + h.key.length);
  }
  rest = rest.replace(STOP_WORDS, '|').replace(STOP_CHARS, '|');
  const tokens = uniq(rest.split('|').map((t) => t.trim()).filter((t) => t.length >= 2));
  for (const t of tokens) {
    const direct = OFFER_IX.filter((ix) => has(ix.text, t)).map((ix) => ix.offer);
    if (direct.length) return { offers: direct, term: t };
  }
  for (const t of tokens.filter((x) => !isAscii(x) && x.length >= 3)) {
    for (let i = 0; i + 2 <= t.length; i++) {
      const gram = t.slice(i, i + 2);
      const fuzzy = OFFER_IX.filter((ix) => ix.keys.some((k) => k.includes(gram))).map((ix) => ix.offer);
      if (fuzzy.length) return { offers: fuzzy, term: gram };
    }
  }
  return null;
}

export function ask(raw: string, ctx: QaContext = {}): QaResult {
  const q = norm(raw);
  if (!q) return reply([text('請輸入問題，例如「麥當勞刷哪張卡」。')], DEFAULT_SUGGESTIONS, ctx);

  const hits = tokenize(q);
  const cardIds = uniq(hits.flatMap((h) => (h.type === 'card' ? [h.ref] : h.type === 'issuer' ? h.ref.split(',') : [])));
  const cards = CARDS.filter((c) => cardIds.includes(c.id));
  const pays = uniq(hits.filter((h) => h.type === 'pay').map((h) => h.ref)).map((id) => PAYS.find((p) => p.id === id)!);
  const countries = uniq(hits.filter((h) => h.type === 'country').map((h) => h.ref));
  const topics = uniq(hits.filter((h) => h.type === 'topic').map((h) => h.ref)).map((id) => TOPICS.find((t) => t.id === id)!);
  const merchantKeys = uniq(hits.filter((h) => h.type === 'merchant').map((h) => h.ref));
  const categoryKeys = uniq(hits.filter((h) => h.type === 'category').map((h) => h.ref));
  const hasEntity =
    cards.length + pays.length + countries.length + topics.length + merchantKeys.length + categoryKeys.length > 0;

  // ---- 閒聊／說明／清單 ----
  if (!hasEntity) {
    if (/^(hi|hello|hey|嗨|哈囉|你好|您好|安安|早安|午安|晚安|在嗎)/.test(q) && q.length <= 8) {
      return reply([text('嗨！想知道刷哪張卡最划算？直接打商家、國家或卡名就行。')], DEFAULT_SUGGESTIONS, ctx);
    }
    if (/謝謝|感謝|thx|thanks|3q/.test(q)) {
      return reply([text('不客氣！刷卡前記得再確認銀行公告 🙂')], DEFAULT_SUGGESTIONS, ctx);
    }
    if (/你會什麼|能問什麼|可以問什麼|怎麼用|怎麼問|使用說明|幫助|說明|help|你是誰|你能做什麼|功能/.test(q)) {
      return answerHelp();
    }
    if (/哪些卡|哪幾張|幾張卡|卡片(清單|列表|一覽)|所有卡|全部的?卡|收錄/.test(q)) {
      return answerCards();
    }
    if (/上限|條件|限制|注意|門檻|怎麼拿|怎麼領|要綁|需要綁|規則|細節|詳細/.test(q)) {
      return answerDetails(ctx);
    }
  }

  // ---- 依實體組合決定意圖（優先序：國家 > 商家 > 接話換卡 > 支付方式 > 活動名稱 > 主題 > 卡片）----
  const wantsDetails = /上限|條件|限制|門檻|規則|細節/.test(q);
  const followUp =
    /^(那|那麼|換成|換|如果是|如果|改成|改)/.test(q) || /呢[?!]*$/.test(q) || /有嗎|可以嗎|能刷嗎|行嗎/.test(q);
  const card = cards.length === 1 ? cards[0] : undefined;
  let r: QaResult | null = null;

  if (countries.length) {
    r = answerCountry(countries, cards);
  } else if (merchantKeys.length) {
    const offers = offersByKeys(merchantKeys);
    const label = labelForKeys(merchantKeys);
    r = cards.length ? answerMerchantOnCards(offers, label, cards) : answerMerchant(offers, label, null, pays[0]);
  } else if (cards.length && ctx.offers?.length && ctx.topic && !pays.length && !topics.length && !categoryKeys.length && followUp) {
    // 「那台新呢」：沿用上一題的商家，只換卡
    r = answerMerchantOnCards(ctx.offers, ctx.topic, cards);
  } else if (pays.length) {
    r = answerPay(pays[0], cards);
  } else if (categoryKeys.length) {
    r = answerCategory(categoryKeys, cards);
  } else if (topics.length) {
    r = answerTopic(topics[0], cards, null);
  } else if (cards.length) {
    if (wantsDetails && ctx.offers?.length && ctx.topic) return answerDetails({ ...ctx, card });
    r = card
      ? answerCardOverview(card)
      : reply(
          [text(`你提到 ${cards.length} 張卡，想看哪一張？`), { kind: 'cards', items: cards }],
          cards.map((c) => `${short(c)} 有什麼優惠`),
          ctx,
        );
  }
  // 「X 的上限與條件」：先算出 X 的答案，再逐項列出上限與條件
  if (r) return wantsDetails && r.context.offers?.length ? answerDetails(r.context) : r;

  // ---- 兜底：關鍵字／模糊搜尋、出國語意 ----
  const fb = fallbackSearch(q, hits);
  if (fb) {
    return answerMerchant(fb.offers, labelForKeys([fb.term]), `我用關鍵字「${fb.term}」幫你找：`, undefined);
  }
  if (/去|出國|旅遊|旅行|飛|玩/.test(q)) {
    return answerTopic(TOPICS.find((t) => t.id === 'abroad')!, [], '我不認得這個地點，先給你各卡的國外消費回饋：');
  }
  return answerUnknown(raw);
}
