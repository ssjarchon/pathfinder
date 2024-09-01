type Leaf<T = unknown> = {
    values: T[];
    parent: (Leaf<T>&({left: Leaf<T>}|{right: Leaf<T>})) | null;
    left: (Leaf<T>&{parent: Leaf<T>}) | null;
    right: (Leaf<T>&{parent: Leaf<T>}) | null;
};

export class SortedTree<T> {

	private length = 0;
	private root: Leaf<T> | null = null;
	private weakMap = new WeakMap<T & object, Leaf<T>>();
	constructor(private compare: (a: T, b: T) => -1 | 0 | 1) {

	}
	add(value: T): boolean {
		if(this.root === null){
			this.root = {values: [value], left: null, right: null, parent: null};
			return true;
		}
		else if(typeof value === 'object' && value !== null){
			if(this.weakMap.has(value)){
				return false;
			}
			const leaf = SortedTree.addValue(this.root, value, this.compare);
			this.weakMap.set(value, leaf);
			return true;
		}
		else{
			SortedTree.addValue(this.root, value, this.compare);
			return true;
		}
	}
	remove(value: T): boolean {
		if(this.root === null){
			return false;
		}
		if(typeof value === 'object' && value !== null){
			const leaf = this.weakMap.get(value);
			if(leaf){
				this.weakMap.delete(value);
				return SortedTree.removeValue(leaf, value, this.compare);
			}
		}
		else{
			return SortedTree.removeValue(this.root, value, this.compare);
		}
        
		throw new Error('Not implemented');
	}
	

	private static addValue<T>(leaf: Leaf<T>, value: T, compare: (a: T, b: T) => -1 | 0 | 1): Leaf<T> {
		const comparison = compare(leaf.values[0], value);
		if (comparison === 0) {
			leaf.values.push(value);
			return leaf;
		}
		if (comparison < 0) {
			if (leaf.left) {
				return this.addValue(leaf.left, value, compare);
			} else {
				leaf.left = { values: [value], left: null, right: null, parent: leaf as Leaf<T> & {left: Leaf<T>} };
				return leaf.left;
			}
		} else{
			if (leaf.right) {
				return this.addValue(leaf.right, value, compare);
			} else {
				leaf.right = { values: [value], left: null, right: null, parent: leaf as Leaf<T> & {right: Leaf<T>} };
				return leaf.right;
			}
		}
	}

	private static hasParent<T>(leaf: Leaf<T>): leaf is Leaf<T> & {parent: Leaf<T>} {
		return leaf.parent !== null;
	}
	private static hasLeft<T>(leaf: Leaf<T>): leaf is Leaf<T> & {left: Leaf<T>} {
		return leaf.left !== null;
	}
	private static hasRight<Z extends Leaf>(leaf: Z): leaf is Z & {right: Leaf} {
		return leaf.right !== null;
	}

	private static getFarthestRightLeaf<Z extends Leaf>(leaf: Z): Z extends {right: Leaf} ? Leaf & {parent: Z} : Z & {right: null} {
		if(SortedTree.hasRight(leaf)){
			return this.getFarthestRightLeaf(leaf);
		}else{
		    return leaf as Z extends {right: Leaf} ? Leaf & {parent: Z} : Z & {right: null};
		}
	}

	private static getFarthestLeftLeaf<T>(leaf: Leaf<T>): Leaf<T> {
		if(leaf.left){
			return this.getFarthestLeftLeaf(leaf.left);
		}
		return leaf;
	}

	private static getDeepestLeafVeeringRight<T>(leaf: Leaf<T>): Leaf<T> {
		if(leaf.right){
			return this.getDeepestLeafVeeringRight(leaf.right);
		}
		if(leaf.left){
			return this.getDeepestLeafVeeringRight(leaf.left);
		}
		return leaf;
	}

	private static getDeepestLeafVeeringLeft<T>(leaf: Leaf<T>): Leaf<T> {
		if(leaf.left){
			return this.getDeepestLeafVeeringLeft(leaf.left);
		}
		if(leaf.right){
			return this.getDeepestLeafVeeringLeft(leaf.right);
		}
		return leaf;
	}

	private static breakAndReaddLeaf<T>(root: Leaf<T>, leaf: Leaf<T>, compare: (a: T, b: T) => -1 | 0 | 1): Leaf<T> {
		if(leaf.values.length === 0){
			throw new Error('Leaf is empty');
		}

		if(leaf.parent){
			if(leaf.parent?.left === leaf){
				leaf.parent.left = null;
			}
			else{
				leaf.parent.right = null;
			}
			leaf.parent = null;
		}

		let node!: Leaf<T>;
		for(let i = 0; i< leaf.values.length; i++){
			if(i === 0){
				node = SortedTree.addValue(root, leaf.values[i], compare);
			}
			else{
				node.values.push(leaf.values[i]);
			}
		}
		if(leaf.left){
			SortedTree.breakAndReaddLeaf(node, leaf.left, compare);
		}
		if(leaf.right){
			SortedTree.breakAndReaddLeaf(node, leaf.right, compare);
		}
		return node;
	}

	private static closeLeaf<T>(leaf: Leaf<T>, compare: (a: T, b: T) => -1 | 0 | 1 ): Leaf<T>|null {
		if(leaf.values.length === 0){
			if(leaf.left && leaf.right){
				const newRoot = SortedTree.getFarthestRightLeaf(leaf.left)
				newRoot.parent.right = null;
				const orphanedLeft = newRoot.left;
				
				const result = {
					values: newRoot.values,
					right: leaf.right,
					left: leaf.left,
					parent: leaf.parent
				}
				if(orphanedLeft){
					SortedTree.breakAndReaddLeaf(result, orphanedLeft, compare)
				}
                
				return result;
			}
			else if(leaf.left){
				return leaf.left;
			}
			else if(leaf.right){
				return leaf.right;
			}
			else{
				return null;
			}
		}
		throw new Error('Leaf is not empty');
	}


	private static removeValue<T>(leaf: Leaf<T>, value: T, compare: (a: T, b: T) => -1 | 0 | 1): boolean {
		if(leaf === null){
			return false;
		}
		const comparison = compare(leaf.values[0], value);
		if(comparison === 0){
			const idx = leaf.values.findIndex((v) => v === value);
			if(idx !== -1){
				return false;
			}
			leaf.values.splice(idx, 1);
			if(leaf.values.length === 0){
                
				//rectify tree
			}
			return true;
		}
		if(comparison < 0){
			return leaf.left ? this.removeValue(leaf.left, value, compare) : false;
		}
		else{
			return leaf.right ? this.removeValue(leaf.right, value, compare): false;
		}
	}
}

export class LiteTree<T> {
	private map = new Map<T, T>();
}