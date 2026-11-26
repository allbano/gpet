import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GatewayHealthService, ReadinessStatus } from '../../core/http/gateway-health.service';

@Component({
  selector: 'app-portal-home',
  imports: [RouterLink],
  templateUrl: './portal-home.html',
  styleUrl: './portal-home.css',
})
export class PortalHome implements OnInit {
  protected readonly health = inject(GatewayHealthService);

  ngOnInit(): void {
    void this.health.verificarTodos();
  }

  protected rotuloStatus(status: ReadinessStatus): string {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Indisponível';
      case 'checking':
        return 'Verificando...';
    }
  }

  protected classesStatus(status: ReadinessStatus): string {
    switch (status) {
      case 'online':
        return 'border-emerald-200 bg-emerald-50 text-emerald-900';
      case 'offline':
        return 'border-red-200 bg-red-50 text-red-900';
      case 'checking':
        return 'border-slate-200 bg-slate-100 text-slate-700';
    }
  }
}
