import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkConfig, readmeVariables, pageVariables } from './check-config.js';

const readme = `# Product
\`SHIPLEAN_OUTSIDE\`
### Configuration
| Variable | What it does |
|---|---|
| \`SHIPLEAN_DB\` | Mentions \`SHIPLEAN_PROSE\` |
| \`SHIPLEAN_EMAIL\`, \`SHIPLEAN_PASSWORD\`, \`POSTGRES_PASSWORD\` | Combined row |

Prose \`SHIPLEAN_IGNORED\`
## Develop
| Variable | What it does |
|---|---|
| \`SHIPLEAN_DEV\` | Not configuration |
`;
const page = `## Database
### \`SHIPLEAN_DB\`
Example \`SHIPLEAN_PROSE\`
## Admin
### \`SHIPLEAN_EMAIL\`
### \`SHIPLEAN_PASSWORD\`
`;
test('CheckConfig_WhenAVariableIsMissingFromThePage_ShouldFail', () => {
  assert.deepEqual(checkConfig(readme, page.replace('### `SHIPLEAN_PASSWORD`', '')), ['Missing from page: SHIPLEAN_PASSWORD']);
});
test('CheckConfig_WhenAHeadingHasNoVariableInTheReadme_ShouldFail', () => {
  assert.deepEqual(checkConfig(readme, page + '### `SHIPLEAN_EXTRA`\n'), ['Extra on page: SHIPLEAN_EXTRA']);
});
test('CheckConfig_WhenBothMatch_ShouldPass', () => assert.deepEqual(checkConfig(readme, page), []));
test('CheckConfig_ShouldHandleRowsWithTwoVariables', () => {
  assert.deepEqual(readmeVariables(readme), ['SHIPLEAN_DB', 'SHIPLEAN_EMAIL', 'SHIPLEAN_PASSWORD']);
});
test('Duplicate declarations fail even when the sets match', () => {
  assert.deepEqual(checkConfig(readme.replace('| `SHIPLEAN_DB` |', '| `SHIPLEAN_DB`, `SHIPLEAN_DB` |'), page + '### `SHIPLEAN_EMAIL`\n'), ['Duplicate in README: SHIPLEAN_DB', 'Duplicate in page: SHIPLEAN_EMAIL']);
});
test('Fenced examples and other heading levels do not declare page variables', () => {
  assert.deepEqual(pageVariables(page + '\n```md\n### `SHIPLEAN_EXAMPLE`\n```\n## `SHIPLEAN_GROUP`\n'), ['SHIPLEAN_DB', 'SHIPLEAN_EMAIL', 'SHIPLEAN_PASSWORD']);
});
test('Missing declaration sources fail closed', () => {
  assert.throws(() => readmeVariables('# Configuration\nNo table'), /No SHIPLEAN/);
  assert.throws(() => pageVariables('No headings'), /No configuration/);
});
