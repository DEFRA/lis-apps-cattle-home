/** @import { Request, ResponseToolkit } from '@hapi/hapi' */
import Boom from '@hapi/boom'
import {
  PERMISSIONS,
  hasPermission
} from '@defra/lis-hubs-infra-access/authorization'

import {
  cphFromParams,
  holdingDetailsController
} from './details/controller.js'
import { animalsOnHoldingController } from './animals/controller.js'

/**
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {symbol | Boom.Boom} h.continue when access is allowed, otherwise a 404
 */
function demandHoldingAccess(request, h) {
  const cph = cphFromParams(request.params)

  if (
    hasPermission(request.auth.credentials.user, {
      permission: PERMISSIONS.cattleRead,
      cph
    })
  ) {
    return h.continue
  }

  // Not found rather than forbidden, so a holding's existence isn't
  // confirmed to someone not entitled to it.
  return Boom.notFound()
}

// Only a user granted cattle read on this holding's CPH may view it.
const cphAccess = {
  pre: [{ method: demandHoldingAccess }]
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
