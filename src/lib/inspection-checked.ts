// Decides whether an agent page's "Checked with <agent> <version> on <date>" line is out of date.
// A page is out of date when it was checked more than 90 days ago, or with an agent version
// older than the one of the recorded run ShipLean's fixtures hold.

export const maxAgeDays = 90;

// The agent version of each recorded fixture (Recorded/<agent>-recorded in ShipLean's test support).
// Codex CLI and Cursor have no recorded run yet, so their pages stay marked unchecked.
export const recordedVersions: Readonly<Record<string, string>> = {
  'claude-code': '2.1.323',
};

const dayMs = 86_400_000;

export function parseDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function versionOf(checkedWith: string): string | undefined {
  return /(\d+(?:\.\d+)*)\s*$/.exec(checkedWith)?.[1];
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return Math.sign(d);
  }
  return 0;
}

export interface CheckedState {
  checked: boolean;
  outOfDate: boolean;
  reasons: string[];
}

export function checkedState(agent: string, checkedWith: string, checkedOn: string, today: Date): CheckedState {
  const on = parseDate(checkedOn);
  const version = versionOf(checkedWith);
  if (!on || !version) return { checked: false, outOfDate: false, reasons: [] };
  const reasons: string[] = [];
  const ageDays = Math.floor((today.getTime() - on.getTime()) / dayMs);
  if (ageDays > maxAgeDays) reasons.push(`it was checked ${ageDays} days ago`);
  const recorded = recordedVersions[agent];
  if (recorded && compareVersions(version, recorded) < 0) {
    reasons.push(`it was checked with ${version}, older than the recorded run's ${recorded}`);
  }
  return { checked: true, outOfDate: reasons.length > 0, reasons };
}
