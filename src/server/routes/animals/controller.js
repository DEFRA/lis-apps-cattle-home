import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'
import { isFromBackOffice } from '#server/common/helpers/hub.js'
import { getSameHostReferrerPath } from './referrer.js'
import { birthHoldingCph, buildCattleDetailsViewModel } from './view-model.js'

const holdingsBasePath = `${getBasePathForModule('cattle-home')}/holdings`

/**
 * @param {string} cph
 * @returns {Promise<{ cph: string, addressLines: string[] | null }>} the holding's CPH and address, with a null address when the holding is not found
 */
async function getLocation(cph) {
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
    const { record } = request.pre
    const cph = record.current_location.identifier
    const cattle = buildCattleDetailsViewModel(record)
    const formattedEarTag = formatEarTag(cattle.eartag)
    const birthCph = birthHoldingCph(record)
    const [currentLocation, placeOfBirth] = isFromBackOffice(request)
      ? await Promise.all([
          getLocation(cph),
          birthCph ? getLocation(birthCph) : null
        ])
      : [null, null]

    return h.view('animals/index', {
      pageTitle: `Cattle details - ${formattedEarTag}`,
      formattedEarTag,
      cattle,
      currentLocation,
      placeOfBirth,
      backLinkHref:
        getSameHostReferrerPath(request) ?? `${holdingsBasePath}/${cph}/animals`
    })
  }
}
