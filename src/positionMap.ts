import { Position } from "./position";

export class PositionMap {
	private map: Map<number, Map<number, Position>> = new Map<number, Map<number, Position>>();

	public get(x: number, y: number): Position {
		if(this.map.has(x)){
			const row = this.map.get(x) as Map<number, Position>;
			if(row.has(y)){
				return row.get(y) as Position;
			}
			else{
				row.set(y, {x: x, y: y});
				return row.get(y) as Position;
			}
		}
		else{
			this.map.set(x, new Map<number, Position>([[y, {x: x, y: y}]]));
			return this.map.get(x)?.get(y) as Position;
		}
	}
}