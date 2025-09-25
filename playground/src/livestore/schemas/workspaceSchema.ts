import { Events, makeSchema, Schema, State } from '@livestore/livestore'

export const tables = {
  workspaces: State.SQLite.table({
    name: 'workspaces',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      currentProjectId: State.SQLite.text({ nullable: true }),
    },
  })
}

export const events = {
  workspaceCreated: Events.synced({
    name: 'workspaceCreated',
    schema: Schema.Struct({ id: Schema.String, name: Schema.String }),
  }),
  workspaceUpdated: Events.synced({
    name: 'workspaceUpdated',
    schema: Schema.Struct({ id: Schema.String, currentProjectId: Schema.String }),
  }),
}

export const materializers = State.SQLite.materializers(events, {
  workspaceCreated: ({ id, name }) => tables.workspaces.insert({ id, name, currentProjectId: null }),
  workspaceUpdated: ({ id, currentProjectId }) => tables.workspaces.update({ currentProjectId }).where({ id }),
})

const state = State.SQLite.makeState({ tables, materializers })
export const schema = makeSchema({ events, state, devtools: { alias: 'workspace' } })
