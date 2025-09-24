import { Events, makeSchema, Schema, State } from '@livestore/livestore'

export const workspaceTables = {
  workspaces: State.SQLite.table({
    name: 'workspaces',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      currentProjectId: State.SQLite.text({ nullable: true }),
    },
  })
}

export const workspaceEvents = {
  workspaceCreated: Events.synced({
    name: 'workspaceCreated',
    schema: Schema.Struct({ id: Schema.String, name: Schema.String }),
  }),
  workspaceUpdated: Events.synced({
    name: 'workspaceUpdated',
    schema: Schema.Struct({ id: Schema.String, currentProjectId: Schema.String }),
  }),
}

export const workspaceMaterializers = State.SQLite.materializers(workspaceEvents, {
  workspaceCreated: ({ id, name }) => workspaceTables.workspaces.insert({ id, name, currentProjectId: null }),
  workspaceUpdated: ({ id, currentProjectId }) => workspaceTables.workspaces.update({ currentProjectId }).where({ id }),
})

export const workspaceState = State.SQLite.makeState({ tables: workspaceTables, materializers: workspaceMaterializers })
export const workspaceSchema = makeSchema({ events: workspaceEvents, state: workspaceState })

export const projectTables = {
  projects: State.SQLite.table({
    name: 'projects',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      workspaceId: State.SQLite.text({ nullable: false }),
    },
  })
}

export const projectEvents = {
  projectCreated: Events.synced({
    name: 'projectCreated',
    schema: Schema.Struct({ id: Schema.String, name: Schema.String, workspaceId: Schema.String }),
  }),
}

export const projectMaterializers = State.SQLite.materializers(projectEvents, {
  projectCreated: ({ id, name, workspaceId }) => projectTables.projects.insert({ id, name, workspaceId }),
})

export const projectState = State.SQLite.makeState({ tables: projectTables, materializers: projectMaterializers })
export const projectSchema = makeSchema({ events: projectEvents, state: projectState })

export const issueTables = {
  issues: State.SQLite.table({
    name: 'issues',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      projectId: State.SQLite.text({ nullable: false }),
    },
  })
}

export const issueEvents = {
  issueCreated: Events.synced({
    name: 'v1.issueCreated',
    schema: Schema.Struct({ id: Schema.String, name: Schema.String, projectId: Schema.String }),
  }),
}

export const issueMaterializers = State.SQLite.materializers(issueEvents, {
  'v1.issueCreated': ({ id, name, projectId }) => issueTables.issues.insert({ id, name, projectId }),
})

export const issueState = State.SQLite.makeState({ tables: issueTables, materializers: issueMaterializers })
export const issueSchema = makeSchema({ events: issueEvents, state: issueState })
