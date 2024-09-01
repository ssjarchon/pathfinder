# Dead Simple Pathfinder

A naive pathfinding library for typescript. Uses a modified A\* algorithm to find the shortest path between two points over a tiled map. Accepts most forms of tiled maps.

## Installation

```
npm i DS-Pathfinder
```

You can run a simple example project from the test.html file.

## Usage

Create a Pathfinder. It will need a toPosition callback, a fromPosition callback, and a MapType.

```typescript
import { Pathfinder } from "ds-pathfinder";

type Position = {
  x: number;
  y: number;
};

type Tile = {
  position: Position;
};

const myTiles = new Map<Tile["position"], Tile>();

const path = new Pathfinder<Tile>({
  toPosition: (item: Tile): Position => {
    return item.position;
  },
  fromPosition: (pos: Position): Tile | null => {
    return myTiles.get(pos) ?? null;
  },
  mapType: "Square",
});
```

### Pathfinding

Call the algorithm like this:

```typescript
path.aStar(firstTile, secondTile, options);
```

You can provide different options as needed.

1. routeLength?: number = Infinity

   Determines the maximum length of any given route. Similar to maxDepth, but only applies as a final filter.

2. includeCostsAtNodes?: boolean = false

   If true, then the returned routes will have the actual costs at each position.

3. includeIncompleteRoutes?: boolean = false

   If true, if not enough complete routes were found to match the requested number in the routes parameter, it will fill the rest with incomplete routes.

4. includeLoopingRoutes?: boolean = false

   If true, routes are allowed to contain loops.

5. onIteration?: (bestRoute: {
   positions: Position[];
   positionHash: string;
   cost: number[]|null;
   estimate: number;
   total: number;
   })=>void;

   If provided, this function will be run on every iteration, and given the current best route.

6. maxDepth?: number = Infinity

   Provides a max depth that any route will be checked. Is a hard limit.

7. routes?: number = 1

   How many unique routes do you want? Sometimes you may want to see a few variations.

8. estimator?: (tile: A, from: A)=>number|null;

   Function that estimates the cost from point a to point b.

9. cost?: (tile: A, from: A)=>number|null;

   Gives the actual cost from point a to point b; only called on adjacent tiles.
