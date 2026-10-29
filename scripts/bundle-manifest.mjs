/**
 * Collect the initial static asset closure from a Vite manifest.
 *
 * Some manifest versions may surface a module's dynamic-import targets in its
 * import/preload list. Exclude those targets for that module only. A target
 * must still be counted if a different module statically imports it.
 *
 * @param {Record<string, { imports?: string[]; dynamicImports?: string[] }>} manifest
 * @param {string} entryKey
 * @returns {Set<string>}
 */
export function collectInitialManifestKeys(manifest, entryKey) {
  const visited = new Set();

  function visit(key) {
    if (visited.has(key)) return;
    const item = manifest[key];
    if (!item) throw new Error(`Bundle budget: manifest import "${key}" is missing.`);
    visited.add(key);

    const dynamicFromThisModule = new Set(item.dynamicImports ?? []);
    for (const imported of item.imports ?? []) {
      if (!dynamicFromThisModule.has(imported)) visit(imported);
    }
  }

  visit(entryKey);
  return visited;
}
