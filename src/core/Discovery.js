import {Data, DirectoryObject, FileObject, FS, Sass} from "@gesslar/toolkit"
import {exec as execCallback} from "child_process"
import {promisify} from "util"

import Actions from "./Actions.js"

const exec = promisify(execCallback)

export default class Discovery {
  #core
  #debug

  constructor(core) {
    this.#core = core
    this.#debug = core.debug
  }

  get core() {
    return this.#core
  }

  /**
   * Discovers, loads, validates and groups actions from various sources
   *
   * @param {object} [specific] - Specific action modules to load
   * @param {FileObject} [specific.print] - Specific print action file
   * @param {FileObject} [specific.parse] - Specific parse action file
   * @returns {Promise<object>} Discovered actions grouped by type
   */
  async discoverActions(specific = {}) {
    const debug = this.#debug

    debug("Discovering actions", 2)
    debug("Specific modules provided: %o", 2,
      Object.values(specific).filter(Boolean).length
    )
    debug("Specific modules provided: %o", 3, specific)

    // Find all action files from various sources
    const files = await this.#discoverActionFiles()

    debug("Discovered %o module files", 2, files.length)

    // Load the action modules
    const loadedActions = await this.#loadActions(files, specific)

    // Filter to matching actions only
    const matched = this.#findMatchingActions(loadedActions, specific)

    // Validate action metadata
    const validated = this.#validateActionsMetas(matched)

    // Group by action type
    const grouped = this.#groupActionsByType(validated)

    return grouped
  }

  /**
   * Discovers action files from mock directory, project package.json,
   * or node_modules (local and global)
   *
   * @returns {Promise<Array<FileObject>>} Array of discovered action files
   */
  async #discoverActionFiles() {
    const debug = this.#debug
    const options = this.#core.options ?? {}

    if(options.mock) {
      return await this.#discoverMockActions(options.mock.path)
    }

    debug("Mock path not set, discovering actions in node_modules", 2)

    const files = []

    // Check project's package.json for exported actions
    const projectActions = await this.#discoverProjectActions(options)
    files.push(...projectActions)

    // Search node_modules (local and global)
    const nodeModulesActions = await this.#discoverNodeModulesActions()
    files.push(...nodeModulesActions)

