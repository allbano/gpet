import { Service, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface AppNotification {
  readonly id: number;
  readonly tipo: NotificationType;
  readonly mensagem: string;
}

@Service()
export class NotificationStore {
  private nextId = 1;
  private readonly itemsSignal = signal<readonly AppNotification[]>([]);

  readonly notifications = this.itemsSignal.asReadonly();

  success(mensagem: string): number {
    return this.add('success', mensagem);
  }

  error(mensagem: string): number {
    return this.add('error', mensagem);
  }

  info(mensagem: string): number {
    return this.add('info', mensagem);
  }

  dismiss(id: number): void {
    this.itemsSignal.update((items) => items.filter((item) => item.id !== id));
  }

  clear(): void {
    this.itemsSignal.set([]);
  }

  private add(tipo: NotificationType, mensagem: string): number {
    const id = this.nextId++;
    this.itemsSignal.update((items) => [...items, { id, tipo, mensagem }]);
    return id;
  }
}
