const route = (from, to) => `${from}|${to}`

export const INTERCITY_TRANSPORT = {
  [route('Phnom Penh', 'Siem Reap')]: [
    { mode: 'Day bus', title: 'Giant Ibis or Virak Buntham coach', time: '5.5-7h', cost: '$12-18', detail: 'The straightforward budget option with several daily departures. Choose a daytime departure if you want to arrive with energy.', fit: 'Best value' },
    { mode: 'Night bus', title: 'Sleeper bus', time: '6-8h overnight', cost: '$15-25', detail: 'Useful for saving one hotel night, but read the berth layout carefully and keep valuables close.', fit: 'Save a night' },
    { mode: 'Private car', title: 'Private driver or shared taxi', time: '5-6h', cost: '$75-120 per car', detail: 'More comfortable and flexible for families or groups. Stop at roadside food stalls or Kampong Thom on the way.', fit: 'Most flexible' },
    { mode: 'Flight', title: 'Domestic flight', time: 'About 1h in air', cost: '$45-120+', detail: 'Fastest on paper, but add airport transfers, check-in, and schedule changes. Compare the full door-to-door time.', fit: 'Fastest' },
  ],
  [route('Siem Reap', 'Battambang')]: [
    { mode: 'Day bus', title: 'Minivan or coach', time: '3-4h', cost: '$10-18', detail: 'Frequent and simple. Minivans can be faster but tighter with luggage.', fit: 'Easy transfer' },
    { mode: 'Private car', title: 'Driver via Sisophon', time: '3-4h', cost: '$55-90 per car', detail: 'Worth considering if you want to stop at countryside temples or travel with several people.', fit: 'Best for stops' },
    { mode: 'Shared taxi', title: 'Local shared taxi', time: '3-4h', cost: '$10-20 per seat', detail: 'Often quicker to fill than a bus, but comfort and departure time depend on the day.', fit: 'Local option' },
  ],
  [route('Battambang', 'Phnom Penh')]: [
    { mode: 'Day bus', title: 'Coach or minivan', time: '4.5-6h', cost: '$12-20', detail: 'The most common connection. Leave early if you have a timed plan in Phnom Penh.', fit: 'Simple' },
    { mode: 'Private car', title: 'Private driver', time: '4-5h', cost: '$70-110 per car', detail: 'Good for families, luggage, or a stop at Oudong on the way south.', fit: 'Comfortable' },
    { mode: 'Train', title: 'Royal Railway', time: 'Variable, often 6h+', cost: '$7-15', detail: 'A slower, atmospheric option when the timetable works. Confirm the current service before planning around it.', fit: 'Scenic' },
  ],
  [route('Phnom Penh', 'Kampot')]: [
    { mode: 'Train', title: 'Royal Railway southbound', time: 'About 3-4h', cost: '$5-10', detail: 'A relaxed scenic choice when the service is running. Check the latest timetable and station transfer.', fit: 'Scenic value' },
    { mode: 'Day bus', title: 'Giant Ibis, Vibol, or minivan', time: '3-4h', cost: '$8-15', detail: 'Frequent and convenient from central Phnom Penh. Book ahead around weekends and holidays.', fit: 'Most practical' },
    { mode: 'Private car', title: 'Private driver', time: '2.5-3.5h', cost: '$45-75 per car', detail: 'Useful if combining Kampot with Kep or pepper farms on the same day.', fit: 'Best for a loop' },
  ],
  [route('Kampot', 'Kep')]: [
    { mode: 'Tuk-tuk', title: 'Remork or tuk-tuk', time: '45-75 min', cost: '$15-25 per ride', detail: 'Easy for a day trip, especially if you agree on a return time and wait price.', fit: 'Best day trip' },
    { mode: 'Train', title: 'Royal Railway coastal leg', time: 'About 1h', cost: '$3-6', detail: 'A scenic option when the schedule lines up. It is slower door-to-door than the road.', fit: 'Low cost' },
    { mode: 'Taxi', title: 'Private taxi', time: '45-60 min', cost: '$20-35', detail: 'Comfortable for two to four people with a fixed pickup and return.', fit: 'Comfortable' },
  ],
  [route('Kampot', 'Koh Rong')]: [
    { mode: 'Bus + ferry', title: 'Transfer to Sihanoukville, then speed ferry', time: '3.5-5h total', cost: '$20-35', detail: 'The standard route. Leave a buffer between road and ferry tickets because weather can shift boat times.', fit: 'Most common' },
    { mode: 'Private transfer', title: 'Car to the pier + ferry', time: '3-4.5h total', cost: '$60-110 per car plus ferry', detail: 'Good for groups carrying beach gear or catching an early boat.', fit: 'Less waiting' },
    { mode: 'Shared minivan', title: 'Kampot to Sihanoukville minivan', time: '2.5-3.5h to pier', cost: '$8-15 plus ferry', detail: 'Budget-friendly, but confirm which Sihanoukville pier the driver uses.', fit: 'Budget' },
  ],
  [route('Phnom Penh', 'Kep')]: [
    { mode: 'Train', title: 'Royal Railway southbound', time: 'About 4-5h', cost: '$6-12', detail: 'A scenic route if the current service fits your day.', fit: 'Scenic' },
    { mode: 'Day bus', title: 'Coach or minivan via Kampot', time: '4-5h', cost: '$10-18', detail: 'The practical road option. Some services require changing in Kampot.', fit: 'Practical' },
    { mode: 'Private car', title: 'Private driver', time: '3-4h', cost: '$55-90 per car', detail: 'Best if you want to combine Kep with a pepper farm or Kampot stop.', fit: 'Flexible' },
  ],
  [route('Phnom Penh', 'Kratie')]: [
    { mode: 'Day bus', title: 'Coach or minivan northeast', time: '5-6h', cost: '$12-20', detail: 'The normal overland route. Bring snacks and expect a rest stop.', fit: 'Budget' },
    { mode: 'Private car', title: 'Private driver', time: '4.5-5.5h', cost: '$75-120 per car', detail: 'Useful for combining Kratie with Kampong Cham or Mekong villages.', fit: 'Flexible' },
    { mode: 'Shared taxi', title: 'Shared taxi', time: '4.5-6h', cost: '$15-25 per seat', detail: 'Can be faster than a bus once full, but luggage space and departure time vary.', fit: 'Local option' },
  ],
  [route('Siem Reap', 'Preah Vihear')]: [
    { mode: 'Private car', title: 'Driver for the temple day', time: '3.5-5h each way', cost: '$90-150 per car', detail: 'The most realistic option for the remote temple. Treat it as a full-day or overnight plan.', fit: 'Recommended' },
    { mode: 'Bus + taxi', title: 'Bus toward Tbeng Meanchey, then local transfer', time: 'Variable', cost: '$20-45 plus taxi', detail: 'Cheaper but complicated. Confirm the final connection locally before committing.', fit: 'Adventurous' },
  ],
  [route('Phnom Penh', 'Mondulkiri')]: [
    { mode: 'Day bus', title: 'Virak Buntham or minivan to Sen Monorom', time: '6-8h', cost: '$15-25', detail: 'The common route into the eastern highlands. Choose a daytime departure for the mountain road.', fit: 'Most practical' },
    { mode: 'Private car', title: 'Private driver', time: '5-7h', cost: '$120-190 per car', detail: 'More comfortable and useful if you are carrying gear or continuing to waterfalls.', fit: 'Comfortable' },
  ],
  [route('Phnom Penh', 'Koh Kong')]: [
    { mode: 'Day bus', title: 'Coach or minivan west', time: '5-7h', cost: '$15-25', detail: 'Book a direct service where possible and confirm the arrival point in Koh Kong.', fit: 'Budget' },
    { mode: 'Private car', title: 'Private driver', time: '4.5-6h', cost: '$100-160 per car', detail: 'Useful for continuing into Tatai or arranging a remote Cardamom itinerary.', fit: 'Best for remote trips' },
  ],
}

