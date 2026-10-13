/** @import { Request } from '@hapi/hapi' */
import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'
import { getReferringHoldingCph, getSameHostReferrerPath } from './referrer.js'
import { buildCattleDetailsViewModel } from './view-model.js'

const holdingsBasePath = `${getBasePathForModule('cattle-home')}/holdings`
const backOfficeCaller = 'lis-hubs-back-office'

/**
 * @param {Request} request
 * @returns {boolean} whether the back-office hub made the request
 */
function isFromBackOffice(request) {
  return request.auth.credentials.caller === backOfficeCaller
}

/**
 * @param {string} cph
 * @returns {Promise<{ cph: string, addressLines: string[] | null }>} the holding's CPH and address, with a null address when the holding is not found
 */
async function getCurrentLocation(cph) {
  try {
    const holding = await cattleHomeBe4FeClient.getHoldingDetails(cph)
    return { cph, addressLines: holding.address.filter(Boolean) }
  } catch (error) {
    if (error.statusCode === statusCodes.notFound) {
      return { cph, addressLines: null }
    }
    throw error
  }
}

export const cattleDetailsController = {
  async handler(request, h) {
    const record = await cattleHomeBe4FeClient.getCattleDetails(
      request.params.earTag
    )

    // Temporary fallback while the cattle record may have no cph.
    // Once the record always carries it, use record.cph alone.
    const cph = record.cph || getReferringHoldingCph(request)
    const cattle = buildCattleDetailsViewModel(record)
    const formattedEarTag = formatEarTag(cattle.eartag)

    return h.view('animals/index', {
      pageTitle: `Cattle details - ${formattedEarTag}`,
      formattedEarTag,
      cattle,
      currentLocation:
        isFromBackOffice(request) && cph ? await getCurrentLocation(cph) : null,
      backLinkHref:
        getSameHostReferrerPath(request) ??
        (cph && `${holdingsBasePath}/${cph}/animals`)
    })
  }
}
