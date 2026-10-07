'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

const TASKS_PATH = '/dashboard/platform/tasks';
const taskErrorPath = (message: string) => `${TASKS_PATH}?error=${encodeURIComponent(message)}`;

export async function getOperationsTasks() {
  const response = await keystoneClient<any>(`
    query OperationsTasks {
      propertyTasks(orderBy: [{ dueAt: asc }], take: 250) {
        id title taskType status priority dueAt source completionNotes
        property { id name hostOrganization { id } }
        listing { id title }
        reservation { id confirmationCode guest { name } }
        assignee { id name }
      }
      properties(where: { status: { equals: "active" } }, orderBy: [{ name: asc }], take: 100) {
        id name hostOrganization { id }
        listings(orderBy: [{ title: asc }], take: 20) { id title }
      }
      users(where: { hostMemberships: { some: { status: { equals: "active" } } } }, orderBy: [{ name: asc }], take: 100) { id name }
    }
  `);
  if (!response.success) return { tasks: [], properties: [], users: [], error: 'Task data is temporarily unavailable.' };
  return { tasks: response.data.propertyTasks || [], properties: response.data.properties || [], users: response.data.users || [], error: null };
}

export async function createOperationsTask(formData: FormData): Promise<void> {
  const response = await keystoneClient<any>(`
    mutation CreatePropertyTask($propertyId: ID!, $listingId: ID, $assigneeId: ID, $title: String!, $taskType: String!, $priority: String, $dueAt: String, $notes: String) {
      createOperationsTask(propertyId: $propertyId, listingId: $listingId, assigneeId: $assigneeId, title: $title, taskType: $taskType, priority: $priority, dueAt: $dueAt, notes: $notes)
    }
  `, {
    propertyId: String(formData.get('propertyId') || ''),
    listingId: String(formData.get('listingId') || '') || null,
    assigneeId: String(formData.get('assigneeId') || '') || null,
    title: String(formData.get('title') || ''),
    taskType: String(formData.get('taskType') || 'turnover_cleaning'),
    priority: String(formData.get('priority') || 'normal'),
    dueAt: String(formData.get('dueAt') || '') || null,
    notes: String(formData.get('notes') || ''),
  });
  if (!response.success) redirect(taskErrorPath('The task could not be created. Review the selected property, listing, and assignee.'));
  revalidatePath(TASKS_PATH);
}

export async function transitionOperationsTask(formData: FormData): Promise<void> {
  const action = String(formData.get('action') || '');
  const evidence = action === 'complete' && formData.get('checklistConfirmed') === 'on' ? { checklistConfirmed: true } : null;
  if (action === 'complete' && !evidence) {
    redirect(taskErrorPath('Task completion requires confirmed checklist evidence.'));
  }
  const response = await keystoneClient<any>(`
    mutation TransitionPropertyTask($taskId: ID!, $action: String!, $assigneeId: ID, $completionNotes: String, $completionEvidence: JSON) {
      transitionPropertyTask(taskId: $taskId, action: $action, assigneeId: $assigneeId, completionNotes: $completionNotes, completionEvidence: $completionEvidence)
    }
  `, {
    taskId: String(formData.get('taskId') || ''),
    action,
    assigneeId: String(formData.get('assigneeId') || '') || null,
    completionNotes: String(formData.get('completionNotes') || '') || null,
    completionEvidence: evidence,
  });
  if (!response.success) {
    redirect(taskErrorPath('The task changed before the action was applied. Refresh the workspace and try again.'));
  }
  revalidatePath(TASKS_PATH);
}
