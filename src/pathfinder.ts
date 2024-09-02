import { hashPosition, isSamePosition, getAdjacentPositions, NestedNonNullish } from "./utilities.js";
import { MapType, MapTypes } from "./mapType.js";
import { Position } from "./position.js"; 
import { PositionMap } from "./positionMap.js";

const UnreachableError = ()=>new Error('Unreachable Code');

type AStarOptions<A, I extends boolean|undefined> = {
    solutions?:{
        /**
         * Include the costs with the positions. This is expensive on performance so beware.
         */
        includeCosts?: I;
        /**
         * Include routes that loop on themselves. Extremely expensive on performance so beware.
         */
        includeLoops?: boolean;
        /**
         * Include routes that did not reach the goal; not all possible routes are included, but those that were checked and did not reach the goal are included.
         */
        includeIncomplete?: boolean;
        /**
         * The type of search to perform. 
         *  * Fast will return the first route found. Always returns a route if one exists, even if the only route is the best route. Can only be used with Route 1, since some possible routes are discarded during the search.
         *  * Best will return the best route found. Can be used to find multiple routes, but will be slower than Fast, even if only 1 route is searched for, because it will check that no other routes could be faster.
         */ 
        type?: 'Fast'|'Best';
        /**
         * The number of routes to find. Default is 1. If you are using Fast, this must be 1 (or left undefined.)
         */
        routes?: number;
        /**
         * Include routes that are a tie in cost. Useful if you have further culling you want to do that you cannot include in the estimator or cost functions.
         */
        includeTies?: boolean;
    }&({
        type?: 'Fast';
        includeIncomplete?: false;
        includeLoops?: false;
        includeTies?: false;
        routes?: 1;
    }|{
        type?: 'Fast'|'Best';
    });
    /**
     * The maximum depth to search, based on cost. Default is Infinity.
     */
    maxDepth?: number;
    /**
     * The maximum distance to search, based on the number of tiles. Default is Infinity.
     */
    maxDistance?: number;
    /**
     * The function that determines the heuristic for calculating estimates. Default is the fetch function provided in the constructor.
     */
    getEstimate?: (tile: A, from: A)=>number|null;
    /**
     * The function that determines the cost to move from one tile to another. Default is the fetch function provided in the constructor.
     */
    getCost?: (tile: A, from: A)=>number|null;
};

export type AStarResult<A,I extends boolean|undefined> = {
    routes: (I extends true ? {cost: number, node: A}[] : A[])[];
    cache: never;
}

export class Pathfinder<A>{

