/// <reference types="vitest/globals" />

import enMessages from "../../messages/en.json";
import ruMessages from "../../messages/ru.json";

type NestedRecord = { [key: string]: string | NestedRecord };

function extractKeyPaths(obj: NestedRecord, prefix = ""): string[] {
  const paths: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      paths.push(...extractKeyPaths(value as NestedRecord, fullKey));
    } else {
      paths.push(fullKey);
    }
  }

  return paths;
}

function getValueAtPath(obj: NestedRecord, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

const enPaths = extractKeyPaths(enMessages as unknown as NestedRecord);
const ruPaths = extractKeyPaths(ruMessages as unknown as NestedRecord);

describe("i18n message parity", () => {
  describe("en.json → ru.json: every key in English exists in Russian", () => {
    it("has no keys missing from ru.json", () => {
      const missing = enPaths.filter((path) => {
        const ruValue = getValueAtPath(ruMessages as unknown as NestedRecord, path);
        return ruValue === undefined;
      });

      if (missing.length > 0) {
        throw new Error(
          `Found ${missing.length} key(s) in en.json missing from ru.json:\n` +
            missing.map((k) => `  - ${k}`).join("\n"),
        );
      }

      expect(missing).toHaveLength(0);
    });
  });

  describe("ru.json → en.json: every key in Russian exists in English", () => {
    it("has no keys missing from en.json", () => {
      const missing = ruPaths.filter((path) => {
        const enValue = getValueAtPath(enMessages as unknown as NestedRecord, path);
        return enValue === undefined;
      });

      if (missing.length > 0) {
        throw new Error(
          `Found ${missing.length} key(s) in ru.json missing from en.json:\n` +
            missing.map((k) => `  - ${k}`).join("\n"),
        );
      }

      expect(missing).toHaveLength(0);
    });
  });

  describe("structure: same top-level namespaces in both files", () => {
    it("en.json and ru.json have the same top-level namespaces", () => {
      const enNamespaces = Object.keys(enMessages).sort();
      const ruNamespaces = Object.keys(ruMessages).sort();

      const onlyInEn = enNamespaces.filter((ns) => !ruNamespaces.includes(ns));
      const onlyInRu = ruNamespaces.filter((ns) => !enNamespaces.includes(ns));

      if (onlyInEn.length > 0 || onlyInRu.length > 0) {
        const parts: string[] = [];
        if (onlyInEn.length > 0)
          parts.push(`Only in en.json: ${onlyInEn.map((ns) => `"${ns}"`).join(", ")}`);
        if (onlyInRu.length > 0)
          parts.push(`Only in ru.json: ${onlyInRu.map((ns) => `"${ns}"`).join(", ")}`);
        throw new Error(`Namespace mismatch:\n${parts.join("\n")}`);
      }

      expect(enNamespaces).toEqual(ruNamespaces);
    });
  });

  describe("totals", () => {
    it("both files have the same number of leaf keys", () => {
      expect(ruPaths).toHaveLength(enPaths.length);
    });
  });
});