export const LOCAL_TRANSPORT = {
  'Siem Reap': [
    { mode: 'Tuk-tuk / remork', title: 'Hire a driver for temple circuits', cost: '$18-30 per day', detail: 'Best for Angkor: agree the route, start time, and whether sunrise or distant temples cost extra.' },
    { mode: 'Scooter', title: 'Rent a motorcycle', cost: '$8-15 per day', detail: 'Flexible for confident riders. Carry your licence, helmet, water, and follow park rules.' },
    { mode: 'Bicycle', title: 'Cycle the small Angkor loop', cost: '$3-8 per day', detail: 'Lovely early in the day, but distances and heat add up quickly.' },
    { mode: 'Ride-hailing', title: 'Grab or PassApp', cost: 'Variable by ride', detail: 'Useful around town; coverage and pickup points can be less predictable near remote temples.' },
  ],
  'Phnom Penh': [
    { mode: 'Tuk-tuk', title: 'Grab or PassApp remork', cost: '$2-8 per ride', detail: 'The easiest city option. Confirm the plate and destination before getting in.' },
    { mode: 'Motorbike', title: 'Motorbike taxi', cost: '$1-5 per ride', detail: 'Fast in traffic for light luggage. Wear a helmet and avoid carrying valuables openly.' },
    { mode: 'Walking', title: 'Walk the central river and museum area', cost: 'Free', detail: 'Many central sights are close enough to combine on foot early in the morning.' },
    { mode: 'Private car', title: 'Car with driver for a full day', cost: '$30-60 per day', detail: 'Worth it for Choeung Ek, the Royal Palace, and multiple stops in heavy traffic.' },
  ],
  Kampot: [
    { mode: 'Tuk-tuk', title: 'Hire a remork for countryside days', cost: '$20-35 per day', detail: 'Best for pepper farms, Secret Lake, salt fields, and Bokor access planning.' },
    { mode: 'Bicycle', title: 'Cycle the town and river lanes', cost: '$3-7 per day', detail: 'Good for the compact center and nearby riverside roads before midday.' },
    { mode: 'Scooter', title: 'Rent a scooter for the coast and farms', cost: '$7-12 per day', detail: 'Use daylight, check brakes and tyres, and take extra care on rural roads.' },
    { mode: 'Kayak / paddle', title: 'Join a river outfitter', cost: '$15-30 per trip', detail: 'Choose an operator that provides safety equipment and checks river conditions.' },
  ],
  'Koh Rong': [
    { mode: 'Walking', title: 'Walk between nearby beaches', cost: 'Free', detail: 'The simplest option around the main village, but trails can be dark or rough after rain.' },
    { mode: 'Longtail boat', title: 'Water taxi between beaches', cost: '$10-30 per boat', detail: 'Useful for remote beaches and returning with luggage. Agree the fare before leaving.' },
    { mode: 'Scooter', title: 'Island motorbike rental', cost: '$10-20 per day', detail: 'Only where roads and rental rules allow; sandy tracks can be risky for inexperienced riders.' },
  ],
  Kep: [
    { mode: 'Tuk-tuk', title: 'Remork for the coast and park', cost: '$15-25 per day', detail: 'Easy for Crab Market, National Park, pagodas, and a return to town.' },
    { mode: 'Scooter', title: 'Rent a scooter', cost: '$7-12 per day', detail: 'Useful for the quiet coastal roads. Wear a helmet and avoid wet downhill corners.' },
    { mode: 'Bicycle', title: 'Cycle the seafront', cost: '$3-6 per day', detail: 'Best for a relaxed morning rather than the hillier park route.' },
  ],
  Battambang: [
    { mode: 'Tuk-tuk', title: 'Hire a driver for the countryside loop', cost: '$15-25 per day', detail: 'The easiest way to combine temples, caves, villages, and the bamboo train.' },
    { mode: 'Bicycle', title: 'Cycle the colonial center', cost: '$3-7 per day', detail: 'A good way to explore the compact center and riverfront before the heat.' },
    { mode: 'Scooter', title: 'Rent a scooter for outlying temples', cost: '$8-15 per day', detail: 'Use a local map and daylight; roads outside town vary in quality.' },
  ],
  Kratie: [
    { mode: 'Bicycle', title: 'Cycle Koh Trong', cost: '$3-6 per day', detail: 'A gentle way to see orchards, village lanes, and homestays at a human pace.' },
    { mode: 'Tuk-tuk', title: 'Hire a driver to Kampi', cost: '$15-30 return', detail: 'Agree the wait time for the dolphin area and return before dark.' },
    { mode: 'Boat', title: 'Community river boat', cost: '$10-25 per person', detail: 'Choose operators that keep distance from dolphins and avoid loud approaches.' },
  ],
  Mondulkiri: [
    { mode: 'Private driver', title: 'Hire a local 4x4 or driver', cost: '$45-80 per day', detail: 'The most reliable way to reach waterfalls, sanctuaries, and remote viewpoints.' },
    { mode: 'Scooter', title: 'Rent only with road confidence', cost: '$10-18 per day', detail: 'Long distances, red dirt, rain, and limited help make this unsuitable for many riders.' },
    { mode: 'Walking', title: 'Walk Sen Monorom locally', cost: 'Free', detail: 'Save vehicles for the countryside and explore cafes, viewpoints, and markets in town.' },
  ],
  'Preah Vihear': [
    { mode: 'Private car', title: 'Driver for remote temples', cost: '$60-120 per day', detail: 'Recommended for Preah Vihear and Koh Ker because distances and access are remote.' },
    { mode: 'Local 4x4', title: 'Transfer up the mountain', cost: 'Variable locally', detail: 'Confirm the official final ascent arrangement and ticket process on arrival.' },
  ],
  'Koh Kong': [
    { mode: 'Boat', title: 'Tatai or mangrove boat trip', cost: '$20-60 per boat', detail: 'Use a conservation-minded local operator and confirm tide and weather conditions.' },
    { mode: 'Tuk-tuk / taxi', title: 'Local transfer around Koh Kong', cost: 'Variable by route', detail: 'Arrange return transport before leaving town for remote trailheads or piers.' },
    { mode: 'Private driver', title: 'Driver for Cardamom routes', cost: '$50-100 per day', detail: 'Recommended for long, remote roads where phone coverage and services are limited.' },
  ],
}

export function getTransportOptions(from, to) {
  return INTERCITY_TRANSPORT[route(from, to)] || INTERCITY_TRANSPORT[route(to, from)] || []
}
