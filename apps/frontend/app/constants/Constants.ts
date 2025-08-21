import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';

export const links = [
	{ title: 'about_us', path: '/about-us' },
	{ title: 'accessibility', path: '/accessibility' },
	{ title: 'privacy_policy', path: '/privacy-policy' },
	{ title: 'general_terms_and_conditions', path: '/terms-and-conditions' },
];

export const nutritionLabels = {
	fat_g: 'nutrition_fat',
	protein_g: 'nutrition_protein',
	saturated_fat_g: 'nutrition_saturated_fat',
	sugar_g: 'nutrition_sugar',
	carbohydrate_g: 'nutrition_carbohydrate',
	calories_kcal: 'nutrition_calories',
	fiber_g: 'nutrition_fiber',
	salt_g: 'nutrition_salt',
};

export const canteensData = [
	{
		image: 'https://images.unsplash.com/photo-1530695801911-f188c516550a',
		name: 'Cafe Corner',
	},
	{
		image: 'https://images.unsplash.com/photo-1572701190183-822417d47bda',
		name: 'Bistro Bliss',
	},
	{
		image: 'https://images.unsplash.com/photo-1486485764572-92b96f21882a',
		name: 'Treat Street',
	},
	{
		image: 'https://images.unsplash.com/photo-1694407907600-ff922f65f229',
		name: 'Meal Oasis',
	},
	{
		image: 'https://images.unsplash.com/photo-1482739627503-c2cb4fc17328',
		name: 'Urban Bites',
	},
	{
		image: 'https://images.unsplash.com/photo-1538334421852-687c439c92f4',
		name: 'Delight Deli',
	},
];

export const FOOD_DATA = [
	{
		id: 1,
		foodName: 'Margherita Pizza',
		image: 'https://images.unsplash.com/photo-1573821663912-6df460f9c684',
		logo: 'https://images.unsplash.com/photo-1612222869049-d8ec83637a3c',
		price: 12.99,
	},
	{
		id: 2,
		foodName: 'Cheeseburger',
		image: 'https://images.unsplash.com/photo-1534790566855-4cb788d389ec',
		logo: 'https://images.unsplash.com/photo-1612222869049-d8ec83637a3c',
		price: 8.99,
	},
	{
		id: 3,
		foodName: 'Sushi Platter',
		image: 'https://images.unsplash.com/photo-1570877215023-229052e10c34',
		logo: 'https://images.unsplash.com/photo-1612222869049-d8ec83637a3c',
		price: 18.49,
	},
	{
		id: 4,
		foodName: 'Pasta Carbonara',
		image: 'https://images.unsplash.com/photo-1556761223-4c4282c73f77',
		logo: 'https://images.unsplash.com/photo-1612222869049-d8ec83637a3c',
		price: 11.99,
	},
	{
		id: 5,
		foodName: 'Grilled Salmon',
		image: 'https://images.unsplash.com/photo-1676300184021-96fa00e1a987',
		logo: 'https://images.unsplash.com/photo-1612222869049-d8ec83637a3c',
		price: 16.75,
	},
	{
		id: 6,
		foodName: 'Chicken Tacos',
		image: 'https://images.unsplash.com/photo-1570461226513-e08b58a52c53',
		logo: 'https://images.unsplash.com/photo-1612222869049-d8ec83637a3c',
		price: 9.99,
	},
	{
		id: 7,
		foodName: 'Caesar Salad',
		image: 'https://images.unsplash.com/photo-1633368475188-1f39151aa4e4',
		logo: 'https://images.unsplash.com/photo-1612222869049-d8ec83637a3c',
		price: 7.49,
	},
	{
		id: 8,
		foodName: 'BBQ Ribs',
		image: 'https://images.unsplash.com/photo-1606157715507-e106be6ab0b0',
		logo: 'https://images.unsplash.com/photo-1612222869049-d8ec83637a3c',
		price: 14.99,
	},
	{
		id: 9,
		foodName: 'Vegetable Stir Fry',
		image: 'https://images.unsplash.com/uploads/141143339879512fe9b0d/f72e2c85',
		logo: 'https://images.unsplash.com/photo-1612222869049-d8ec83637a3c',
		price: 10.49,
	},
	{
		id: 10,
		foodName: 'Chocolate Cake',
		image: 'https://images.unsplash.com/photo-1586985289906-406988974504',
		logo: 'https://images.unsplash.com/photo-1612222869049-d8ec83637a3c',
		price: 6.99,
	},
];
export const campuses = [
	{
		id: 1,
		campusName: 'Green Valley University',
		imageUrl: 'https://images.unsplash.com/photo-1530695801911-f188c516550a',
		distance: 1200, // in meters
	},
	{
		id: 2,
		campusName: 'Sunrise College',
		imageUrl: 'https://images.unsplash.com/photo-1538334421852-687c439c92f4',
		distance: 2300, // in meters
	},
	{
		id: 3,
		campusName: 'Ocean View Institute',
		imageUrl: 'https://images.unsplash.com/photo-1572701190183-822417d47bda',
		distance: 1500, // in meters
	},
	{
		id: 4,
		campusName: 'Maple Leaf Academy',
		imageUrl: 'https://images.unsplash.com/photo-1482739627503-c2cb4fc17328',
		distance: 3100, // in meters
	},
	{
		id: 5,
		campusName: 'Pine Hill University',
		imageUrl: 'https://images.unsplash.com/photo-1530695801911-f188c516550a',
		distance: 2500, // in meters
	},
	{
		id: 6,
		campusName: 'Riverstone College',
		imageUrl: 'https://images.unsplash.com/photo-1538334421852-687c439c92f4',
		distance: 4000, // in meters
	},
	{
		id: 7,
		campusName: 'Starlight Institute',
		imageUrl: 'https://images.unsplash.com/photo-1572701190183-822417d47bda',
		distance: 1900, // in meters
	},
	{
		id: 8,
		campusName: 'Horizon Academy',
		imageUrl: 'https://images.unsplash.com/photo-1482739627503-c2cb4fc17328',
		distance: 2700, // in meters
	},
	{
		id: 9,
		campusName: 'Evergreen University',
		imageUrl: 'https://images.unsplash.com/photo-1530695801911-f188c516550a',
		distance: 3400, // in meters
	},
	{
		id: 10,
		campusName: 'Summit College',
		imageUrl: 'https://images.unsplash.com/photo-1538334421852-687c439c92f4',
		distance: 4100, // in meters
	},
];

export const blurhash =
	'|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

export const languageCode = 'en';
export const itemStatus = 'published';
// export const languageCode = 'de';

// let assetId: string | DirectusFiles | null | undefined = undefined
// let image_url: string | undefined = undefined
// let thumb_hash: string | undefined = undefined
// if (typeof resource !== 'string') {
//   if (resource?.image) {
//     assetId = resource.image
//   }
//   if (resource?.image_remote_url) {
//     image_url = resource.image_remote_url
//   }
//   if (resource?.image_thumb_hash) {
//     thumb_hash = resource.image_thumb_hash
//   }
// }
