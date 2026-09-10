import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'
import { config } from '#config/config.js'
import { createCattleHomeApi } from '#server/services/cattle-home-api.js'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { logger } from '@defra/lis-hubs-infra-core'

const cattleHomeApi = createCattleHomeApi({ config })
const holdingDetailsBasePath = `${getBasePathForModule('cattle-home')}/holdings`

// The cattle spoke has no landing page of its own yet: a keeper with one
// holding goes straight to it, a keeper with several goes to their first.
// A keeper with none has nothing to land on.
export const landingController = {
  async handler(request, h) {
    const userId = request.app.hubAuth?.email ?? request.app.hubAuth?.sub
    logger.info(`Cattle home landing request received [userId=${userId}]`)

    const { data: holdings } = await cattleHomeApi.getCphsForUser(userId)

    if (holdings.length === 0) {
      return h.response('Page not found').code(statusCodes.notFound)
    }

    return h.redirect(`${holdingDetailsBasePath}/${cphPath(holdings[0].cph)}`)
  }
}

/**
 * @param {string} cph holding identifier
 * @returns {string} encoded CPH path
 */
export function cphPath(cph) {
  return cph.split('/').map(encodeURIComponent).join('/')
}
