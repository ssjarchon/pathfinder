import { MapType, MapTypes } from "./mapType.js";
import { Position } from "./position.js";
import { PositionMap } from "./positionMap.js";

export const isSamePosition = (a: Position, b: Position): boolean => a.x === b.x && a.y === b.y;

export const hashPosition = <X extends number, Y extends number>(position: Position & {
    x: X;
    y: Y;
}): `${X},${Y}` => `${position.x},${position.y}`;

const deeperConstructor = (position: Position, mapType: MapType, positionMap: PositionMap): Position[] => {
	switch (mapType) {
	case MapTypes['Square']:
		return [
			positionMap.get( position.x, position.y - 1 ),
			positionMap.get( position.x + 1, position.y ),
			positionMap.get( position.x,  position.y + 1 ),
			positionMap.get( position.x - 1, position.y ),
		];
	case MapTypes['Hex-Horizontal']:
		return [
			positionMap.get( position.x,  position.y - 1 ),
			positionMap.get( position.x + 1,  position.y - 1 ),
			positionMap.get( position.x + 1,  position.y ),
			positionMap.get( position.x,  position.y + 1 ),
			positionMap.get( position.x - 1,  position.y ),
			positionMap.get( position.x - 1,  position.y - 1),
		];
	case MapTypes['Hex-Vertical']:
		return [
			positionMap.get( position.x - 1, position.y ),
			positionMap.get( position.x - 1, position.y + 1 ),
			positionMap.get( position.x, position.y + 1 ),
			positionMap.get( position.x + 1, position.y ),
			positionMap.get( position.x, position.y - 1 ),
			positionMap.get( position.x - 1, position.y - 1 ),
		];
	case MapTypes['Octo-Square']:
		return [
			positionMap.get(  position.x, position.y - 1 ),
			positionMap.get(  position.x + 1, position.y - 1 ),
			positionMap.get(  position.x + 1, position.y ),
			positionMap.get(  position.x + 1, position.y + 1 ),
			positionMap.get(  position.x, position.y + 1 ),
			positionMap.get(  position.x - 1, position.y + 1 ),
			positionMap.get(  position.x - 1, position.y ),
			positionMap.get(  position.x - 1, position.y - 1 ),
		];
	case MapTypes['Triangle']:
		if (position.x % 2 === 0) {
			return [
				positionMap.get(  position.x - 1, position.y),
				positionMap.get(  position.x, position.y + 1),
				positionMap.get(  position.x + 1, position.y ),
			];
		} else {
			return [
				positionMap.get(  position.x - 1, position.y ),
				positionMap.get(  position.x, position.y - 1 ),
				positionMap.get(  position.x + 1, position.y ),
			];
		}
	default:
		console.warn('Unknown map type:', mapType);
		return [];
	}
	return [];
}

export const getAdjacentPositions = (position: Position, mapType: MapType, positionMap?: PositionMap): Position[] => {
	if(positionMap){
		return deeperConstructor(position, mapType, positionMap);
	}
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
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type NestedNonNullish<T> = T extends Function ? T : T extends null|undefined ? never : T extends object ? {
	[K in keyof T]-?: NestedNonNullish<T[K]>;
}  : NonNullable<T>;
