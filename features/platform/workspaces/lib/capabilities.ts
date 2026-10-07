export type WorkspaceActor = {
  id?: string | null;
  role?: {
    canManageProperties?: boolean | null;
    canManageListings?: boolean | null;
  } | null;
} | null | undefined;

export function canManageProperties(actor: WorkspaceActor) {
  return Boolean(actor?.id && actor.role?.canManageProperties === true);
}

export function canManageListings(actor: WorkspaceActor) {
  return Boolean(actor?.id && actor.role?.canManageListings === true);
}
