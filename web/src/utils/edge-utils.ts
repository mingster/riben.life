// Edge Runtime compatible utility functions
// This file should not import any Node.js modules like 'crypto'

export const transformBigIntToNumbers = (obj: any): any => {
	if (obj === null || obj === undefined) return;

	if (Array.isArray(obj)) {
		return obj.map(transformBigIntToNumbers);
	}
	if (typeof obj === "object") {
		for (const key of Object.keys(obj)) {
			if (typeof obj[key] === "bigint") {
				obj[key] = Number(obj[key]);
			} else if (typeof obj[key] === "object" && obj[key] !== null) {
				obj[key] = transformBigIntToNumbers(obj[key]);
			}
		}
	}
	return obj;
};

// recursive function looping deeply through an object to find Decimals
export const transformDecimalsToNumbers = (obj: any) => {
	if (!obj) {
		return;
	}

	for (const key of Object.keys(obj)) {
		if (
			obj[key] &&
			typeof obj[key] === "object" &&
			obj[key].toNumber &&
			typeof obj[key].toNumber === "function"
		) {
			// Check if it's a Decimal-like object
			obj[key] = obj[key].toNumber();
		} else if (typeof obj[key] === "object") {
			transformDecimalsToNumbers(obj[key]);
		}
	}
};
