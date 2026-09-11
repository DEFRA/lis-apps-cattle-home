import { animalsOnHoldingController } from './controller.js'

export const animals = {
  plugin: {
    name: 'animals',
    register(server) {
      server.route({
        method: 'GET',
        path: '/holdings/{county}/{parish}/{holding}/animals',
        ...animalsOnHoldingController
      })
    }
  }
}
