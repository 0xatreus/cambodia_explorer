// Turns an approved suggestion from /api/community-places into the shape the map and list read.
export function suggestionToPlace(suggestion) {
  const description = suggestion.description || 'Recommended by a fellow traveller.'
  return {
    id: `community-${suggestion.id}`,
    suggestionId: suggestion.id,
    name: suggestion.name,
    city: suggestion.province,
    province: suggestion.province,
    category: suggestion.category,
    coords: [suggestion.lat, suggestion.lng],
    cost: 0,
    time: 1.5,
    description,
    tip: 'Suggested by the community. Check opening details locally before you go.',
    tag: 'Community pick',
    tags: suggestion.tags,
    vibeTags: suggestion.tags,
    dietaryTags: suggestion.tags,
    image: suggestion.photoUrl || '',
    communityPick: true,
    likes: suggestion.likes ?? 0,
    liked: Boolean(suggestion.liked),
  }
}