	private toPosition: (args: A)=>Position;
	private fromPosition: (Position: Position)=>A|null;
	public getEstimate: <Z extends A>(tile: Z, from: Z) => number | null;
	public getCost: <Z extends A>(tile: Z, from: Z) => number | null;
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
         * @returns The cost to move from one tile to another. If the cost is negative, than some how going this direction is practically like time traveling (not actually but you could use this to represent hyper speeds, but beware this could cause some strangeness.) If this returns null, it is considered impassable.
         */
        getEstimate?: <Z extends A>(tile: Z, from: Z) => number | null;
        /**
         * The actual cost to move from one tile to another. This will only ever be called for adjacent tiles, so you can (and must) be accurate here.
         * @param tile Whatever object represents a tile.
         * @param from The tile you are moving from. Not strictly necessary but could be useful if you have planes (walls) between tiles, facing, or some similar feature.
         * @returns The cost to move from one tile to another. If the cost is negative, than some how going this direction is practically like time traveling (not actually but you could use this to represent hyper speeds, but beware this could cause some strangeness.) If this returns null, it is considered impassable.
         */
        getCost?: <Z extends A>(tile: Z, from: Z) => number | null;
    }) {
		this.toPosition = options.toPosition;
		this.fromPosition = options.fromPosition;
		this._mapType = options.mapType || MapTypes.Square;
		if(!options.getEstimate){
			this.getEstimate = (a,b)=>Pathfinder._genericFetch(a,b,this.toPosition);
		}
		else{
			this.getEstimate = options.getEstimate;
		}

		if(!options.getCost){
			this.getCost = (a,b)=>Pathfinder._genericFetch(a,b,this.toPosition);
		}
		else{
			this.getCost = options.getCost;
		}
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
	private static wrappedAndCachedFetch = <A>(tile: Position, from: Position, fetch: <Z extends A>(tile: Z, from: Z)=>number|null, fromPosition: (pos:Position)=> A|null, directCompare?: boolean) => {
		if(directCompare){
			if(tile === from){
				return -Infinity;
			}
		}
		else{
			const tHash = hashPosition(tile);
			const fHash = hashPosition(from);
			if(tHash === fHash) {
				return -Infinity;
			}
		}
				
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
			
		return cost;
		
	};

	/**
     * Trimmed down version of A* that is more efficient but less flexible.
     * @param start 
     * @param end 
     * @param options {AStarOptions<A, I>}
     * @returns 
     */
	private _AStar = <I extends boolean|undefined = false>(start: Position, end: Position, options?: NestedNonNullish<AStarOptions<A, I>>): AStarResult<A,I> => {
        
		const positionMap = new PositionMap();
		start = positionMap.get(start.x, start.y);
		
		const estimator = (options?.getEstimate ?? this.getEstimate);
		const pricer = (options?.getCost ?? this.getCost);

		let maxDepth = options?.maxDepth ?? Infinity;
		const desiredRouteCount = options?.solutions?.routes ?? 1;
		const maxDistance = options?.maxDistance ?? Infinity;

        type Item = {
            positions: [Position, ...Position[]];
            costs?: number[];
            costSum: number;
            estimate: number;
            total: number;
        };
    
        //const checkedPositions = new Set<Position>([]);
        /**
         * The routes that have reached the goal.
         */
        const successfulRoutes = new Set<Item>([]);
        const touchedPositionCounts = new Map<Position, number>([]);
        const incrementTouchedPosition = (position: Position) => {
        	const count = touchedPositionCounts.get((position)) ?? 0;
        	touchedPositionCounts.set((position), count + 1);
        }

        /**
        * The routes that are currently being checked, in the order
        * we start with the start position.
        */
        const activeRoutes: Item[] = [];
    
        let bestActiveRoute: Item = {
        	positions: [positionMap.get(start.x, start.y)],
        	costs: [],
        	costSum: 0,
        	estimate: 0,
        	total: 0,
        };
        let tempCost:number|null;
        
        /**
         * The sort predicate for the active routes. This is the heart of the A* algorithm.
         * Traditional A* is f(n)=g(n)+h(n), 
         * where 
         *  g(n) is the cost to get to the current node and
         *  h(n) is the heuristic to get to the end.
         * Ideally you pick the minimum f(n) to get the best route, and recursively do this until you reach the end.
         * Here we do something a little more interesting, 
         * in that we break ties by pick the route whose last position has been touched the least,
         * which may give you routes that search unexplored space first.
         * @param a 
         * @param b 
         * @returns 
         */
        const sortPredicate = (a: Item, b: Item)=>{
    		const totalDiff = a.total - b.total;
    		/*if(totalDiff === 0){ 			
    				const aTouched = touchedPositionCounts.get((a.positions.at(-1) as Position))??0;
    				const bTouched = touchedPositionCounts.get((b.positions.at(-1) as Position))??0;
    				return aTouched - bTouched;
    		}*/
    		return totalDiff;
    	}

        /**
         * Sorts a new route into the active routes. 
         * Because Active Routes needs to be sorted, we insert them this way because it is much faster than calling the sort method (we know only this new item needs to be determined.)
         */
        //Loop variable - declared here for performance reasons.
        let sortIntoActiveRoutesIndex = 0;
        const sortIntoActiveRoutes = (item: Item)=>{
        	
        	if(activeRoutes.length === 0 || sortPredicate(item, activeRoutes[0]) <= 0){
        		activeRoutes.unshift(item);
        	}
        	for(sortIntoActiveRoutesIndex=1; sortIntoActiveRoutesIndex < activeRoutes.length; sortIntoActiveRoutesIndex++){
        		if(sortPredicate(item, activeRoutes[sortIntoActiveRoutesIndex]) <= 0){
        			activeRoutes.splice(sortIntoActiveRoutesIndex, 0, item);
        			return;
        		}
        	}
        	activeRoutes.push(item);
        }

        /**
         * The main loop of the A* algorithm.
         * Take the best active route and find the next possible routes from it, one step at a time.
         */

        //Loop variables - declared here for performance reasons.
        let i:number, j: number;
        do{
        	if(bestActiveRoute.total <= maxDepth && bestActiveRoute.positions.length < maxDistance){
        		const choices: (Position|Partial<Item>)[] = getAdjacentPositions(bestActiveRoute.positions.at(-1) as Position, this._mapType, positionMap);
        		createLoop:
        		for(i = 0; i < choices.length; i++){
        			choices[i] = {
        				positions: [...bestActiveRoute.positions, choices[i] as Position],
        			}
        			if(options?.solutions?.includeLoops !== true && (choices[i] as Item).positions.length >= 3){
        				for(j = (choices[i] as Item).positions.length - 2; j > 0; j--){
        					if((choices[i] as Item).positions[j] === (choices[i] as Item).positions.at(-1)){
        						choices.splice(i, 1);
        						i--;
        						continue createLoop;
        					}
        				}
        				incrementTouchedPosition((choices[i] as Item).positions.at(-1) as Position);
        				if(options?.solutions.type === 'Fast' && touchedPositionCounts.get((choices[i] as Item).positions.at(-1) as Position) as number > 3){
        					choices.splice(i, 1);
        					i--;
        					continue;
        				}
        			} 
        			tempCost = Pathfinder.wrappedAndCachedFetch((choices[i] as Item).positions.at(-1) as Position, bestActiveRoute.positions.at(-1) as Position, pricer, this.fromPosition, true);
        			if(tempCost === null){
        				choices.splice(i, 1);
        				i--;
        				continue;
        			}
        			(choices[i] as {estimate: number|null}).estimate = Pathfinder.wrappedAndCachedFetch(end, bestActiveRoute.positions.at(-1) as Position, estimator, this.fromPosition, true);
        			if((choices[i] as Partial<Item>).estimate === null){
        				choices.splice(i, 1);
        				i--;
        				continue;
        			}
        			if(options?.solutions?.includeCosts){
        				(choices[i] as Item).costs = [...bestActiveRoute.costs??[], tempCost as number];
        			}
        			(choices[i] as Item).costSum = bestActiveRoute.costSum + tempCost as number;
        			(choices[i] as Item).total = (choices[i] as Item).costSum as number + (choices[i] as Item).estimate;
        			incrementTouchedPosition((choices[i] as Item).positions.at(-1) as Position);	
        		}
        		/**
                 * Loop over the new choices and decide what to do with them.
                 * This loop is labeled so that we can continue it from inside the loop that checks for loopbacks.
                 */
        		for(i=0; i < choices.length; i++){
        			/*
                    if(!(options?.includeLoopingRoutes ?? false)){
        				for(j = 0; j < (choices[i] as Item).positions.length-1; j++){
        					if((choices[i] as Item).positions[j] === (choices[i] as Item).positions.at(-1)){
        						continue loop1;
        					}
        				}
        			}
                    */
        			if(isSamePosition((choices[i] as Item).positions.at(-1) as Position, end)){
        				successfulRoutes.add((choices[i] as Item));
        				maxDepth = Math.min(maxDepth, (choices[i] as Item).total);
        				continue;
        			}
        			sortIntoActiveRoutes(choices[i] as Item);
        		}
        	}
        	bestActiveRoute = activeRoutes.shift() as Item;
        	
        }while((activeRoutes.length > 0) && (options?.solutions?.type === 'Best' || successfulRoutes.size < desiredRouteCount));
        const routes = Array.from(successfulRoutes.values());
        const result = {
    	    routes: routes.map((route)=>route.positions.map(this.fromPosition)),
    	    cache:undefined as never,
        } as unknown as AStarResult<A, I>;
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

		const calculatedOptions: NestedNonNullish<AStarOptions<A, I>> = {
			solutions: {
				includeCosts: (options?.solutions?.includeCosts ?? false) as NestedNonNullish<I>,
				includeIncomplete: options?.solutions?.includeIncomplete ?? false,
				includeLoops: options?.solutions?.includeLoops ?? false,
				type: options?.solutions?.type ?? 'Best',
				routes: options?.solutions?.routes ?? 1,
				includeTies: options?.solutions?.includeTies ?? false,
			},
			maxDepth: options?.maxDepth ?? Infinity,
			maxDistance: options?.maxDistance ?? Infinity,
			getEstimate: options?.getEstimate ?? this.getEstimate,
			getCost: options?.getCost ?? this.getCost,
		};

		if(typeof calculatedOptions.maxDepth !== 'number' || isNaN(calculatedOptions.maxDepth) || calculatedOptions.maxDepth < 1){
			throw new Error('maxDepth must be greater than 0.');
		}
		if(typeof calculatedOptions.solutions.routes !== 'number' || isNaN(calculatedOptions.solutions.routes) || calculatedOptions.solutions.routes < 1){
			throw new Error('routes must be greater than 0.');
		}
		if(typeof calculatedOptions.maxDistance !== 'number' || isNaN(calculatedOptions.maxDistance) || calculatedOptions.maxDistance < 1){
			throw new Error('routeLength must be greater than 0.');
		}
        
		return this._AStar(this.toPosition(start), this.toPosition(end), calculatedOptions);
	}
}
