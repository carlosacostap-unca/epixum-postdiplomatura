export const PUBLICATION_FIELD = {
  name: 'publicationStatus', type: 'select', required: false, maxSelect: 1,
  values: ['draft', 'published'],
};

export function withPublicationField(fields = []) {
  const previous = fields.find((field) => field.name === PUBLICATION_FIELD.name);
  return [...fields.filter((field) => field.name !== PUBLICATION_FIELD.name), { ...previous, ...PUBLICATION_FIELD }];
}

export const publishedRule = (prefix = '') =>
  `(${prefix}publicationStatus = "" || ${prefix}publicationStatus = "published")`;
