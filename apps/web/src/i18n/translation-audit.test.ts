import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as ts from 'typescript';
import vi from './vi';

type KeyUse = { key: string; file: string; line: number };
type DynamicKeyUse = { file: string; line: number };
type RawTextUse = { text: string; file: string; line: number };

// Intentional non-translatable tokens: brand wordmark, locale codes, file extension and FM ability acronyms.
const ALLOWED_RAW_JSX_TEXT = new Set(['MANAGER', 'HUB', 'VI', 'EN', '.fm', 'CA —', 'RCA —', 'PA —', 'PA']);

function listTsx(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listTsx(path);
    return entry.isFile() && path.endsWith('.tsx') ? [path] : [];
  });
}

function auditTranslationCalls(file: string, content: string): { keys: KeyUse[]; dynamic: DynamicKeyUse[] } {
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const keys: KeyUse[] = [];
  const dynamic: DynamicKeyUse[] = [];

  const add = (key: string, node: ts.Node) => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    keys.push({ key, file: relative(process.cwd(), file), line });
  };

  const visitKeyArgument = (node: ts.Expression) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      add(node.text, node);
      return;
    }
    if (ts.isConditionalExpression(node)) {
      visitKeyArgument(node.whenTrue);
      visitKeyArgument(node.whenFalse);
      return;
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.Plus) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      dynamic.push({ file: relative(process.cwd(), file), line });
    }
  };

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 't' &&
        node.arguments.length > 0) {
      visitKeyArgument(node.arguments[0]!);
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return { keys, dynamic };
}

function auditRawJsxText(file: string, content: string): RawTextUse[] {
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const raw: RawTextUse[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (text && /[A-Za-zÀ-ỹ]/.test(text) && !ALLOWED_RAW_JSX_TEXT.has(text)) {
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        raw.push({ text, file: relative(process.cwd(), file), line });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return raw;
}

describe('UI translation key coverage', () => {
  it('has Vietnamese copy for every literal key used by app components', () => {
    const sourceRoot = join(process.cwd(), 'apps/web/src');
    const files = listTsx(sourceRoot);
    const uses = files.flatMap(file => auditTranslationCalls(file, readFileSync(file, 'utf8')).keys);
    const missing = uses.filter(use => !Object.prototype.hasOwnProperty.call(vi, use.key));

    expect(missing.map(use => `${use.file}:${use.line} — ${use.key}`)).toEqual([]);
  });

  it('keeps visible English UI copy in i18n except for explicit brand and football tokens', () => {
    const sourceRoot = join(process.cwd(), 'apps/web/src');
    const files = listTsx(sourceRoot);
    const raw = files.flatMap(file => auditRawJsxText(file, readFileSync(file, 'utf8')));

    expect(raw.map(use => `${use.file}:${use.line} — ${use.text}`)).toEqual([]);
  });

  it('uses interpolation rather than concatenating translation keys', () => {
    const sourceRoot = join(process.cwd(), 'apps/web/src');
    const files = listTsx(sourceRoot);
    const dynamic = files.flatMap(file => auditTranslationCalls(file, readFileSync(file, 'utf8')).dynamic);

    expect(dynamic.map(use => `${use.file}:${use.line}`)).toEqual([]);
  });
});
