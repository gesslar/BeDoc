import {Data, DirectoryObject, FileObject, Sass} from "@gesslar/toolkit"
import fetch from "node-fetch"
import url from "node:url"

const SCHEMA_URL = "https://bedoc.gesslar.dev/schemas/v1/bedoc.action.json"
const LOCAL_CACHE_DIR = ".cache"
const LOCAL_SCHEMA_FILE = "bedoc.action.json"

// In-memory cache to avoid repeated file I/O
const cache = {schema: null}

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
  static async getSchemaFile() {
    const schemaDir = await this.#findPackageCache()
    if(!schemaDir)
      throw Sass.new("Unable to find package.json.")

    return new FileObject(LOCAL_SCHEMA_FILE, schemaDir)
  }

  //* @param {import('./types.js').DebugFunction} [debug] - Optional debug function
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

      cache.schema(await schemaFile.loadData())

      return cache.schema
    } catch(error) {
      throw Sass.new(`Retrieving BeDoc schema from ${SCHEMA_URL}`, error)
    }
  }

  //* @param {import('./types.js').DebugFunction} [debug] - Optional debug function
  static async load(debug=null) {
    try {
      if(cache.schema)
        return cache.schema

      const schemaFile = await this.getSchemaFile(debug)
      if(!schemaFile)
        throw Sass.new("Unable to determine schema file.")

      if(await schemaFile.exists)
        cache.schema = schemaFile.loadData()

      else
        cache.schema = this.#downloadSchema(debug)

      if(!cache.schema)
        throw Sass.new("Unable to load schema")

      return cache.schema
    } catch(error) {
      throw Sass.new("Loading BeDoc action schema.", error)
    }
  }

  static async #findPackageCache(directoryObject) {
    if(Data.typeOf(directoryObject) !== "DirectoryObject")
      directoryObject = new DirectoryObject(url.fileURLToPath(new url.URL(".", import.meta.url)))

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
