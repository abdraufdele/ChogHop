import { Relay } from '../../components/relay';
import { collectionConfig } from '../../chain/config';
export const dynamic='force-dynamic';
export default function RelayPage() {
  const {NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:publishableKey}=process.env;
  let config=null;
  try {config=collectionConfig();} catch { /* Configuration failures stay closed. */ }
  const test=process.env.CHOGHOP_ENVIRONMENT==='test'&&Boolean(config&&new URL(config.rpc).hostname==='127.0.0.1');
  return <Relay settings={{chainId:config?.chainId??10143,collection:config?.collection??'',
    supabaseUrl:process.env.SUPABASE_URL??'',publishableKey:publishableKey??'',
    configured:Boolean(config&&publishableKey&&process.env.SUPABASE_SERVICE_ROLE_KEY),test,
    fixtureWallet:process.env.NODE_ENV==='development'&&test&&process.env.CHOGHOP_FIXTURE_PREVIEW==='1'}}/>;
}
