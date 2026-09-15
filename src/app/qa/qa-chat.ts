import { Component, ElementRef, Injector, afterNextRender, inject, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CARD_SHORT, OfferGroup, QaAnswer, QaBlock, QaContext, ask, welcome } from './qa-engine';

interface ChatMessage {
  id: number;
  role: 'user' | 'bot';
  text?: string;
  blocks?: QaBlock[];
  suggestions?: string[];
}

/** 同一張卡的優惠超過這個數量就先收合 */
const FOLD_AT = 8;

/**
 * 問答機器人的對話介面。
 * 所有回答都來自 qa-engine（同步、純前端）；這裡只負責訊息串、建議問題與展開／收合。
 */
@Component({
  selector: 'app-qa-chat',
  imports: [FormsModule],
  templateUrl: './qa-chat.html',
  styleUrl: './qa-chat.css',
})
export class QaChat {
  /** 使用者想用快速查詢看完整清單時發出（帶關鍵字） */
  readonly searchRequested = output<string>();

  protected readonly short = CARD_SHORT;
  protected readonly draft = signal('');
  protected readonly thinking = signal(false);
  protected readonly messages = signal<ChatMessage[]>([]);

  private seq = 0;
  private ctx: QaContext = {};
  private readonly log = viewChild<ElementRef<HTMLElement>>('log');
  private readonly injector = inject(Injector);

  constructor() {
    this.reset();
  }

  protected send(text: string = this.draft()): void {
    const q = text.trim();
    if (!q || this.thinking()) return;
    this.draft.set('');
    this.push({ id: ++this.seq, role: 'user', text: q });
    this.thinking.set(true);
    // 引擎是同步的；短暫延遲只是讓「輸入中」有節奏
    setTimeout(() => {
      let answer: QaAnswer;
      try {
        const r = ask(q, this.ctx);
        this.ctx = r.context;
        answer = r.answer;
      } catch (e) {
        console.error(e);
        answer = { blocks: [{ kind: 'text', text: '這題我處理時出了點問題，換個問法試試。' }], suggestions: [] };
      }
      this.thinking.set(false);
      this.push(this.bot(answer));
    }, 220);
  }

  protected reset(): void {
    this.ctx = {};
    this.thinking.set(false);
    this.messages.set([this.bot(welcome())]);
  }

  /** 展開／收合某則回答裡某張卡的優惠清單（以不可變方式更新，讓 signal 重新渲染） */
  protected toggle(msg: ChatMessage, block: QaBlock, gi: number): void {
    this.messages.update((ms) =>
      ms.map((m) => {
        if (m !== msg) return m;
        return {
          ...m,
          blocks: m.blocks?.map((b) => {
            if (b !== block || b.kind !== 'offers') return b;
            return { ...b, groups: b.groups.map((g, i) => (i === gi ? { ...g, expanded: !g.expanded } : g)) };
          }),
        };
      }),
    );
  }

  protected visible(g: OfferGroup) {
    return g.expanded || g.offers.length <= FOLD_AT + 2 ? g.offers : g.offers.slice(0, FOLD_AT);
  }

  protected folded(g: OfferGroup): number {
    return g.offers.length - this.visible(g).length;
  }

  private bot(answer: QaAnswer): ChatMessage {
    return { id: ++this.seq, role: 'bot', blocks: answer.blocks, suggestions: answer.suggestions };
  }

  private push(m: ChatMessage): void {
    this.messages.update((ms) => [...ms, m]);
    afterNextRender(
      () => {
        const el = this.log()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      },
      { injector: this.injector },
    );
  }
}
