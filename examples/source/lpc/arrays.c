/**
 * Returns a new array containing the distinct elements of the input
 * array.
 *
 * @param {mixed[]} arr - An array of mixed types.
 * @return {mixed[]} - A new array with distinct elements from the input array.
 * @example
 * ```c
 * distinct_array(({1, 2, 3, 4, 5, 1, 2, 3, 4, 5}));
 * // Returns: ({1, 2, 3, 4, 5})
 * ```
 */
mixed *distinct_array(mixed *arr) {}

/**
 * Returns a new array containing the elements of the input array
 * from index 0 to start-1, and from end+1 to the end of the input
 * array. If start is greater than end, the new array will contain
 * all the elements of the input array.
 *
 * @param {mixed[]} arr - The input array.
 * @param {int} start - The starting index of elements to be removed.
 * @param {int} end - The ending index of elements to be removed. Defaults to
 *                    start if not specified.
 * @return {mixed[]} - A new array with specified elements removed.
 * @example
 * ```c
 * remove_array_element(({1, 2, 3, 4, 5}), 1, 3);
 * // Returns: ({1, 5})
 * ```
 */
varargs mixed *remove_array_element(mixed *arr, int start, int end) {}

/**
 * Modifies the content of an array by removing existing elements
 * and/or adding new elements. Returns a new array with the
 * modifications.
 *
 * @param {mixed[]} arr - The array from which elements will be removed and to
 *                        which new elements may be added.
 * @param {int} start - The zero-based index at which to start changing the
 *                      array. If negative, it will begin that many elements
 *                      from the end.
 * @param {int} delete_count - The number of elements to remove from the array,
 *                             starting from the index specified by start. If
 *                             delete_count is 0, no elements are removed.
 * @param {mixed[]} items_to_add - An array of elements to add to the array at
 *                                   the start index. Can be omitted or passed as
 *                                   null if no elements are to be added.
 * @return {mixed[]} - A new array reflecting the desired modifications.
 * @example
 * ```c
 * splice(({1, 2, 3, 4, 5}), 1, 2, ({6, 7}));
 * // Returns: ({1, 6, 7, 4, 5})
 * ```
 */
varargs mixed *splice(mixed *arr, int start, int delete_count, mixed *items_to_add) {}

/**
 * Returns a new array with the elements of the input array in
 * reverse order.
 *
 * @param {mixed[]} arr - The input array.
 * @return {mixed[]} - A new array with elements in reverse order.
 * @example
 * ```c
 * reverse_array(({1, 2, 3, 4, 5}));
 * // Returns: ({5, 4, 3, 2, 1})
 * ```
 */
mixed *reverse_array(mixed *arr) {}

/**
 * Checks if all elements in the input array are of the specified
 * type. If the array is of size 0, it is considered uniform.
 *
 * @param {string} type - The type to check for.
 * @param {mixed*} arr - The array to check.
 * @return {int} - Returns 1 if all elements are of the specified type, 0
 *                  otherwise.
 * @example
 * ```c
 * uniform_array("int", ({1, 2, 3, 4, 5}));
 * // Returns: 1
 * uniform_array("int", ({1, 2, 3, 4, "5"}));
 * // Returns: 0
 * ```
 */
int uniform_array(string type, mixed *arr) {}

/**
 * Returns an array filled with the specified value. If no array
 * is provided, an empty array is created. If no value is
 * provided, 0 is used as the value to fill the array with. If no
 * start index is provided, the array is filled from the end.
 *
 * @param {mixed*} arr - The array to fill.
 * @param {mixed} value - The value to fill the array with.
 * @param {int} start_index - The index at which to start filling the array. (optional)
 * @return {mixed} - The filled array.
 * @example
 * ```c
 * array_fill(({1, 2, 3, 4, 5}), 0, 10, 0);
 * // Returns: ({0, 0, 0, 0, 0, 0, 0, 0, 0, 0})
 * ```
 */
