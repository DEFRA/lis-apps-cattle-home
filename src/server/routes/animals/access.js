/** @import { Request, ResponseToolkit } from '@hapi/hapi' */
import Boom from '@hapi/boom'
import {
  hasPermission,
  PERMISSIONS
} from '@defra/lis-hubs-infra-access/authorization'

import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'
import { getReferringHoldingCph } from './referrer.js'

function normaliseEarTag(earTag) {
  return earTag.replaceAll(/\s/g, '').toUpperCase()
}

/**
 * @param {string} cph
 * @param {string} earTag
 * @returns {Promise<boolean>} whether the animal is in the holding's animals-on-holding list
 */
async function isOnHolding(cph, earTag) {
  const wanted = normaliseEarTag(earTag)
  const { animals } = await cattleHomeBe4FeClient.getCattleOnHolding(cph, {
    q: earTag
  })

  return animals.some((animal) => normaliseEarTag(animal.eartag) === wanted)
}

/**
 * @param {Request} request
 * @param {ResponseToolkit} h
 * @returns {Promise<symbol | Boom.Boom>} h.continue when access is allowed, otherwise a 404
 */
async function demandAnimalAccess(request, h) {
  // TODO: temporary access check.
  // eventually a user must have access to the animal's current holding or one of its previous holdings
  // this will require a cads endpoint to get the animal's location history
  const cph = getReferringHoldingCph(request)
  const { user } = request.auth.credentials

  if (
    cph &&
    hasPermission(user, { permission: PERMISSIONS.cattleRead, cph }) &&
    (await isOnHolding(cph, request.params.earTag))
  ) {
    return h.continue
  }

  return Boom.notFound()
}

// Only a user who reached the animal from the animals-on-holding page of a
// holding they may read, with the animal on that holding, may view it.
export const animalAccess = {
  pre: [{ method: demandAnimalAccess }]
}
