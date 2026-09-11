// Steel-thread placeholder holding data, standing in for be4fe/cattle-home
// until it's wired to lis-fake-service (LREG-457/458). CPHs match
// fake/service's user fixtures (fake/service/data/fixtures/users.json) so
// holding access lines up with login. Each holding matches the shape of
// be4fe/cattle-home's UserCph response model (see cattle-home-be4fe-client.js);
// display fields not modelled in fake/service are invented.

/**
 * @param {{ cph: string, name: string, businessName: string, addressLine2: string, town: string, county: string, postcode: string, herdMark: string }} fields
 * @returns {object} a UserCph-shaped holding
 */
function buildHolding({
  cph,
  name,
  businessName,
  addressLine2,
  town,
  county,
  postcode,
  herdMark
}) {
  return {
    cph,
    name,
    business_name: businessName,
    address: [name, addressLine2, town, county, postcode, 'England'],
    allowed_species: ['ctt'],
    herd_marks: [herdMark]
  }
}

const fairfieldLivestockLtd = 'Fairfield Livestock Ltd'

// [cph, name, addressLine2, postcode, herdMark] - all in Lavendon, Buckinghamshire
const fairfieldHoldingRows = [
  ['22/002/0002', 'Fairfield Farm', 'Manor Road', 'MK1 1AA', 'UK 324787'],
  ['22/003/0003', 'Meadow View Farm', 'Mill Lane', 'MK1 1AB', 'UK 324788'],
  ['22/004/0004', 'Hilltop Farm', 'Ridge Road', 'MK1 1AC', 'UK 324789'],
  ['22/005/0005', 'Riverside Farm', 'Riverbank Lane', 'MK1 1AD', 'UK 324790'],
  ['22/006/0006', 'Long Acre Farm', 'Long Lane', 'MK1 1AE', 'UK 324791'],
  ['22/007/0007', 'Orchard Farm', 'Orchard Road', 'MK1 1AF', 'UK 324792']
]

const holdingsByUserId = {
  'oakfield.farmer@oakhill-farms.co.uk': [
    buildHolding({
      cph: '22/001/0001',
      name: 'Oakfield Farm',
      businessName: 'Oakfield Livestock Ltd',
      addressLine2: 'Church Lane',
      town: 'Shrewsbury',
      county: 'Shropshire',
      postcode: 'SY4 1AB',
      herdMark: 'UK 324537'
    })
  ],
  'fairfield.farmer@fairfield-farms.co.uk': fairfieldHoldingRows.map(
    ([cph, name, addressLine2, postcode, herdMark]) =>
      buildHolding({
        cph,
        name,
        businessName: fairfieldLivestockLtd,
        addressLine2,
        town: 'Lavendon',
        county: 'Buckinghamshire',
        postcode,
        herdMark
      })
  )
}

/**
 * @param {string} userId
 * @returns {object[]} the holdings this user keeps
 */
export function getHoldingsForUser(userId) {
  return holdingsByUserId[userId] ?? []
}

/**
 * @param {string} cph holding identifier
 * @returns {object|undefined} the holding with this CPH, if any
 */
export function getHoldingByCph(cph) {
  return Object.values(holdingsByUserId)
    .flat()
    .find((holding) => holding.cph === cph)
}
