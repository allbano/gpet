import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoDir } from '../../scripts/env.cjs';

const senhaInicial = () => {
  const arquivo = process.env['GPET_E2E_PASSWORD_FILE'];
  if (!arquivo)
    throw new Error('Defina GPET_E2E_PASSWORD_FILE apontando ao secret da conta de teste.');
  return readFileSync(resolve(repoDir, arquivo), 'utf8').trimEnd();
};
async function entrar(page: Page, login: string, senha: string) {
  await page.goto('/gpet-admin/login');
  await page.getByLabel('Usuário', { exact: true }).fill(login);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Logar', exact: true }).click();
}
async function acessivel(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(resultado.violations).toEqual([]);
}

test('navegação pública, fallback SPA, API JSON e acessibilidade', async ({ page, request }) => {
  for (const rota of [
    '/',
    '/ensino',
    '/ensino/cursos',
    '/ensino/materiais',
    '/pesquisa',
    '/pesquisa/projetos',
    '/pesquisa/linhas',
    '/extensao',
    '/extensao/projetos',
    '/extensao/eventos',
    '/producao',
    '/producao/publicacoes',
    '/producao/produtos',
    '/contato',
    '/biblioteca',
    '/nao-existe',
    '/gpet-admin/login',
  ]) {
    await page.goto(rota);
    await expect(page.locator('h1')).toBeVisible();
    await acessivel(page);
  }
  await page.goto('/');
  const submenu = page.getByRole('button', { name: 'Abrir submenu de Ensino', exact: true });
  await submenu.focus();
  await submenu.press('ArrowDown');
  await expect(page.getByRole('link', { name: 'Cursos', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(submenu).toBeFocused();
  await expect(submenu).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Ensino', exact: true })).toBeVisible();
  await acessivel(page);
  const api = await request.get('/api/v1/public/ausente');
  expect(api.status()).toBe(404);
  expect(api.headers()['content-type']).toContain('application/json');
  expect(await api.text()).not.toContain('<html');
  const admin = await request.get('/api/v1/admin/usuarios');
  expect(admin.status()).toBe(401);
});

test('bootstrap, troca obrigatória, usuário, catálogos, atividade e leitura pública', async ({
  page,
  browser,
}) => {
  const id = Date.now().toString(36);
  const senha = 'senha de teste ficticia ' + id;
  const senhaAdmin = 'SenhaAdmin8-' + id;
  const login = 'e2e-' + id;
  await entrar(page, 'admin', senhaInicial());
  await expect(page).toHaveURL(/\/(trocar-senha|admin\/atividades)$/);
  if (
    page.url().endsWith('/trocar-senha') ||
    (await page.getByRole('heading', { name: 'Trocar senha', exact: true }).isVisible())
  ) {
    await page.getByLabel('Senha atual', { exact: true }).fill(senhaInicial());
    await page.getByLabel('Nova senha', { exact: true }).fill(senhaAdmin);
    await page.getByLabel('Confirme a nova senha').fill(senhaAdmin);
    await acessivel(page);
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();
    await expect(page).toHaveURL(/\/gpet-admin\/login$/);
    await entrar(page, 'admin', senhaAdmin);
  }
  await expect(page).toHaveURL(/\/admin\/atividades$/);
  await acessivel(page);
  await page.getByRole('link', { name: 'Usuários', exact: true }).click();
  await page.getByRole('button', { name: 'Novo usuário' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Pessoa E2E ' + id);
  await page.getByLabel('Login', { exact: true }).fill(login);
  await page.getByLabel('Senha temporária (8 a 64 caracteres)', { exact: true }).fill(senha);
  await acessivel(page);
  await page.getByRole('button', { name: 'Salvar usuário' }).click();
  await expect(page.getByRole('status')).toContainText('Usuário salvo');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await entrar(page, login, senha);
  await expect(page).toHaveURL(/\/trocar-senha$/);
  const definitiva = 'Abc12345';
  await page.getByLabel('Senha atual', { exact: true }).fill(senha);
  await page.getByLabel('Nova senha', { exact: true }).fill(definitiva);
  await page.getByLabel('Confirme a nova senha').fill(definitiva);
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page).toHaveURL(/\/gpet-admin\/login$/);
  await entrar(page, login, definitiva);
  await expect(page).toHaveURL(/\/admin\/atividades$/);
  // Todas as contas possuem as mesmas permissões administrativas.
  await page.getByRole('link', { name: 'Usuários', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Novo usuário' })).toBeVisible();
  await page.getByRole('link', { name: 'Categorias', exact: true }).click();
  await page.getByRole('button', { name: 'Novo cadastro' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Categoria E2E ' + id);
  await page.getByLabel('Natureza', { exact: true }).selectOption('formativa');
  await page.getByLabel('Descrição', { exact: true }).fill('Categoria fictícia de formação.');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cadastro salvo');
  await page.getByRole('link', { name: 'Formatos', exact: true }).click();
  await page.getByRole('button', { name: 'Novo cadastro' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Formato E2E ' + id);
  await page.getByLabel('Descrição', { exact: true }).fill('Formato fictício.');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cadastro salvo');
  await page.getByRole('link', { name: 'Atividades', exact: true }).click();
  await page.getByRole('button', { name: 'Nova atividade', exact: true }).click();
  await page.getByLabel('Natureza', { exact: true }).selectOption('formativa');
  await page.getByLabel('Título', { exact: true }).fill('Curso E2E ' + id);
  await page
    .getByLabel('Categoria', { exact: true })
    .selectOption({ label: 'Categoria E2E ' + id });
  await page.getByLabel('Formato', { exact: true }).selectOption({ label: 'Formato E2E ' + id });
  await page.getByLabel('Carga horária', { exact: true }).fill('20 horas e estudo livre');
  await page.getByLabel('Público-alvo', { exact: true }).fill('Docentes fictícios');
  await page.getByLabel('Data de início').fill('2026-11-01');
  await page.getByLabel('Data de fim').fill('2026-11-02');
  await page
    .getByLabel('Descrição', { exact: true })
    .fill('Atividade fictícia para validar o fluxo completo.');
  await acessivel(page);
  await page.getByRole('button', { name: 'Salvar atividade' }).click();
  await expect(page.getByRole('status')).toContainText('Atividade salva');
  const visitante = await browser.newContext({ baseURL: new URL(page.url()).origin });
  const publico = await visitante.newPage();
  await publico.goto('/ensino');
  await publico.getByLabel('Título', { exact: true }).fill('Curso E2E ' + id);
  await publico.getByRole('button', { name: 'Aplicar filtros' }).click();
  await publico.getByRole('link', { name: 'Curso E2E ' + id, exact: true }).click();
  await expect(publico.locator('h1')).toHaveText('Curso E2E ' + id);
  await expect(publico.getByText('20 horas e estudo livre', { exact: true })).toBeVisible();
  await acessivel(publico);
  const urlPublica = publico.url();
  await page.getByRole('button', { name: 'Editar Curso E2E ' + id, exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Curso atualizado E2E ' + id);
  await page.getByRole('button', { name: 'Salvar atividade' }).click();
  await expect(page.getByRole('status')).toContainText('Atividade salva');
  await publico.reload();
  await expect(publico.locator('h1')).toHaveText('Curso atualizado E2E ' + id);
  await page
    .getByRole('button', { name: 'Excluir Curso atualizado E2E ' + id, exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(page.getByRole('status')).toContainText('Atividade excluída');
  const excluida = await publico.request.get(
    urlPublica.replace('/ensino/atividades/', '/api/v1/public/atividades/'),
  );
  expect(excluida.status()).toBe(404);
  await visitante.close();
});
