import { getBasePathForModule } from '@defra/lis-hubs-infra-registry'

import { cattleHomeBe4FeClient } from '#server/services/cattle-home-be4fe-client.js'
import { computeAge } from '#server/services/animal-age.js'
import { getBreedName } from '#server/services/breed-names.js'
import { cphFromParams } from '../holdings/controller.js'

const holdingsBasePath = `${getBasePathForModule('cattle-home')}/holdings`

// The BE4FE returns every animal on a CPH in one unsorted, unfiltered
// list - it doesn't support search, sorting or pagination yet - so this
// renders that list as-is, as a single page.
export const animalsOnHoldingController = {
  async handler(request, h) {
    const cph = cphFromParams(request.params)
    const [holding, animals] = await Promise.all([
      cattleHomeBe4FeClient.getHoldingDetails(cph),
      cattleHomeBe4FeClient.getCattleForCph(cph)
    ])

    const totalItems = animals.length
    const baseHref = `${holdingsBasePath}/${cph}/animals`

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
      animals: animals.map((animal) => ({
        eartag: animal.eartag,
        dateOfBirth: animal.date_of_birth,
        age: animal.date_of_birth ? computeAge(animal.date_of_birth) : null,
        dateOnCph: animal.date_on_cph,
        sex: animal.sex,
        breedCode: animal.breed_code,
        breedName: getBreedName(animal.breed_code)
      })),
      search: '',
      totalItems,
      sort: 'ear_tag',
      direction: 'asc',
      baseHref,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems,
        itemsPerPage: totalItems
      },
      tabs: [
        {
          text: 'Holding details',
          href: `${holdingsBasePath}/${cph}`
        },
        {
          text: 'Animals on holding',
          href: baseHref,
          active: true
        }
      ]
    })
  }
}
