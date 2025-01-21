/**
 * Resolves a given path relative to the current path, handling
 * special cases such as user directories and relative paths.
 *
 * @param {string} base_dir - The current path.
 * @param {string} path - The next path to resolve.
 * @return {string} - The resolved absolute path.
 */
string resolve_path(string base_dir, string path) {}

/**
 * Resolves and validates a path, checking if it exists as either
 * a file or directory.
 *
 * @param {string} base_dir - The base directory to resolve relative paths from.
 * @param {string} path - The path to resolve and validate.
 * @return {string|int} - The resolved absolute path if valid, or 0 if invalid.
 */
string valid_path(string base_dir, string path) {}

/**
 * Resolves and validates a file path, checking if it exists as a
 * file.
 *
 * @param {string} base_dir - The base directory to resolve relative paths from.
 * @param {string} path - The file path to resolve and validate.
 * @return {string|int} - The resolved absolute file path if valid, or 0 if invalid.
 */
string valid_file(string base_dir, string path) {}

/**
 * Resolves and validates a directory path, checking if it exists
 * as a directory.
 *
 * @param {string} base_dir - The base directory to resolve relative paths from.
 * @param {string} path - The directory path to resolve and validate.
 * @return {string|int} - The resolved absolute directory path if valid, or 0 if invalid.
 */
string valid_dir(string base_dir, string path) {}

/**
 * Resolves a file path without checking its existence.
 *
 * @param {string} base_dir - The base directory to resolve relative paths from.
 * @param {string} path - The file path to resolve.
 * @return {string} - The resolved absolute file path.
 */
string resolve_file(string base_dir, string path) {}

/**
 * Resolves a directory path without checking its existence,
 * ensuring it ends with a slash.
 *
 * @param {string} base_dir - The base directory to resolve relative paths from.
 * @param {string} path - The directory path to resolve.
 * @return {string} - The resolved absolute directory path, ending with a slash.
 */
string resolve_dir(string base_dir, string path) {}

/**
 * Resolves a path and returns an array of matching files, supporting
 * wildcard pattern. If no wildcard is present in the pattern, "*" is
 * appended.
 *
 * @param {string} base_dir - The base directory to resolve relative paths from.
 * @param {string} path - The path or pattern to resolve and search for files.
 * @return {string[]} - An array of matching file paths, or ({}) if invalid.
 */
string *get_files(string base_dir, string path) {}
