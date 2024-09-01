import { hashPosition, isSamePosition, getAdjacentPositions, compareByPriorityList, sum } from "./utilities.js";
import { MapType, MapTypes } from "./mapType.js";
import { Position } from "./position.js"; 

const UnreachableError = ()=>new Error('Unreachable Code');

type AStarOptions<A, I extends boolean|undefined> = {
    routeLength?: number;
    includeCostsAtNodes?: I;
    includeIncompleteRoutes?: boolean;
    includeLoopingRoutes?: boolean;
    onIteration?: (bestRoute: {
        positions: Position[];
        positionHash: string;
        cost: number[]|null;
        estimate: number;
        total: number;
    })=>void|Promise<void>;
    maxDepth?: number;
    routes?: number;
    estimator?: (tile: A, from: A)=>number|null;
    cost?: (tile: A, from: A)=>number|null;
    cache?: never;
};

export type AStarResult<A,I extends boolean|undefined> = {
    routes: (I extends true ? {cost: number, node: A}[] : A[])[];
    cache: never;
}
/*
const Resort = <T>(array: T[], idx: number, compare: (a: T, b: T)=>-1|0|1): T[] => {
	let temp: T;
	let i = idx;
	if(array.length <= 1){
		return array;
	}
	while(true){
		if(i === 0){
			const val = compare(array[i], array[i+1]);
			if(val > 0){
				temp = array[i];
				array[i] = array[i+1];
				array[i+1] = temp;
				i++;
				continue;
			}
			break;
		}
		if(i === array.length-1){
			const val = compare(array[i-1], array[i]);
			if(val > 0){
				temp = array[i];
				array[i] = array[i+1];
				array[i+1] = temp;
				i++;
				continue;
			}
			break;
		}
		const top = compare(array[i], array[i-1]);
		const bottom = compare(array[i], array[i+1]);
		if(top === 0 && bottom === 0){
			break;
		}
		if(top === -1){
			temp = array[i-1];
			array[i-1] = array[i];
			array[i] = temp;
			continue;
		}
		if(bottom === 1){
			temp = array[i+1];
			array[i+1] = array[i];
			array[i] = temp;
			continue;
		}
		break;


	}
	return array;
}
*/
export class Pathfinder<A>{

	private toPosition: (args: A)=>Position;
	private fromPosition: (Position: Position)=>A|null;
	public estimator: <Z extends A>(tile: Z, from: Z) => number | null;
	public cost: <Z extends A>(tile: Z, from: Z) => number | null;
	private _mapType: Readonly<MapType>;
	

	private static _genericFetch = <A>(tile: A, from: A, toPosition: Pathfinder<A>['toPosition']): number => {
		return Math.abs(toPosition(tile).x - toPosition(from).x) + Math.abs(toPosition(tile).y - toPosition(from).y);
	}

	public get mapType() {
        
		return this._mapType;
	}
	constructor(options:{
        toPosition: (args: A)=>Position;
        fromPosition: (Position: Position)=>A|null;
        mapType?: MapType;
        /**
         * The estimated cost to move from one tile to another. At short ranges, this should be accurate but at long ranges, a heuristic is acceptable.
         * @param tile Whatever object represents a tile.
         * @param from The tile you are moving from. Not strictly necessary but could be useful if you have planes (walls) between tiles, facing, or some similar feature.
         * @returns The cost to move from one tile to another. If the cost is negative, than some how going this direction is practically like time traveling (not actually but you could use this to represent hyper speeds.) If this returns null, it is considered impassable.
         */
        estimator?: <Z extends A>(tile: Z, from: Z) => number | null;
        cost?: <Z extends A>(tile: Z, from: Z) => number | null;
    }) {
		this.toPosition = options.toPosition;
		this.fromPosition = options.fromPosition;
		this._mapType = options.mapType || MapTypes.Square;
		if(!options.estimator){
			this.estimator = (a,b)=>Pathfinder._genericFetch(a,b,this.toPosition);
		}
		else{
			this.estimator = options.estimator;
		}

		if(!options.cost){
			this.cost = (a,b)=>Pathfinder._genericFetch(a,b,this.toPosition);
		}
		else{
			this.cost = options.cost;
		}
	}

