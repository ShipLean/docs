import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkedState } from './inspection-checked.ts';

const today = new Date('2026-11-16T12:00:00Z');
const daysBack = (n: number) => new Date(today.getTime() - n * 86_400_000).toISOString().slice(0, 10);

test('a page checked 91 days ago is out of date', () => {
  const s = checkedState('claude-code', 'Claude Code 2.1.323', daysBack(91), today);
  assert.equal(s.outOfDate, true);
  assert.match(s.reasons[0], /91 days ago/);
});

test('a page checked 89 days ago is current', () => {
  assert.equal(checkedState('claude-code', 'Claude Code 2.1.323', daysBack(89), today).outOfDate, false);
});

test('a version older than the recorded fixture is out of date', () => {
  const s = checkedState('claude-code', 'Claude Code 2.1.300', daysBack(1), today);
  assert.equal(s.outOfDate, true);
  assert.match(s.reasons[0], /older than the recorded run/);
});

test('a newer version is current, and versions compare numerically', () => {
  assert.equal(checkedState('claude-code', 'Claude Code 2.1.1000', daysBack(1), today).outOfDate, false);
});

test('an unchecked placeholder is neither checked nor out of date', () => {
  const s = checkedState('cursor', 'Cursor <version>', '<yyyy-mm-dd>', today);
  assert.deepEqual(s, { checked: false, outOfDate: false, reasons: [] });
});
