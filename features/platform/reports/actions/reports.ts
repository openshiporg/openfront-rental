'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { validateReportRange } from '../lib/reportRange';

/** Hosts the operator may run reports for: identity only, without property access. */
export async function getReportHosts(search = '') {
  const response = await keystoneClient<any>(`query ReportHosts($search: String) { permittedHostOrganizations(permission: "canReadReports", search: $search) }`, { search: search.trim().slice(0, 120) || null });
  if (!response.success) return { hosts: [] as Array<{ id: string; name: string }>, hasMore: false, error: 'Report access couldn’t be checked. Try again in a moment.' };
  const result = response.data.permittedHostOrganizations || {};
  return { hosts: (Array.isArray(result.hosts) ? result.hosts : []) as Array<{ id: string; name: string }>, hasMore: result.hasMore === true, error: null };
}

export async function getHostReport({ hostOrganizationId, startDate, endDate }: { hostOrganizationId: string; startDate: string; endDate: string }) {
  const rangeError = validateReportRange(startDate, endDate);
  if (rangeError) return { report: null, error: rangeError };
  const response = await keystoneClient<any>(`
    query HostOperationsReport($hostOrganizationId: ID!, $startDate: String!, $endDate: String!) {
      hostOperationsReport(hostOrganizationId: $hostOrganizationId, startDate: $startDate, endDate: $endDate)
    }
  `, { hostOrganizationId, startDate, endDate });
  if (response.success) return { report: response.data.hostOperationsReport, error: null };
  const first = Array.isArray(response.errors) ? response.errors[0] : null;
  const code = String(first?.extensions?.code || '');
  if (['BAD_USER_INPUT', 'FORBIDDEN'].includes(code) && typeof first?.message === 'string' && first.message.length <= 300) return { report: null, error: first.message };
  return { report: null, error: 'The report couldn’t be generated. Try again in a moment.' };
}
