import { makeWorker } from '@livestore/adapter-web/worker'

import { schema } from './schemas/todoSchema'

makeWorker({ schema })
