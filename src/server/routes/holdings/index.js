import { demandPermission, PERMISSIONS } from '@defra/lis-hubs-infra-access/auth'

import {
  cphFromParams,
  holdingDetailsController
} from './details/controller.js'
import { animalsOnHoldingController } from './animals/controller.js'

// Only a user granted cattle read on this holding's CPH may view it.
const cphAccess = {
  pre: [
    {
      method: demandPermission({
        permission: PERMISSIONS.cattleRead,
        getCph: (request) => cphFromParams(request.params)
      })
    }
  ]
}

export const holdings = {
  plugin: {
    name: 'holdings',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/holdings/{county}/{parish}/{holding}',
          ...holdingDetailsController,
          options: cphAccess
        },
        {
          method: 'GET',
          path: '/holdings/{county}/{parish}/{holding}/animals',
          ...animalsOnHoldingController,
          options: cphAccess
        }
      ])
    }
  }
}
