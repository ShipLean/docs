import type { Page } from 'playwright';

export interface SeedResult {
  projectKey: 'DEMO';
  /** REST UUID, not the project key. */
  projectId: string;
  /** Work-item keys in deterministic fixture order, not REST UUIDs. */
  epics: string[];
  /** features[0]: Guide new members through their first project. */
  features: string[];
  /** Work-item keys in deterministic fixture order, not REST UUIDs. */
  stories: string[];
  /** REST UUID of the demo sprint. */
  sprint: string;
  /** REST UUID of the project's existing Stories board. */
  boardId: string;
  /** REST UUID of the future sprint: capacity 22, 13 points committed. */
  futureSprint: string;
  /** REST UUID of the closed sprint that ended yesterday, named Foundations. */
  recentSprint: string;
  /** REST UUID of the older closed sprint, named Discovery. */
  olderSprint: string;
  /** Six ranked backlog rows above the older stories: the first five total 8 points, the sixth has 2. */
  backlogRows: string[];
  /** The three stories already in the future sprint, 13 points. */
  futureStories: string[];
  /** Two stories finished in the recent sprint, with item-level retro points. */
  retroStories: string[];
  /** Action items: [closed in the older sprint under a Feature, open under features[0]]. */
  actionItems: string[];
}

export interface ShotSpec {
  /** Globally unique, section-prefixed name; also the Shot component's name. */
  name: string;
  /** Application-relative path, resolved after seeding. */
  route: string | ((ctx: SeedResult) => string);
  /** Captured signed out, on a public route such as /login. Skips the theme control and the app shell, so the theme follows the emulated OS preference. */
  public?: boolean;
  steps?: (page: Page, ctx: SeedResult) => Promise<void>;
  clip?: { x: number; y: number; width: number; height: number };
}
