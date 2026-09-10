import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'

// Hardcoded to the steel-thread Oakfield Farm holding; there is no backend to
// call yet. Real data comes from be4fe/cattle-home under LREG-459's follow-up.
const holding = {
  cphNumber: '22/001/0001',
  holdingName: 'Oakfield Farm',
  businessName: 'Oakfield Livestock Ltd',
  addressLines: [
    'Oakfield Farm',
    'Church Lane',
    'Shrewsbury',
    'Shropshire',
    'SY4 1AB',
    'England'
  ],
  herdMark: 'UK 324537'
}

const holdingsBasePath = `${getBasePathForModule('cattle-home')}/holdings`

/**
 * @param {{ county?: string, parish?: string, holding?: string }} params route parameters
 * @returns {string|null} slash-separated CPH
 */
export function cphFromParams({ county, parish, holding: holdingNumber } = {}) {
  return county && parish && holdingNumber
    ? `${county}/${parish}/${holdingNumber}`
    : null
}

export const holdingDetailsController = {
  handler(request, h) {
    const cph = cphFromParams(request.params)

    return h.view('holdings/details', {
      pageTitle: 'Holding details',
      holding,
      tabs: [
        {
          text: 'Holding details',
          href: `${holdingsBasePath}/${cph}`,
          active: true
        }
      ]
    })
  }
}
