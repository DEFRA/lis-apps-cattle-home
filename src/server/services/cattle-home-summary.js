/**
 * @param {{ cattleHomeApi: object, userId: string, traceId?: string, logger?: object }} options
 * @returns {Promise<{ holdings: object[], totalCattle: number }>}
 */
export async function buildCattleHomeSummary({
  cattleHomeApi,
  userId,
  traceId,
  logger
}) {
  logger?.info?.(
    `Building cattle home summary [userId=${userId} | traceId=${traceId}]`
  )
  const cphResponse = await cattleHomeApi.getCphsForUser(userId, traceId)
  logger?.info?.(
    `Retrieved CPH data [holdingCount=${cphResponse.data.length} | traceId=${traceId}]`
  )

  const holdings = await Promise.all(
    cphResponse.data.map(async (holding) => {
      logger?.info?.(
        `Processing holding [cph=${holding.cph} | traceId=${traceId}]`
      )

      const cattleResponse = await cattleHomeApi.getCattleForCph(
        holding.cph,
        traceId
      )

      logger?.info?.(
        `Retrieved cattle data for holding [cph=${holding.cph} | cattleCount=${cattleResponse.data.length} | traceId=${traceId}]`
      )

      return {
        ...holding,
        cattle: cattleResponse.data.map(addDisplayStatus),
        cattleCount: cattleResponse.data.length
      }
    })
  )

  const summary = {
    holdings,
    totalCattle: holdings.reduce(
      (total, holding) => total + holding.cattleCount,
      0
    )
  }

  logger?.info?.(
    `Cattle home summary completed [holdingCount=${summary.holdings.length} | totalCattle=${summary.totalCattle} | traceId=${traceId}]`
  )

  return summary
}

function addDisplayStatus(animal) {
  const isValidated = animal.status === 'saved'

  return {
    ...animal,
    statusLabel: isValidated ? 'Validated' : 'Pending',
    statusClass: isValidated ? 'govuk-tag--green' : 'govuk-tag--blue'
  }
}
