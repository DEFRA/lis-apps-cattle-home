/** @import { Server } from '@hapi/hapi' */

import { animalAccess } from './access.js'
import { cattleDetailsController } from './controller.js'

export const animals = {
  plugin: {
    name: 'animals',
    /**
     * Registers the routes with the server.
     *
     * @param {Server} server - the Hapi server
     */
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/animals/cattle/{earTag}',
          ...cattleDetailsController,
          options: animalAccess
        }
      ])
    }
  }
}
