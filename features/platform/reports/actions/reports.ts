'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { validateReportRange } from '../lib/reportRange';

export async function getHostReport({ startDate, endDate }: { startDate: string; endDate: string }) {
  const rangeError = validateReportRange(startDate, endDate);
  if (rangeError) return { host: null, report: null, error: rangeError };
  const hosts = await keystoneClient<any>(`query ReportHosts { hostOrganizations(orderBy: [{ name: asc }], take: 20) { id name } }`);
  const host = hosts.success ? hosts.data.hostOrganizations?.[0] : null;
  if (!host) return { host: null, report: null, error: hosts.success ? 'No accessible host organization.' : 'Report authorization could not be verified.' };
  const response = await keystoneClient<any>(`
    query HostOperationsReport($hostOrganizationId: ID!, $startDate: String!, $endDate: String!) {
      hostOperationsReport(hostOrganizationId: $hostOrganizationId, startDate: $startDate, endDate: $endDate)
    }
  `, { hostOrganizationId: host.id, startDate, endDate });
  return { host, report: response.success ? response.data.hostOperationsReport : null, error: response.success ? null : 'The report could not be generated for that date range.' };
}
