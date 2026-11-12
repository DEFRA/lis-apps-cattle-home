/** @import { Server } from '@hapi/hapi' */

import { healthController } from './controller.js'

export const health = {
  plugin: {
    name: 'health',
    /**
     * Registers the routes with the server.
     *
     * @param {Server} server - the Hapi server
     */
    register(server) {
      server.route({
        method: 'GET',
        path: '/health',
        options: { auth: false },
        ...healthController
      })
    }
  }
}
