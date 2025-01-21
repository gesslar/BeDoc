/**
 * Appends a string to another string if it is not already there. If the string
 * is already present, the original string is returned.
 *
 * @param {string} source - The string to append to.
 * @param {string} to_append - The string to append.
 * @return {string} - The original string with the appended string if it was not
 *                    already present.
 */
string append(string source, string to_append) {}

/**
 * Prepends a string to another string if it is not already there.
 * If the string is already present, the original string is returned.
 *
 * @param {string} source - The string to prepend to.
 * @param {string} to_prepend - The string to prepend.
 * @return {string} - The original string with the prepended string if it was not
 *                    already present.
 */
string prepend(string source, string to_prepend) {}

/**
 * Chops a substring off the end or beginning of another string if
 * it is present. If the substring is not present, the original
 * string is returned. If no direction is specified, chops from
 * the right (-1).
 *
 * @param {string} str - The string to chop from.
 * @param {string} sub - The substring to chop.
 * @param {int} dir - The direction to chop: 1 for left, -1 for right (optional, default: -1)
 * @return {string} - The string with the substring chopped off if it was present.
 */
varargs string chop(string str, string sub, int dir) {}

/**
 * Extracts a substring from a string. If no ending position is provided,
 * extracts from the starting position to the end of the string.
 *
 * @param {string} str - The string to extract from.
 * @param {int} from - The starting position to extract from.
 * @param {int} to - The ending position to extract to (optional)
 * @return {string} - The extracted substring.
 */
varargs string extract(string str, int from, int to) {}

/**
 * Returns a string with all colour codes removed.
 *
 * @param {string} str - The string to remove colour from.
 * @return {string} - The string without colour.
 */
string no_ansi(string str) {}

/**
 * Returns a string that is a simple list of the elements of an array,
 * joined by a conjunction. If no conjunction is provided, "and" will be used.
 *
 * @param {string[]} arr - The array to make a list from.
 * @param {string} conjunction - The word to join the last two elements (optional, default: "and")
 * @return {string} - The simple list string.
 */
varargs string simple_list(string *arr, string conjunction) {}

/**
 * Returns a substring of a string, starting from 0 and ending at the
 * first occurrence of another string within it. If the reverse flag
 * is set, the substring will start at the last occurrence of the
 * substring within the string.
 *
 * @param {string} str - The string to extract from.
 * @param {string} sub - The substring to extract to.
 * @param {int} reverse - If set, the substring will start at the last occurrence (optional, default: 0)
 * @return {string} - The extracted substring.
 */
varargs string substr(string str, string sub, int reverse) {}

/**
 * Converts a string representation of an LPC value to the
 * corresponding LPC value. If the flag is set, returns an array with
 * the value and the remaining string.
 *
 * @param {string} str - The string to convert.
 * @param {int} flag - If set, returns an array with the value and remaining string (optional, default: 0)
 * @return {mixed} - The LPC value represented by the string.
 */
varargs mixed from_string(string str, int flag) {}

/**
 * Converts an LPC value to its string representation.
 *
 * @param {mixed} val - The value to convert.
 * @return {string} - The string representation of the value.
 */
string stringify(mixed val) {}

/**
 * Returns a string with commas added to the number. Handles both integer
 * and floating point numbers, as well as strings that can be converted to numbers.
 * For negative numbers, the negative sign is preserved at the start.
 *
 * @param {mixed} number - The number to add commas to.
 * @return {string} - The number with commas added as a string.
 */
string add_commas(mixed number) {}

/**
 * Reverses a string.
 *
 * @param {string} str - The string to reverse.
 * @return {string} - The reversed string.
 */
string reverse_string(string str) {}

/**
 * Searches for a substring in a string starting from a given position
 * and moving backwards. If no starting position is provided, starts from
 * the beginning of the string.
 *
 * @param {string} str - The string to search in.
 * @param {string} sub - The substring to search for.
 * @param {int} start - The starting position to search from (optional, default: 0)
 * @return {int} - The position of the substring in the string, or -1 if not found.
 */
varargs int reverse_strsrch(string str, string sub, int start) {}

/**
 * Searches for the position of a substring in a string using a
 * regular expression. If reverse is set, the search will start from
 * the end of the string.
 *
 * @param {string} str - The string to search in.
 * @param {string} substr - The regular expression to search for.
 * @param {int} reverse - If set, the search will start from the end (optional, default: 0)
 * @return {int} - The position of the substring in the string, or -1 if not found.
 */
varargs int pcre_strsrch(string str, string substr, int reverse) {}

/**
 * Returns 1 if the string contains colour codes, 0 if not.
 *
 * @param {string} str - The string to check.
 * @return {int} - 1 if the string contains colour codes, otherwise 0.
 */
int colourp(string str) {}

/**
 * Trims whitespace from both ends of a string.
 *
 * @param {string} str - The string to trim.
 * @return {string} - The trimmed string.
 */
string trim(string str) {}

/**
 * Trims whitespace from the start of a string.
 *
 * @param {string} str - The string to trim.
 * @return {string} - The trimmed string.
 */
string ltrim(string str) {}

/**
 * Trims whitespace from the end of a string.
 *
 * @param {string} str - The string to trim.
 * @return {string} - The trimmed string.
 */
string rtrim(string str) {}
