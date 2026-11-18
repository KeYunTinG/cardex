import { Component, computed, effect, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QaChat } from './qa/qa-chat';
import { capLabel, rateValue } from './qa/qa-engine';
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
} from './card-data';

/** 一張卡在本次查詢的結果：優惠依回饋率由高到低，best 為第一筆 */
interface CardRank {
  card: Card;
  offers: Offer[];
  best: Offer;
  /** best 的百分比數值；「現折 100 元」等無法比較者為 null，排在最後 */
  value: number | null;
  /** 回饋率橫條長度（相對本次最高值，0–100） */
  bar: number;
}
/** 命中的加碼國家，附上該地區適用的回饋率 */
interface CountryHit extends Country {
  rate: string;
}
/** 首頁情境捷徑：點下去等於查詢該關鍵字 */
interface Scene {
  title: string;
  query: string;
  top: CardRank | null;
}

/** 卡面示意色（純裝飾，非銀行品牌色） */
export const CARD_COLOR: Record<string, string> = {
  dbs: '#1F2A44',
  jihe: '#7A1F2B',
  laidian: '#167A42',
  ctbc: '#3A4F8F',
  richart: '#B43C0A',
  'esun-pi': '#0F766E',
  'esun-ubear': '#6B4E2E',
};

const SCENES: { title: string; query: string }[] = [
  { title: '便利商店', query: '超商' },
  { title: 'LINE Pay 付款', query: 'LINE Pay' },
  { title: 'Netflix 訂閱', query: 'Netflix' },
  { title: '加油', query: '加油' },
];

const EXAMPLES = ['麥當勞', '唐吉訶德', '淘寶', 'UNIQLO', 'JPN', '歐洲'];

const OWNED_KEY = 'cardex.owned';
const ONLY_MINE_KEY = 'cardex.onlyMine';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 無痕模式或儲存被封鎖：只是不記住，不影響功能 */
  }
}

function matchOffers(q: string): Offer[] {
  if (!q) return [];
  return OFFERS.filter((o) =>
    [o.merchant, o.category, ...(o.aliases ?? [])].join(' ').toLowerCase().includes(q),
  );
}

