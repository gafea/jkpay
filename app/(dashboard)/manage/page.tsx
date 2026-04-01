import { ensureOwnerAccess } from '@/lib/access';
import { fetchServerApi } from '@/lib/server-api';
import type { ApiManageResponse } from '@/lib/api-types';
import { ManageGrid } from './manage-grid';

export default async function ManagePage() {
  await ensureOwnerAccess();
  const data = await fetchServerApi<ApiManageResponse>('/api/manage');

  return <ManageGrid {...data} />;
}
