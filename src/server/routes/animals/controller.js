import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'
import { isFromBackOffice } from '#server/common/helpers/hub.js'
import { getSameHostReferrerPath } from './referrer.js'
import { buildCattleDetailsViewModel } from './view-model.js'

const basePath = getBasePathForModule('cattle-home')
const holdingsBasePath = `${basePath}/holdings`
const animalsBasePath = `${basePath}/animals`

/**
 * The back office links a dam to its own record when the dam is currently
 * on the same holding as the animal (BO-597-08). A dam elsewhere, or not
 * known to CADS, is shown as plain text.
 *
 * @param {string | null} damTag
 * @param {string} cph the animal's current holding
 * @returns {Promise<string | null>} the dam's detail path, or null
 */
async function getDamHref(damTag, cph) {
  if (!damTag || !cph) {
    return null
  }
  try {
    const dam = await cattleHomeBe4FeClient.getCattleDetails(damTag)
    return dam.current_location?.identifier === cph
      ? `${animalsBasePath}/${encodeURIComponent(damTag)}`
      : null
  } catch (error) {
    if (error.statusCode === statusCodes.notFound) {
      return null
    }
    throw error
  }
}

/**
 * @param {{ geneticDamTag: string | null, surrogateTag: string | null }} dam
 * @param {string} cph
 * @returns {Promise<{ genetic: string | null, surrogate: string | null }>}
 */
async function getDamHrefs(dam, cph) {
  const [genetic, surrogate] = await Promise.all([
    getDamHref(dam.geneticDamTag, cph),
    getDamHref(dam.surrogateTag, cph)
  ])
  return { genetic, surrogate }
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
    const { record } = request.pre
    const cph = record.current_location.identifier
    const cattle = buildCattleDetailsViewModel(record)
    const formattedEarTag = formatEarTag(cattle.eartag)
    const isBackOffice = isFromBackOffice(request)

    return h.view('animals/index', {
      pageTitle: isBackOffice
        ? `${formattedEarTag} - Registered animal`
        : `Cattle details - ${formattedEarTag}`,
      formattedEarTag,
      cattle,
      currentLocation: isBackOffice ? await getCurrentLocation(cph) : null,
      damHrefs: isBackOffice
        ? await getDamHrefs(cattle.dam, cph)
        : { genetic: null, surrogate: null },
      backLinkHref:
        getSameHostReferrerPath(request) ?? `${holdingsBasePath}/${cph}/animals`
    })
  }
}
