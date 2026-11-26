import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationStore } from '../../../core/notifications/notification.store';
import { NotificationToast } from './notification-toast';

describe('NotificationToast', () => {
  let fixture: ComponentFixture<NotificationToast>;
  let store: NotificationStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationToast],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationToast);
    store = TestBed.inject(NotificationStore);
  });

  it('deve renderizar notificações da store e permitir fechá-las', async () => {
    store.success('Atividade salva com sucesso.');
    await fixture.whenStable();

    const container = fixture.nativeElement.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(container.textContent).toContain('Atividade salva com sucesso.');

    const closeBtn = fixture.nativeElement.querySelector('button[aria-label]') as HTMLButtonElement;
    closeBtn.click();
    await fixture.whenStable();

    expect(store.notifications().length).toBe(0);
  });
});
