import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  try {
    const sessao = await auth.carregar();
    if (!sessao) return router.createUrlTree(['/gpet-admin/login']);
    if (sessao.usuario.trocarSenha) return router.createUrlTree(['/trocar-senha']);
    return true;
  } catch {
    return router.createUrlTree(['/gpet-admin/login'], { queryParams: { erro: 'conexao' } });
  }
};
export const senhaGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  try {
    return (await auth.carregar()) ? true : router.createUrlTree(['/gpet-admin/login']);
  } catch {
    return router.createUrlTree(['/gpet-admin/login'], { queryParams: { erro: 'conexao' } });
  }
};
