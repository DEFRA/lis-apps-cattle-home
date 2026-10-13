/** @import { Request } from '@hapi/hapi' */
import Boom from '@hapi/boom'
import {
  hasPermission,
  PERMISSIONS
} from '@defra/lis-hubs-infra-access/authorization'

import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'

/**
 * Fetches the animal and allows the request when the user may read cattle on
 * the animal's current holding. Not found rather than forbidden, so an
 * animal's existence isn't confirmed to someone not entitled to it.
 *
 * @param {Request} request
 * @returns {Promise<object>} the cattle record, for the handler
 */
async function demandAnimalAccess(request) {
  const record = await cattleHomeBe4FeClient.getCattleDetails(
    request.params.earTag
  )
  const { user } = request.auth.credentials

  if (
    record.cph &&
    hasPermission(user, { permission: PERMISSIONS.cattleRead, cph: record.cph })
  ) {
    return record
  }

  throw Boom.notFound()
}

// Only a user granted cattle read on the animal's current holding may view it.
export const animalAccess = {
  pre: [{ method: demandAnimalAccess, assign: 'record' }]
}
