import { Pathfinder } from "./pathfinder.js";

const xSize = 80;
const ySize = 50;

const myGrid: {type: string}[][] = [/*
	[{ type: "floor" }, { type: "floor" }, { type: "floor" }, { type: "floor" }],
	[{ type: "stone" }, { type: "stone" }, { type: "floor" }, { type: "floor" }],
	[{ type: "floor" }, { type: "stone" }, { type: "floor" }, { type: "stone" }],
	[{ type: "floor" }, { type: "floor" }, { type: "floor" }, { type: "floor" }],
	[{ type: "floor" }, { type: "stone" }, { type: "stone" }, { type: "floor" }],
	[{ type: "floor" }, { type: "floor" }, { type: "floor" }, { type: "floor" }],*/
];

for (let x = 0; x < xSize; x++) {
	const row = [];
	for (let y = 0; y < ySize; y++) {
		row.push({
			type: Math.random() > 0.3 ? "floor" :  Math.random() > 0.1 ? "stone" : "water"
		});
	}
	myGrid.push(row);
}

for (let x = 0; x < xSize; x++) {
	const row = myGrid[x];
	for (let y = 0; y < ySize; y++) {
		const item = row[y];
		if (item.type === "wall") {
			continue;
		}
		const adjacent = [
			myGrid[x]?.[y - 1],
			myGrid[x + 1]?.[y],
			myGrid[x]?.[y + 1],
			myGrid[x - 1]?.[y],
		].filter((item) => item && item.type === 'water').length;
        
		switch (adjacent) {
		case 0: 
			row[y] = { type: Math.random() < 0.001 ? "lava" : row[y].type };
			if(row[y].type === "lava"){
				[
					myGrid[x]?.[y - 1],
					myGrid[x + 1]?.[y],
					myGrid[x]?.[y + 1],
					myGrid[x - 1]?.[y],
				].forEach((item) => {
					if(item && item.type === "floor"){
						item.type = "lava";
					}
				});
			}
			break;
		case 1:
			row[y] = { type: Math.random() < 0.2 ? "water" : row[y].type };
			break;
		case 2:
			row[y] = { type: Math.random() < 0.9 ? "water" : row[y].type };
			break;
		case 3:
			row[y] = { type: Math.random() < 0.9 ? "water" : "floor" };
			break;
		case 4:
			row[y] = { type: Math.random() < 0.01 ? "water" : "floor" };
			break;
		}
		
	}
	myGrid[x] = row;
}

const Tiles = myGrid.map((row, x) => {
	return row.map((item, y) => {
		return {
			...item,
			x: x,
			y: y,
			element: undefined as unknown as HTMLElement
		};
	})
}).flat();

type Tile = typeof Tiles[0];

const path = new Pathfinder<Tile>({
	toPosition: (item: Tile) => {
		return item;
	},
	fromPosition: (pos: { x: number; y: number }): Tile | null => {
		return Tiles.find((item) => item.x === pos.x && item.y === pos.y) || null;
	},
	cost: (tile: Tile, destination: Tile) => {
		let z = 0;
		switch(destination.type){
		case "lava":
			z+=20;
			break;
		case "water":
			z+=2;
			break;
		case "stone":
			return null;
		case "floor":
			break;
		}
		return z + Math.abs(tile.x-destination.x) + Math.abs(tile.y-destination.y);
	},
	mapType: "Square",
});

