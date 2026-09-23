import { cattleDetailsController } from './controller.js'

export const animals = {
  plugin: {
    name: 'animals',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/animals/{earTag}',
          ...cattleDetailsController
        }
      ])
    }
  }
}
