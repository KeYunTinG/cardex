import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QaChat } from './qa-chat';

/** 引擎回覆前有 220ms 的「輸入中」延遲，測試等它過去 */
const answered = async (fixture: ComponentFixture<QaChat>) => {
  await new Promise((r) => setTimeout(r, 400));
  await fixture.whenStable();
};

const askInUi = async (fixture: ComponentFixture<QaChat>, q: string) => {
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector<HTMLInputElement>('input.ask')!;
  input.value = q;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
  el.querySelector<HTMLFormElement>('form.composer')!.requestSubmit();
  await fixture.whenStable();
};

describe('QaChat', () => {
  let fixture: ComponentFixture<QaChat>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QaChat],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(QaChat);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('開場就有歡迎訊息與建議問題', () => {
    expect(el.querySelector('.msg.bot .t')?.textContent).toContain('Cardex 問答機器人');
    expect(el.querySelectorAll('.chip').length).toBeGreaterThan(0);
  });

  it('送出問題後顯示使用者訊息、依卡分組的答案與皇冠', async () => {
    await askInUi(fixture, '麥當勞刷哪張卡');
    expect(el.querySelector('.msg.user .bubble')?.textContent).toContain('麥當勞刷哪張卡');
    expect(el.querySelector('.typing')).not.toBeNull();

    await answered(fixture);
    expect(el.querySelector('.typing')).toBeNull();
    const groups = el.querySelectorAll('.group');
    expect(groups.length).toBe(3);
    expect(groups[0].classList).toContain('top');
    expect(groups[0].querySelector('.g-name')?.textContent).toContain('星展');
    expect(el.querySelector('.t.crown')?.textContent).toContain('最划算');
  });

  it('點建議問題會接著問，且沿用脈絡', async () => {
    await askInUi(fixture, '麥當勞刷哪張卡');
    await answered(fixture);
    const chip = [...el.querySelectorAll<HTMLButtonElement>('.chip')].find((c) => c.textContent?.includes('上限與條件'))!;
    chip.click();
    await answered(fixture);
    const bots = el.querySelectorAll('.msg.bot .bubble');
    expect(bots[bots.length - 1].textContent).toContain('500 點');
  });

  it('「到快速查詢看」會發出 searchRequested', async () => {
    let got = '';
    fixture.componentInstance.searchRequested.subscribe((q) => (got = q));
    await askInUi(fixture, 'Netflix 用哪張最划算');
    await answered(fixture);
    el.querySelector<HTMLButtonElement>('.link')!.click();
    expect(got).toBe('Netflix');
  });

  it('清除對話後回到開場', async () => {
    await askInUi(fixture, '有哪些卡');
    await answered(fixture);
    expect(el.querySelectorAll('.msg').length).toBeGreaterThan(1);
    el.querySelector<HTMLButtonElement>('.chat-reset')!.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('.msg').length).toBe(1);
  });
});
