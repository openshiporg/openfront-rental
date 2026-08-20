'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export async function getHostReport({ startDate, endDate }: { startDate: string; endDate: string }) {
  const hosts = await keystoneClient<any>(`query ReportHosts { hostOrganizations(orderBy: [{ name: asc }], take: 20) { id name } }`);
  const host = hosts.success ? hosts.data.hostOrganizations?.[0] : null;
  if (!host) return { host: null, report: null, error: hosts.success ? 'No accessible host organization.' : hosts.error };
  const response = await keystoneClient<any>(`
    query HostOperationsReport($hostOrganizationId: ID!, $startDate: String!, $endDate: String!) {
      hostOperationsReport(hostOrganizationId: $hostOrganizationId, startDate: $startDate, endDate: $endDate)
    }
  `, { hostOrganizationId: host.id, startDate, endDate });
  return { host, report: response.success ? response.data.hostOperationsReport : null, error: response.success ? null : response.error };
}
