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
