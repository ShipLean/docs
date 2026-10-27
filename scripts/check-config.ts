import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Examples and prose mentions must never count as configuration declarations.
function unfencedLines(markdown: string): string[] {
  let fence: string | undefined;
  return markdown.split(/\r?\n/).filter((line) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/)?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
      return false;
    }
    return !fence;
  });
}

export function readmeVariables(markdown: string): string[] {
  const names: string[] = [];
  let sectionLevel = 0;
  let inTable = false;
  for (const line of unfencedLines(markdown)) {
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      if (sectionLevel && heading[1].length <= sectionLevel) break;
      if (heading[2].trim() === 'Configuration') sectionLevel = heading[1].length;
    }
    if (!sectionLevel) continue;
    if (/^\s*\|\s*Variable\s*\|/.test(line)) { inTable = true; continue; }
    if (!inTable) continue;
    if (!/^\s*\|/.test(line)) { inTable = false; continue; }
    const variableCell = line.split('|')[1];
    for (const match of variableCell.matchAll(/`(SHIPLEAN_[A-Z0-9_]+)`/g)) names.push(match[1]);
  }
  if (!names.length) throw new Error('No SHIPLEAN variables found in the README Configuration table');
  return names;
}

export function pageVariables(markdown: string): string[] {
  const names = unfencedLines(markdown).flatMap((line) => {
    const match = line.match(/^###\s+`(SHIPLEAN_[A-Z0-9_]+)`\s*#*\s*$/);
    return match ? [match[1]] : [];
  });
  if (!names.length) throw new Error('No configuration variable headings found on the page');
  return names;
}

export function checkConfig(readme: string, page: string): string[] {
  const expected = readmeVariables(readme);
  const actual = pageVariables(page);
  const differences: string[] = [];
  for (const [label, names] of [['README', expected], ['page', actual]] as const) {
    const seen = new Set<string>();
    for (const name of names) {
      if (seen.has(name)) differences.push(`Duplicate in ${label}: ${name}`);
      seen.add(name);
    }
  }
  for (const name of new Set(expected)) if (!actual.includes(name)) differences.push(`Missing from page: ${name}`);
  for (const name of new Set(actual)) if (!expected.includes(name)) differences.push(`Extra on page: ${name}`);
  return differences;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const readmePath = process.argv[2];
    if (!readmePath || process.argv.length !== 3) throw new Error('Usage: check-config.ts <product-readme-path>');
    const pagePath = ['src/content/docs/start/configuration.mdx', 'src/content/docs/start/configuration.md'].filter(existsSync);
    if (pagePath.length !== 1) throw new Error('Expected exactly one configuration.md or configuration.mdx page');
    const differences = checkConfig(readFileSync(readmePath, 'utf8'), readFileSync(pagePath[0], 'utf8'));
    if (differences.length) { console.error(differences.join('\n')); process.exitCode = 1; }
    else console.log('Configuration variables match the product README (including duplicate checks).');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
