/**
 * mockServer.ts – Minimal Directus GET mock backend for Maestro end-to-end tests.
 *
 * Serves the shared fixtures from packages/common/src/testData/FoodOfferTestData.ts
 * so that the app shows a deterministic canteen and deterministic food offers,
 * matching exactly the data the unit tests run against.
 *
 * Scope (intentionally small, see repo discussion):
 * - Only GET requests are mocked. Directus write operations are answered with
 *   403 so the app degrades gracefully (anonymous mode does not need writes).
 * - Collections without fixtures return an empty list, which the app treats
 *   like an empty backend (screens render their empty states).
 * - A future improvement is to run a real Directus + database for e2e tests;
 *   until then this mock keeps the tests fast and deterministic.
 *
 * Usage (from apps/frontend/app):
 *   yarn maestro:mock-server            # starts on port 4030
 *   MOCK_SERVER_PORT=5000 yarn maestro:mock-server
 */

import * as http from 'http';
import { URL } from 'url';

import {
	getTestFoodoffers,
	TEST_APP_SETTINGS,
	TEST_CANTEEN,
} from '../../../../../packages/common/src/testData/FoodOfferTestData';

const PORT = Number(process.env.MOCK_SERVER_PORT) || 4030;

/** Returns today's date as YYYY-MM-DD in local time (same as the app requests). */
function getLocalDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Extracts the requested date (YYYY-MM-DD) from the Directus filter query params.
 * We only need any `date._gte` value to know which day is being requested.
 *
 * Two formats occur:
 * - Directus SDK sends the filter as one JSON string:
 *   `filter={"_and":[...{"date":{"_gte":"2026-07-14"}}...]}`
 * - axios serializes nested objects with bracket notation:
 *   `filter[_and][1][_or][0][_and][0][date][_gte]=2026-07-14`
 */
function extractRequestedDate(requestUrl: URL): string | null {
	// Bracket notation (axios)
	for (const [key, value] of requestUrl.searchParams.entries()) {
		if (key.startsWith('filter') && key.endsWith('[date][_gte]')) {
			return value;
		}
	}

	// JSON string (Directus SDK)
	const filterParam = requestUrl.searchParams.get('filter');
	if (!filterParam) return null;
	try {
		const filter = JSON.parse(filterParam);
		const found: string[] = [];
		const walk = (node: any): void => {
			if (!node || typeof node !== 'object') return;
			if (node.date && typeof node.date._gte === 'string') found.push(node.date._gte);
			for (const value of Object.values(node)) walk(value);
		};
		walk(filter);
		return found[0] ?? null;
	} catch {
		return null;
	}
}

function sendJson(res: http.ServerResponse, statusCode: number, body: unknown): void {
	const payload = JSON.stringify(body);
	res.writeHead(statusCode, {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(payload),
	});
	res.end(payload);
}

/** Handles GET /items/<collection>. Returns fixture data or an empty list. */
function handleItemsRequest(collection: string, requestUrl: URL, res: http.ServerResponse): void {
	switch (collection) {
		case 'app_settings':
			// Singleton collection: Directus returns an object, not an array.
			sendJson(res, 200, { data: TEST_APP_SETTINGS });
			return;
		case 'canteens':
			sendJson(res, 200, { data: [TEST_CANTEEN] });
			return;
		case 'foodoffers': {
			const requestedDate = extractRequestedDate(requestUrl);
			const today = getLocalDateString(new Date());
			// Only "today" has offers; other days are empty. This keeps the
			// element ids in the rendered list unique for Maestro assertions.
			if (requestedDate === null || requestedDate === today) {
				sendJson(res, 200, { data: getTestFoodoffers(requestedDate ?? today) });
			} else {
				sendJson(res, 200, { data: [] });
			}
			return;
		}
		default:
			sendJson(res, 200, { data: [] });
	}
}

const server = http.createServer((req, res) => {
	const method = req.method ?? 'GET';
	const requestUrl = new URL(req.url ?? '/', `http://localhost:${PORT}`);
	const pathname = requestUrl.pathname;

	// CORS: the app runs on a different origin (Expo dev server).
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

	// eslint-disable-next-line no-console
	console.log(`[mock-backend] ${method} ${pathname}${requestUrl.search}`);

	if (method === 'OPTIONS') {
		res.writeHead(204);
		res.end();
		return;
	}

	if (method !== 'GET') {
		// Only GET requests are mocked (see file header).
		sendJson(res, 403, { errors: [{ message: 'Mock backend only supports GET requests.' }] });
		return;
	}

	if (pathname === '/server/info') {
		sendJson(res, 200, {
			data: {
				project: {
					project_name: 'Rocket Meals Mock',
					project_descriptor: 'Maestro mock backend',
					project_logo: null,
					project_color: '#D14610',
					public_foreground: null,
					public_background: null,
					public_note: null,
					custom_css: null,
				},
			},
		});
		return;
	}

	if (pathname === '/server/health') {
		sendJson(res, 200, { status: 'ok' });
		return;
	}

	if (pathname === '/auth' || pathname.startsWith('/auth/')) {
		// No SSO providers in the mock; the anonymous flow does not need them.
		sendJson(res, 200, { data: [] });
		return;
	}

	if (pathname === '/users/me') {
		sendJson(res, 401, { errors: [{ message: 'Not authenticated (mock backend).' }] });
		return;
	}

	if (pathname.startsWith('/assets/')) {
		res.writeHead(404);
		res.end();
		return;
	}

	if (pathname.startsWith('/items/')) {
		const collection = pathname.split('/')[2] ?? '';
		handleItemsRequest(collection, requestUrl, res);
		return;
	}

	if (pathname.startsWith('/fields/')) {
		sendJson(res, 200, { data: [] });
		return;
	}

	sendJson(res, 200, { data: [] });
});

server.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`[mock-backend] Directus GET mock listening on http://localhost:${PORT}`);
	// eslint-disable-next-line no-console
	console.log(`[mock-backend] Foodoffers are served for today (${getLocalDateString(new Date())}) only.`);
});
