/** @import { Request } from '@hapi/hapi' */
/**
 * The browser sends the hub's public URL as the referrer, and the hub proxy
 * passes the host it was called on as x-forwarded-host, so the two are
 * compared to keep the back link on the current domain.
 *
 * @param {Request} request
 * @returns {string | undefined} the referrer's path and query, when it is on the same host as the request
 */
export function getSameHostReferrerPath(request) {
  const { referer } = request.headers
  if (!referer) {
    return undefined
  }

  let refererUrl
  try {
    refererUrl = new URL(referer)
  } catch {
    return undefined
  }

  const requestHost = (
    request.headers['x-forwarded-host'] ??
    request.headers.host ??
    ''
  )
    .split(',')[0]
    .trim()

  // A path starting with // would make the link protocol-relative, i.e.
  // another site.
  if (refererUrl.host !== requestHost || refererUrl.pathname.startsWith('//')) {
    return undefined
  }

  return `${refererUrl.pathname}${refererUrl.search}`
}
