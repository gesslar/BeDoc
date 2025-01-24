/**
 * Checks if a directory exists.
 *
 * @param {string} dirname The name of the directory to check.
 * @return {int} 1 if exists, 0 if not.
 */
int directory_exists(string dirname) {}

/**
 * Checks if a file exists.
 *
 * @param {string} file The name of the file to check.
 * @return {int} 1 if exists, 0 if not.
 */
int file_exists(string file) {}

/**
 * Checks if a compiled file (.c) exists.
 *
 * @param {string} file The base name of the file to check.
 * @return {int} 1 if exists, 0 if not.
 */
int cfile_exists(string file) {}

/**
 * Checks if a save file exists.
 *
 * @param {string} file The base name of the file to check.
 * @return {int} 1 if exists, 0 if not.
 */
int ofile_exists(string file) {}

/**
 * Checks if a user data file exists.
 *
 * @param {string} user The username to check.
 * @return {int} 1 if exists, 0 if not.
 */
int user_exists(string user) {}