    return files
  }

  /**
   * Discovers action files in the mock directory
   *
   * @param {string} mockPath - Path to mock directory
   * @returns {Promise<Array<FileObject>>} Array of mock action files
   */
  async #discoverMockActions(mockPath) {
    const debug = this.#debug

    debug("Discovering mock actions in %o", 2, mockPath)

    return await FS.getFiles([
      `${mockPath}/bedoc-*-printer.js`,
      `${mockPath}/bedoc-*-parser.js`,
    ])
  }

  /**
   * Discovers actions exported in the project's package.json
   *
   * @param {object} options - Core options
   * @returns {Promise<Array<FileObject>>} Array of project action files
   */
  async #discoverProjectActions(options) {
    const debug = this.#debug

    debug("Looking for actions in project's package.json", 2)

    if(!this.core.packageJson) {
      debug("No modules found in project's package.json", 2)

      return []
    }

    const exported = (this.core.packageJson.actions || [])
      .map(m => new FileObject(m, options.basePath))
      .flat()

    debug("Found %o modules in project's package.json", 2, exported.length)
    debug("Found modules in project's package.json: %o", 3, exported)

    return exported
  }

  /**
   * Discovers actions in node_modules directories (local and global)
   *
   * @returns {Promise<Array<FileObject>>} Array of node_modules action files
   */
  async #discoverNodeModulesActions() {
    const debug = this.#debug

    debug("Looking for modules in node_modules (local and global)", 2)

    // Get npm root paths asynchronously
    const [localResult, globalResult] = await Promise.all([
      exec("npm root").catch(() => ({stdout: ""})),
      exec("npm root -g").catch(() => ({stdout: ""}))
    ])

    const directories = [
      localResult.stdout.trim(),
      globalResult.stdout.trim()
    ]
      .filter(Boolean)
      .map(d => new DirectoryObject(d))

    const nodeModulesDirs = await Data.asyncFilter(directories, d => d.exists)

    debug("Found %o directories to search", 2, nodeModulesDirs.length)
    debug("Directories to search: %o", 3, nodeModulesDirs.map(d => d.path))

    const files = []

    for(const nodeModulesDir of nodeModulesDirs) {
      const discovered = await this.#searchNodeModulesDir(nodeModulesDir)
      files.push(...discovered)
    }

    return files
  }

  /**
   * Searches a single node_modules directory for BeDoc actions
   *
   * @param {DirectoryObject} nodeModulesDir - node_modules directory to search
   * @returns {Promise<Array<FileObject>>} Array of discovered action files
   */
  async #searchNodeModulesDir(nodeModulesDir) {
    const debug = this.#debug
    const files = []

    const {directories: moduleDirs} = await nodeModulesDir.read()

    debug("Found %o directories in %o", 2,
      moduleDirs.length, nodeModulesDir.path
    )

    // Build list of directories to search (including scoped packages)
    const dirsToSearch = await this.#expandScopedPackages(moduleDirs)

    debug("Total directories to search: %o", 2, dirsToSearch.length)
    debug("Directories to search: %o", 3, dirsToSearch.map(d => d.path))

    // Filter out hidden directories and search for BeDoc actions
    const visibleDirs = dirsToSearch.filter(d => !d.name.startsWith("."))

    for(const dir of visibleDirs) {
      const actions = await this.#extractActionsFromPackage(dir)
      files.push(...actions)
    }

    return files
  }

  /**
   * Expands scoped packages (e.g., `@bedoc/parser`) into searchable directories
   *
   * @param {Array<DirectoryObject>} moduleDirs - Module directories
   * @returns {Promise<Array<DirectoryObject>>} Expanded directory list
   */
  async #expandScopedPackages(moduleDirs) {
    const debug = this.#debug
    const dirsToSearch = [...moduleDirs]

    // Find scoped packages (directories starting with @)
    const scopedDirs = moduleDirs.filter(d => d.name.startsWith("@"))

    // Expand each scoped package to include its sub-packages
    for(const scopedDir of scopedDirs) {
      const {directories: scopedPackages} = await scopedDir.read()

      debug("Found %o packages under scoped package %o", 2,
        scopedPackages.length, scopedDir.name
      )
      debug("Packages under %o: %o", 3,
        scopedDir.path, scopedPackages.map(d => d.path)
      )

      dirsToSearch.push(...scopedPackages)
    }

    return dirsToSearch
  }

  /**
   * Extracts BeDoc actions from a package directory
   *
   * @param {DirectoryObject} dir - Package directory to search
   * @returns {Promise<Array<FileObject>>} Array of action files found
   */
  async #extractActionsFromPackage(dir) {
    const debug = this.#debug
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

    debug("Discovered %o modules from package.json: %o", 2,
      actions.length, packageJsonFile.path
    )
    debug("Discovered action files: %o", 3, actionObjects.map(f => f.uri))

    return actionObjects
  }

  /**
   * Loads action modules from files and tags specific modules
   *
   * @param {Array<FileObject>} moduleFiles - Module files to load
   * @param {object} specificModules - Specific modules to tag and load
   * @returns {Promise<Array<object>>} Array of loaded actions
   */
  async #loadActions(moduleFiles, specificModules) {
    const debug = this.#debug

    debug("Loading actions from %o module files", 2, moduleFiles.length)

    // Tag specific modules so they can be prioritized during matching
    this.#tagSpecificModules(specificModules)

    // Combine all modules to load
    const toLoad = [
      ...moduleFiles,
      ...Object.values(specificModules).filter(Boolean),
    ]

    debug("Total modules to load: %o", 2, toLoad.length)
    debug("Modules to load: %o", 3, toLoad.map(f => f.uri))

    const loadedActions = []

    for(const file of toLoad) {
      debug("Loading module %o", 2, file.uri)

      const module = await this.#loadModule(file)
      const action = module?.default

      if(!action)
        throw Sass.new(
          `Unable to find default export in action ${file.uri}`
        )

      loadedActions.push({file, action})
    }

    return loadedActions
  }

  /**
   * Tags specific modules with their action type for priority matching
   *
   * @param {object} specificModules - Modules to tag
   * @returns {void}
   */
  #tagSpecificModules(specificModules) {
    const debug = this.#debug

    for(const [kind, file] of Object.entries(specificModules)) {
      if(file) {
        debug("Tagging specific module %o as %o", 3, file.path, kind)
        file.specificType = file.specificType || []
        file.specificType.push(kind)
      }
    }
  }

  /**
   * Loads a module file and returns the imported module
   *
   * @param {FileObject} file - File to load
   * @returns {Promise<object>} The imported module
   */
  async #loadModule(file) {
    this.#debug("Loading module `%o`", 3, file.uri)

    return await file.import()
  }

  /**
   * Finds actions matching the requested types (specific or all)
   *
   * @param {Array<object>} loadedActions - All loaded actions
   * @param {object} specificModules - Specific modules requested
   * @returns {Array<object>} Matching actions
   */
  #findMatchingActions(loadedActions, specificModules) {
    const debug = this.#debug
    const actions = []

    debug("Determining matching actions from loaded modules", 2)

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

      debug("Total matching %o actions: %o", 2,
        actionType, matchingActions.length
      )

      actions.push(...matchingActions)
    }

    debug("Found %o total matching actions", 2, actions.length)

    return actions
  }

  /**
   * Finds a specific action by type and validates it exists
   *
   * @param {Array<object>} loadedActions - All loaded actions
   * @param {string} actionType - Type of action to find
   * @param {FileObject} module - Expected module file
   * @returns {object} The found action
   * @throws {Error} If the specific action is not found
   */
  #findSpecificAction(loadedActions, actionType, module) {
    const debug = this.#debug

    debug("Filtering for specifically tagged %o actions", 2, actionType)

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
   * Validates action metadata and filters invalid actions
   *
   * @param {Array<object>} loadedActions - Actions to validate
   * @returns {Array<object>} Valid actions only
   */
  #validateActionsMetas(loadedActions) {
    const debug = this.#debug

    return loadedActions.filter(loadedAction => {
      const {action, file} = loadedAction
      const metaKind = action.meta.kind

      debug("Checking validity of %o action %o", 2, metaKind, file.uri)

      const isValid = this.#validMeta(metaKind, {action})

      debug("Meta in %o is %o", 3,
        file.module, isValid ? "valid" : "invalid"
      )

      if(isValid) {
        debug("%o contains a valid %o action", 3, file.uri, metaKind)
      } else {
        debug("Action is not a valid %o action", 3, metaKind)
      }

      return isValid
    })
  }

  /**
   * Validates action metadata against requirements
   *
   * @param {string} actionType - Type of action to validate
   * @param {object} toValidate - Object containing action to validate
   * @param {object} toValidate.action - The action to validate
   * @returns {boolean} True if action meets all requirements
   */
  #validMeta(actionType, toValidate) {
    const debug = this.#debug

    debug("Checking meta requirements for %o", 3, actionType)

    const requirements = Actions.actionMetaRequirements[actionType]

    if(!requirements)
      throw new Error(
        `No meta requirements found for action type \`${actionType}\``
      )

    for(const requirement of requirements) {
      if(Data.isType(requirement, "Object")) {
        // Requirement is key-value pair that must match
        for(const [key, value] of Object.entries(requirement)) {
          debug("Checking object requirement %o", 4, {key, value})

          if(toValidate.action.meta[key] !== value)
            return false

          debug("Requirement met: %o", 4, {key, value})
        }
      } else if(Data.isType(requirement, "String")) {
        // Requirement is a property that must exist
        debug("Checking string requirement: %o", 4, requirement)

        if(!toValidate.action.meta[requirement])
          return false

        debug("Requirement met: %o", 4, requirement)
      }
    }

    return true
  }

  /**
   * Groups validated actions by their type
   *
   * @param {Array<object>} validatedActions - Validated actions to group
   * @returns {object} Actions grouped by type (parse, print, etc.)
   */
  #groupActionsByType(validatedActions) {
    const debug = this.#debug

    const grouped = Actions.actionTypes.reduce((acc, curr) => {
      acc[curr] = validatedActions.filter(a => a.action.meta.kind === curr)

      return acc
    }, {})

    debug("Grouped actions: %o", 3,
      Object.entries(grouped).map(([k, v]) => `${k}: ${v.length}`)
    )

    return grouped
  }
}
