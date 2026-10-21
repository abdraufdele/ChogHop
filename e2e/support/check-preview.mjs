// Run against dev-preview.mjs. Covers the manual preview's real handoff button.
import { chromium, expect } from '@playwright/test';
const browser=await chromium.launch({channel:'chrome'});
try {
  for(const width of [1440,320]) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const page=await context.newPage();page.setDefaultTimeout(30000);
    await context.addCookies([
      {name:'sb-127-auth-token',value:'stale-fixture-session',url:'http://127.0.0.1:3000'},
      {name:'unrelated-preview-cookie',value:'retained',url:'http://127.0.0.1:3000'},
    ]);
    await page.addInitScript(()=>{
      if(!localStorage.getItem('preview-check-seeded')) {
        localStorage.setItem('preview-check-seeded','yes');
        localStorage.setItem('choghop.fixture.role','keeper');
        localStorage.setItem('choghop.fixture.bridge','previous-launch');
      }
    });
    await page.goto('http://127.0.0.1:3000/relay?fixture_role=keeper');
    const cookies=await context.cookies();
    expect(cookies.some(cookie=>cookie.value==='stale-fixture-session')).toBe(false);
    expect(cookies.some(cookie=>cookie.name==='unrelated-preview-cookie')).toBe(true);
    await page.getByRole('button',{name:'Sign in to ChogHop'}).click();
    await expect(page.getByLabel('Chog token ID')).toHaveValue('801');
    await page.getByLabel('Chog token ID').fill(String(9300+width));
    await page.getByRole('button',{name:'Verify and select Chog'}).click();
    await page.getByRole('radio',{name:'star',exact:true}).check();
    await page.getByRole('radio',{name:'south',exact:true}).check();
    // A radio retains an explicit keyboard focus ring.
    await page.getByRole('radio',{name:'south',exact:true}).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('radio',{name:'direct',exact:true})).toBeFocused();
    await page.getByRole('button',{name:'Prepare the signal'}).click();
    await expect(page.getByLabel('Prepared mark becomes a signal')).toBeVisible();
    await expect(page.getByLabel('Friend’s wallet address')).toHaveValue('0x1563915e194D8CfBA1943570603F7606A3115508');
    await page.getByRole('button',{name:'Sign one guest move'}).click();
    await expect(page.getByLabel('Share this invitation')).toBeVisible();
    await page.screenshot({path:`test-results/preview-${width}-ticket.png`,fullPage:true});
    const logout=page.waitForResponse(response=>response.url().includes('/auth/v1/logout')&&response.ok());
    await page.getByRole('button',{name:'Pass to test Runner · owner offline'}).click();
    await logout;
    await expect(page.getByLabel('Fixture actor')).toContainText('ACTING AS TEST RUNNER');
    await expect(page.getByText(/Owner offline \(simulated\)/)).toBeVisible();
    await expect(page.getByRole('button',{name:'Sign in to ChogHop'})).toBeVisible();
    await page.getByRole('button',{name:'Sign in to ChogHop'}).click();
    await page.getByRole('button',{name:'Open invitation',exact:true}).click();
    await expect(page.getByRole('region',{name:'Runner transformation clues'})).toBeVisible();
    await page.getByRole('radio',{name:'star',exact:true}).check();
    await page.getByRole('radio',{name:'south',exact:true}).check();
    await page.getByRole('button',{name:'Restore the lantern'}).click();
    await expect(page.getByRole('region',{name:`Passport entry for Chog #${9300+width}`})).toBeVisible();
    await expect(page.locator('.earned-passport .passport-stamp')).toHaveCSS('animation-name','none');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/preview-${width}-passport.png`,fullPage:true});
    console.log(`PASS ${width}px: stale fixture session cleared, unrelated cookie retained, keyboard, Keeper logout, Runner switch, passport, reduced motion, no horizontal clipping.`);
    await context.close();
  }
} finally {await browser.close();}
