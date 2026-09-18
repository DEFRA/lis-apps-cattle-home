import { holdingDetailsController } from './details/controller.js'
import { animalsOnHoldingController } from './animals/controller.js'

export const holdings = {
  plugin: {
    name: 'holdings',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/holdings/{county}/{parish}/{holding}',
          ...holdingDetailsController
        },
        {
          method: 'GET',
          path: '/holdings/{county}/{parish}/{holding}/animals',
          ...animalsOnHoldingController
        }
      ])
    }
  }
}
