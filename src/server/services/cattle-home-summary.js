/**
 * @param {{ cattleHomeApi: object, userId: string, traceId?: string }} options
 * @returns {Promise<{ holdings: object[], totalCattle: number }>}
 */
export async function buildCattleHomeSummary({
  cattleHomeApi,
  userId,
  traceId
}) {
  const cphResponse = await cattleHomeApi.getCphsForUser(userId, traceId)
  const holdings = await Promise.all(
    cphResponse.data.map(async (holding) => {
      const cattleResponse = await cattleHomeApi.getCattleForCph(
        holding.cph,
        traceId
      )

      return {
        ...holding,
        cattle: cattleResponse.data.map(addDisplayStatus),
        cattleCount: cattleResponse.data.length
      }
    })
  )

  return {
    holdings,
    totalCattle: holdings.reduce(
      (total, holding) => total + holding.cattleCount,
      0
    )
  }
}

function addDisplayStatus(animal) {
  const isValidated = animal.status === 'saved'

  return {
    ...animal,
    statusLabel: isValidated ? 'Validated' : 'Pending',
    statusClass: isValidated ? 'govuk-tag--green' : 'govuk-tag--blue'
  }
}
