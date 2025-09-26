import { Events, makeSchema, Schema, State } from '@livestore/livestore'

export const tables = {
  projects: State.SQLite.table({
    name: 'projects',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      workspaceId: State.SQLite.text({ nullable: false }),
    },
  })
}

export const events = {
  projectCreated: Events.synced({
    name: 'projectCreated',
    schema: Schema.Struct({ id: Schema.String, name: Schema.String, workspaceId: Schema.String }),
  }),
}

export const materializers = State.SQLite.materializers(events, {
  projectCreated: ({ id, name, workspaceId }) => tables.projects.insert({ id, name, workspaceId }),
})

const state = State.SQLite.makeState({ tables, materializers })
export const schema = makeSchema({ events, state, devtools: { alias: 'project' } })
