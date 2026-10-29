import type { StarlightUserConfig } from '@astrojs/starlight/types';

export const sidebar = [
  {
    "label": "Home",
    "items": [
      {
        "label": "ShipLean documentation",
        "link": "/"
      }
    ]
  },
  {
    "label": "Get started",
    "items": [
      {
        "label": "What is ShipLean",
        "link": "/start/overview/"
      },
      {
        "label": "Quick start: Docker Compose",
        "link": "/start/quickstart/"
      },
      {
        "label": "Install for production",
        "link": "/start/production/"
      },
      {
        "label": "Configuration reference",
        "link": "/start/configuration/"
      },
      {
        "label": "Storage options",
        "link": "/start/storage/"
      },
      {
        "label": "Sign-in options",
        "link": "/start/sign-in/"
      },
      {
        "label": "Running more than one instance",
        "link": "/start/scaling/"
      },
      {
        "label": "Integrations",
        "link": "/start/integrations/"
      },
      {
        "label": "Your first project in 10 minutes",
        "link": "/start/guides/first-project/"
      },
      {
        "label": "Import from Jira",
        "link": "/start/guides/jira-import/"
      },
      {
        "label": "Run a Scrum sprint",
        "link": "/start/guides/scrum-sprint/"
      },
      {
        "label": "Run Kanban",
        "link": "/start/guides/kanban/"
      },
      {
        "label": "Connect Claude Code and capture your first idea",
        "link": "/start/guides/first-agent/"
      }
    ]
  },
  {
    "label": "Using the app",
    "items": [
      {
        "label": "Navigating ShipLean",
        "link": "/ui/navigation/"
      },
      {
        "label": "Sign in and your profile",
        "link": "/ui/profile/"
      },
      {
        "label": "Backlogs",
        "link": "/ui/backlogs/"
      },
      {
        "label": "Work items",
        "link": "/ui/work-items/"
      },
      {
        "label": "Features and the Feature editor",
        "link": "/ui/features/"
      },
      {
        "label": "Boards",
        "link": "/ui/boards/"
      },
      {
        "label": "Board settings",
        "link": "/ui/board-settings/"
      },
      {
        "label": "Sprints",
        "link": "/ui/sprints/"
      },
      {
        "label": "Sprint planning and capacity",
        "link": "/ui/planning/"
      },
      {
        "label": "Sprint backlog",
        "link": "/ui/sprint-backlog/"
      },
      {
        "label": "Taskboard",
        "link": "/ui/taskboard/"
      },
      {
        "label": "Feature board",
        "link": "/ui/feature-board/"
      },
      {
        "label": "Project settings",
        "link": "/ui/project-settings/"
      },
      {
        "label": "New project",
        "link": "/ui/new-project/"
      },
      {
        "label": "Jira import",
        "link": "/ui/import/"
      },
      {
        "label": "Instance settings",
        "link": "/ui/instance/"
      },
      {
        "label": "Connecting an agent: the consent screen",
        "link": "/ui/authorize/"
      }
    ]
  },
  {
    "label": "Agents and MCP",
    "items": [
      {
        "label": "Agents in ShipLean",
        "link": "/agents/overview/"
      },
      {
        "label": "Connect an agent",
        "link": "/agents/connect/"
      },
      {
        "label": "Authentication options",
        "link": "/agents/auth/"
      },
      {
        "label": "Scopes and step-up",
        "link": "/agents/scopes/"
      },
      {
        "label": "Tool reference",
        "link": "/agents/tools/"
      },
      {
        "label": "Example prompts",
        "link": "/agents/prompts/"
      }
    ]
  },
  {
    "label": "Working with ShipLean",
    "items": [
      {
        "label": "The flow at a glance",
        "link": "/work/flow/"
      },
      {
        "label": "Epics as areas",
        "link": "/work/epics/"
      },
      {
        "label": "Capturing ideas",
        "link": "/work/ideas/"
      },
      {
        "label": "Researching an idea with an agent",
        "link": "/work/research/"
      },
      {
        "label": "Validating: go, park or remove",
        "link": "/work/validate/"
      },
      {
        "label": "Planning and breaking down",
        "link": "/work/plan/"
      },
      {
        "label": "Agents doing the work",
        "link": "/work/build/"
      },
      {
        "label": "Finishing and learning",
        "link": "/work/done/"
      },
      {
        "label": "Scrum or Kanban with ShipLean",
        "link": "/work/cadence/"
      }
    ]
  },
  {
    "label": "Reference",
    "items": [
      {
        "label": "Glossary",
        "link": "/reference/glossary/"
      },
      {
        "label": "REST API",
        "link": "/reference/api/"
      },
      {
        "label": "Release notes",
        "link": "/reference/releases/"
      }
    ]
  }
] satisfies StarlightUserConfig['sidebar'];