varargs mixed array_fill(mixed *arr, mixed value, int size, int start_index) {}

/**
 * Returns a new array of the specified size, filled with the
 * specified value. If the array is larger than the specified size,
 * the array is truncated to the specified size.
 *
 * @param {mixed*} arr - The array to pad.
 * @param {int} size - The size of the array to create.
 * @param {mixed} value - The value to fill the array with.
 * @param {int} beginning - Whether to fill the array from the beginning. (optional)
 * @return {mixed} - The padded array.
 * @example
 * ```c
 * array_pad(({1, 2, 3, 4, 5}), 10, 0, 1);
 * // Returns: ({0, 0, 0, 0, 0, 1, 2, 3, 4, 5})
 * ```
 */
varargs mixed array_pad(mixed *arr, int size, mixed value, int beginning) {}

/**
 * Removes and returns the last element of the array.
 *
 * @param {mixed[]} arr - The array from which to pop an element.
 * @return {mixed} - The last element of the array.
 * @example
 * ```c
 * mixed *arr = ({1, 2, 3, 4, 5});
 * pop(ref arr);
 * // Array: ({1, 2, 3, 4})
 * // Returns: 5
 * ```
 */
mixed pop(mixed ref *arr) {}

/**
 * Adds a new element to the end of the array and returns the new
 * size of the array.
 *
 * @param {mixed[]} arr - The array to which to push an element.
 * @param {mixed} value - The element to push onto the array.
 * @return {int} - The new size of the array.
 * @example
 * ```c
 * mixed *arr = ({1, 2, 3, 4, 5});
 * push(ref arr, 6);
 * // Array: ({1, 2, 3, 4, 5, 6})
 * // Returns: 6
 * ```
 */
int push(mixed ref *arr, mixed value) {}

/**
 * Removes and returns the first element of the array.
 *
 * @param {mixed[]} arr - The array from which to shift an element.
 * @return {mixed} - The first element of the array.
 * @example
 * ```c
 * mixed *arr = ({1, 2, 3, 4, 5});
 * shift(ref arr);
 * // Array: ({2, 3, 4, 5})
 * // Returns: 1
 * ```
 */
mixed shift(mixed ref *arr) {}

/**
 * Adds a new element to the beginning of the array and returns
 * the new size of the array.
 *
 * @param {mixed[]} arr - The array to which to unshift an element.
 * @param {mixed} value - The element to unshift onto the array.
 * @return {int} - The new size of the array.
 * @example
 * ```c
 * mixed *arr = ({1, 2, 3, 4, 5});
 * unshift(ref arr, 0);
 * // Array: ({0, 1, 2, 3, 4, 5})
 * // Returns: 6
 * ```
 */
int unshift(mixed ref *arr, mixed value) {}

/**
 * Returns a new array containing the elements of the input array
 * from the start index to the end index. If the end index is
 * negative, it will start from the end of the array.
 *
 * @param {mixed[]} arr - The array to slice.
 * @param {int} start - The starting index of the slice.
 * @param {int} end - The ending index of the slice.
 * @return {mixed[]} - A new array with the specified elements.
 * @example
 * ```c
 * array_slice(({1, 2, 3, 4, 5}), 1, 3) ;
 * // Returns: ({2, 3, 4})
 * ```
 */
varargs mixed *array_slice(mixed *arr, int start, int end) {}

/**
 * Merges two arrays into a single array.
 *
 * @param {mixed[]} arr1 - The first array to merge.
 * @param {mixed[]} arr2 - The second array to merge.
 * @return {mixed[]} - A new array with elements from both input arrays.
 * @example
 * ```c
 * array_merge(({1, 2, 3}), ({4, 5, 6}));
 * // Returns: ({1, 2, 3, 4, 5, 6})
 * ```
 */
mixed *array_merge(mixed *arr1, mixed *arr2) {}
