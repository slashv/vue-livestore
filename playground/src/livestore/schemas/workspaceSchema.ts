import { Events, makeSchema, Schema, State } from '@livestore/livestore'

export const tables = {
  workspaces: State.SQLite.table({
    name: 'workspaces',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ default: '' }),
      currentProjectId: State.SQLite.text({ nullable: true }),
    },
  })
}

export const events = {
  workspaceCreated: Events.synced({
    name: 'v1.WorkspaceCreated',
    schema: Schema.Struct({ id: Schema.String, name: Schema.String }),
  }),
  workspaceUpdated: Events.synced({
    name: 'v1.WorkspaceUpdated',
    schema: Schema.Struct({ id: Schema.String, currentProjectId: Schema.String }),
  }),
}

export const materializers = State.SQLite.materializers(events, {
  'v1.WorkspaceCreated': ({ id, name }) => tables.workspaces.insert({ id, name, currentProjectId: null }),
  'v1.WorkspaceUpdated': ({ id, currentProjectId }) => tables.workspaces.update({ currentProjectId }).where({ id }),
})

const state = State.SQLite.makeState({ tables, materializers })
export const schema = makeSchema({ events, state, devtools: { alias: 'workspace' } })
