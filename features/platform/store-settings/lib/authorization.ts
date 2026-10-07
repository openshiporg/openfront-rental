export type StoreSettingsActor = {
  id?: string | null;
  isActive?: boolean | null;
  role?: { canManageSettings?: boolean | null } | null;
} | null | undefined;

export function canManageStoreSettings(actor: StoreSettingsActor) {
  return Boolean(actor?.id && actor.isActive === true && actor.role?.canManageSettings === true);
}
