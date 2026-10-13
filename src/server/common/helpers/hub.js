/** @import { Request } from '@hapi/hapi' */

const backOfficeCaller = 'lis-hubs-back-office'

/**
 * @param {Request} request
 * @returns {boolean} whether the back-office hub made the request
 */
export function isFromBackOffice(request) {
  return request.auth?.credentials?.caller === backOfficeCaller
}
