import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function pickMark(page: Page, glyph: string, bearing: string) {
  await page.getByRole('radio', { name: glyph.toLowerCase(), exact: true }).check();
  await page.getByRole('radio', { name: bearing.toLowerCase(), exact: true }).check();
}

for (const treatment of ['Direct', 'Reflected']) {
  test(`${treatment}: arrival to sample passport without a wallet`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const start = performance.now();
    await page.goto('/');
    await page.getByRole('button', { name: 'Star chart', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Two chart marks survived');
    const interactionMs = Math.round(performance.now() - start);
    expect(interactionMs).toBeLessThan(30_000);
    await info.attach('first-meaningful-interaction', { body: JSON.stringify({ interactionMs, conditions: 'local production build; automated chart inspection; not a human usability test' }), contentType: 'application/json' });
    if (treatment === 'Direct') await page.screenshot({ path: info.outputPath('arrival.png'), fullPage: true, animations: 'disabled' });
    await pickMark(page, 'Sun', 'North');
    await page.getByRole('button', { name: 'Prepare the signal' }).click();
    await expect(page.locator('.error-message[role="alert"]')).toContainText('doesn’t fit the chart');
    await pickMark(page, 'Star', 'South');
    await page.getByRole('radio', { name: new RegExp(`^${treatment}`) }).check();
    await page.getByRole('button', { name: 'Prepare the signal' }).click();
    await expect(page.getByRole('heading', { name: 'A little light to pass on.' })).toBeFocused();
    await expect(page.getByText('One lantern restoration', { exact: true })).toBeVisible();
    await expect(page.getByText('Simulated handoff. No wallet permission is issued.')).toBeVisible();
    await expect(page.getByText(/WAT · this practice session/)).toBeVisible();
    await page.getByRole('button', { name: 'Take the Runner role' }).click();
    await expect(page.getByRole('heading', { name: 'Follow the signal home.' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Follow the signal home.' })).toBeVisible();
    await pickMark(page, 'Moon', 'East');
    await page.getByRole('button', { name: 'Restore the lantern' }).click();
    await expect(page.locator('.error-message[role="alert"]')).toContainText('light is still quiet');
    await pickMark(page, 'Star', 'South');
    await page.getByRole('button', { name: 'Restore the lantern' }).click();
    await expect(page.getByRole('heading', { name: 'A small shared story.' })).toBeFocused();
    await expect(page.getByText('No live passport entry or NFT history was created.')).toBeVisible();
    await expect(page.locator('.passport-story')).toContainText(`${treatment.toLowerCase()} signal`);
    await expect(page.locator('.observatory')).toHaveClass(/is-lit/);
    await page.screenshot({ path: info.outputPath(`passport-${treatment.toLowerCase()}.png`), fullPage: true, animations: 'disabled' });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'A small shared story.' })).toBeVisible();
    await page.getByRole('button', { name: 'Try the other treatment' }).click();
    await expect(page.getByRole('heading', { name: 'Read the missing mark.' })).toBeVisible();
    await expect(page.getByRole('radio', { name: treatment === 'Direct' ? /^Reflected/ : /^Direct/ })).toBeChecked();
    expect(errors).toEqual([]);
  });
}

test('recovers from a failed request without losing the selected answer', async ({ page }) => {
  await page.goto('/');
  await pickMark(page, 'Star', 'South');
  await page.route('**/api/practice', route => route.request().method() === 'POST' ? route.abort('failed') : route.continue());
  await page.getByRole('button', { name: 'Prepare the signal' }).click();
  await expect(page.locator('.error-message[role="alert"]')).toContainText('Your choices are still here');
  await expect(page.getByRole('radio', { name: 'star', exact: true })).toBeChecked();
  await page.unroute('**/api/practice');
  await page.getByRole('button', { name: 'Prepare the signal' }).click();
  await expect(page.getByRole('heading', { name: 'A little light to pass on.' })).toBeVisible();
});

test('explains expired practice and can start fresh', async ({ page }) => {
  await page.goto('/');
  await pickMark(page, 'Star', 'South');
  await page.route('**/api/practice', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 410, contentType: 'application/json', body: JSON.stringify({ error: 'session_expired' }) }) : route.continue());
  await page.getByRole('button', { name: 'Prepare the signal' }).click();
  await expect(page.locator('.error-message[role="alert"]')).toContainText('session has ended');
  await page.unroute('**/api/practice');
  await page.getByRole('button', { name: 'Start fresh practice' }).click();
  await expect(page.getByText('A fresh practice. The sea is waiting.')).toBeVisible();
  await pickMark(page, 'Star', 'South');
  await page.getByRole('button', { name: 'Prepare the signal' }).click();
  await expect(page.getByRole('heading', { name: 'A little light to pass on.' })).toBeVisible();
});

test('recovers when the initial practice session cannot be opened', async ({ page }) => {
  await page.route('**/api/practice', route => route.abort('failed'));
  await page.goto('/');
  await expect(page.locator('.error-message[role="alert"]')).toContainText('couldn’t be reached');
  await page.unroute('**/api/practice');
  await page.getByRole('button', { name: 'Reload practice' }).click();
  await pickMark(page, 'Star', 'South');
  await page.getByRole('button', { name: 'Prepare the signal' }).click();
  await expect(page.getByRole('heading', { name: 'A little light to pass on.' })).toBeVisible();
});

test('supports keyboard radio controls, narrow screens and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const sun = page.getByRole('radio', { name: 'sun', exact: true });
  await expect(sun).toBeEnabled();
  const tray = await page.locator('.action-tray').boundingBox();
  const treatment = await page.locator('.treatment-picker').boundingBox();
  expect(tray && treatment && tray.y >= treatment.y + treatment.height).toBe(true);
  await sun.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'star', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: 'north', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Prepare the signal' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'A little light to pass on.' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('.signal-transformation').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

test('API rejects forged completion, oversized bodies, foreign origins and session replay', async ({ request }) => {
  const initial = await request.get('/api/practice');
  const cookie = initial.headers()['set-cookie']!;
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('Path=/api/practice');
  const forged = await request.post('/api/practice', { data: { revision: 0, action: { type: 'complete', completed: true } } });
  expect(forged.status()).toBe(422);
  const crossOrigin = await request.post('/api/practice', { headers: { Origin: 'https://elsewhere.example' }, data: {} });
  expect(crossOrigin.status()).toBe(403);
  const oversized = await request.post('/api/practice', { data: { huge: 'x'.repeat(2200) } });
  expect(oversized.status()).toBe(413);
  const payload = { revision: 0, action: { type: 'prepare', mark: { glyph: 'star', bearing: 'south' }, treatment: 'direct' } };
  const prepared = await request.post('/api/practice', { headers: { Origin: 'http://127.0.0.1:3000' }, data: payload });
  expect(prepared.status()).toBe(200);
  const replayed = await request.post('/api/practice', { data: payload });
  expect(replayed.status()).toBe(409);
  expect((await replayed.json()).snapshot.stage).toBe('handoff');
});