	/**
    * Determines if a Route is a logical duplicate of another route.
    * @pure 
    * @param route 
    * @param routesToCheck 
    * @returns 
    */
	private static isLogicalDuplicate = <T extends {positions: Position[], positionHash: string}>(route: T, routesToCheck: T[]):boolean => {
		//const routeHash = route.positions.map(hashPosition).join(',');
		let count = 0;
		return routesToCheck.some((routeToCompare)=>{
			//const routeToCompareHash = routeToCompare.positions.map(hashPosition).join(',');
			count += route.positionHash === routeToCompare.positionHash ? 1 : 0;
			if(count > 1){
				return true;
			}
		});
	}

	/**
    * Determines if a Route loops on itself at any point.
    * @pure
    * @param route 
    * @returns 
    */
	private static isLoopingRoute = <T extends {positions: Position[]}>(route: T): boolean => {
		return route.positions.some((position, index)=>{
			for(let i = index+1; i < route.positions.length; i++){
				if(isSamePosition(position, route.positions[i])){
					return true;
				}
			}
		});
	}
	/**
 * Wraps a fetch function and caches the results. Mostly pure but writes back to the cachedFetches.
 * @param tile 
 * @param from 
 * @param cachedFetches 
 * @param fetch 
 * @param fromPosition 
 * @returns 
 */
	private static wrappedAndCachedFetch = <A>(tile: Position, from: Position, cachedFetches: Map<string, number|null>, fetch: <Z extends A>(tile: Z, from: Z)=>number|null, fromPosition: (pos:Position)=> A|null) => {
		const tHash = hashPosition(tile);
		const fHash = hashPosition(from);
		if(tHash === fHash) {
			return -Infinity;
		}
		const hash = `${hashPosition(tile)},${hashPosition(from)}`;
		if(cachedFetches.has(hash)) {
			return cachedFetches.get(hash) as number|null;
		}
		else{
			const fromPos = fromPosition(from) as A;
			const tilePos = fromPosition(tile) as A;
			if(tilePos === null){
				return null;
			}
			if(fromPos === null){
				//This should never happen. This would mean you asked to start from a tile that doesn't exist. Stop that. You should know better.
				throw UnreachableError();
			}
			const cost = fetch(fromPosition(tile) as A, fromPosition(from) as A);
			cachedFetches.set(hash, cost);
			return cost;
		}
	};

