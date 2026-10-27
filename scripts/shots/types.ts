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
}

export interface ShotSpec {
  /** Globally unique, section-prefixed name; also the Shot component's name. */
  name: string;
  /** Application-relative path, resolved after seeding. */
  route: string | ((ctx: SeedResult) => string);
  steps?: (page: Page, ctx: SeedResult) => Promise<void>;
  clip?: { x: number; y: number; width: number; height: number };
}
