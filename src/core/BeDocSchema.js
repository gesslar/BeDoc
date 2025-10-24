import {Data, DirectoryObject, FileObject, Sass} from "@gesslar/toolkit"
import fetch from "node-fetch"

const SCHEMA_URL = "https://bedoc.gesslar.dev/schemas/v1/bedoc.action.json"
const LOCAL_CACHE_DIR = ".cache"
const LOCAL_SCHEMA_FILE = "bedoc.action.json"

// In-memory cache to avoid repeated file I/O
const cache = {schema: null}

/**
 * BeDoc-specific schema management utilities.
 * Handles loading, fetching, and caching the BeDoc action schema.
 *
 * @class
 */
export default class BeDocSchema {
  /**
   * Gets the local schema file object.
   *
   * @returns {Promise<FileObject>} File object for the local schema
   * @throws {Sass} If package.json cannot be found
   */
  static async getSchemaFile() {
    const schemaDir = await this.#findPackageCache()
    if(!schemaDir)
      throw Sass.new("Unable to find package.json.")

    return new FileObject(LOCAL_SCHEMA_FILE, schemaDir)
  }

  /**
   * Downloads the BeDoc schema from the remote URL and caches it locally.
   *
   * @private
   * @param {import('./types.js').DebugFunction} [debug] - Optional debug function
   * @returns {Promise<object>} The loaded schema object
   * @throws {Sass} If fetching or writing fails
   */
  static async #downloadSchema(debug=null) {
    try {
      debug?.("Fetching BeDoc schema from: %o", 2, SCHEMA_URL)

      const response = await fetch(SCHEMA_URL)

      if(!response.ok)
        throw Sass.new(`HTTP ${response.status}: ${response.statusText}`)

      const schema = await response.text()
      const schemaFile = await this.getSchemaFile()
      if(!await schemaFile.directory.exists)
        await schemaFile.directory.assureExists()

      await schemaFile.write(schema)

      cache.schema = await schemaFile.loadData()

      return cache.schema
    } catch(error) {
      throw Sass.new(`Retrieving BeDoc schema from ${SCHEMA_URL}`, error)
    }
  }

  /**
   * Loads the BeDoc schema, using cache if available, otherwise loads from disk or downloads.
   *
   * @param {import('./types.js').DebugFunction} [debug] - Optional debug function
   * @returns {Promise<object>} The loaded schema object
   * @throws {Sass} If loading fails
   */
  static async load(debug=null) {
    try {
      if(cache.schema)
        return cache.schema

      const schemaFile = await this.getSchemaFile()
      if(!schemaFile)
        throw Sass.new("Unable to determine schema file.")

      if(await schemaFile.exists)
        cache.schema = await schemaFile.loadData()

      else
        cache.schema = await this.#downloadSchema(debug)

      if(!cache.schema)
        throw Sass.new("Unable to load schema")

      return cache.schema
    } catch(error) {
      throw Sass.new("Loading BeDoc action schema.", error)
    }
  }

  /**
   * Finds the nearest package cache directory by walking up from the given directory.
   *
   * @private
   * @param {DirectoryObject} [directoryObject] - Optional starting directory
   * @returns {Promise<DirectoryObject|undefined>} The cache directory object, or undefined if not found
   */
  static async #findPackageCache(directoryObject) {
    if(!Data.isType(directoryObject, "DirectoryObject"))
      directoryObject = new DirectoryObject()

    const trail = directoryObject.walkUp

    for(const dir of trail) {
      const file = new FileObject("package.json", dir)

      if(await file.exists) {
        const cacheDir = new DirectoryObject(`${dir.path}${dir.sep}${LOCAL_CACHE_DIR}`)

        return cacheDir
      }
    }
  }
}
