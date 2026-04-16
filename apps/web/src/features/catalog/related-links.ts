export type CategoryLinkCandidate = {
  id: string;
  name: string;
  slug: string;
  templateKey: string;
};

export type ProductLinkCandidate = {
  id: string;
  name: string;
  slug: string;
};

function sortByName<T extends { name: string }>(items: T[]) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

export function getRelatedCategoryLinks(input: {
  categories: CategoryLinkCandidate[];
  currentCategoryId: string;
  currentTemplateKey: string;
  limit?: number;
}) {
  const limit = input.limit ?? 4;
  const candidates = input.categories.filter((category) => category.id !== input.currentCategoryId);
  const sameTemplate = sortByName(
    candidates.filter((category) => category.templateKey === input.currentTemplateKey),
  );
  const otherTemplates = sortByName(
    candidates.filter((category) => category.templateKey !== input.currentTemplateKey),
  );
  return [...sameTemplate, ...otherTemplates].slice(0, limit);
}

export function getRelatedProductLinks(input: {
  products: ProductLinkCandidate[];
  currentProductId: string;
  limit?: number;
}) {
  const limit = input.limit ?? 4;
  return input.products.filter((product) => product.id !== input.currentProductId).slice(0, limit);
}
