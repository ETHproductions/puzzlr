class Array2D {
	#width;
	#height;
	
	/**
	 * Create a new Array2D. This constructor can be called in several ways:
	 * - new Array2D(width, height, fill?)
	 *   - create with given width and height, optionally filling with a value
	 * - new Array2D(arr)
	 *   - convert a 2-dimensional array to an Array2D
	 * - new Array2D(arr, width)
	 *   - convert a 1-dimensional array to an Array2D with a given width
	 * - new Array2D(arr2d)
	 *   - clone an existing Array2D
	 */
	constructor(width, height, fill) {
		if (width instanceof Array2D) {
			this.#width = width.width;
			this.#height = width.height;
			this.data = width.data.slice();
		} else if (width instanceof Array) {
			let data = width;
			if (data.length == 0)
				throw new Error("Array2D cannot be created from empty array");
			if (data[0] instanceof Array) {
				return Array2D.from2D(data);
			} else {
				return Array2D.from1D(data, height, fill);
			}
		} else {
			if (typeof width != 'number' || typeof height != 'number')
				throw new Error("Array2D must be given width and height");
			if (width <= 0 || width % 1 != 0 || height <= 0 || height % 1 != 0)
				throw new Error("Array2D width and height must be positive integers");
			this.#width = width;
			this.#height = height;
			this.data = new Array(width * height).fill(fill);
		}
	}
	/**
	 * Clone this Array2D by copying the width, height, and data.
	 */
	clone() {
		return new Array2D(this);
	}
	
	/**
	 * Create a new Array2D with a given width and height from a 1-dimensional
	 * array of data.
	 */
	static from1D(data, width, height) {
		if (!(data instanceof Array))
			throw new Error("Array2D.from1D() requires 1D array");
		if (typeof width != 'number')
			throw new Error("Array2D created from 1D array must have width provided");
		if (width <= 0 || width % 1 != 0)
			throw new Error("Array2D width must be a positive integer");
		
		if (typeof height != 'number')
			height = Math.ceil(data.length / width);
		if (height <= 0 || height % 1 != 0)
			throw new Error("Array2D height must be a positive integer");
		
		let arr = new Array2D(width, height);
		for (let y = 0; y < height; y++)
			for (let x = 0; x < width; x++)
				arr.data[y * width + x] = data[y * width + x];
		
		return arr;
	}
	
	/**
	 * Create a new Array2D from a 2-dimensional array of data.
	 */
	static from2D(data) {
		if (!(data instanceof Array) || !(data[0] instanceof Array))
			throw new Error("Array2D.from2D() requires 2D array");
		
		let width = data.reduce((p, c) => Math.max(p, c.length), 0);
		if (width == 0)
			throw new Error("Array2D cannot be created from empty 2D array");
		
		let arr = new Array2D(width, data.length);
		for (let y = 0; y < this.#height; y++)
			for (let x = 0; x < width; x++)
				arr.data[y * width + x] = data[y][x];
		
		return arr;
	}
	
	/**
	 * The width of this Array2D.
	 */
	get width() {
		return this.#width;
	}
	/**
	 * The height of this Array2D.
	 */
	get height() {
		return this.#height;
	}
	/**
	 * The size of this Array2D, i.e. the total number of cells.
	 */
	get size() {
		return this.#width * this.#height;
	}
	
	/**
	 * Get an item by 1D index in the data array.
	 */
	get1D(index) {
		return this.data[index];
	}
	/**
	 * Set an item at a given 1D index in the data array. Returns true if given
	 * index is in-bounds, false otherwise.
	 */
	set1D(index, obj) {
		if (0 <= index && index < this.data.length) {
			this.data[index] = obj;
			return true;
		}
		return false;
	}
	
	/**
	 * Get an item at a given 2D location in this Array2D. A default return
	 * value can be given for if the requested position is outside the bounds
	 * of the array.
	 */
	get2D(x, y, def) {
		if (this.inBounds2D(x, y))
			return this.data[y * this.#width + x];
		return def;
	}
	/**
	 * Set an item at a given 2D location in this Array2D. Returns
	 * true if the location given is in-bounds, false otherwise.
	 */
	set2D(x, y, obj) {
		if (this.inBounds2D(x, y)) {
			this.data[y * this.#width + x] = obj;
			return true;
		}
		return false;
	}
	
	/**
	 * Returns true if a given 2D location is in-bounds, false otherwise.
	 */
	inBounds2D(x, y) {
		return x >= 0 && x < this.#width && y >= 0 && y < this.#height;
	}
	
	/**
	 * Modify each item in this Array2D by mapping through a given function.
	 * The function is provided three arguments:
	 * 1. the item at a given location
	 * 2. the location itself, with 2D position as .x/.y and 1D index as .i
	 * 3. this Array2D
	 */
	modify(func) {
		for (let y = 0; y < this.#height; y++)
			for (let x = 0; x < this.#width; x++) {
				let i = y * this.#width + x;
				this.data[i] = func(this.data[i], { x, y, i }, this);
			}
		return this;
	}
	/**
	 * Clone this Array2D and map each item through a given function.
	 * The function is provided three arguments:
	 * 1. the item at a given location
	 * 2. the location itself, with 2D position as .x/.y and 1D index as .i
	 * 3. the cloned Array2D
	 */
	map(func) {
		let arr = this.clone();
		arr.modify(func);
		return arr;
	}
}

module.exports = Array2D;
