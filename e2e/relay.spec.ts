import { test,expect,type Page } from '@playwright/test';
import { privateKeyToAccount } from 'viem/accounts';
import { hexToString,type Hex } from 'viem';

async function wallet(page:Page,key:Hex) {
  const account=privateKeyToAccount(key);
  await page.exposeFunction('fixtureWalletRequest',async(method:string,params:unknown[])=>{
    if(method==='eth_requestAccounts'||method==='eth_accounts')return [account.address];
    if(method==='eth_chainId')return '0x279f';
    if(method==='wallet_switchEthereumChain'||method==='wallet_addEthereumChain')return null;
    if(method==='personal_sign')return account.signMessage({message:hexToString(params[0] as Hex)});
    if(method==='eth_signTypedData_v4'){
      const data=JSON.parse(params[1] as string);delete data.types.EIP712Domain;
      return account.signTypedData(data);
    }
    throw new Error(`Unsupported test wallet method ${method}`);
  });
  await page.addInitScript(()=>{
    const browser=window as unknown as {ethereum:unknown;fixtureWalletRequest:(method:string,params:unknown[])=>Promise<unknown>};
    browser.ethereum={isMetaMask:true,on:()=>{},removeListener:()=>{},request:({method,params=[]}:{method:string;params:unknown[]})=>browser.fixtureWalletRequest(method,params)};
  });
}
async function signIn(page:Page) {
  await page.getByRole('button',{name:/Connect/}).click();
  await page.getByRole('button',{name:'Sign in to ChogHop'}).click();
  await expect(page.getByRole('button',{name:'Sign out'})).toBeVisible();
}
test('live API rejects cross-origin, unauthenticated and oversized requests',async({request})=>{
  test.skip(process.env.CHOGHOP_E2E_STORAGE==='supabase','Uses the isolated local application origin');
  const badOrigin=await request.post('/api/relay',{headers:{Origin:'https://unrelated.example'},data:{operation:'start',tokenId:'801'}});
  expect(badOrigin.status()).toBe(403);
  const noSession=await request.post('/api/relay',{headers:{Origin:'http://127.0.0.1:3000'},data:{operation:'start',tokenId:'801'}});
  expect(noSession.status()).toBe(401);
  const oversized=await request.post('/api/relay',{headers:{Origin:'http://127.0.0.1:3000'},data:{operation:'start',padding:'x'.repeat(4097)}});
  expect(oversized.status()).toBe(413);
});
test('isolated fixture wallets complete the owner-offline handoff through real API and PostgreSQL',async({page,browser},info)=>{
  test.skip(process.env.CHOGHOP_E2E_STORAGE==='supabase','Requires genuine holder accounts for hosted gate');
  await wallet(page,`0x${'11'.repeat(32)}`);
  await page.goto('/relay');
  await signIn(page);
  await page.getByLabel('Chog token ID').fill(info.project.name==='mobile'?'802':'801');
  await page.getByRole('button',{name:'Verify and select Chog'}).click();
  await expect(page.getByRole('heading',{name:'Complete the chart.'})).toBeVisible();
  await page.getByRole('radio',{name:'star',exact:true}).check();
  await page.getByRole('radio',{name:'south',exact:true}).check();
  await page.getByRole('radio',{name:'reflected',exact:true}).check();
  await page.getByRole('button',{name:'Prepare the signal'}).click();
  await page.reload();
  await page.getByRole('button',{name:'Resume saved run'}).click();
  await expect(page.getByRole('heading',{name:'Your signal is ready.'})).toBeVisible();
  await page.getByLabel('Friend’s wallet address').fill(privateKeyToAccount(`0x${'22'.repeat(32)}`).address);
  await page.getByRole('button',{name:'Sign one guest move'}).click();
  const invitation=page.getByLabel('Share this invitation');
  await expect(invitation).toBeVisible();
  const url=await invitation.inputValue();
  await page.reload();
  await page.getByRole('button',{name:'Resume saved run'}).click();
  await expect(page.getByRole('button',{name:'Revoke invitation'})).toBeVisible();
  await expect(page.getByLabel('Share this invitation')).toHaveValue(url);
  await page.getByRole('button',{name:'Sign out'}).click();
  // A fresh browser context and separate authenticated wallet; owner signs out first.
  const mobile=info.project.name==='mobile';
  const context=await browser.newContext({viewport:mobile?{width:320,height:760}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
  const friend=await context.newPage();await wallet(friend,`0x${'22'.repeat(32)}`);
  await friend.goto(url);await signIn(friend);
  await friend.getByRole('button',{name:'Open invitation',exact:true}).click();
  await expect(friend.getByText('Status: active')).toBeVisible();
  expect(await friend.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(mobile)await friend.screenshot({path:info.outputPath('mobile-runner.png'),fullPage:true});
  await friend.getByRole('radio',{name:'sun',exact:true}).check();
  await friend.getByRole('radio',{name:'north',exact:true}).check();
  await friend.getByRole('button',{name:'Restore the lantern'}).click();
  await expect(friend.getByRole('alert').filter({hasText:'Compare your glyph and arrow'})).toBeVisible();
  await friend.getByRole('radio',{name:'star',exact:true}).check();
  await friend.getByRole('radio',{name:'south',exact:true}).check();
  await friend.getByRole('button',{name:'Restore the lantern'}).click();
  await expect(friend.getByRole('heading',{name:'The coast has its light.'})).toBeVisible();
  await expect(friend.getByText('Status: redeemed')).toBeVisible();
  expect(await friend.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await context.close();
});
