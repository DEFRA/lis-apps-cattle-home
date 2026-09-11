import { intervalToDuration } from 'date-fns'

/**
 * @param {string} dateOfBirth ISO date string
 * @param {Date} [now]
 * @returns {string} e.g. "3 years, 6 months"
 */
export function computeAge(dateOfBirth, now = new Date()) {
  // intervalToDuration omits a unit entirely (rather than returning 0) when
  // its value is zero, so years/months need a default.
  const { years = 0, months = 0 } = intervalToDuration({
    start: new Date(dateOfBirth),
    end: now
  })

  return `${years} year${years === 1 ? '' : 's'}, ${months} month${months === 1 ? '' : 's'}`
}
