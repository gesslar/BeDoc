import {Data, DirectoryObject, FileObject, FS, Sass, Tantrum, Util} from "@gesslar/toolkit"
import {exec as execCallback} from "child_process"
import {promisify} from "util"

import Actions from "./Actions.js"

const exec = promisify(execCallback)

/** @typedef {import("@gesslar/actioneer").ActionBuilder} ActionBuilder */

/**
 * Discovery class orchestrates the discovery and loading of BeDoc action modules.
 * It provides a pipeline to find, validate, and group action modules from various sources,
 * including mock directories, project package.json, and node_modules (local and global).
 *
 * @class Discovery
 * @example
 * const discovery = new Discovery({ debug, config, project });
 * const builder = discovery.setup(actionBuilder);
 */
export default class Discovery {
  /**
   * Metadata for the Discovery class.
   *
   * @type {{name: string}}
   */
  static meta = Object.freeze({
    name: "Discovery"
  })

  /**
   * Internal debug logger instance.
   *
   * @type {function(...args: Array<unknown>): void}
   * @private
   */
  #debug

  /**
   * Sets up the discovery pipeline using ActionBuilder.
   *
   * @param {ActionBuilder} ab - ActionBuilder instance
   * @returns {ActionBuilder} Configured builder
   */
  setup = ab => ab
    .do("Initialise Discovery", this.#init)
    .do("Discover action files", this.#discoverActionFiles)
    .do("Load action modules", this.#loadActions)
    .do("Find matching actions", this.#findMatchingActions)
    .do("Validate action metadata", this.#validateActionsMetas)
    .do("Group actions by type", this.#groupActionsByType)

  /**
   * Initializes the Discovery pipeline by extracting the logger
   * from the context and setting up the debug instance for internal logging.
   *
   * @private
   * @param {object} value - Pipeline context object containing runtime values.
   * @returns {object} The same value as was passed in.
   */
  async #init(value) {
    const {glog} = value

    this.#debug = glog.newDebug(this.constructor.name)

    this.#debug(`${this.constructor.name} initialised`, 2)

    return value
  }

  /**
   * Discovers action files from mock directory, project package.json, or node_modules.
   *
   * @private
   * @param {object} value - Pipeline context with config
   * @returns {Promise<object>} Updated context with discovered files
   */
  async #discoverActionFiles(value) {
    const {content} = value

    if(content.mock) {
      content.mockFiles = await this.#discoverMockActions(content.mock)

      return value
    }

    this.#debug("Mock path not set, discovering actions in node_modules", 2)

    // Check project's package.json for exported actions
    const projectActions = content.project
      ? await this.#discoverProjectActions(content.basePath, content.project)
      : []

    // Search node_modules (local and global)
    const nodeModulesActions = await this.#discoverNodeModulesActions()
    const moduleActions = [...projectActions,...nodeModulesActions].flat()

    this.#debug("Discovered %o module files", 2, moduleActions.length)

    content.moduleActions = moduleActions

    return value
  }

  /**
   * Discovers action files in the mock directory.
   *
   * @private
   * @param {string} mockPath - Path to mock directory
   * @returns {Promise<Array<FileObject>>} Array of mock action files
   */
  async #discoverMockActions(mockPath) {
    this.#debug("Discovering mock actions in %o", 2, mockPath)

    return await FS.getFiles([
      `${mockPath.path}/bedoc-*-printer.js`,
      `${mockPath.path}/bedoc-*-parser.js`,
    ])
  }

  /**
   * Discovers actions exported in the project's package.json.
   *
   * @private
   * @param {string} basePath - Project base path
   * @param {object} packageJson - package.json object
   * @returns {Promise<Array<FileObject>>} Array of project action files
   */
  async #discoverProjectActions(basePath, packageJson) {
    this.#debug("Looking for actions in project's package.json", 2)

    const exported = (packageJson.actions ?? [])
      .map(action => new FileObject(action,basePath))
      .flat()

    this.#debug(
      "Found %o modules in project's package.json", 2, exported.length
    )

    this.#debug("Found modules in project's package.json: %o", 3, exported)

    return exported
  }

  /**
   * Discovers actions in node_modules directories (local and global).
   *
   * @private
   * @returns {Promise<Array<FileObject>>} Array of node_modules action files
   */
  async #discoverNodeModulesActions() {
    this.#debug("Looking for modules in node_modules (local and global)", 2)

    const dirs = await this.#discoverNodeDirectories()
    const settled = await Util.settleAll(dirs.map(
      d => this.#searchNodeModulesDir(d)
    ))

    const rejected = settled.filter(r => r.state === "rejected")
    if(rejected.length)
      throw Tantrum.new("Searching for compatible Node nodules", rejected.map(r => r.reason))

    return settled.map(s => s.value)
  }

  /**
   * Discovers node_modules root directories (local and global).
   *
   * @private
   * @returns {Promise<Array<DirectoryObject>>} Array of DirectoryObject instances
   */
  async #discoverNodeDirectories() {
    // Get npm root paths asynchronously
    const settled = await Util.settleAll([exec("npm root"),exec("npm root -g")])