	private _aStar = <I extends boolean|undefined = false>(start: Position, end: Position, options?: AStarOptions<A, I>): AStarResult<A,I>  => {
		const estimator = (options?.estimator ?? this.estimator);
		const cost = (options?.cost ?? this.cost);
		if(!estimator) {
			throw new Error('No fetch function provided.');
		}

		const maxDepth = options?.maxDepth  ?? Infinity;
		if(maxDepth < 1){
			throw new Error('maxDepth must be greater than 0.');
		}

		const desiredRouteCount = options?.routes ?? 1;
		if(desiredRouteCount < 1){
			throw new Error('routes must be greater than 0.');
		}

		const routeLength = options?.routeLength  ?? Infinity;
		if(routeLength < 1){
			throw new Error('routeLength must be greater than 0.');
		}

        type Item = {
            positions: [Position, ...Position[]];
            positionHash: string;
            cost: number[]|null;
            estimate: number;
            total: number;
        };

        const items: Map<string, Item> = new Map(
        	[[
        		hashPosition(start) as string,
        		{
        			positions: [start], 
        			positionHash: hashPosition(start), 
        			cost: [] as number[], 
        			estimate: 0, 
        			total: 0
        		}
        	]]);
        
        const sureGet = (key: string): Item => {
        	const item = items.get(key);
        	if(item){
        		return item;
        	}
        	throw new Error('Item not found.');
        }

        //const checkedPositions = new Set<Position>([]);
        /**
         * The routes that have reached the goal.
         */
        const successfulRouteHashes = new Set<string>([]);
        let successfulRouteCount = 0;
        
        const touchedPositionCounts = new Map<string, number>([]);
        const incrementTouchedPosition = (position: Position) => {
        	const count = touchedPositionCounts.get(hashPosition(position)) ?? 0;
        	if(count !== 0){
        		console.log('Touched Position:', position, count + 1);
        	}
        	touchedPositionCounts.set(hashPosition(position), count + 1);
        }

        /**
         * The routes that are currently being checked, in the order
         */
        const activeRouteHashes: string[] = [hashPosition(start)];
        const activeBacklog: string[] = [];
        let checkedValidity = false;
        let bestActiveRoute = sureGet(hashPosition(start));
        const cachedFetches = new Map<string, number|null>( []);
        
        do{
        	//Begin finding new routes.
        	if(bestActiveRoute.positions.length <= maxDepth){
        		const from = bestActiveRoute.positions.at(-1) as Position;
        		const adjacentPositions = getAdjacentPositions(from, this._mapType);
        		const choices: Item[] = adjacentPositions.map((position) => {

        			const n = this.fromPosition(position);
        			const m = this.fromPosition(from);

        			return {
        				positions: [...bestActiveRoute.positions,position],
        				positionHash: `${bestActiveRoute.positionHash},${hashPosition(position)}`,
        				cost: n && m && cost(n, m) || null,
                        
        			} as {cost: number|null, positions: Position[], positionHash: string, estimate: number|null, total: number|null|undefined};
        		}).filter(k=>{
        			if(k.cost !== null){
        					if(k.positions.length >= 2){
        						if(touchedPositionCounts.get(hashPosition(k.positions.at(-1) as Position)) ?? 0 > 0){
        							if(touchedPositionCounts.get(hashPosition(k.positions.at(-2) as Position)) ?? 0 > 0){
        								return false;
        							}
        						}
        					}
        				return true;
        				}
        		}).map(item=>{
        			item.estimate = Pathfinder.wrappedAndCachedFetch(end, item.positions.at(-1) as Position, cachedFetches, estimator, this.fromPosition);
        			return item as Omit<Item, 'cost'>&{cost: number};
        		}).filter(k=>k.estimate !== null).map(item=>{
        				const singleCost = item.cost as number;
        				const totalCost = [...bestActiveRoute.cost??[], singleCost];
        				const thisItem: Item = item as unknown as Item;
        			thisItem.cost = totalCost;
        			thisItem.total = sum(...totalCost) + item.estimate;
        			return thisItem;
        		})

        		if(choices.length !== 0){
        			choices.forEach((choice)=>{
        				if(!(options?.includeLoopingRoutes ?? false)){
        					if(new Set(choice.positions).size !== choice.positions.length){
        						return;
        					}
        					items.set(choice.positionHash, choice);
        					if(Pathfinder.isLoopingRoute(choice)){
        						items.delete(choice.positionHash);
        						return;
        					}
        				}
        				if(isSamePosition(choice.positions.at(-1) as Position, end)){
        					items.set(choice.positionHash, choice);
        					successfulRouteHashes.add(choice.positionHash);
        					successfulRouteCount++;
        					return;
        				}
        				
        				if((options?.includeLoopingRoutes ?? false)){
        				    items.set(choice.positionHash, choice);
        				}
       
        				
        				incrementTouchedPosition(choice.positions.at(-1) as Position);
        				activeRouteHashes.unshift(choice.positionHash);
        				if(options?.onIteration){
        					console.log(activeRouteHashes.length, bestActiveRoute)
        					options?.onIteration(choice);
        				}		
        			});
        		}
        	}
        	    
        	items.delete(bestActiveRoute.positionHash);
        	activeRouteHashes.splice(activeRouteHashes.indexOf(bestActiveRoute.positionHash), 1);
        	const sortPredicate = (a: string, b: string)=>{
        		const aSide = items.get(a) as Item;
        		const bSide = items.get(b) as Item;
        		const totalDiff = aSide.total - bSide.total;
        		if(totalDiff === 0){
        			const totalCostDiff = sum(...bSide.cost as number[]) - sum(...aSide.cost as number[]);
        			if(totalCostDiff === 0){
        			const aTouched = touchedPositionCounts.get(hashPosition(aSide.positions.at(-1) as Position))??0;
        			const bTouched = touchedPositionCounts.get(hashPosition(bSide.positions.at(-1) as Position))??0;
        			console.log('identical totals, ising touched position counts', aTouched, bTouched); 
        			return aTouched - bTouched;
        			}
        			return totalCostDiff;
        		}
        		return totalDiff;
        	}
        	
        	activeRouteHashes.sort(sortPredicate);
        	
        	

        	if(activeRouteHashes.length > 100 && !checkedValidity){
        		checkedValidity = true;
        		if(getAdjacentPositions(start, this._mapType).length === 0){
        			break;
        		}
        		if(getAdjacentPositions(end, this._mapType).length === 0){
        			break;
        		}
        	}
        	if(activeRouteHashes.length === 0){
        		if(activeBacklog.length === 0){
        			break;
        		}
        		else{
        			console.log('Filling from backlog');
        			const chunk = activeBacklog.splice(0, 25);
        			chunk.forEach((hash)=>{
        				activeRouteHashes.push(hash);
        				
        			});
        		}
        	}
        	bestActiveRoute = sureGet(activeRouteHashes[0]);
        }while(successfulRouteCount < desiredRouteCount && (activeRouteHashes.length > 0 || activeBacklog.length > 0));
        const routes = Array.from(successfulRouteHashes.values()).map((hash)=>items.get(hash) as Item);
        if(desiredRouteCount > routes.length && options?.includeIncompleteRoutes){
        	routes.push(...Array.from(items.values()).filter((route)=>!activeRouteHashes.includes(route.positionHash)));
        	if(desiredRouteCount > routes.length){
        		routes.push(...Array.from(items.values()).filter((route)=>!activeRouteHashes.includes(route.positionHash)));
        	}
        }
        
        const includeCostsAtNodes = (options?.includeCostsAtNodes ?? false) as I;

        const result = {
        	routes: routes.sort((a,b)=>compareByPriorityList([sum(...a.cost??[]), a.positions.length],[ sum(...b.cost??[], b.positions.length)])).filter((_, index)=>index < desiredRouteCount).map((route)=>{
        		//cast because typescript is dumb.
        		let item: (I extends true ? { cost: number; node: A; }[] : A[]);
        		if(includeCostsAtNodes === true){
        			item = route.positions.map(
        				(v,idx)=>({
        					cost: route.cost?.[idx] as number, 
        					node: this.fromPosition(v)
        				})) as (I extends true ? { cost: number; node: A; }[] : A[])
        		}
        		else{
        			item = route.positions.map(this.fromPosition) as (I extends true ? { cost: number; node: A; }[] : A[]);
        		}
        		return item;
        	}),
        	cache:undefined as never,
            
        };
        return result;
	}

