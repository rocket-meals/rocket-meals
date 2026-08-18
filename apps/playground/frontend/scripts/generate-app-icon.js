// Generates assets/icons/app_icon_source.png (1024x1024) without any native
// image tooling: the icon is rasterized per pixel and written as PNG via node's
// built-in zlib (same approach as apps/tag-und-jahr). Re-run with
// `node scripts/generate-app-icon.js` after changing the colors in
// constants/theme.ts (kept in sync by hand).
//
// Motif: a play triangle inside a rounded "screen", i.e. a sandbox to press
// play in - the playground hosts runnable experiments.
const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');

const SIZE = 1024;
const CENTER = SIZE / 2;

// Same palette as constants/theme.ts
const BACKGROUND = [0x12, 0x14, 0x1f];
const SCREEN = [0x1d, 0x21, 0x33];
const SCREEN_BORDER = [0x2c, 0x31, 0x49];
const ACCENT = [0x3a, 0xd0, 0xc4];

// Geometry, all relative to the icon size. Everything stays inside the central
// 66% of the canvas so Android's adaptive-icon mask cannot crop the screen.
const SCREEN_HALF_WIDTH = 0.26 * SIZE;
const SCREEN_HALF_HEIGHT = 0.21 * SIZE;
const SCREEN_RADIUS = 0.055 * SIZE;
const SCREEN_BORDER_WIDTH = 0.018 * SIZE;
// Equilateral play triangle, pointing right, centered by its centroid.
const TRIANGLE_RADIUS = 0.105 * SIZE;

function smoothstep(edge0, edge1, x) {
	const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
	return t * t * (3 - 2 * t);
}

// Signed distance to a rounded rectangle centered at (cx, cy); negative inside.
function roundedRectDistance(px, py, cx, cy, halfWidth, halfHeight, radius) {
	const dx = Math.abs(px - cx) - (halfWidth - radius);
	const dy = Math.abs(py - cy) - (halfHeight - radius);
	const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
	return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

// Signed distance to a triangle given by its three corners; negative inside.
// (Standard "max of the three half-plane distances" for a convex polygon.)
function triangleDistance(px, py, corners) {
	let distance = Number.NEGATIVE_INFINITY;
	for (let i = 0; i < corners.length; i++) {
		const [ax, ay] = corners[i];
		const [bx, by] = corners[(i + 1) % corners.length];
		const edgeX = bx - ax;
		const edgeY = by - ay;
		const length = Math.hypot(edgeX, edgeY);
		// Outward normal of a clockwise-wound triangle in screen coordinates.
		const halfPlane = ((px - ax) * edgeY - (py - ay) * edgeX) / length;
		distance = Math.max(distance, halfPlane);
	}
	return distance;
}

// 1 inside the shape, 0 outside, ~1px soft edge
function coverage(distance) {
	return 1 - smoothstep(-1, 1, distance);
}

function blend(base, color, amount) {
	return [
		base[0] + (color[0] - base[0]) * amount,
		base[1] + (color[1] - base[1]) * amount,
		base[2] + (color[2] - base[2]) * amount,
	];
}

const triangleCorners = [0, 120, 240].map((degrees) => {
	// 0° is the tip of the play triangle, pointing to the right.
	const radians = (degrees * Math.PI) / 180;
	return [CENTER + TRIANGLE_RADIUS * Math.cos(radians), CENTER + TRIANGLE_RADIUS * Math.sin(radians)];
});

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
	const rowStart = y * (SIZE * 4 + 1);
	raw[rowStart] = 0; // PNG filter type: None
	for (let x = 0; x < SIZE; x++) {
		const screenDistance = roundedRectDistance(x, y, CENTER, CENTER, SCREEN_HALF_WIDTH, SCREEN_HALF_HEIGHT, SCREEN_RADIUS);
		let color = BACKGROUND;
		color = blend(color, SCREEN_BORDER, coverage(screenDistance));
		color = blend(color, SCREEN, coverage(screenDistance + SCREEN_BORDER_WIDTH));
		color = blend(color, ACCENT, coverage(triangleDistance(x, y, triangleCorners)));
		const offset = rowStart + 1 + x * 4;
		const [red = 0, green = 0, blue = 0] = color;
		raw[offset] = Math.round(red);
		raw[offset + 1] = Math.round(green);
		raw[offset + 2] = Math.round(blue);
		raw[offset + 3] = 255;
	}
}

function pngChunk(type, data) {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(typeAndData));
	return Buffer.concat([length, typeAndData, crc]);
}

let crcTable;
function crc32(buf) {
	if (!crcTable) {
		crcTable = [];
		for (let n = 0; n < 256; n++) {
			let c = n;
			for (let k = 0; k < 8; k++) {
				c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
			}
			crcTable[n] = c >>> 0;
		}
	}
	let crc = 0xffffffff;
	for (const byte of buf) {
		crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); // width
ihdr.writeUInt32BE(SIZE, 4); // height
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
const png = Buffer.concat([
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
	pngChunk('IHDR', ihdr),
	pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
	pngChunk('IEND', Buffer.alloc(0)),
]);

const target = path.resolve(__dirname, '../assets/icons/app_icon_source.png');
fs.writeFileSync(target, png);
console.log(`Wrote ${target} (${png.length} bytes)`);
