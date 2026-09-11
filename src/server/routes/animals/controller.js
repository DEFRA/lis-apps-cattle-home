import escapeHtml from 'lodash/escape.js'

import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'
import { statusCodes } from '@defra/lis-infra-ui-services/status-codes'

import { getAnimalsForCph } from '#server/services/canned-animals.js'
import { getHoldingByCph } from '#server/services/canned-holdings.js'
import { computeAge } from '#server/services/animal-age.js'
import { getBreedName } from '#server/services/breed-names.js'
import { cphFromParams } from '../holdings/controller.js'

const holdingsBasePath = `${getBasePathForModule('cattle-home')}/holdings`

export const animalsOnHoldingController = {
  handler(request, h) {
    const cph = cphFromParams(request.params)
    const holding = getHoldingByCph(cph)

    if (!holding) {
      return h.response('Page not found').code(statusCodes.notFound)
    }

    const search = request.query.search?.trim() || ''
    const sort = request.query.sort || 'ear_tag'
    const direction = request.query.direction === 'desc' ? 'desc' : 'asc'
    const {
      animals: pageAnimals,
      totalItems,
      totalPages,
      currentPage,
      itemsPerPage
    } = getAnimalsForCph(cph, {
      search,
      sort,
      direction,
      page: Number(request.query.page) || 1
    })

    return h.view('animals/index', {
      pageTitle: 'Animals on holding',
      holding,
      columns: [
        { text: 'Ear tag number', sortKey: 'ear_tag' },
        { text: 'Date of birth', sortKey: 'date_of_birth' },
        { text: 'Age', sortKey: 'age' },
        { text: 'Date on holding', sortKey: 'date_on_cph' },
        { text: 'Sex', sortKey: 'sex' },
        { text: 'Breed', sortKey: 'breed' }
      ],
      rows: pageAnimals.map((animal) => {
        const breedCode = escapeHtml(animal.breed_code)
        const breedName = escapeHtml(getBreedName(animal.breed_code))

        return [
          { text: animal.eartag },
          { text: animal.date_of_birth },
          { text: computeAge(animal.date_of_birth) },
          { text: animal.date_on_cph },
          { text: animal.sex },
          {
            html: `<abbr title="${breedName}">${breedCode}</abbr><span class="govuk-visually-hidden">, ${breedName}</span>`
          }
        ]
      }),
      search,
      totalItems,
      sort,
      direction,
      baseHref: `${holdingsBasePath}/${cph}/animals`,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        itemsPerPage
      },
      tabs: [
        {
          text: 'Holding details',
          href: `${holdingsBasePath}/${cph}`
        },
        {
          text: 'Animals on holding',
          href: `${holdingsBasePath}/${cph}/animals`,
          active: true
        }
      ]
    })
  }
}