	private  _asyncAStar = async <I extends boolean|undefined = false>(start: Position, end: Position, options?: AStarOptions<A, I>): Promise<AStarResult<A,I>>  => {
        
		const estimator = (options?.estimator ?? this.estimator);
		const cost = (options?.cost ?? this.cost);
		if(!estimator) {
			throw new Error('No fetch function provided.');
		}

		const maxDepth = options?.maxDepth  ?? Infinity;
		if(maxDepth < 1){
			throw new Error('maxDepth must be greater than 0.');
		}

		const desiredRouteCount = options?.routes ?? 1;
		if(desiredRouteCount < 1){
			throw new Error('routes must be greater than 0.');
		}

		const routeLength = options?.routeLength  ?? Infinity;
		if(routeLength < 1){
			throw new Error('routeLength must be greater than 0.');
		}

        type Item = {
            positions: [Position, ...Position[]];
            positionHash: string;
            cost: number[]|null;
            estimate: number;
            total: number;
        };

        const items: Map<string, Item> = new Map(
        	[[
        		hashPosition(start) as string,
        		{
        			positions: [start], 
        			positionHash: hashPosition(start), 
        			cost: [] as number[], 
        			estimate: 0, 
        			total: 0
        		}
        	]]);
        
        const sureGet = (key: string): Item => {
        	const item = items.get(key);
        	if(item){
        		return item;
        	}
        	throw new Error('Item not found.');
        }

        //const checkedPositions = new Set<Position>([]);
        /**
         * The routes that have reached the goal.
         */
        const successfulRouteHashes = new Set<string>([]);
        let successfulRouteCount = 0;
        
        const touchedPositionCounts = new Map<string, number>([]);
        const incrementTouchedPosition = (position: Position) => {
        	const count = touchedPositionCounts.get(hashPosition(position)) ?? 0;
        	if(count !== 0){
        		console.log('Touched Position:', position, count + 1);
        	}
        	touchedPositionCounts.set(hashPosition(position), count + 1);
        }

        /**
         * The routes that are currently being checked, in the order
         */
        const activeRouteHashes: string[] = [hashPosition(start)];
        const activeBacklog: string[] = [];
        let checkedValidity = false;
        let bestActiveRoute = sureGet(hashPosition(start));
        const cachedFetches = new Map<string, number|null>( []);
        
        do{
        	//Begin finding new routes.
        	if(bestActiveRoute.positions.length <= maxDepth){
        		const from = bestActiveRoute.positions.at(-1) as Position;
        		const adjacentPositions = getAdjacentPositions(from, this._mapType);
        		const choices: Item[] = adjacentPositions.map((position) => {
        			return {
        				positions: [...bestActiveRoute.positions,position],
        				positionHash: `${bestActiveRoute.positionHash},${hashPosition(position)}`,
        				cost: Pathfinder.wrappedAndCachedFetch(position, from, cachedFetches, cost, this.fromPosition),
        			} as {cost: number|null, positions: Position[], positionHash: string, estimate: number|null, total: number|null|undefined};
        		}).filter(k=>{
        			if(k.cost !== null){
        					if(k.positions.length >= 2){
        						if(touchedPositionCounts.get(hashPosition(k.positions.at(-1) as Position)) ?? 0 > 0){
        							if(touchedPositionCounts.get(hashPosition(k.positions.at(-2) as Position)) ?? 0 > 0){
        								return false;
        							}
        						}
        					}
        				return true;
        				}
        		}).map(item=>{
        			item.estimate = Pathfinder.wrappedAndCachedFetch(end, item.positions.at(-1) as Position, cachedFetches, estimator, this.fromPosition);
        			return item as Omit<Item, 'cost'>&{cost: number};
        		}).filter(k=>k.estimate !== null).map(item=>{
        				const singleCost = item.cost as number;
        				const totalCost = [...bestActiveRoute.cost??[], singleCost];
        				const thisItem: Item = item as unknown as Item;
        			thisItem.cost = totalCost;
        			thisItem.total = sum(...totalCost) + item.estimate;
        			return thisItem;
        		})

        		if(choices.length !== 0){
        			await Promise.all(choices.map(async (choice)=>{
        				if(!(options?.includeLoopingRoutes ?? false)){
        					if(new Set(choice.positions).size !== choice.positions.length){
        						return;
        					}
        					items.set(choice.positionHash, choice);
        					if(Pathfinder.isLoopingRoute(choice)){
        						items.delete(choice.positionHash);
        						return;
        					}
        				}
        				if(isSamePosition(choice.positions.at(-1) as Position, end)){
        					items.set(choice.positionHash, choice);
        					successfulRouteHashes.add(choice.positionHash);
        					successfulRouteCount++;
        					return;
        				}
        				
        				if((options?.includeLoopingRoutes ?? false)){
        				    items.set(choice.positionHash, choice);
        				}
       
        				
        				incrementTouchedPosition(choice.positions.at(-1) as Position);
        				activeRouteHashes.unshift(choice.positionHash);
        				if(options?.onIteration){
        					console.log(activeRouteHashes.length, bestActiveRoute)
        					const out = options?.onIteration(choice);
        					if(out && typeof out === 'object' && out instanceof Promise){
        						await out;
        					}
        				}
        				
        			}));
        		}
        	}
        	    
        	items.delete(bestActiveRoute.positionHash);
        	activeRouteHashes.splice(activeRouteHashes.indexOf(bestActiveRoute.positionHash), 1);
        	const sortPredicate = (a: string, b: string)=>{
        		const aSide = items.get(a) as Item;
        		const bSide = items.get(b) as Item;
        		const totalDiff = aSide.total - bSide.total;
        		if(totalDiff === 0){
        			const totalCostDiff = sum(...bSide.cost as number[]) - sum(...aSide.cost as number[]);
        			if(totalCostDiff === 0){
        			const aTouched = touchedPositionCounts.get(hashPosition(aSide.positions.at(-1) as Position))??0;
        			const bTouched = touchedPositionCounts.get(hashPosition(bSide.positions.at(-1) as Position))??0;
        			console.log('identical totals, ising touched position counts', aTouched, bTouched); 
        			return aTouched - bTouched;
        			}
        			return totalCostDiff;
        		}
        		return totalDiff;
        	}
        	
        	activeRouteHashes.sort(sortPredicate);
        	
        	

        	if(activeRouteHashes.length > 100 && !checkedValidity){
        		checkedValidity = true;
        		if(getAdjacentPositions(start, this._mapType).length === 0){
        			break;
        		}
        		if(getAdjacentPositions(end, this._mapType).length === 0){
        			break;
        		}
        	}
        	if(activeRouteHashes.length === 0){
        		if(activeBacklog.length === 0){
        			break;
        		}
        		else{
        			console.log('Filling from backlog');
        			const chunk = activeBacklog.splice(0, 25);
        			chunk.forEach((hash)=>{
        				activeRouteHashes.push(hash);
        				
        			});
        		}
        	}
        	bestActiveRoute = sureGet(activeRouteHashes[0]);
        }while(successfulRouteCount < desiredRouteCount && (activeRouteHashes.length > 0 || activeBacklog.length > 0));
        const routes = Array.from(successfulRouteHashes.values()).map((hash)=>items.get(hash) as Item);
        if(desiredRouteCount > routes.length && options?.includeIncompleteRoutes){
        	routes.push(...Array.from(items.values()).filter((route)=>!activeRouteHashes.includes(route.positionHash)));
        	if(desiredRouteCount > routes.length){
        		routes.push(...Array.from(items.values()).filter((route)=>!activeRouteHashes.includes(route.positionHash)));
        	}
        }
        
        const includeCostsAtNodes = (options?.includeCostsAtNodes ?? false) as I;

        const result = {
        	routes: routes.sort((a,b)=>compareByPriorityList([sum(...a.cost??[]), a.positions.length],[ sum(...b.cost??[], b.positions.length)])).filter((_, index)=>index < desiredRouteCount).map((route)=>{
        		//cast because typescript is dumb.
        		let item: (I extends true ? { cost: number; node: A; }[] : A[]);
        		if(includeCostsAtNodes === true){
        			item = route.positions.map(
        				(v,idx)=>({
        					cost: route.cost?.[idx] as number, 
        					node: this.fromPosition(v)
        				})) as (I extends true ? { cost: number; node: A; }[] : A[])
        		}
        		else{
        			item = route.positions.map(this.fromPosition) as (I extends true ? { cost: number; node: A; }[] : A[]);
        		}
        		return item;
        	}),
        	cache:undefined as never,
            
        };
        return result;
	}

