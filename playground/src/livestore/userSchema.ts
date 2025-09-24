import { Events, makeSchema, Schema, SessionIdSymbol, State } from '@livestore/livestore'

// User management schema for nested stores example
export const userTables = {
  users: State.SQLite.table({
    name: 'users',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ default: '' }),
      email: State.SQLite.text({ default: '' }),
      createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
    }
  }),
  userPreferences: State.SQLite.clientDocument({
    name: 'userPreferences',
    schema: Schema.Struct({
      theme: Schema.Literal('light', 'dark'),
      notifications: Schema.Boolean,
    }),
    default: {
      id: SessionIdSymbol,
      value: {
        theme: 'light',
        notifications: true,
      }
    }
  })
}

export const userEvents = {
  userCreated: Events.synced({
    name: 'v1.UserCreated',
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      email: Schema.String,
      createdAt: Schema.Date,
    }),
  }),
  userUpdated: Events.synced({
    name: 'v1.UserUpdated',
    schema: Schema.Struct({
      id: Schema.String,
      name: Schema.optional(Schema.String),
      email: Schema.optional(Schema.String),
    }),
  }),
  userPreferencesSet: userTables.userPreferences.set
}

const userMaterializers = State.SQLite.materializers(userEvents, {
  'v1.UserCreated': ({ id, name, email, createdAt }) =>
    userTables.users.insert({ id, name, email, createdAt }),
  'v1.UserUpdated': ({ id, name, email }) => {
    const updates: Record<string, string> = {}
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    return userTables.users.update(updates).where({ id })
  },
})

const userState = State.SQLite.makeState({ tables: userTables, materializers: userMaterializers })
export const userSchema = makeSchema({ events: userEvents, state: userState })