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
