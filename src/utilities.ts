import { MapType, MapTypes } from "./mapType.js";
import { Position } from "./position.js";

export const isSamePosition = (a: Position, b: Position): boolean => a.x === b.x && a.y === b.y;
const convertBooleanToNumber = (value: boolean | number): number => typeof value === 'boolean' ? value ? 1 : -1 : value;
const convertNullishToNumber = <T>(value: T): T extends null | undefined ? 0 : Exclude<T, null | undefined> => ((value === null) ? 0 : value === undefined ? 0 : value) as T extends null | undefined ? 0 : Exclude<T, null | undefined>;

//const compareCache = new Map<string, -1 | 0 | 1>();

export const compareByPriorityList = <T extends (boolean | number | undefined | null)[]>(a: T, b: T, tieBreaker?: (a: T, b: T) => T): -1 | 0 | 1 => {
	
	const len = Math.max(a.length, b.length);
	for (let i = 0; i < len; i++) {

		const x = convertBooleanToNumber(convertNullishToNumber(a[i]));
		const y = convertBooleanToNumber(convertNullishToNumber(b[i]));
		

		if (x === y) {
			continue;
		}
		
		return x < y ? -1 : 1;
	}
	if (tieBreaker) {
		const result = convertBooleanToNumber(convertNullishToNumber(tieBreaker(a,b)) as number | boolean);
		const finalResult = result > 0 ? 1 : result < 0 ? -1 : 0;
		
		return finalResult;
	}
	
	return 0;
};
export const hashPosition = <X extends number, Y extends number>(position: Position & {
    x: X;
    y: Y;
}): `${X},${Y}` => `${position.x},${position.y}`;
export const getAdjacentPositions = (position: Position, mapType: MapType): Position[] => {
	switch (mapType) {
	case MapTypes['Square']:
		return [
			{ x: position.x, y: position.y - 1 },
			{ x: position.x + 1, y: position.y },
			{ x: position.x, y: position.y + 1 },
			{ x: position.x - 1, y: position.y },
		];
	case MapTypes['Hex-Horizontal']:
		return [
			{ x: position.x, y: position.y - 1 },
			{ x: position.x + 1, y: position.y - 1 },
			{ x: position.x + 1, y: position.y },
			{ x: position.x, y: position.y + 1 },
			{ x: position.x - 1, y: position.y },
			{ x: position.x - 1, y: position.y - 1 },
		];
	case MapTypes['Hex-Vertical']:
		return [
			{ x: position.x - 1, y: position.y },
			{ x: position.x - 1, y: position.y + 1 },
			{ x: position.x, y: position.y + 1 },
			{ x: position.x + 1, y: position.y },
			{ x: position.x, y: position.y - 1 },
			{ x: position.x - 1, y: position.y - 1 },
		];
	case MapTypes['Octo-Square']:
		return [
			{ x: position.x, y: position.y - 1 },
			{ x: position.x + 1, y: position.y - 1 },
			{ x: position.x + 1, y: position.y },
			{ x: position.x + 1, y: position.y + 1 },
			{ x: position.x, y: position.y + 1 },
			{ x: position.x - 1, y: position.y + 1 },
			{ x: position.x - 1, y: position.y },
			{ x: position.x - 1, y: position.y - 1 },
		];
	case MapTypes['Triangle']:
		if (position.x % 2 === 0) {
			return [
				{ x: position.x - 1, y: position.y },
				{ x: position.x, y: position.y + 1 },
				{ x: position.x + 1, y: position.y },
			];
		} else {
			return [
				{ x: position.x - 1, y: position.y },
				{ x: position.x, y: position.y - 1 },
				{ x: position.x + 1, y: position.y },
			];
		}
	default:
		console.warn('Unknown map type:', mapType);
		return [];
	}
	return [];
};
export const sum = (...nums:number[]): number => nums.reduce((acc, cur) => acc + cur, 0);