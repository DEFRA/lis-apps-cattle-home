/** @import { Request } from '@hapi/hapi' */
/** @import { CattleDetails } from '#server/services/cattle-home-be4fe-client.js' */
import Boom from '@hapi/boom'
import { audit } from '@defra/cdp-auditing'
import { logger } from '@defra/lis-hubs-infra-core'
import {
  hasPermission,
  PERMISSIONS
} from '@defra/lis-hubs-infra-access/authorization'

import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'

/**
 * Fetches the animal and allows the request when the user may read cattle on
 * the animal's current holding. Not found rather than forbidden, so an
 * animal's existence isn't confirmed to someone not entitled to it. Access
 * via one of the animal's previous holdings waits on a CADS location history
 * endpoint. Each decision goes to the CDP audit stream and to the application
 * log.
 *
 * @param {Request} request
 * @returns {Promise<CattleDetails>} the cattle record, for the handler
 */
async function demandAnimalAccess(request) {
  let record
  try {
    record = await cattleHomeBe4FeClient.getCattleDetails(request.params.earTag)
  } catch (error) {
    if (error.statusCode === statusCodes.notFound) {
      throw Boom.notFound()
    }
    throw error
  }
  const { user } = request.auth.credentials
  const { earTag } = request.params
  const cph = record.current_location?.identifier
  const granted = Boolean(
    cph && hasPermission(user, { permission: PERMISSIONS.cattleRead, cph })
  )
  const outcome = granted ? 'granted' : 'denied'

  audit({ event: 'animal-access', outcome, earTag, cph, user: user.sub })
  logger.warn({ earTag, outcome }, `Animal access ${outcome}`)

  if (granted) {
    return record
  }

  throw Boom.notFound()
}

// Only a user granted cattle read on the animal's current holding may view it.
export const animalAccess = {
  pre: [{ method: demandAnimalAccess, assign: 'record' }]
}
