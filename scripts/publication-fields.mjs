export const PUBLICATION_FIELD = {
  name: 'publicationStatus', type: 'select', required: false, maxSelect: 1,
  values: ['draft', 'published'],
};

export function withPublicationField(fields = []) {
  const previous = fields.find((field) => field.name === PUBLICATION_FIELD.name);
  return [...fields.filter((field) => field.name !== PUBLICATION_FIELD.name), { ...previous, ...PUBLICATION_FIELD }];
}

export function withResourcePublicationFields(fields = []) {
  const previous = fields.find(field => field.name === 'audience');
  return [...withPublicationField(fields).filter(field => field.name !== 'audience'),
    { ...previous, name: 'audience', type: 'select', required: false, maxSelect: 1, values: ['everyone', 'teachers'] }];
}

export const sharedResourceAudienceRule = '(audience = "" || audience = "everyone")';

export function withScheduledPublicationFields(fields = []) {
  const statusFields = withPublicationField(fields).map(field => field.name === 'publicationStatus'
    ? { ...field, values: ['draft', 'published', 'scheduled'] } : field);
  const previous = fields.find(field => field.name === 'publishAt');
  return [...statusFields.filter(field => field.name !== 'publishAt'),
    { ...previous, name: 'publishAt', type: 'date', required: false }];
}

export const visiblePublicationRule = (prefix = '') =>
  `(${prefix}publicationStatus = "" || ${prefix}publicationStatus = "published" || (${prefix}publicationStatus = "scheduled" && ${prefix}publishAt != "" && ${prefix}publishAt <= @now))`;

export const publishedRule = (prefix = '') =>
  `(${prefix}publicationStatus = "" || ${prefix}publicationStatus = "published")`;
