import { Relay } from '../../components/relay';
import { collectionConfig } from '../../chain/config';
export const dynamic='force-dynamic';
export default function RelayPage() {
  let config=null;
  try {config=collectionConfig();} catch { /* Configuration failures stay closed. */ }
  return <Relay settings={{chainId:config?.chainId??10143,collection:config?.collection??'',
    supabaseUrl:process.env.SUPABASE_URL??'',publishableKey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??'',
    configured:Boolean(config&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY&&process.env.SUPABASE_SERVICE_ROLE_KEY),test:process.env.CHOGHOP_ENVIRONMENT==='test'&&Boolean(config&&new URL(config.rpc).hostname==='127.0.0.1')}}/>;
}
