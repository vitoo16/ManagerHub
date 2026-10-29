import { describe, expect, it } from 'vitest';
import { collectInitialManifestKeys } from './bundle-manifest.mjs';

describe('initial bundle manifest traversal', () => {
  it('excludes lazy chunks surfaced in the same module import list', () => {
    const manifest = {
      'main.tsx': { imports: ['shared.js', 'lazy.js'], dynamicImports: ['lazy.js'] },
      'shared.js': { imports: [], dynamicImports: [] },
      'lazy.js': { imports: [], dynamicImports: [] }
    };
    expect([...collectInitialManifestKeys(manifest, 'main.tsx')]).toEqual(['main.tsx', 'shared.js']);
  });

  it('still counts a chunk statically imported by another module', () => {
    const manifest = {
      'main.tsx': { imports: ['shared.js', 'lazy.js'], dynamicImports: ['lazy.js'] },
      'shared.js': { imports: ['lazy.js'], dynamicImports: [] },
      'lazy.js': { imports: [], dynamicImports: [] }
    };
    expect([...collectInitialManifestKeys(manifest, 'main.tsx')]).toEqual(['main.tsx', 'shared.js', 'lazy.js']);
  });

  it('fails clearly when a static dependency is absent from the manifest', () => {
    const manifest = { 'main.tsx': { imports: ['missing.js'], dynamicImports: [] } };
    expect(() => collectInitialManifestKeys(manifest, 'main.tsx')).toThrow('manifest import "missing.js" is missing');
  });
});
