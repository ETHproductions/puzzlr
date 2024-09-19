/**
 * Construct representing a rectangular array of data. Width and height cannot
 * be changed after creation.
 */
export default class Array2D<T> {
  #width: number = 0;
  #height: number = 0;
  data: T[] = [];

  /**
   * Create a new Array2D. This constructor can be called in several ways:
   * - new Array2D(width, height, fill?)
   *   - create with given width and height, optionally filling with a value
   * - new Array2D(arr)
   *   - convert a 2-dimensional array to an Array2D
   * - new Array2D(arr2d)
   *   - clone an existing Array2D
   */
  constructor(width: number, height?: number, fill?: T);
  constructor(arr: T[][]);
  constructor(arr2d: Array2D<T>);
  constructor(width: number | T[][] | Array2D<T>, height?: number, fill?: T) {
    if (width instanceof Array2D) {
      this.#width = width.width;
      this.#height = width.height;
      this.data = width.data.slice();
    } else if (width instanceof Array) {
      const data = width;
      if (data.length == 0)
        throw new Error("Array2D cannot be created from empty array");
      return Array2D.from2D(data);
    } else {
      if (typeof width != "number" || typeof height != "number")
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
  static from1D<T>(
    data: T[],
    width: number,
    height: number = Math.ceil(data.length / width),
  ) {
    if (width <= 0 || width % 1 != 0)
      throw new Error("Array2D width must be a positive integer");
    if (height <= 0 || height % 1 != 0)
      throw new Error("Array2D height must be a positive integer");

    const arr = new Array2D<T>(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        arr.data[y * width + x] = data[y * width + x];
      }
    }

    return arr;
  }

  /**
   * Create a new Array2D from a 2-dimensional array of data.
   */
  static from2D<T>(data: T[][]) {
    const width = data.reduce((p, c) => Math.max(p, c.length), 0);
    if (width == 0)
      throw new Error("Array2D cannot be created from empty 2D array");

    const arr = new Array2D<T>(width, data.length);
    for (let y = 0; y < arr.height; y++) {
      for (let x = 0; x < width; x++) {
        arr.data[y * width + x] = data[y][x];
      }
    }

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
  get1D(index: number) {
    return this.data[index];
  }
  /**
   * Set an item at a given 1D index in the data array. Returns true if given
   * index is in-bounds, false otherwise.
   */
  set1D(index: number, obj: T) {
    if (0 <= index && index < this.data.length) {
      this.data[index] = obj;
      return true;
    }
    return false;
  }

  /**
   * Get the item at a given 2D location in this Array2D. Throws if the
   * requested location is outside the bounds of the array.
   */
  get2D(x: number, y: number) {
    if (this.inBounds2D(x, y)) return this.data[y * this.#width + x];
    throw new RangeError("Attempted to get value outside bounds of Array2D");
  }
  /**
   * Get the item at a given 2D location in this Array2D, with a default value
   * returned instead if the requested location is outside the bounds of the
   * array.
   */
  get2DUnsafe<U>(x: number, y: number, def: U) {
    if (this.inBounds2D(x, y)) return this.data[y * this.#width + x];
    return def;
  }
  /**
   * Set the item at a given 2D location in this Array2D. Throws if the
   * requested location is outside the bounds of the array.
   */
  set2D(x: number, y: number, obj: T) {
    if (this.inBounds2D(x, y)) return (this.data[y * this.#width + x] = obj);
    throw new RangeError("Attempted to set value outside bounds of Array2D");
  }

  /**
   * Returns true if a given 2D location is inside the bounds of the array,
   * false otherwise.
   */
  inBounds2D(x: number, y: number) {
    return x >= 0 && x < this.#width && y >= 0 && y < this.#height;
  }

  /**
   * Modify each item in this Array2D by mapping through a given function.
   * The function is provided three arguments:
   * 1. the item at a given location
   * 2. the location itself, with 2D position as .x/.y and 1D index as .i
   * 3. this Array2D
   */
  modify(
    func: (
      item: T,
      pos: { x: number; y: number; i: number },
      arr: Array2D<T>,
    ) => T,
  ) {
    for (let y = 0; y < this.#height; y++)
      for (let x = 0; x < this.#width; x++) {
        const i = y * this.#width + x;
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
  map<U>(
    func: (
      item: T,
      pos: { x: number; y: number; i: number },
      arr: Array2D<T>,
    ) => U,
  ) {
    const arr = new Array2D<U>(this.width, this.height);
    for (let y = 0; y < this.#height; y++)
      for (let x = 0; x < this.#width; x++) {
        const i = y * this.#width + x;
        arr.data[i] = func(this.data[i], { x, y, i }, this);
      }
    return arr;
  }
}
