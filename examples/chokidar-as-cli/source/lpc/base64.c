/**
 * Encodes a given string or buffer into Base64 format.
 *
 * @param {mixed} source_str The string or buffer to be encoded. This is a really long string. What do you think?
 *      I do be lovin' it, fo sho.
 * @return {string} The Base64 encoded string.
 * @example
 * ```c
 * base64_encode("Hello, world!")
 * // "SGVsbG8sIHdvcmxkIQ=="
 * ```
 */
string base64_encode(mixed source_str) {}

/**
 * Decodes a given Base64 encoded string.
 *
 * @param {string} source The Base64 encoded string to be decoded.
 * @return {string} The decoded string.
 * @example
 * ```c
 * base64_decode("SGVsbG8sIHdvcmxkIQ==")
 * // "Hello, world!"
 * ```
 */
string base64_decode(string source) {}