const styles = document.createElement("style");
document.body.append(styles);
styles.innerHTML = `
.container{
    width: 100vw;
    height: 95vh;
    display:grid;
    grid-template-columns: ${`${100 / myGrid[0].length}% `.repeat(myGrid[0].length)};
    grid-template-rows: ${`${100 / myGrid.length}% `.repeat(myGrid.length)};
}

.container div{
position:relative;
    border: 1px solid black;
    background-color: white;
    transition: background-color .5s;
    align-items: center;
    display: flex;
    justify-content: center;
    font-size: 2em;
}
   
    .container div.search{
    background-color: purple;
    }
    .container div.path{
    background-color: yellow;
    }
    .container div.start{
    background-color: green;
    } 
    .container div.end{
    background-color: red;
    }
    .container div.lava{
    background-color: crimson;
    }
    .container div.water{
    
    }
    .container div.water:after{
        content: "";
        width: 100%;
        height: 100%;
            background-color: blue;
    position: absolute;
    z-index: 0;
    }
    .container div.wall{
    background-color: black;}
.container div:hover{
border: 3px solid purple;
}`;

const report = document.createElement("div");
document.body.append(report);

const container = document.createElement("div");
document.body.append(container);
let first: HTMLElement|null, second: HTMLElement|null;

container.innerHTML = `${Tiles.map((item, idx) => {
	return `<div data-idx="${idx}"></div>`;
}).join('')}`;

container.classList.add("container");
Array.from(container.querySelectorAll('div')).forEach((ele, idx)=>{

	Tiles[idx].element = ele as HTMLElement;
	const item = Tiles[idx];
	if(item.element){
		if(item.type === "floor")
			item.element.classList.add("floor");
		else if(item.type === "stone")
			item.element.classList.add("wall");
		else if(item.type === "water")
			item.element.classList.add("water");
		else if(item.type === "lava")
			item.element.classList.add("lava");
	}
	const cancel = 0;
	ele.addEventListener('click',async()=>{
		clearTimeout(cancel);
		if(second){
			second = null;
			first = ele;
		}
		else if(first && first !== ele){
			second = ele;

			

			const firstTile = Tiles.find(k=>k.element === first);
			const secondTile = Tiles.find(k=>k.element === second);

			if(firstTile && secondTile){
				Tiles.forEach((item)=>{
					if(item.element){
						item.element.classList.remove("start");
						item.element.classList.remove("end");
						item.element.classList.remove("path");
						item.element.classList.remove("search");
                        
						item.element.innerText = "";
					}
				});
				const start = performance.now()+performance.timeOrigin;
				let end = start;
				const callback = ()=>{
					if(end === start){
						window.requestAnimationFrame(()=>{
							report.innerHTML = `Pathfinding took ${(performance.now()+performance.timeOrigin)-start}ms`;
						});
					}
				}
				const walk = await path.aStarAsync(firstTile, secondTile, {
					includeCostsAtNodes: true,
					includeIncompleteRoutes: true,
					includeLoopingRoutes: true,
					
					onIteration: async(r)=>{
						const pos = r.positions.at(-1);
						if(pos){
							const tile = Tiles.find(t=>{
								return t.x === pos.x && t.y === pos.y;
							});
							if(tile && tile.element){
								tile.element.classList.add("search");
								tile.element.innerText = `${(r.cost??[]).reduce((a,b)=>a+b, 0)}`;
								await new Promise((res)=>window.requestAnimationFrame(res));
							}
						}
						//callback();
						//console.log(r)}
				    }});
				callback();
				end = performance.now()+performance.timeOrigin;
				//report.innerHTML = `Pathfinding took ${end-start}ms`;
				if(walk.routes.length === 0){
					first.classList.add("start");
					second.classList.add("end");
				}

				else{
					const thisWalk = walk.routes[Math.floor(walk.routes.length*Math.random())];
					
					Tiles.forEach((item)=>{
						if(item.element){
							item.element.classList.remove("start");
							item.element.classList.remove("end");
							item.element.classList.remove("path");
							
						}
					});
					thisWalk.forEach((item, idx)=>{
						item.node.element.innerText = `${idx}`;
						if(idx === 0){
							item.node.element.classList.add("start");
						}
						else if(idx === thisWalk.length - 1){
							item.node.element.classList.add("end");
						}
						else{
							item.node.element.classList.add("path");
						}
					})
				} 
					
				
			}
		}
		else{
			first = ele;
		}
	})
});
