/**
 * Generates a random float between 0 and upper_bound.
 *
 * @param {mixed} upper_bound - The upper bound for the random float.
 * @return {float} - The random float between 0 and upper_bound.
 */
float random_float(mixed upper_bound) {}

/**
 * Selects an element from a weighted mapping based on their weights.
 *
 * @param {mapping} m - The weighted mapping to select from, where keys are the
 *                     elements and values are their weights.
 * @return {mixed} - The selected element.
 */
mixed element_of_weighted(mapping m) {}

/**
 * Generates a random integer within a specified range.
 *
 * @param {int} min - The lower bound (inclusive) of the range.
 * @param {int} max - The upper bound (inclusive) of the range.
 * @return {int} - A random number in the specified range.
 */
int random_clamp(int min, int max) {}

/* PRANDOM 128 */
/**
 * Sanitizes the seed for the random number generator. Ensures that the seed
 * is a non-zero integer and within the range of a 64-bit unsigned integer.
 *
 * @param {mixed} seed - The seed to sanitize.
 * @return {int[]} - The sanitized seed.
 */
public int *sanitize_seed(mixed seed) {}

/**
 * Generates a random number within a specified range using the xorshift128+
 * algorithm.
 *
 * @param {mixed} seed - The seed for the random number generator.
 * @param {int} size - The upper bound for the random number.
 * @return {int[]} - A two element array where the first element is the
 *                   updated seed and the second is the random number.
 */
int *prandom(mixed seed, int size) {}

/**
 * Generates a random float within a specified range using the xorshift128+
 * algorithm.
 *
 * @param {mixed} seed - The seed for the random number generator.
 * @param {float} size - The upper bound for the random float.
 * @return {mixed[]} - A two element array where the first element is the
 *                     updated seed and the second is the random float.
 */
mixed *prandom_float(mixed seed, float size) {}

/**
 * Shuffles an array using the xorshift128+ algorithm.
 *
 * @param {mixed} seed - The seed for the random number generator.
 * @param {mixed[]} arr - The array to shuffle.
 * @return {mixed[]} - A two element array where the first element is the
 *                     updated seed and the second is the shuffled array.
 */
mixed *pshuffle(mixed seed, mixed *arr) {}

/**
 * Selects an element from an array using the xorshift128+ algorithm.
 *
 * @param {mixed} seed - The seed for the random number generator.
 * @param {mixed[]} arr - The array to select an element from.
 * @return {mixed[]} - A two element array where the first element is the
 *                     updated seed and the second is the selected element.
 */
mixed *pelement_of(mixed seed, mixed *arr) {}

/**
 * Generates a random number within a specified range using the xorshift128+
 * algorithm.
 *
 * @param {mixed} seed - The seed for the random number generator.
 * @param {int} min - The lower bound (inclusive) of the range.
 * @param {int} max - The upper bound (inclusive) of the range.
 * @return {mixed[]} - A two element array where the first element is the
 *                     updated seed and the second is the random number.
 */
mixed *prandom_clamp(mixed seed, int min, int max) {}

/**
 * Selects an element from a weighted mapping using the xorshift128+
 * algorithm.
 *
 * @param {mixed} seed - The seed for the random number generator.
 * @param {mapping} weights - The weighted mapping to select from, where keys
 *                           are the elements and values are their weights.
 * @return {mixed[]} - A two element array where the first element is the
 *                     updated seed and the second is the selected element.
 */
mixed *pelement_of_weighted(mixed seed, mapping weights) {}
