/**
 * Retrieves the value associated with a given key from a file.
 *
 * @param {string} file The file to read from.
 * @param {string} key The key to search for.
 * @param {mixed} def The default value to return if the key is not found. (optional)
 * @return {mixed} The value associated with the key, or the default value if
 *                    the key is not found.
 */
varargs mixed data_value(string file, string key, mixed def) {}

/**
 * Writes a key-value pair to a file. If the key already exists,
 * the value is updated.
 *
 * @param {string} file The file to write to.
 * @param {string} key The key to write.
 * @param {mixed} data The value(s) to write.
 * @return {void}
 */
varargs void data_write(string file, string key, mixed data...) {}

/**
 * Deletes the key-value pair from the file.
 *
 * @param {string} file The file to modify.
 * @param {string} key The key to delete.
 * @return {int} 1 if the key was found and deleted, 0 otherwise.
 */
int data_del(string file, string key) {}

/**
 * Increments the value associated with the given key in the file
 * by the specified amount. If the key does not exist, it is
 * created with the increment value.
 *
 * @param {string} file The file to modify.
 * @param {string} key The key to increment the value for.
 * @param {int} inc The amount to increment by.
 * @return {int} The new value after incrementing.
 */
varargs int data_inc(string file, string key, int inc) {}

/**
 * Serializes data to a string.
 *
 * @param {mixed} data The data to serialize.
 * @return {string} The serialized data as a string.
 */
string serialize(mixed data) {}

/**
 * Deserializes a string to data.
 *
 * @param {string} str The string to deserialize.
 * @return {mixed} The deserialized data.
 */
mixed deserialize(string str) {}

/**
 * Compresses a string using gzip.
 *
 * @param {string} str The string to compress.
 * @return {string} The compressed string.
 */
string gzip_compress(string str) {}

/**
 * Decompresses a gzip compressed string.
 *
 * @param {string} str The compressed string to decompress.
 * @return {string} The decompressed string.
 */
string gzip_decompress(string str) {}
