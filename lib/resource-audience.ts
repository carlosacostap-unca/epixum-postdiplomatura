export type ResourceAudience = 'everyone' | 'teachers';

// Empty values preserve the audience of resources created before this option existed.
export function isSharedResourceAudience(audience?: string | null) {
  return audience == null || audience === '' || audience === 'everyone';
}

export function resourceAudiencePatch(value: FormDataEntryValue | null, creating = false) {
  if (value === null) return creating ? { audience: 'everyone' as const } : {};
  if (value !== 'everyone' && value !== 'teachers') throw new Error('Disponibilidad del recurso inválida');
  return { audience: value };
}

export function isSharedResource(resource: { class?: string; assignment?: string; audience?: string | null }) {
  return !resource.class && !resource.assignment || isSharedResourceAudience(resource.audience);
}
