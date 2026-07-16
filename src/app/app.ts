import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  protected readonly cards = CARDS;

  // ================= 跨卡商家／通路查詢 =================
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

  protected pickExample(term: string) {
    this.lookupQuery.set(term);
  }
}
