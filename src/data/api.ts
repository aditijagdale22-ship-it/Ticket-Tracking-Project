export const api = {
  users: {
    identify: "users.identify",
    get: "users.get",
    list: "users.list",
    listPublic: "users.listPublic",
  },
  teams: {
    list: "teams.list",
    create: "teams.create",
  },
  tickets: {
    list: "tickets.list",
    get: "tickets.get",
    create: "tickets.create",
    changeStatus: "tickets.changeStatus",
    update: "tickets.update",
    remove: "tickets.remove",
    duplicate: "tickets.duplicate",
  },
  sprints: {
    listByTeam: "sprints.listByTeam",
    create: "sprints.create",
    report: "sprints.report",
  },
  seed: {
    ensureDefaultTeams: "seed.ensureDefaultTeams",
    loadDemo: "seed.loadDemo",
  },
  progress: {
    snapshot: "progress.snapshot",
  },
} as const;

export type ApiRoute = string;
