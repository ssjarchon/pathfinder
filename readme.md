#Dead Simple Pathfinder

##Installation

```
npm i DS-Pathfinder
```

##Usage

```typescript
import { Pathfinder } from "ds-pathfinder";

const myMap: {}[][] = [
  [{ type: "floor" }, { type: "floor" }, { type: "floor" }, { type: "floor" }],
  [{ type: "stone" }, { type: "stone" }, { type: "floor" }, { type: "floor" }],
  [{ type: "floor" }, { type: "stone" }, { type: "floor" }, { type: "floor" }],
  [{ type: "floor" }, { type: "floor" }, { type: "floor" }, { type: "floor" }],
];

type Tile = myMap[number][number];

const path = new Pathfinder<Tile>({
  toPosition: (item: Tile) => {
    for (let y = 0; y < myMap.length; y++) {
      for (let x = 0; x < myMap[y].length; x++) {
        if (myMap[y][x] === item) {
          return {
            x: x,
            y: y,
          };
        }
      }
    }
  },
  fromPosition: (pos: { x: number; y: number }): Tile | null => {
    const tile = myMap[y]?.[x];
    if (tile) {
      return tile;
    }
    return null;
  },
  mapType: "Square",
});

const styles = document.createElement("style");
document.body.append(styles);
styles.innerHTML = `
.container{
    display:grid;
    grid-template-columns: ${`${100 / myMap.length}vh`.repeat(myMap.length)};
    grid-template-rows: ${`${100 / myMap[0].length}vh`.repeat(myMap[0].length)};
}
.container div{
border: 1px solid black;
}`;

const container = document.createElement("div");
document.body.append(container);
let first, second;
container.innerHTML = `${myMap.flat().map((item, idx) => {
  `<div data-x="${idx % myMap[0].length}" data-y="${Math.round(
    idx / myMap[0].length
  )}"></div>`;
})}`;
container.classList.add("container");
Array.from(container.querySelectorAll("div")).forEach((ele) => {
  ele.addEventListener("click", () => {
    if (second) {
      second = null;
      first = ele;
    } else if (first && first !== ele) {
      second = ele;
      path.aStar();
    }
  });
});
```