/** 依卡片分組並排名：先比 best 的回饋率，同分維持卡片原順序 */
function rankCards(offers: Offer[], cards: Card[]): CardRank[] {
  const ranks = cards
    .map((card) => {
      const os = offers
        .filter((o) => o.cardId === card.id)
        .map((o) => ({ o, v: rateValue(o.rate) }))
        .sort((a, b) => (b.v ?? -1) - (a.v ?? -1))
        .map((x) => x.o);
      return os.length ? { card, offers: os, best: os[0], value: rateValue(os[0].rate), bar: 0 } : null;
    })
    .filter((r): r is CardRank => r !== null)
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  const max = Math.max(0, ...ranks.map((r) => r.value ?? 0));
  for (const r of ranks) r.bar = max > 0 && r.value !== null ? Math.max(4, (r.value / max) * 100) : 0;
  return ranks;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, NgTemplateOutlet, QaChat],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly cards = CARDS;
  protected readonly color = CARD_COLOR;
  protected readonly examples = EXAMPLES;
  protected readonly capLabel = capLabel;

  /** 頁面模式：查詢或問答機器人（兩者共用同一份資料） */
  protected readonly mode = signal<'search' | 'chat'>('search');
  private readonly chat = viewChild(QaChat);

  // ================= 我的卡夾 =================
  /** 使用者持有的卡（預設全部），記在 localStorage */
  protected readonly owned = signal<Set<string>>(
    new Set(load<string[]>(OWNED_KEY, CARDS.map((c) => c.id)).filter((id) => CARDS.some((c) => c.id === id))),
  );
  protected readonly onlyMine = signal<boolean>(load(ONLY_MINE_KEY, false));
  protected readonly ownedCount = computed(() => this.owned().size);

  /** 本次排名納入的卡 */
  private readonly scope = computed(() =>
    this.onlyMine() ? CARDS.filter((c) => this.owned().has(c.id)) : CARDS,
  );

  protected toggleOwned(id: string): void {
    this.owned.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ================= 跨卡查詢 =================
  protected readonly lookupQuery = signal('');
  private readonly q = computed(() => this.lookupQuery().trim().toLowerCase());
  protected readonly hasQuery = computed(() => this.q().length > 0);

  private readonly matchedOffers = computed(() => matchOffers(this.q()));
  private readonly ranked = computed(() => rankCards(this.matchedOffers(), this.scope()));

  /** 使用者表示「這張卡的條件我不符合」的卡；換關鍵字就重置 */
  protected readonly unmet = signal<Set<string>>(new Set());

  /** 條件符合、列入排名的卡 */
  protected readonly eligible = computed(() => this.ranked().filter((r) => !this.unmet().has(r.card.id)));
  protected readonly top = computed(() => this.eligible()[0] ?? null);
  protected readonly runners = computed(() => this.eligible().slice(1));
  /** 使用者取消勾選條件、暫不列入排名的卡 */
  protected readonly excluded = computed(() => this.ranked().filter((r) => this.unmet().has(r.card.id)));
  /** 沒有任何加碼命中的卡：以一般消費回饋計 */
  protected readonly others = computed(() => {
    const hit = new Set(this.ranked().map((r) => r.card.id));
    return this.scope().filter((c) => !hit.has(c.id));
  });
  /** 有條件備註的命中卡，做成「刷之前確認」清單 */
  protected readonly checks = computed(() => this.ranked().filter((r) => !!r.best.note));

  /** 查詢詞命中的帳單別名（商家名本身沒命中時才有參考價值） */
  protected readonly aliasHits = computed(() => {
    const q = this.q();
    if (!q) return [];
    const out = new Set<string>();
    for (const o of this.matchedOffers()) {
      if (o.merchant.toLowerCase().includes(q)) continue;
      for (const a of o.aliases ?? []) if (a.toLowerCase().includes(q)) out.add(`${a} → ${o.merchant}`);
    }
    return [...out].slice(0, 6);
  });

  protected toggleMet(id: string): void {
    this.unmet.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---- 國碼／國名查詢（星展存戶升級 5% 加碼國家）----
  protected readonly countryNote = DBS_COUNTRY_NOTE;

  protected readonly matchedCountries = computed<CountryHit[]>(() => {
    const q = this.q();
    if (!q) return [];
    return DBS_COUNTRIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.includes(q) || c.region.includes(q),
    ).map((c) => ({ ...c, rate: c.region === '歐洲' ? DBS_RATE_EU : DBS_RATE_NON_EU }));
  });
  protected readonly countryTotal = computed(() => this.matchedCountries().length);

  protected readonly matchTotal = computed(() => this.ranked().reduce((n, r) => n + r.offers.length, 0));
  protected readonly noMatch = computed(
    () => this.hasQuery() && this.ranked().length === 0 && this.countryTotal() === 0,
  );

  // ---- 首頁情境捷徑：即時算出各情境目前最高的卡 ----
  protected readonly scenes = computed<Scene[]>(() =>
    SCENES.map((s) => ({ ...s, top: rankCards(matchOffers(s.query.toLowerCase()), this.scope())[0] ?? null })),
  );

  /** 展開全部優惠的卡（預設只顯示每張卡前幾筆） */
  protected readonly expanded = signal<Set<string>>(new Set());
  protected readonly FOLD_AT = 3;
  protected toggleExpanded(id: string): void {
    this.expanded.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  protected shown(r: CardRank): Offer[] {
    return this.expanded().has(r.card.id) ? r.offers : r.offers.slice(0, this.FOLD_AT);
  }

  constructor() {
    // 網址 ?q=麥當勞 可直接帶出結果；輸入時同步回網址，方便分享
    try {
      const initial = new URLSearchParams(location.search).get('q');
      if (initial) this.lookupQuery.set(initial);
    } catch {}
    effect(() => {
      const q = this.lookupQuery().trim();
      try {
        const url = new URL(location.href);
        if (q) url.searchParams.set('q', q);
        else url.searchParams.delete('q');
        history.replaceState(history.state, '', url);
      } catch {}
    });
    effect(() => save(OWNED_KEY, [...this.owned()]));
    effect(() => save(ONLY_MINE_KEY, this.onlyMine()));
    // 換關鍵字時，條件勾選與展開狀態都回到預設
    effect(() => {
      this.q();
      this.unmet.set(new Set());
      this.expanded.set(new Set());
    });
  }

  protected pickExample(term: string): void {
    this.lookupQuery.set(term);
    this.mode.set('search');
  }

  /** 輸入框按 Enter：查得到就留在結果，查不到（多半是一句話）就交給問答機器人 */
  protected submit(): void {
    const text = this.lookupQuery().trim();
    if (text && this.noMatch()) this.askBot(text);
  }

  protected askBot(text: string): void {
    this.mode.set('chat');
    this.chat()?.send(text);
  }

  /** 從問答機器人跳回查詢並帶入關鍵字 */
  protected openSearch(term: string): void {
    this.lookupQuery.set(term);
    this.mode.set('search');
  }
}
