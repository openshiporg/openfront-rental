export const unavailableWorkspaceRecordMessage = 'This record is unavailable or outside your host scope.';

export function workspaceDetailFailureMessage(record: unknown, _transportError?: string | null) {
  return record ? null : unavailableWorkspaceRecordMessage;
}
