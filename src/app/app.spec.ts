import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';

const search = async (fixture: ComponentFixture<App>, q: string) => {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input.search')!;
  input.value = q;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
};

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let el: HTMLElement;

  beforeEach(async () => {
    try {
      localStorage.removeItem('cardex.owned');
      localStorage.removeItem('cardex.onlyMine');
    } catch {}
    // App 會把查詢詞寫進網址 ?q=，清掉以免影響下一個測試
    history.replaceState(null, '', location.pathname);
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('should create the app', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('首頁有標題、情境捷徑與七張卡的卡夾', () => {
    expect(el.querySelector('h1')?.textContent).toContain('刷哪張');
    expect(el.querySelectorAll('.scene').length).toBe(4);
    expect(el.querySelectorAll('.wcard').length).toBe(7);
  });

  it('查「麥當勞」：星展最划算，賴點、台新依序排在後面', async () => {
    await search(fixture, '麥當勞');
    expect(el.querySelector('.verdict .v-name')?.textContent).toContain('星展');
    const names = [...el.querySelectorAll('.rank .r-name')].map((n) => n.textContent?.trim());
    expect(names).toEqual(['聯邦賴點卡', '台新 Richart 卡']);
    expect(el.querySelector('.others summary')?.textContent).toContain('其他 4 張');
  });

  it('取消勾選條件後，該卡移出排名', async () => {
    await search(fixture, '麥當勞');
    const dbs = [...el.querySelectorAll<HTMLLabelElement>('.check')].find((c) => c.textContent?.includes('星展'))!;
    dbs.querySelector('input')!.click();
    await fixture.whenStable();
    expect(el.querySelector('.verdict .v-name')?.textContent).toContain('賴點');
    expect(el.querySelector('.excluded')?.textContent).toContain('星展');
  });

  it('「只看我的卡」只排卡夾裡的卡', async () => {
    const dbs = [...el.querySelectorAll<HTMLElement>('.wcard')].find((c) => c.textContent?.includes('星展'))!;
    dbs.querySelector<HTMLInputElement>('input')!.click();
    await search(fixture, '麥當勞');
    const mine = [...el.querySelectorAll<HTMLButtonElement>('.seg button')].find((b) => b.textContent?.includes('只看我的卡'))!;
    mine.click();
    await fixture.whenStable();
    expect(el.querySelector('.verdict .v-name')?.textContent).toContain('賴點');
  });

  it('查不到時可以改問機器人', async () => {
    await search(fixture, '完全不存在的店');
    expect(el.querySelector('.none-title')?.textContent).toContain('查無');
    expect(el.querySelector('.ask-bot')).not.toBeNull();
  });
});
