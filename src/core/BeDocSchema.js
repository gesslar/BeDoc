import {FileObject, Sass} from "@gesslar/toolkit"
import fetch from "node-fetch"
import url from "node:url"

const SCHEMA_URL = "https://bedoc.gesslar.dev/schemas/v1/bedoc.action.json"
const LOCAL_SCHEMA_PATH = "dist/bedoc.action.json"

// In-memory cache to avoid repeated file I/O
let _cachedSchema = null

/**
 * BeDoc-specific schema management utilities.
 * Handles loading, fetching, and caching the BeDoc action schema.
 */
export default class BeDocSchema {
  /**
   * Gets the local schema file object
   *
   * @returns {FileObject} File object for the local schema
   */
  static getSchemaFile() {
    return new FileObject(
      LOCAL_SCHEMA_PATH,
      url.fileURLToPath(new URL("../../../", import.meta.url))
    )
  }

  /**
   * Downloads and saves the action schema from the remote URL
   *
   * @param {import('./types.js').DebugFunction} [debug] - Optional debug function
   * @returns {object} The downloaded schema data
   */
  static async fetchSchema(debug = null) {
    debug?.("Fetching BeDoc schema from: %o", 2, SCHEMA_URL)

    try {
      const response = await fetch(SCHEMA_URL)

      if(!response.ok) {
        throw Sass.new(`HTTP ${response.status}: ${response.statusText}`)
      }

      const schema = await response.text()
      const schemaFile = this.getSchemaFile()

      // Ensure the directory exists before writing
      await schemaFile.directory.assureExists()

      debug?.("Caching schema to: %o", 2, schemaFile.path)
      await schemaFile.write(schema)

      const schemaData = await schemaFile.loadData()
      _cachedSchema = schemaData

      return schemaData
    } catch(error) {
      throw Sass.new(`Failed to fetch BeDoc schema from ${SCHEMA_URL}`, error)
    }
  }

  /**
   * Loads the action schema with caching
   * Priority: memory cache → local file → remote fetch
   *
   * @param {import('./types.js').DebugFunction} [debug] - Optional debug function
   * @returns {object} The schema data
   */
  static async loadSchema(debug = null) {
    // Return cached version if available
    if(_cachedSchema) {
      debug?.("Using cached BeDoc schema", 3)

      return _cachedSchema
    }

    const schemaFile = this.getSchemaFile()
    const fileExists = await schemaFile.exists

    if(fileExists) {
      debug?.("Loading BeDoc schema from: %o", 2, schemaFile.path)
      try {
        _cachedSchema = await schemaFile.loadData()

        return _cachedSchema
      } catch(error) {
        debug?.("Failed to load local schema, will fetch: %o", 1, error.message)
        // Fall through to fetch
      }
    } else {
      debug?.("Local schema not found at: %o", 2, schemaFile.path)
    }

    // Fetch from remote and cache
    return await this.fetchSchema(debug)
  }

  /**
   * Gets the schema URL for reference
   *
   * @returns {string} The remote schema URL
   */
  static get schemaUrl() {
    return SCHEMA_URL
  }

  /**
   * Gets the local schema path for reference
   *
   * @returns {string} The local schema file path
   */
  static get localSchemaPath() {
    return LOCAL_SCHEMA_PATH
  }

  /**
   * Clears the in-memory cache (useful for testing)
   */
  static clearCache() {
    _cachedSchema = null
  }

  /**
   * Checks if schema is cached in memory
   *
   * @returns {boolean} Whether schema is cached
   */
  static get isCached() {
    return _cachedSchema !== null
  }
}
