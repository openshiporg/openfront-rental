import type { OnboardingDefinition, OnboardingOperation } from './types';

export type ProgressEvent =
  | { type: 'loading'; operation: OnboardingOperation }
  | { type: 'completed'; operation: OnboardingOperation }
  | { type: 'error'; operation?: OnboardingOperation; message: string }
  | { type: 'message'; message: string };

export function onboardingErrorMessage(error: unknown) {
  // graphql-request's default message includes query variables. Surface only the
  // server's errors, not the entire merchant configuration or request payload.
  const response = (error as { response?: { errors?: { message?: string }[] } } | null)?.response;
  if (response?.errors?.length) return response.errors.map(item => item.message || 'Setup failed.').join('\n').slice(0, 2000);
  return (error instanceof Error ? error.message : 'Setup failed.').slice(0, 2000);
}

function assertSuccess(result: { success: boolean; error?: string }) {
  if (!result.success) throw new Error(result.error || 'Setup could not be completed.');
}

/** The canonical e-commerce sequence: await each persisted item, then verify, then complete. */
export async function runOnboarding<T>(definition: OnboardingDefinition<T>, data: T, emit: (event: ProgressEvent) => void) {
  let current: OnboardingOperation | undefined;
  try {
    const operations = definition.getOperations(data);
    const visible = definition.sections.flatMap(section => section.getItems(data).map(item => `${section.type}:${item.id}`));
    const planned = operations.map(operation => `${operation.section}:${operation.id}`);
    if (new Set(visible).size !== visible.length || new Set(planned).size !== planned.length || visible.length !== planned.length || visible.some(key => !planned.includes(key))) {
      throw new Error('Every onboarding chip must have one uniquely identified backend operation.');
    }
    assertSuccess(await definition.start());
    for (const operation of operations) {
      current = operation;
      emit({ type: 'message', message: operation.message });
      emit({ type: 'loading', operation });
      assertSuccess(await definition.createItem(data, operation));
      emit({ type: 'completed', operation });
      current = undefined;
    }
    emit({ type: 'message', message: 'Verifying saved configuration…' });
    assertSuccess(await definition.verify(data));
    assertSuccess(await definition.complete(data));
    return true;
  } catch (error) {
    emit({ type: 'error', operation: current, message: onboardingErrorMessage(error) });
    return false;
  }
}