	/**
     * Performs an A* search on the map.
     * @param start Starting Tile
     * @param end Ending Tile - the Goal!
     * @param options {
     *      routeLength: The maximum length of the route. Default is 1.
     *      includeCostsAtNodes: If true, the result will include the cost to move to each node. Default is false.
     *      includeIncompleteRoutes: If true, the result will include routes that did not reach the goal. Default is false.
     *      includeLoopingRoutes: If true, the result will include routes that loop on themselves. Default is false.
     *      maxDepth: The maximum depth to search. Default is Infinity.
     *      routes: The number of routes to find. Default is 1.
     *      fetch: The function that determines the heuristic for calculating costs and estimates. Default is the fetch function provided in the constructor.
     * }
     * 
     * @returns 
     */
	public aStar = <I extends boolean|undefined = false>(start: A, end: A, options?: AStarOptions<A, I>): AStarResult<A, I>  => {
		return this._aStar(this.toPosition(start), this.toPosition(end), options);
	}
	
	public aStarAsync = async <I extends boolean|undefined = false>(start: A, end: A, options?: AStarOptions<A, I>): Promise<AStarResult<A, I>> => {
		return this._asyncAStar(this.toPosition(start), this.toPosition(end), options);
	}

	public tileDistance = (start: A, end: A): number => {
		return this.aStar(start, end, {
			routes: 1,
			cost: ()=>1,
			estimator: this.estimator,
			includeCostsAtNodes: false,
		}).routes[0].length - 1;
	}
}
