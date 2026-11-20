/** @import { Request, ResponseToolkit, Server } from '@hapi/hapi' */
import Boom from '@hapi/boom'
import {
  PERMISSIONS,
  hasPermission
} from '@defra/lis-hubs-infra-access/authorization'

import { holdingDetailsController } from './details/controller.js'
import { animalsOnHoldingController } from './animals/controller.js'
import { isFromBackOffice } from '#server/common/helpers/hub.js'
import { createListReferrer } from './list-referrer.js'

/**
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {symbol | Boom.Boom} h.continue when access is allowed, otherwise a 404
 */
function demandHoldingAccess(request, h) {
  const cph = request.params.cph

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

/**
 * Front office lists cattle at the holding's own path, so the separate
 * animals URL belongs to back office alone.
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {symbol | Boom.Boom} h.continue for back office, otherwise a 404
 */
function demandBackOffice(request, h) {
  return isFromBackOffice(request) ? h.continue : Boom.notFound()
}

export const holdings = {
  plugin: {
    name: 'holdings',
    /**
     * Registers the routes with the server.
     *
     * @param {Server} server - the Hapi server
     */
    register(server) {
      const listReferrer = createListReferrer(server)
      server.app.listReferrer = listReferrer

      // Only a user granted cattle read on this holding's CPH may view it.
      // The list referrer gives back office a back link to the holdings list.
      const holdingPage = {
        pre: [
          { method: demandHoldingAccess },
          { method: listReferrer.resolve, assign: 'listReferrer' }
        ]
      }

      server.route([
        {
          method: 'GET',
          path: '/holdings/{cph*3}/cattle',
          handler: (request, h) =>
            isFromBackOffice(request)
              ? holdingDetailsController.handler(request, h)
              : animalsOnHoldingController.handler(request, h),
          options: holdingPage
        },
        {
          method: 'GET',
          path: '/holdings/{cph*3}/cattle/animals',
          ...animalsOnHoldingController,
          options: {
            pre: [...holdingPage.pre, { method: demandBackOffice }]
          }
        }
      ])
    }
  }
}
