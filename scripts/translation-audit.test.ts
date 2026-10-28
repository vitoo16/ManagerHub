import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import vi from '../apps/web/src/i18n/vi';

type KeyUse = { key: string; file: string; line: number };
type DynamicKeyUse = { file: string; line: number };
type RawTextUse = { text: string; file: string; line: number };

// Intentional non-translatable tokens: brand wordmark, locale codes, file extension, keyboard shortcut and FM ability acronyms.
const ALLOWED_RAW_JSX_TEXT = new Set(['MANAGER', 'HUB', 'VI', 'EN', '.fm', 'CA —', 'RCA —', 'PA —', 'PA', '⌘ K', 'Promise']);

function listTsx(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listTsx(path);
    return entry.isFile() && path.endsWith('.tsx') ? [path] : [];
  });
}

function lineAt(source: string, offset: number): number {
  return source.slice(0, offset).split('\n').length;
}

function firstArgument(source: string, openParen: number): { text: string; end: number } | null {
  let depth = 1;
  let quote = '';
  let escaped = false;
  let firstComma = -1;

  for (let i = openParen + 1; i < source.length; i++) {
    const char = source[i]!;
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') depth++;
    else if (char === ')') {
      depth--;
      if (depth === 0) {
        return { text: source.slice(openParen + 1, firstComma < 0 ? i : firstComma).trim(), end: i };
      }
    } else if (char === ',' && depth === 1 && firstComma < 0) {
      firstComma = i;
    }
  }
  return null;
}

function hasPlusOutsideString(text: string): boolean {
  let quote = '';
  let escaped = false;
  for (const char of text) {
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '\u0060') quote = char;
    else if (char === '+') return true;
  }
  return false;
}

function literalStrings(text: string): string[] {
  const pattern = /^\\s*(?:"((?:\\\\.|[^"\\\\])*)"|'((?:\\\\.|[^'\\\\])*)')\\s*$/;
  const exact = text.match(pattern);
  if (exact) return [(exact[1] ?? exact[2] ?? '').replace(/\\\\(["'\\\\])/g, '$1')];

  // For a conditional t(...), only branch literals are translation keys; literals in its condition are internal values.
  const values: string[] = [];
  const branches = /\\?\\s*"((?:\\\\.|[^"\\\\])*)"|\\?\\s*'((?:\\\\.|[^'\\\\])*)'|:\\s*"((?:\\\\.|[^"\\\\])*)"|:\\s*'((?:\\\\.|[^'\\\\])*)'/g;
  for (const match of text.matchAll(branches)) {
    const value = match[1] ?? match[2] ?? match[3] ?? match[4];
    if (value !== undefined) values.push(value.replace(/\\\\(["'\\\\])/g, '$1'));
  }
  return values;
}

function auditTranslationCalls(file: string, source: string): { keys: KeyUse[]; dynamic: DynamicKeyUse[] } {
  const keys: KeyUse[] = [];
  const dynamic: DynamicKeyUse[] = [];
  const callPattern = /\bt\s*\(/g;

  for (const match of source.matchAll(callPattern)) {
    const openParen = match.index! + match[0].lastIndexOf('(');
    const argument = firstArgument(source, openParen);
    if (!argument) continue;
    const line = lineAt(source, match.index!);
    for (const key of literalStrings(argument.text)) {
      keys.push({ key, file: relative(process.cwd(), file), line });
    }
    if (hasPlusOutsideString(argument.text)) {
      dynamic.push({ file: relative(process.cwd(), file), line });
    }
  }
  return { keys, dynamic };
}

function auditRawJsxText(file: string, source: string): RawTextUse[] {
  const raw: RawTextUse[] = [];
  // JSX copy is plain text between tags; ignore expression/code fragments and only audit short human-readable spans.
  const pattern = />([^<>]+)</g;
  for (const match of source.matchAll(pattern)) {
    const text = match[1]!.replace(/\s+/g, ' ').trim();
    if (!text || text.length > 160 || !/[A-Za-zÀ-ỹ]/.test(text)) continue;
    if (/[(){}[\];=]/.test(text) || ALLOWED_RAW_JSX_TEXT.has(text)) continue;
    raw.push({ text, file: relative(process.cwd(), file), line: lineAt(source, match.index!) });
  }
  return raw;
}

describe('UI translation key coverage', () => {
  it('has Vietnamese copy for every literal key used by app components', () => {
    const sourceRoot = join(process.cwd(), 'apps/web/src');
    const files = listTsx(sourceRoot);
    const uses = files.flatMap(file => auditTranslationCalls(file, readFileSync(file, 'utf8')).keys);
    const missing = uses.filter(use => !Object.prototype.hasOwnProperty.call(vi, use.key));

    expect(missing.map(use => use.file + ':' + use.line + ' — ' + use.key)).toEqual([]);
  });

  it('keeps visible English UI copy in i18n except for explicit brand and football tokens', () => {
    const sourceRoot = join(process.cwd(), 'apps/web/src');
    const files = listTsx(sourceRoot);
    const raw = files.flatMap(file => auditRawJsxText(file, readFileSync(file, 'utf8')));

    expect(raw.map(use => use.file + ':' + use.line + ' — ' + use.text)).toEqual([]);
  });

  it('uses interpolation rather than concatenating translation keys', () => {
    const sourceRoot = join(process.cwd(), 'apps/web/src');
    const files = listTsx(sourceRoot);
    const dynamic = files.flatMap(file => auditTranslationCalls(file, readFileSync(file, 'utf8')).dynamic);

    expect(dynamic.map(use => use.file + ':' + use.line)).toEqual([]);
  });
});
