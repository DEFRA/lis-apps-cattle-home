/** @import { Request } from '@hapi/hapi' */
/** @import { CattleDetails } from '#server/services/cattle-home-be4fe-client.js' */
import Boom from '@hapi/boom'
import {
  hasPermission,
  PERMISSIONS
} from '@defra/lis-hubs-infra-access/authorization'

import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'

/**
 * Fetches the animal and allows the request when the user may read cattle on
 * the animal's current holding. Not found rather than forbidden, so an
 * animal's existence isn't confirmed to someone not entitled to it. Access
 * via one of the animal's previous holdings waits on a CADS location history
 * endpoint.
 *
 * @param {Request} request
 * @returns {Promise<CattleDetails>} the cattle record, for the handler
 */
async function demandAnimalAccess(request) {
  const record = await cattleHomeBe4FeClient.getCattleDetails(
    request.params.earTag
  )
  const { user } = request.auth.credentials
  const cph = record.current_location?.identifier

  if (cph && hasPermission(user, { permission: PERMISSIONS.cattleRead, cph })) {
    return record
  }

  throw Boom.notFound()
}

// Only a user granted cattle read on the animal's current holding may view it.
export const animalAccess = {
  pre: [{ method: demandAnimalAccess, assign: 'record' }]
}
