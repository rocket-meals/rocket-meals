// Picks the day and canteen the store screenshots show. Today's food plan is a poor
// choice: dishes of the current week often have no photo yet. A past Monday has them,
// so the generator looks back over the last Mondays and takes the most recent one on
// which a canteen served enough dishes with a photo. The app is then told that this
// Monday is "today" (shifted clock) and which canteen to show (?canteens_id=).

const TIME_ZONE = 'Europe/Berlin';
const MONDAYS_TO_CHECK = 8;
/** A food plan with at least this many photographed dishes counts as good enough. */
const ENOUGH_DISHES_WITH_PHOTO = 4;

export type ShowcaseDay = {
  /** YYYY-MM-DD, a Monday */
  date: string;
  canteenId: string;
  canteenAlias: string;
  offers: number;
  offersWithPhoto: number;
};

type Canteen = { id: string; alias?: string | null };
type FoodOffer = { canteen?: string | null; food?: { image?: string | null; image_remote_url?: string | null } | null };

function berlinIsoDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** The last Mondays before today (Berlin), most recent first. */
export function getPastMondays(now: Date, count: number = MONDAYS_TO_CHECK): string[] {
  const dayMs = 24 * 60 * 60 * 1000;
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short' }).format(now);
  const daysSinceMonday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday);
  // "Before today": on a Monday the last Monday is a week ago.
  const lastMondayOffset = daysSinceMonday === 0 ? 7 : daysSinceMonday;
  return Array.from({ length: count }, (_, week) => berlinIsoDate(new Date(now.getTime() - (lastMondayOffset + week * 7) * dayMs)));
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} antwortete mit ${response.status}`);
  }
  return ((await response.json()) as { data: T }).data;
}

function query(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export async function findShowcaseDay(serverUrl: string, now: Date = new Date()): Promise<ShowcaseDay | undefined> {
  // Same canteens, same order as the app loads them in kiosk mode.
  const canteens = await getJson<Canteen[]>(`${serverUrl}/items/canteens?${query({ 'filter[status][_eq]': 'published', fields: 'id,alias', limit: '-1' })}`);
  const published = new Map(canteens.map(canteen => [String(canteen.id), canteen]));
  if (published.size === 0) return undefined;

  const candidates: ShowcaseDay[] = [];
  for (const date of getPastMondays(now)) {
    const offers = await getJson<FoodOffer[]>( // NOSONAR S9382 - newest Monday first, stops at the first good one
      `${serverUrl}/items/foodoffers?${query({ 'filter[date][_eq]': date, fields: 'canteen,food.image,food.image_remote_url', limit: '-1' })}`
    );
    const perCanteen = new Map<string, { offers: number; withPhoto: number }>();
    for (const offer of offers) {
      const canteenId = offer.canteen ? String(offer.canteen) : '';
      if (!published.has(canteenId)) continue;
      const entry = perCanteen.get(canteenId) ?? { offers: 0, withPhoto: 0 };
      entry.offers++;
      if (offer.food?.image || offer.food?.image_remote_url) entry.withPhoto++;
      perCanteen.set(canteenId, entry);
    }
    const best = [...perCanteen.entries()].sort((a, b) => b[1].withPhoto - a[1].withPhoto || b[1].offers - a[1].offers)[0];
    if (!best) continue;
    const day: ShowcaseDay = {
      date,
      canteenId: best[0],
      canteenAlias: published.get(best[0])?.alias ?? best[0],
      offers: best[1].offers,
      offersWithPhoto: best[1].withPhoto,
    };
    if (day.offersWithPhoto >= ENOUGH_DISHES_WITH_PHOTO) return day;
    candidates.push(day);
  }
  // No Monday was good enough: take the one with the most photos (newest wins a tie).
  return candidates.sort((a, b) => b.offersWithPhoto - a.offersWithPhoto || b.offers - a.offers)[0];
}

/** 11:30 Berlin time on the given day (lunch, every canteen open). */
export function lunchTimeOn(isoDate: string): Date {
  const noonUtc = new Date(`${isoDate}T12:00:00Z`);
  const offsetPart = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'longOffset' })
    .formatToParts(noonUtc)
    .find(part => part.type === 'timeZoneName')?.value;
  const offset = offsetPart && offsetPart !== 'GMT' ? offsetPart.slice(3) : '+00:00';
  return new Date(`${isoDate}T11:30:00${offset}`);
}
