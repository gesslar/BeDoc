/**
 * Returns the short description of an object, optionally
 * including extra short descriptions in parentheses.
 * @param {object} ob - The object to get the short description of.
 * @param {int} extras - Whether to include extra short descriptions.
 *                       Defaults to 1 (include extras).
 * @return {string} - The short description of the object, including any
 *                    extra short descriptions.
 */
varargs string get_short(object ob, int extras) {}

/**
 * Returns the long description of an object, optionally
 * including extra long descriptions.
 * @param {object} ob - The object to get the long description of.
 * @param {int} extras - Whether to include extra long descriptions.
 *                       Defaults to 1 (include extras).
 * @return {string} - The long description of the object, including any
 *                    extra long descriptions.
 */
string get_long(object ob, int extras) {}

/**
 * Generates a description for an object based on its properties.
 * @param {object} obj - The object to generate a description for.
 * @return {string} - The generated description.
 */
string generate_description(object obj) {}

/**
 * Sets the description for an object.
 * @param {object} obj - The object to set the description for.
 * @param {string} desc - The description to set.
 */
void set_description(object obj, string desc) {}

/**
 * Appends additional information to an object's description.
 * @param {object} obj - The object to append the description to.
 * @param {string} additional_desc - The additional description to append.
 */
void append_description(object obj, string additional_desc) {}

/**
 * Clears the description of an object.
 * @param {object} obj - The object to clear the description for.
 */
void clear_description(object obj) {}
