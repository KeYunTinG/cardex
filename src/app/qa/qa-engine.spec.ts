import { OFFERS } from '../card-data';
import { QaBlock, QaResult, ask, norm, rateValue } from './qa-engine';

function block<K extends QaBlock['kind']>(r: QaResult, kind: K): Extract<QaBlock, { kind: K }> {
  const b = r.answer.blocks.find((x) => x.kind === kind);
  if (!b) throw new Error(`沒有 ${kind} 區塊，只有：${r.answer.blocks.map((x) => x.kind).join(',')}`);
  return b as Extract<QaBlock, { kind: K }>;
}
const hasBlock = (r: QaResult, kind: QaBlock['kind']) => r.answer.blocks.some((b) => b.kind === kind);
const allText = (r: QaResult) =>
  r.answer.blocks.map((b) => (b.kind === 'text' ? b.text : '')).join('\n');

describe('qa-engine', () => {
  describe('工具', () => {
    it('norm：全形轉半形、去空白、小寫', () => {
      expect(norm('Ｕｂｅｒ Eats ／ ＡＰＰＬＥ')).toBe('ubereats/apple');
    });
    it('rateValue：取第一個百分比，非百分比為 null', () => {
      expect(rateValue('最高 10%')).toBe(10);
      expect(rateValue('3.8%＋免 1.5% 國外交易手續費')).toBe(3.8);
      expect(rateValue('現折 100 元')).toBeNull();
    });
  });

  describe('商家', () => {
    it('麥當勞刷哪張卡：依回饋率排序，星展最高', () => {
      const r = ask('麥當勞刷哪張卡');
      const b = block(r, 'offers');
      expect(b.groups.map((g) => g.card.id)).toEqual(['dbs', 'laidian', 'richart']);
      expect(b.crown).toBeTrue();
      expect(allText(r)).toContain('最划算');
      expect(r.context.topic).toBe('麥當勞');
    });
    it('別名與帳單名稱：APPLE.COM、驚安殿堂、711', () => {
      expect(block(ask('APPLE.COM'), 'offers').groups.some((g) => g.card.id === 'dbs')).toBeTrue();
      expect(block(ask('驚安殿堂有回饋嗎'), 'offers').groups.length).toBeGreaterThanOrEqual(3);
      expect(block(ask('711 刷哪張'), 'offers').groups.some((g) => g.card.id === 'ctbc')).toBeTrue();
    });
    it('Uber Eats 不會混入 Uber（通勤）', () => {
      const b = block(ask('Uber Eats 有回饋嗎'), 'offers');
      const merchants = b.groups.flatMap((g) => g.offers.map((o) => o.merchant));
      expect(merchants.length).toBeGreaterThan(0);
      expect(merchants.every((m) => /uber eats/i.test(m))).toBeTrue();
    });
    it('指定卡片：台新刷麥當勞，並提示其他卡更高', () => {
      const r = ask('台新刷麥當勞有回饋嗎');
      const b = block(r, 'offers');
      expect(b.groups.length).toBe(1);
      expect(b.groups[0].card.id).toBe('richart');
      expect(allText(r)).toContain('其他卡更高');
    });
    it('指定卡片沒收錄時改給一般回饋', () => {
      const r = ask('吉鶴卡刷麥當勞');
      expect(hasBlock(r, 'offers')).toBeFalse();
      expect(block(r, 'generals').items.every((g) => g.card.id === 'jihe')).toBeTrue();
    });
    it('用 LINE Pay 刷麥當勞：只有賴點註明適用，其他歸為未註明', () => {
      const r = ask('用 LINE Pay 刷麥當勞');
      expect(block(r, 'offers').groups.map((g) => g.card.id)).toEqual(['laidian']);
      const t = allText(r);
      expect(t).toContain('未註明');
      expect(t).toContain('星展');
      expect(t).not.toContain('註明 LINE Pay 不適用');
    });
    it('用 LINE Pay 刷台鐵：台新通勤交通註明不適用', () => {
      const t = allText(ask('用 LINE Pay 刷台鐵'));
      expect(t).toContain('註明 LINE Pay 不適用');
      expect(t).toContain('通勤交通');
    });
    it('全家：不會撈到鞋全家福，標籤是「全家」', () => {
      const r = ask('全家刷哪張');
      expect(r.context.topic).toBe('全家');
      const merchants = block(r, 'offers').groups.flatMap((g) => g.offers.map((o) => o.merchant));
      expect(merchants).not.toContain('鞋全家福');
      expect(merchants).toContain('全家便利商店');
    });
    it('Pi 拍錢包：「分期不適用；可綁 Pi 拍錢包」不會被誤判成不適用', () => {
      const t = allText(ask('用 Pi 拍錢包刷哪張'));
      expect(t).not.toContain('通路加碼 2');
    });
    it('去日本：欣葉日本料理不會被當成日本的店', () => {
      const cats = block(ask('去日本要帶哪張卡'), 'categories');
      expect(cats.items.some((c) => c.merchants.includes('欣葉日本料理'))).toBeFalse();
    });
    it('查無商家', () => {
      expect(allText(ask('好市多刷哪張'))).toMatch(/聽不懂|查無/);
    });
  });

  describe('接話', () => {
    it('上限多少：沿用上一題的優惠', () => {
      const r = ask('上限多少', ask('麥當勞刷哪張卡').context);
      const t = allText(r);
      expect(t).toContain('麥當勞');
      expect(t).toContain('500 點');
    });
    it('X 的上限與條件：一句話直接問', () => {
      expect(allText(ask('麥當勞的上限與條件'))).toContain('500 點');
    });
    it('那台新呢：換卡不換商家', () => {
      const r = ask('那台新呢', ask('麥當勞刷哪張卡').context);
      const b = block(r, 'offers');
      expect(b.groups.length).toBe(1);
      expect(b.groups[0].card.id).toBe('richart');
    });
    it('沒有脈絡時請使用者先給主題', () => {
      expect(allText(ask('上限多少'))).toContain('先告訴我');
    });
  });

  describe('國家', () => {
    it('去日本要帶哪張卡：星展加碼國家、一般國外回饋、日本活動', () => {
      const r = ask('去日本要帶哪張卡');
      expect(block(r, 'countries').items.map((x) => x.code)).toEqual(['JPN']);
      const g = block(r, 'generals');
      expect(g.items[0].card.id).toBe('dbs');
      expect(g.items[0].value).toBe(5);
      expect(g.items.some((x) => x.card.id === 'jihe' && x.label.includes('日幣'))).toBeTrue();
      expect(block(r, 'categories').items.some((x) => x.category.includes('日本 11 大'))).toBeTrue();
    });
    it('國碼、城市、地區：JPN、東京、歐洲', () => {
      expect(block(ask('JPN'), 'countries').items[0].name).toBe('日本');
      expect(block(ask('去東京玩'), 'countries').items[0].code).toBe('JPN');
      expect(block(ask('歐洲有哪些加碼國家'), 'countries').items.length).toBe(41);
    });
    it('不在星展清單的國家仍給其他卡的回饋', () => {
      const r = ask('去澳洲刷哪張');
      expect(hasBlock(r, 'countries')).toBeFalse();
      expect(allText(r)).toContain('不在星展');
      expect(block(r, 'categories').items.some((x) => x.merchants.includes('澳洲'))).toBeTrue();
    });
  });

  describe('卡片', () => {
    it('星展卡有什麼優惠：一般回饋＋活動大類', () => {
      const r = ask('星展卡有什麼優惠');
      expect(allText(r)).toContain('星展傳說對決聯名卡');
      expect(block(r, 'generals').items.length).toBe(3);
      expect(block(r, 'categories').items.map((c) => c.category)).toEqual(['精選通路']);
    });
    it('台新一般消費幾 %', () => {
      const g = block(ask('台新一般消費幾 %'), 'generals');
      expect(g.items.every((x) => x.card.id === 'richart')).toBeTrue();
      expect(g.items.some((x) => x.label.includes('一般消費'))).toBeTrue();
    });
    it('Richart Chill 刷有哪些通路', () => {
      const c = block(ask('Richart Chill 刷有哪些通路'), 'categories');
      expect(c.items.length).toBeGreaterThan(5);
      expect(c.items.every((x) => x.card.id === 'richart' && x.category.startsWith('Chill 刷'))).toBeTrue();
    });
    it('有哪些卡', () => {
      expect(block(ask('有哪些卡'), 'cards').items.length).toBe(7);
    });
  });

  describe('支付方式與主題', () => {
    it('用 LINE Pay 刷哪張：排除註明不適用的方案', () => {
      const r = ask('用 LINE Pay 刷哪張');
      const all = block(r, 'offers').groups.flatMap((g) => g.offers);
      expect(all.some((o) => o.cardId === 'laidian')).toBeTrue();
      expect(all.every((o) => !/LINE Pay／全盈\+Pay 不適用/.test(o.note ?? ''))).toBeTrue();
      expect(allText(r)).toContain('不適用');
    });
    it('網購刷哪張', () => {
      const b = block(ask('網購刷哪張'), 'offers');
      expect(b.groups.flatMap((g) => g.offers).some((o) => o.merchant.includes('蝦皮'))).toBeTrue();
    });
    it('國外消費哪張最高：賴點 3% 排第一', () => {
      const g = block(ask('國外消費哪張最高'), 'generals');
      expect(g.items[0].card.id).toBe('laidian');
      expect(g.items[0].value).toBe(3);
    });
    it('保費：一般回饋與加碼活動都列', () => {
      const r = ask('保費刷哪張');
      expect(block(r, 'generals').items.some((x) => x.card.id === 'richart')).toBeTrue();
      expect(block(r, 'offers').groups.some((x) => x.card.id === 'esun-pi')).toBeTrue();
    });
  });

  describe('閒聊與兜底', () => {
    it('你好／說明／謝謝', () => {
      expect(allText(ask('你好'))).toContain('嗨');
      expect(allText(ask('說明'))).toContain('問題類型');
      expect(allText(ask('謝謝'))).toContain('不客氣');
    });
    it('聽不懂時老實說，並給建議問題', () => {
      const r = ask('asdfghjkl');
      expect(allText(r)).toContain('聽不懂');
      expect(r.answer.suggestions.length).toBeGreaterThan(0);
    });
    it('每一筆優惠的商家名稱都問得到', () => {
      const misses = OFFERS.filter(
        (o) => !['offers', 'categories', 'generals'].some((k) => hasBlock(ask(o.merchant), k as QaBlock['kind'])),
      ).map((o) => o.merchant);
      expect(misses).toEqual([]);
    });
  });
});
