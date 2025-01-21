/**
 * Checks if a given function is valid and not owned by a destructed
 * object.
 *
 * @param {mixed} f - The function to check.
 * @return {int} - 1 if the function is valid, otherwise 0.
 */
int valid_function(mixed f) {}

/**
 * Returns a formatted string of the current call stack trace.
 *
 * @param {int} colour - Whether to include colour codes (optional, default: 0)
 * @return {string} - The formatted call stack trace.
 */
varargs string call_trace(int colour) {}

/**
 * Assembles a callback function from the provided arguments.
 * This function is used to create a callable structure that can be
 * invoked later. The callback can be either a method on an object or
 * a function.
 *
 * Usage:
 * - When you need to create a callback for an object method:
 *   `assemble_call_back(object, "method", args...)`
 * - When you need to create a callback for a function:
 *   `assemble_call_back(function, args...)`
 *
 * The function performs the following steps:
 * 1. Checks if the provided arguments form a valid array
 * 2. Determines the size of the arguments array
 * 3. Checks if the first argument is an object. If so, it verifies that
 *    the second argument is a valid method name on the object
 * 4. If the first argument is a function, it creates a callback with the
 *    function and any additional arguments
 * 5. Returns the assembled callback as an array
 *
 * @param {mixed} arg - The arguments to assemble into a callback.
 * @return {mixed[]} - The assembled callback.
 */
mixed *assemble_call_back(mixed arg...) {}

/**
 * Executes a callback with the given arguments.
 *
 * @param {mixed} cb - The callback to execute.
 * @param {mixed} new_arg - The arguments to pass to the callback (optional).
 * @return {mixed} - The result of the callback execution.
 */
mixed call_back(mixed cb, mixed new_arg...) {}

/**
 * Calls the specified function on the given object if it exists.
 *
 * @param {mixed} ob - The object to call the function on.
 * @param {string} func - The name of the function to call.
 * @param {mixed} arg - The argument to pass to the function (optional).
 * @return {mixed} - The return value of the function, or null if the function
 *                   does not exist.
 */
varargs mixed call_if(mixed ob, string func, mixed arg...) {}

/**
 * Delays an action for a specified amount of time.
 *
 * @param {string} action - The action to delay.
 * @param {float} delay - The amount of time to delay the action.
 * @param {mixed[]} cb - The callback to execute after the delay.
 * @return {int} - The ID of the delayed action.
 */
varargs int delay_act(string act, float delay, mixed *cb) {}

/**
 * Asserts that a statement is true. If the statement is false, it
 * will throw an error with the given message. If no message is
 * provided, it will use a default message.
 *
 * @param {mixed} statement - The statement to assert.
 * @param {string} message - The message to display if the condition is false (optional).
 */
varargs void assert(mixed statement, string message) {}