    const rejected = settled.filter(r => r.state === "rejected")
    if(rejected.length > 0)
      throw Tantrum.new("Discovering Node.js module paths.", rejected.map(r => r.reason))

    const directories = settled
      .map(r => r.value.stdout?.trim())
      .filter(Boolean)
      .map(r => new DirectoryObject(r))

    this.#debug("Found %o directories to search", 2, directories.length)
    this.#debug("Directories to search: %o", 3, directories.map(d => d.path))

    return directories
  }

  /**
   * Searches a node_modules directory for BeDoc actions.
   *
   * @private
   * @param {DirectoryObject} nodeModulesDir - Directory to search
   * @returns {Promise<Array<FileObject>>} Array of discovered action files
   */
  async #searchNodeModulesDir(nodeModulesDir) {
    const files = []

    const {directories: moduleDirs} = await nodeModulesDir.read()

    this.#debug("Found %o directories in %o", 2,
      moduleDirs.length, nodeModulesDir.path
    )

    // Build list of directories to search (including scoped packages)
    const dirsToSearch = await this.#expandScopedPackages(moduleDirs)

    this.#debug("Total directories to search: %o", 2, dirsToSearch.length)
    this.#debug("Directories to search: %o", 3, dirsToSearch.map(d => d.path))

    // Filter out hidden directories and search for BeDoc actions
    const visibleDirs = dirsToSearch.filter(d => !d.name.startsWith("."))

    for(const dir of visibleDirs) {
      const actions = await this.#extractActionsFromPackage(dir)
      files.push(...actions)
    }

    return files
  }

  /**
   * Expands scoped packages (e.g., \@bedoc/*) into searchable directories.
   *
   * @private
   * @param {Array<DirectoryObject>} moduleDirs - Module directories
   * @returns {Promise<Array<DirectoryObject>>} Expanded directory list
   */
  async #expandScopedPackages(moduleDirs) {
    const dirsToSearch = [...moduleDirs]

    // Find scoped packages (directories starting with @)
    const scopedDirs = moduleDirs.filter(d => d.name.startsWith("@"))

    // Expand each scoped package to include its sub-packages
    for(const scopedDir of scopedDirs) {
      const {directories: scopedPackages} = await scopedDir.read()

      this.#debug("Found %o packages under scoped package %o", 2,
        scopedPackages.length, scopedDir.name
      )
      this.#debug("Packages under %o: %o", 3,
        scopedDir.path, scopedPackages.map(d => d.path)
      )

      dirsToSearch.push(...scopedPackages)
    }

    return dirsToSearch
  }

  /**
   * Extracts BeDoc actions from a package directory.
   *
   * @private
   * @param {DirectoryObject} dir - Package directory
   * @returns {Promise<Array<FileObject>>} Array of action files found
   */
  async #extractActionsFromPackage(dir) {
    const packageJsonFile = new FileObject("package.json", dir)

    if(!await packageJsonFile.exists)
      return []

    const packageJson = await packageJsonFile.loadData()

    if(!packageJson.bedoc)
      return []

    const {actions} = packageJson.bedoc ?? {}

    if(!actions || !Array.isArray(actions))
      return []

    const moduleFileObjects = actions.map(f => new FileObject(f, dir))
    const actionObjects = await Data.asyncFilter(
      moduleFileObjects, f => f.exists
    )

    this.#debug("Discovered %o modules from package.json: %o", 2,
      actions.length, packageJsonFile.path
    )

    this.#debug("Discovered action files: %o", 3, actionObjects.map(f => f.uri))

    return actionObjects
  }

  /**
   * Loads action modules from files and tags specific modules.
   *
   * @private
   * @param {object} value - Pipeline context with files
   * @returns {Promise<object>} Context with loaded actions
   */
  async #loadActions(value) {
    const {content} = value
    const {moduleActions, mockFiles} = content

    const specificModules = {
      parse: content.parser,
      print: content.printer
    }

    // Tag specific modules so they can be prioritized during matching
    this.#tagSpecificModules(specificModules)

    // Combine all modules to load
    const toLoad = [
      ...(moduleActions??[]),
      ...(mockFiles??[]),
      ...Object.values(specificModules).filter(Boolean),
    ]

    this.#debug("Total modules to load: %o", 2, toLoad.length)
    this.#debug("Modules to load: %o", 3, toLoad.map(f => f.uri))

    const settled = await Util.settleAll(toLoad.map(async file => {
      this.#debug("Loading module %o", 2, file.uri)

      const module = await file.import()
      const action = module?.default

      if(!action)
        throw Sass.new(`Unable to find default export in action ${file.uri}`)

      return {action,file}
    }))

    Util.anyRejected(settled) && Util.throwRejected(settled)

    const loadedActions = Util.fulfilledValues(settled)

    value.content = {loadedActions, specificModules}

    return value
  }

  /**
   * Tags specific modules with their action type for priority matching.
   *
   * @private
   * @param {object} specificModules - Modules to tag
   * @returns {void}
   */
  #tagSpecificModules(specificModules) {
    for(const [kind, file] of Object.entries(specificModules)) {
      if(file) {
        this.#debug("Tagging specific module %o as %o", 3, file.path, kind)
        file.specificType = file.specificType || []
        file.specificType.push(kind)
      }
    }
  }

  /**
   * Finds actions matching the requested types (specific or all).
   *
   * @private
   * @param {object} value - Pipeline context with loadedActions and specificModules
   * @returns {object} Context with matching actions
   */
  #findMatchingActions(value) {
    const {content} = value
    const {loadedActions, specificModules} = content
    const actions = []

    this.#debug("Determining matching actions from loaded modules", 2)

    for(const actionType of Actions.actionTypes) {
      const module = specificModules[actionType]
      const matchingActions = []

      if(module) {
        // User specified a particular module for this type
        const found = this.#findSpecificAction(
          loadedActions, actionType, module
        )
        matchingActions.push(found)
      } else {
        // No specific module, find all actions of this type
        const found = loadedActions.filter(
          e => e.action.meta.kind === actionType
        )
        matchingActions.push(...found)
      }

      this.#debug("Total matching %o actions: %o", 2,
        actionType, matchingActions.length
      )

      actions.push(...matchingActions)
    }

    this.#debug("Found %o total matching actions", 2, actions.length)

    value.content = {actions}

    return value
  }

  /**
   * Finds a specific action by type and validates it exists.
   *
   * @private
   * @param {Array<object>} loadedActions - All loaded actions
   * @param {string} actionType - Type of action to find
   * @param {FileObject} module - Expected module file
   * @returns {object} The found action
   * @throws {Error} If the specific action is not found
   */
  #findSpecificAction(loadedActions, actionType, module) {
    this.#debug("Filtering for specifically tagged %o actions", 2, actionType)

    const found = loadedActions.find(
      e =>
        e.action.meta?.kind === actionType &&
        e.file.specificType?.includes(actionType)
    )

    if(!found)
      throw new Error(
        `'${module.uri}' did not contain the anticipated ${actionType} action.`
      )

    return found
  }

  /**
   * Validates action metadata and filters invalid actions.
   *
   * @private
   * @param {object} value - Pipeline context with actions
   * @returns {object} Context with validated actions
   */
  #validateActionsMetas(value) {
    const {content} = value
    const {actions} = content

    const validatedActions = actions.filter(loadedAction => {
      const {meta} = loadedAction.action
      const metaKind = meta.kind

      this.#debug("Checking validity of %o action %o", 2, metaKind, meta.name)

      const isValid = this.#validMeta(metaKind, loadedAction.action)

      this.#debug("Meta in %o is %o", 3, meta.name, isValid ? "valid" : "invalid")

      if(isValid) {
        this.#debug("%o contains a valid %o action", 3, meta.name, metaKind)
      } else {
        this.#debug("Action is not a valid %o action", 3, metaKind)
      }

      return isValid
    })

    if(validatedActions.length < 2)
      throw Sass.new("Insufficient number of actions found. Require 1 parser and 1 printer.")

    value.content = {validatedActions}

    return value
  }

  /**
   * Validates action metadata against requirements.
   *
   * @private
   * @param {string} actionType - Type of action to validate
   * @param {object} action - The action to validate
   * @returns {boolean} True if action meets all requirements
   */
  #validMeta(actionType, action) {
    this.#debug("Checking meta requirements for %o", 3, actionType)

    const requirements = Actions.actionMetaRequirements[actionType]

    if(!requirements)
      throw new Error(
        `No meta requirements found for action type \`${actionType}\``
      )

    for(const requirement of requirements) {
      if(Data.isType(requirement, "Object")) {
        // Requirement is key-value pair that must match
        for(const [key, value] of Object.entries(requirement)) {
          this.#debug("Checking object requirement %o", 4, {key, value})

          if(action.meta[key] !== value)
            return false

          this.#debug("Requirement met: %o", 4, {key, value})
        }
      } else if(Data.isType(requirement, "String")) {
        // Requirement is a property that must exist
        this.#debug("Checking string requirement: %o", 4, requirement)

        if(!action.meta[requirement])
          return false

        this.#debug("Requirement met: %o", 4, requirement)
      }
    }

    return true
  }

  /**
   * Groups validated actions by their type.
   *
   * @private
   * @param {object} value - Pipeline context with validatedActions
   * @returns {object} Context with grouped actions
   */
  #groupActionsByType(value) {
    const {content} = value
    const {validatedActions} = content

    const grouped = Actions.actionTypes.reduce((acc, actionType) => {
      acc[actionType] = validatedActions.filter(
        a => a.action.meta.kind === actionType
      )

      return acc
    }, {})

    this.#debug("Grouped actions: %o", 3,
      Object.entries(grouped).map(([k, v]) => `${k}: ${v.length}`)
    )

    value.content =  grouped

    return value
  }
}
