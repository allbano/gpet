import { Component, inject } from '@angular/core';
import { NotificationStore, NotificationType } from '../../../core/notifications/notification.store';

@Component({
  selector: 'app-notification-toast',
  templateUrl: './notification-toast.html',
  styleUrl: './notification-toast.css',
})
export class NotificationToast {
  protected readonly store = inject(NotificationStore);

  protected classesParaTipo(tipo: NotificationType): string {
    switch (tipo) {
      case 'success':
        return 'border-emerald-300 bg-emerald-50 text-emerald-950';
      case 'error':
        return 'border-red-300 bg-red-50 text-red-950';
      case 'info':
        return 'border-sky-300 bg-sky-50 text-sky-950';
    }
  }

  protected rotuloTipo(tipo: NotificationType): string {
    switch (tipo) {
      case 'success':
        return 'Sucesso';
      case 'error':
        return 'Erro';
      case 'info':
        return 'Aviso';
    }
  }
}
