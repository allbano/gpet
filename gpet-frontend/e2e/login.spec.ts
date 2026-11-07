import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('menu público sem acesso administrativo e login apenas no endereço dedicado', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Administração', exact: true })).toHaveCount(0);
  await expect(
    page.locator('a[href^="/admin"], a[href^="/gpet-admin"], a[href="/login"]'),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Administração', exact: true })).toHaveCount(0);
  await expect(
    page.locator('a[href^="/admin"], a[href^="/gpet-admin"], a[href="/login"]'),
  ).toHaveCount(0);

  await page.goto('/login');
  await expect(
    page.getByRole('heading', { name: 'Página não encontrada', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveCount(0);

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/gpet-admin\/login$/);
  await expect(page.getByLabel('Usuário', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
});

test('login responsivo, acessível e navegação de volta à Home', async ({ page }, testInfo) => {
  const errosCsp: string[] = [];
  page.on('console', (mensagem) => {
    if (mensagem.type() === 'error' && /Content Security Policy/i.test(mensagem.text())) {
      errosCsp.push(mensagem.text());
    }
  });
  for (const viewport of [
    { width: 1029, height: 585 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/gpet-admin/login');
    const logo = page.getByRole('img', {
      name: 'GPET — Educação e Tecnologia, Pessoas e Protagonismos',
    });
    await expect(logo).toBeVisible();
    await expect(logo).toHaveJSProperty('naturalWidth', 4501);
    await expect(page.getByRole('button', { name: 'Logar', exact: true })).toBeDisabled();
    for (const campo of [
      page.getByLabel('Usuário', { exact: true }),
      page.getByLabel('Senha', { exact: true }),
    ]) {
      await expect(campo).toHaveCSS('border-top-style', 'solid');
      await expect(campo).toHaveCSS('border-top-width', '2px');
      await expect(campo).toHaveCSS('padding-top', '12px');
      await expect(campo).toHaveCSS('font-size', '16px');
      const caixa = await campo.boundingBox();
      const formulario = await page.locator('form').boundingBox();
      expect(caixa!.width).toBeCloseTo(formulario!.width, 0);
      expect(caixa!.height).toBeGreaterThanOrEqual(48);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(resultado.violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`login-${viewport.width}.png`),
      fullPage: true,
    });
  }

  await page.getByLabel('Usuário', { exact: true }).fill('pessoa fictícia');
  await page.getByLabel('Senha', { exact: true }).fill('senha fictícia');
  await page.getByLabel('Usuário', { exact: true }).focus();
  await expect(page.getByLabel('Usuário', { exact: true })).toHaveCSS('outline-style', 'solid');
  await expect(page.getByLabel('Usuário', { exact: true })).toHaveCSS('outline-width', '3px');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Senha', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Voltar', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Logar', exact: true })).toBeFocused();
  await page.getByRole('link', { name: 'Voltar', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(errosCsp).toEqual([]);
});

test('login mantém os campos e anuncia erro de autenticação com resposta mock', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      status: 401,
      json: { codigo: 'credenciais_invalidas', mensagem: 'Usuário ou senha inválidos.' },
    }),
  );
  await page.goto('/gpet-admin/login');
  await page.getByLabel('Usuário', { exact: true }).fill('pessoa fictícia');
  await page.getByLabel('Senha', { exact: true }).fill('senha incorreta fictícia');
  await page.getByRole('button', { name: 'Logar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Usuário ou senha inválidos.');
  await expect(page.getByLabel('Usuário', { exact: true })).toHaveValue('pessoa fictícia');
  await expect(page.getByRole('button', { name: 'Logar', exact: true })).toBeEnabled();
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(resultado.violations).toEqual([]);
});
