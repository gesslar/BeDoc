#include <simul_efun.h>

/**
 * Calculates what `a` percent of `b` is.
 *
 * @param {float} a The percentage value.
 * @param {float} b The whole value.
 * @return {float} The value that is `a` percent of `b`.
 */
float percent_of(float a, float b) {}

/**
 * Calculates what percentage `a` is of `b`.
 *
 * @param {float} a The part value.
 * @param {float} b The whole value.
 * @return {float} The percentage of `a` out of `b`.
 */
float percent(float a, float b) {}

/**
 * Ensures a value is within a specified range.
 *
 * @param {float} min The minimum value.
 * @param {float} max The maximum value.
 * @param {float} val The value to check.
 * @return {float} The value, constrained within the range of `min` to `max`.
 */
float clamp(float min, float max, float val) {}

/**
 * Calculates the remainder of `a` divided by `b`. If either value is an integer,
 * it will be converted to float before calculation.
 *
 * @param {mixed} a The dividend.
 * @param {mixed} b The divisor.
 * @return {float} The remainder of `a` divided by `b`.
 */
varargs float remainder(mixed a, mixed b) {}

/**
 * Calculates the sum of all elements in an array.
 *
 * @param {mixed[]} arr The array of numbers to sum.
 * @return {int} The sum of all elements in the array.
 */
int sum(mixed *arr) {}

/**
 * Evaluates a number against a condition. The condition can be a
 * simple comparison, or a compound condition using `AND` and `OR`.
 * This system allows for the evaluation of numeric conditions
 * using a specific set of operators and syntax rules.
 *
 * Basic Operators:
 * `<` Less than
 * `>` Greater than
 * `<=` Less than or equal to
 * `>=` Greater than or equal to
 * `=` or `==` Equal to
 * `!=` Not equal to
 * `%` Checks if a number is divisible by the given value
 *
 * Range Operator:
 * Use a hyphen (`-`) to specify a range, inclusive of both ends.
 * Example: `5-15` means any number from `5` to `15`, including
 * `5` and `15`.
 *
 * Set Inclusion/Exclusion:
 * `[a,b,c]` Checks if a number is one of the listed values
 * `![a,b,c]` Checks if a number is not one of the listed values
 *
 * Logical Operators:
 * `AND` Both conditions must be true
 * `OR` At least one condition must be true
 *
 * Grouping:
 * Use parentheses `()` to group conditions and override default precedence.
 *
 * Precedence (from highest to lowest):
 * 1. Parentheses `()`
 * 2. Basic operators, Range, Modulo, Set inclusion/exclusion
 * 3. `AND`
 * 4. `OR`
 *
 * Syntax Rules:
 * No spaces are allowed in the condition string
 * Operators must be used exactly as specified
 * Set values must be comma-separated without spaces
 *
 * Example: `(5-15AND%3)OR[20,25,30]`
 * This checks if a number is between `5` and `15` (inclusive) AND
 * divisible by `3`, OR if it's `20`, `25`, or `30`.
 *
 * @param {int} number The number to evaluate.
 * @param {string} condition The condition to evaluate against.
 * @return {int} 1 if the condition evaluates to true, 0 otherwise.
 */
int evaluate_number(int number, string condition) {}
