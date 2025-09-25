import { Events, makeSchema, Schema, State } from '@livestore/livestore'

export const tables = {
  issues: State.SQLite.table({
    name: 'issues',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      projectId: State.SQLite.text({ nullable: false }),
    },
  })
}

export const events = {
  issueCreated: Events.synced({
    name: 'v1.issueCreated',
    schema: Schema.Struct({ id: Schema.String, name: Schema.String, projectId: Schema.String }),
  }),
}

export const materializers = State.SQLite.materializers(events, {
  'v1.issueCreated': ({ id, name, projectId }) => tables.issues.insert({ id, name, projectId }),
})

const state = State.SQLite.makeState({ tables, materializers })
export const schema = makeSchema({ events, state, devtools: { alias: 'issue' } })
