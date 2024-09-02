import { Pathfinder } from "./pathfinder.js";

const xSize = 100;
const ySize = 200;

    type Tile =  {
        type: "floor"|"stone"|"water"|"lava"|"wall"
        x: number;
        y: number;
        element: HTMLElement;
    };

const myGrid = Array.from({ length: xSize }, (y) => Array.from({ length: ySize }, (x) => ({ 
	type: Math.random() < 0.3 ? "stone" : Math.random() < 0.1 ? "water" : Math.random() < 0.1 ? "lava" : "floor" ,
	x: x,
	y: y,
	element: undefined as unknown as HTMLElement
}as Tile)
));

const Tiles: Tile[] = myGrid.map((row, x) => {
	return row.map((item, y) => {
		return {
			...item,
			x: x,
			y: y,
			element: undefined as unknown as HTMLElement
		} as Tile;
	})
}).flat();



console.log(JSON.stringify(myGrid));

const maps = new Map<number, Map<number, Tile>>();
Tiles.forEach((item)=>{
	if(!maps.has(item.x)){
		maps.set(item.x, new Map<number, Tile>());
	}
	maps.get(item.x)?.set(item.y, item);
});

const path = new Pathfinder<Tile>({
	toPosition: (item: Tile) => {
		return item;
	},
	fromPosition: (pos: { x: number; y: number }): Tile | null => {
		return (maps.get(pos.x))?.get(pos.y) || null;
	},getEstimate:
    (tile: Tile, destination: Tile) => {

    	return  Math.abs(tile.x-destination.x) + Math.abs(tile.y-destination.y);
    },
	getCost: (_: Tile, destination: Tile) => {

		switch(destination.type){
		case "lava":
			return 21;
			
		case "water":
			return 3;
			
		case "stone":
			return null;
		default:
			return 1;
			
		}
		
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

//@ts-expect-error adding clear to window
window.clear = ()=>{
	Tiles.forEach((item)=>{
		item.type = "floor";
		if(item.element){
			item.element.setAttribute('class','');
			item.element.classList.add("floor");
			item.element.innerText = "";
		}
	});
}

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
	ele.addEventListener('contextmenu',(e)=>{

		item.type = item.type === "stone" ? "floor" : "stone";

		item.element?.classList.remove("floor");
		item.element?.classList.remove("wall");

		if(item.type === "floor")
			item.element.classList.add("floor");
		else if(item.type === "stone")
			item.element.classList.add("wall");

		e.preventDefault();
	});
	ele.addEventListener('mouseenter',(e)=>{
		if(e.buttons === 2){
			console.log("right click");
			item.type = item.type === "stone" ? "floor" : "stone";

			item.element?.classList.remove("floor");
			item.element?.classList.remove("wall");

			if(item.type === "floor")
				item.element.classList.add("floor");
			else if(item.type === "stone")
				item.element.classList.add("wall");

			e.preventDefault();
		}
	});
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
				
				const callback = ()=>{
					//if(end === start){
					//	window.requestAnimationFrame(()=>{
					report.innerHTML = `Pathfinding took ${(performance.now()+performance.timeOrigin)-start}ms`;
					//	});
					//}
				}
				const walk = path.aStar(firstTile, secondTile, {
					solutions: {type:'Fast'}
				    });
				
				
				callback();
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
					console.log('Solutions:',walk.routes.length)
					thisWalk.forEach((item, idx)=>{
						//item.element.innerText = `${idx}`;
						if(idx === 0){
							item.element.classList.add("start");
						}
						else if(idx === thisWalk.length - 1){
							item.element.classList.add("end");
						}
						else{
							item.element.classList.add("path");
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
