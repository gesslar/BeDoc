/**
 * Capitalizes the first letter of each word in a string.
 *
 * @param {string} str - The string to capitalize.
 * @return {string} - The capitalized string.
 */
string cap_words(string str) {}

/**
 * Capitalizes significant words in a string, ignoring certain
 * insignificant words. Optionally capitalizes the first word
 * as a title.
 *
 * @param {string} str - The string to capitalize.
 * @param {int} title - Whether to capitalize the first word as a title (optional).
 * @return {string} - The string with significant words capitalized.
 */
varargs string cap_significant_words(string str, int title) {}

/**
 * Returns the possessive form of a noun. If the noun ends with 's',
 * it adds an apostrophe; otherwise, it adds 's.
 *
 * @param {mixed} ob - The object or string to convert to possessive form.
 * @return {string} - The possessive form of the noun.
 */
string possessive_noun(mixed ob) {}

/**
 * Returns the possessive form of a proper noun. Applies 's to the
 * end of the noun.
 *
 * @param {mixed} ob - The object or string to convert to possessive form.
 * @return {string} - The possessive form of the proper noun.
 */
string possessive_proper_noun(mixed ob) {}

/**
 * Returns the possessive pronoun corresponding to the object's
 * gender. Defaults to "its" for non-string or unknown gender
 * @param {mixed} ob - The object or gender string to convert
 * @return {string} - The possessive pronoun
 */
string possessive_pronoun(mixed ob) {}

/**
 * Returns the possessive adjective corresponding to the object's
 * gender. Defaults to "its" for non-string or unknown gender
 * @param {mixed} ob - The object or gender string to convert
 * @return {string} - The possessive adjective
 */
string possessive(mixed ob) {}

/**
 * Returns the reflexive pronoun corresponding to the object's
 * gender. Defaults to "itself" for non-string or unknown gender
 * @param {mixed} ob - The object or gender string to convert
 * @return {string} - The reflexive pronoun
 */
string reflexive(mixed ob) {}

/**
 * Returns the objective pronoun corresponding to the object's
 * gender. Defaults to "it" for non-string or unknown gender
 * @param {mixed} ob - The object or gender string to convert
 * @return {string} - The objective pronoun
 */
string objective(mixed ob) {}

/**
 * Returns the subjective pronoun corresponding to the object's
 * gender. Defaults to "it" for non-string or unknown gender
 * @param {mixed} ob - The object or gender string to convert
 * @return {string} - The subjective pronoun
 */
string subjective(mixed ob) {}

/**
  * Returns the article corresponding to the noun. If definite
  * is true, returns "the"; otherwise, returns "a" or "an"
  * depending on the noun's initial letter
  * @param {string} str - The noun to determine the article for
  * @param {int} definite - Whether to return the definite article (defaults to 0)
  * @return {string} - The article
 */
varargs string article(string str, int definite) {}

/**
 * Adds an article to a string. If definite is true, adds "the";
 * otherwise, adds "a" or "an" depending on the noun's initial
 * letter
 * @param {string} str - The string to add the article to
 * @param {int} definite - Whether to add the definite article (defaults to 0)
 * @return {string} - The string with the article prepended
 */
varargs string add_article(string str, int definite) {}

/**
 * Removes an article from a string. If the string begins with
 * "the ", "a ", or "an ", removes the article
 * @param {string} str - The string to remove the article from
 * @return {string} - The string with the article removed
 */
string remove_article(string str) {}
