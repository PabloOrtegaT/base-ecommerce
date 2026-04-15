import {
  getCategoryAttributeDefinitions,
  validateCategoryAttributeValues,
  type CategoryTemplateKey,
} from "@base-ecommerce/domain";
import { createAdminMutationError } from "./mutation-errors";

export function parseVariantFormAttributeValues(
  formData: FormData,
  templateKey: CategoryTemplateKey,
) {
  const definitions = getCategoryAttributeDefinitions(templateKey);
  const values: Record<string, string | number | boolean> = {};
  const allowedKeys = new Set(definitions.map((d) => d.key));

  for (const [key] of formData.entries()) {
    if (key.startsWith("attr:") && !allowedKeys.has(key.slice(5))) {
      throw createAdminMutationError(
        "validation",
        `Unknown attribute "${key.slice(5)}" is not allowed.`,
      );
    }
  }

  for (const definition of definitions) {
    const raw = formData.get(`attr:${definition.key}`);

    if (raw !== null && typeof raw !== "string") {
      throw createAdminMutationError(
        "validation",
        `Attribute "${definition.key}" must be a text value.`,
      );
    }

    if (definition.type === "boolean") {
      if (definition.required && raw !== "on") {
        throw createAdminMutationError(
          "validation",
          `Missing required attribute "${definition.key}".`,
        );
      }
      if (raw === "on") {
        values[definition.key] = true;
      }
      continue;
    }

    if (raw === null || raw.trim().length === 0) {
      if (definition.required) {
        throw createAdminMutationError(
          "validation",
          `Missing required attribute "${definition.key}".`,
        );
      }
      continue;
    }

    const strValue = raw.trim();

    if (definition.type === "number") {
      const numValue = Number(strValue);
      if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
        throw createAdminMutationError(
          "validation",
          `Attribute "${definition.key}" must be a valid finite number.`,
        );
      }
      values[definition.key] = numValue;
      continue;
    }

    values[definition.key] = strValue;
  }

  const validation = validateCategoryAttributeValues(templateKey, values);
  if (!validation.success) {
    const messages = validation.error.issues.map((e) => e.message).join("; ");
    throw createAdminMutationError("validation", messages);
  }

  return values;
}
