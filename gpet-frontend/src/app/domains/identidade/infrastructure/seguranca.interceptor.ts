import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessaoStore } from '../application/sessao-store';

export const segurancaInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);
  const sessao = inject(SessaoStore).sessao();
  const headers: Record<string, string> = {};
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    headers['X-GPET-Request'] = '1';
    if (sessao) headers['X-CSRF-Token'] = sessao.csrfToken;
  }
  return next(request.clone({ setHeaders: headers }));
};
