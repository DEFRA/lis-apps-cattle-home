import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from '@livestock/taxonomy-home'
import { species } from '@livestock/species-cattle'

export const homeController = {
  handler(request, h) {
    const displayName =
      [request.app.hubAuth?.firstName, request.app.hubAuth?.lastName]
        .filter(Boolean)
        .join(' ') || null
    const signedInAs =
      request.app.hubAuth?.email ??
      displayName ??
      request.app.hubAuth?.sub ??
      'Authenticated user'

    return h.view('home/index', {
      pageTitle: 'Home for Cattle',
      heading: 'Home for Cattle',
      caption: 'Spoke microsite',
      taxonomy,
      species,
      signedInAs,
      directPort: 3221,
      hubPath: buildMicrositePath(taxonomy.id, species.id),
      apiEndpoint: 'http://localhost:3000/api/species/cattle/taxonomies/home'
    })
  }
}
