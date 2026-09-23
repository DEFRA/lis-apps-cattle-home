import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'
import { formatEarTag } from '@defra/lis-infra-ui-services/nunjucks/filters'

import { getCannedCattleDetails } from '#server/services/canned-animals.js'
import { buildCattleDetailsViewModel } from './view-model.js'

const holdingsBasePath = `${getBasePathForModule('cattle-home')}/holdings`

export const cattleDetailsController = {
  async handler(request, h) {
    const record = getCannedCattleDetails(request.params.earTag)

    if (!record) {
      return h.response('Page not found').code(statusCodes.notFound)
    }

    const cattle = buildCattleDetailsViewModel(record)
    const formattedEarTag = formatEarTag(cattle.eartag)

    return h.view('animals/index', {
      pageTitle: `Cattle details - ${formattedEarTag}`,
      formattedEarTag,
      cattle,
      backLinkHref: `${holdingsBasePath}/${record.cph}/animals`
    })
  }
}
