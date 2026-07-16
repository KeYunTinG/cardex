import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
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

type Tab = 'search' | 'lookup';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface Block {
  cardId: string;
  heading: string;
  md: string;
}
interface RenderedBlock {
  cardName: string;
  heading: string;
  html: SafeHtml;
}
/** 依卡片分組的查詢結果 */
interface CardGroup {
  card: Card;
  offers: Offer[];
}
/** 命中的加碼國家，附上該地區適用的回饋率 */
interface CountryHit extends Country {
  rate: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly tab = signal<Tab>('lookup');
  protected readonly cards = CARDS;

  // ================= 層級一：全文關鍵字搜尋（跨三張卡） =================
  protected readonly mdReady = signal(false);
  protected readonly mdError = signal(false);
  protected readonly docQuery = signal('');
  protected readonly cardFilter = signal<string>('all'); // 'all' 或 card.id
  private readonly blocks = signal<Block[]>([]);

  constructor() {
    Promise.all(
      CARDS.map((c) =>
        fetch('cardInfo/' + encodeURIComponent(c.file))
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
          })
          .then((text) => this.buildBlocks(c.id, text)),
      ),
    )
      .then((groups) => {
        this.blocks.set(groups.flat());
        this.mdReady.set(true);
      })
      .catch(() => this.mdError.set(true));
  }

  private buildBlocks(cardId: string, md: string): Block[] {
    const out: Block[] = [];
    let heading = '';
    for (const raw of md.split(/\n{2,}/)) {
      const t = raw.trim();
      if (!t || t === '---') continue;
      if (/^#{1,6}\s/.test(t)) {
        heading = t.replace(/^#{1,6}\s+/, '').trim();
        continue;
      }
      out.push({ cardId, heading, md: t });
    }
    return out;
  }

  private cardName(id: string): string {
    return CARDS.find((c) => c.id === id)?.name ?? id;
  }

  protected readonly results = computed<RenderedBlock[]>(() => {
    const q = this.docQuery().trim();
    const lower = q.toLowerCase();
    const cf = this.cardFilter();
    const matched = this.blocks().filter((b) => {
      if (cf !== 'all' && b.cardId !== cf) return false;
      if (!lower) return true;
      return (
        b.md.toLowerCase().includes(lower) ||
        b.heading.toLowerCase().includes(lower)
      );
    });
    return matched.map((b) => ({
      cardName: this.cardName(b.cardId),
      heading: b.heading,
      html: this.sanitizer.bypassSecurityTrustHtml(
        this.highlight(marked.parse(b.md) as string, q),
      ),
    }));
  });

  protected readonly resultCount = computed(() => this.results().length);

  private highlight(html: string, q: string): string {
    if (!q) return html;
    const re = new RegExp(`(${escapeRegExp(q)})`, 'gi');
    return html
      .split(/(<[^>]+>)/)
      .map((part) => (part.startsWith('<') ? part : part.replace(re, '<mark>$1</mark>')))
      .join('');
  }

  // ================= 層級二：跨卡商家／通路查詢 =================
  protected readonly lookupQuery = signal('');

  private readonly matchedOffers = computed<Offer[]>(() => {
    const q = this.lookupQuery().trim().toLowerCase();
    if (!q) return [];
    return OFFERS.filter((o) =>
      [o.merchant, o.category, ...(o.aliases ?? [])]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  });

  /** 將符合的優惠依卡片分組，卡片依原順序排列 */
  protected readonly groupedOffers = computed<CardGroup[]>(() => {
    const offers = this.matchedOffers();
    return CARDS.map((card) => ({
      card,
      offers: offers.filter((o) => o.cardId === card.id),
    })).filter((g) => g.offers.length > 0);
  });

  // ---- 國碼／國名查詢（星展存戶升級 5% 加碼國家）----
  protected readonly countryNote = DBS_COUNTRY_NOTE;

  protected readonly matchedCountries = computed<CountryHit[]>(() => {
    const q = this.lookupQuery().trim().toLowerCase();
    if (!q) return [];
    return DBS_COUNTRIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.includes(q) ||
        c.region.includes(q),
    ).map((c) => ({
      ...c,
      rate: c.region === '歐洲' ? DBS_RATE_EU : DBS_RATE_NON_EU,
    }));
  });

  protected readonly countryTotal = computed(() => this.matchedCountries().length);

  protected readonly hasQuery = computed(() => this.lookupQuery().trim().length > 0);
  protected readonly matchTotal = computed(() => this.matchedOffers().length);
  protected readonly cardsHit = computed(() => this.groupedOffers().length);
  protected readonly noMatch = computed(
    () => this.hasQuery() && this.matchTotal() === 0 && this.countryTotal() === 0,
  );

  protected setTab(t: Tab) {
    this.tab.set(t);
  }

  protected pickExample(term: string) {
    this.lookupQuery.set(term);
  }
}
