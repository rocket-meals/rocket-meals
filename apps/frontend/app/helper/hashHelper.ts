export class HashHelper {
	/**
	 * Compute an MD5 hash for a string. This implementation is minimal and should
	 * be replaced with expo-crypto when package installation is possible.
	 * TODO: Replace with expo-crypto MD5 implementation
	 */
	static md5(str: string): string {
		let xl: number;

		const rotateLeft = (lValue: number, iShiftBits: number) =>
			(lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));

		const addUnsigned = (lX: number, lY: number) => {
			const lX8 = lX & 0x80000000;
			const lY8 = lY & 0x80000000;
			const lX4 = lX & 0x40000000;
			const lY4 = lY & 0x40000000;
			const result = (lX & 0x3fffffff) + (lY & 0x3fffffff);
			if (lX4 & lY4) {
				return result ^ 0x80000000 ^ lX8 ^ lY8;
			}
			if (lX4 | lY4) {
				if (result & 0x40000000) {
					return result ^ 0xc0000000 ^ lX8 ^ lY8;
				} else {
					return result ^ 0x40000000 ^ lX8 ^ lY8;
				}
			} else {
				return result ^ lX8 ^ lY8;
			}
		};

		const _F = (x: number, y: number, z: number) => (x & y) | (~x & z);
		const _G = (x: number, y: number, z: number) => (x & z) | (y & ~z);
		const _H = (x: number, y: number, z: number) => x ^ y ^ z;
		const _I = (x: number, y: number, z: number) => y ^ (x | ~z);

		const _FF = (
			a: number,
			b: number,
			c: number,
			d: number,
			x: number,
			s: number,
			ac: number
		) =>
			addUnsigned(
				rotateLeft(addUnsigned(addUnsigned(a, _F(b, c, d)), addUnsigned(x, ac)), s),
				b
			);

		const _GG = (
			a: number,
			b: number,
			c: number,
			d: number,
			x: number,
			s: number,
			ac: number
		) =>
			addUnsigned(
				rotateLeft(addUnsigned(addUnsigned(a, _G(b, c, d)), addUnsigned(x, ac)), s),
				b
			);

		const _HH = (
			a: number,
			b: number,
			c: number,
			d: number,
			x: number,
			s: number,
			ac: number
		) =>
			addUnsigned(
				rotateLeft(addUnsigned(addUnsigned(a, _H(b, c, d)), addUnsigned(x, ac)), s),
				b
			);

		const _II = (
			a: number,
			b: number,
			c: number,
			d: number,
			x: number,
			s: number,
			ac: number
		) =>
			addUnsigned(
				rotateLeft(addUnsigned(addUnsigned(a, _I(b, c, d)), addUnsigned(x, ac)), s),
				b
			);

		const convertToWordArray = (str: string) => {
			let lWordCount: number;
			const lMessageLength = str.length;
			const lNumberOfWords_temp1 = lMessageLength + 8;
			const lNumberOfWords_temp2 =
				((lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64) | 0;
			const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
			const lWordArray = new Array<number>(lNumberOfWords - 1);
			const lBytePosition = 0;
			let lByteCount = 0;
			while (lByteCount < lMessageLength) {
				lWordCount = (lByteCount - (lByteCount % 4)) / 4;
				lWordArray[lWordCount] =
					lWordArray[lWordCount] |
					(str.charCodeAt(lByteCount) << ((lByteCount % 4) * 8));
				lByteCount++;
			}
			lWordCount = (lByteCount - (lByteCount % 4)) / 4;
			lWordArray[lWordCount] =
				lWordArray[lWordCount] | (0x80 << ((lByteCount % 4) * 8));
			lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
			lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
			return lWordArray;
		};

		const wordToHex = (lValue: number) => {
			let wordToHexValue = '';
			let wordToHexValue_temp = '';
			for (let lCount = 0; lCount <= 3; lCount++) {
				const lByte = (lValue >>> (lCount * 8)) & 255;
				wordToHexValue_temp = '0' + lByte.toString(16);
				wordToHexValue += wordToHexValue_temp.substr(
					wordToHexValue_temp.length - 2,
					2
				);
			}
			return wordToHexValue;
		};

		const x = convertToWordArray(str);
		let a = 0x67452301;
		let b = 0xefcdab89;
		let c = 0x98badcfe;
		let d = 0x10325476;

		for (let k = 0; k < x.length; k += 16) {
			const AA = a;
			const BB = b;
			const CC = c;
			const DD = d;
			a = _FF(a, b, c, d, x[k + 0], 7, 0xd76aa478);
			d = _FF(d, a, b, c, x[k + 1], 12, 0xe8c7b756);
			c = _FF(c, d, a, b, x[k + 2], 17, 0x242070db);
			b = _FF(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
			a = _FF(a, b, c, d, x[k + 4], 7, 0xf57c0faf);
			d = _FF(d, a, b, c, x[k + 5], 12, 0x4787c62a);
			c = _FF(c, d, a, b, x[k + 6], 17, 0xa8304613);
			b = _FF(b, c, d, a, x[k + 7], 22, 0xfd469501);
			a = _FF(a, b, c, d, x[k + 8], 7, 0x698098d8);
			d = _FF(d, a, b, c, x[k + 9], 12, 0x8b44f7af);
			c = _FF(c, d, a, b, x[k + 10], 17, 0xffff5bb1);
			b = _FF(b, c, d, a, x[k + 11], 22, 0x895cd7be);
			a = _FF(a, b, c, d, x[k + 12], 7, 0x6b901122);
			d = _FF(d, a, b, c, x[k + 13], 12, 0xfd987193);
			c = _FF(c, d, a, b, x[k + 14], 17, 0xa679438e);
			b = _FF(b, c, d, a, x[k + 15], 22, 0x49b40821);
			a = _GG(a, b, c, d, x[k + 1], 5, 0xf61e2562);
			d = _GG(d, a, b, c, x[k + 6], 9, 0xc040b340);
			c = _GG(c, d, a, b, x[k + 11], 14, 0x265e5a51);
			b = _GG(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
			a = _GG(a, b, c, d, x[k + 5], 5, 0xd62f105d);
			d = _GG(d, a, b, c, x[k + 10], 9, 0x02441453);
			c = _GG(c, d, a, b, x[k + 15], 14, 0xd8a1e681);
			b = _GG(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
			a = _GG(a, b, c, d, x[k + 9], 5, 0x21e1cde6);
			d = _GG(d, a, b, c, x[k + 14], 9, 0xc33707d6);
			c = _GG(c, d, a, b, x[k + 3], 14, 0xf4d50d87);
			b = _GG(b, c, d, a, x[k + 8], 20, 0x455a14ed);
			a = _GG(a, b, c, d, x[k + 13], 5, 0xa9e3e905);
			d = _GG(d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
			c = _GG(c, d, a, b, x[k + 7], 14, 0x676f02d9);
			b = _GG(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);
			a = _HH(a, b, c, d, x[k + 5], 4, 0xfffa3942);
			d = _HH(d, a, b, c, x[k + 8], 11, 0x8771f681);
			c = _HH(c, d, a, b, x[k + 11], 16, 0x6d9d6122);
			b = _HH(b, c, d, a, x[k + 14], 23, 0xfde5380c);
			a = _HH(a, b, c, d, x[k + 1], 4, 0xa4beea44);
			d = _HH(d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
			c = _HH(c, d, a, b, x[k + 7], 16, 0xf6bb4b60);
			b = _HH(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
			a = _HH(a, b, c, d, x[k + 13], 4, 0x289b7ec6);
			d = _HH(d, a, b, c, x[k + 0], 11, 0xeaa127fa);
			c = _HH(c, d, a, b, x[k + 3], 16, 0xd4ef3085);
			b = _HH(b, c, d, a, x[k + 6], 23, 0x04881d05);
			a = _HH(a, b, c, d, x[k + 9], 4, 0xd9d4d039);
			d = _HH(d, a, b, c, x[k + 12], 11, 0xe6db99e5);
			c = _HH(c, d, a, b, x[k + 15], 16, 0x1fa27cf8);
			b = _HH(b, c, d, a, x[k + 2], 23, 0xc4ac5665);
			a = _II(a, b, c, d, x[k + 0], 6, 0xf4292244);
			d = _II(d, a, b, c, x[k + 7], 10, 0x432aff97);
			c = _II(c, d, a, b, x[k + 14], 15, 0xab9423a7);
			b = _II(b, c, d, a, x[k + 5], 21, 0xfc93a039);
			a = _II(a, b, c, d, x[k + 12], 6, 0x655b59c3);
			d = _II(d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
			c = _II(c, d, a, b, x[k + 10], 15, 0xffeff47d);
			b = _II(b, c, d, a, x[k + 1], 21, 0x85845dd1);
			a = _II(a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
			d = _II(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
			c = _II(c, d, a, b, x[k + 6], 15, 0xa3014314);
			b = _II(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
			a = _II(a, b, c, d, x[k + 4], 6, 0xf7537e82);
			d = _II(d, a, b, c, x[k + 11], 10, 0xbd3af235);
			c = _II(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
			b = _II(b, c, d, a, x[k + 9], 21, 0xeb86d391);
			a = addUnsigned(a, AA);
			b = addUnsigned(b, BB);
			c = addUnsigned(c, CC);
			d = addUnsigned(d, DD);
		}

		return (
			wordToHex(a) +
			wordToHex(b) +
			wordToHex(c) +
			wordToHex(d)
		).toLowerCase();
	}
}
