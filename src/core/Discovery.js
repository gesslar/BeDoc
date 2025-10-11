import {Data, DirectoryObject, FileObject, FS, Sass} from "@gesslar/toolkit"
import {execSync} from "child_process"

import Actions from "./Actions.js"

export default class Discovery {
  #debug
  #core

  constructor(core, options, debug) {
    this.#core = core
    this.#debug = debug
  }

  /**
   * Discover actions from local or global node_modules
   *
   * @param {object} [specific] Configuration options for action discovery
   * @param {object} [specific.print] Print-related configuration options
   * @param {object} [specific.parse] Parse-related configuration options
   * @returns {Promise<object>} A map of discovered modules
   */
  async discoverActions(specific = {}) {
    const debug = this.#debug

    debug("Discovering actions", 2)

    debug("Specific modules provided: %o", 2, Object.values(specific).filter(Boolean).length)
    debug("Specific modules provided: %o", 3, specific)

    const files = []
    const options = this.#core.options ?? {}

    if(options.mock) {
      debug("Discovering mock actions in %o", 2, options.mock.path)

      files.push(
        ...(await FS.getFiles([
          `${options.mock.path}/bedoc-*-printer.js`,
          `${options.mock.path}/bedoc-*-parser.js`,
        ])),
      )
    } else {
      debug("Mock path not set, discovering actions in node_modules", 2)

      debug("Looking for actions in project's package.json", 2)
      if(this.core.packageJson) {
        const exported = (this.core.packageJson.actions || [])
          .map(m => new FileObject(m, options.basePath))
          .flat()

        debug("Found %o modules in project's package.json", 2, exported.length)
        debug("Found modules in project's package.json: %o", 2, exported)

        files.push(...exported)
      } else {
        debug("No modules found in project's package.json", 2)
      }

      debug("Looking for modules in node_modules (global and locally installed)", 2)
      const directories = [
        execSync("npm root").toString().trim(),
        execSync("npm root -g").toString().trim(),
      ]
        .filter(Boolean)
        .map(d => new DirectoryObject(d))

      const nodeModulesDirs = await Data.asyncFilter(directories, d => d.exists)

      debug("Found %o directories to search for actions", 2, directories.length)

      debug("Directories to search for actions: %o", 3, directories)

      for(const nodeModulesDir of nodeModulesDirs) {
        const dirsToSearch = []
        const {directories: moduleDirs} = await nodeModulesDir.read()

        debug("Found %o directories in %o", 2, moduleDirs.length, nodeModulesDir.path)

        // Handle scoped packages (e.g., @bedoc/something)
        const scopedDirs = moduleDirs.filter(d => d.name.startsWith("@"))

        dirsToSearch.push(...moduleDirs)

        // If we find a scope (e.g., "@bedoc"), look inside it for bedoc modules
        for(const scopedDir of scopedDirs) {
          const {directories: scopedPackages} = await scopedDir.read()

          debug("Found %o directories under scoped package %o", 2, directories.length, scopedDir.name)
          debug("Found directories under scoped package %o\n%o", 2, scopedDir.path, scopedPackages.map(d => d.path))

          dirsToSearch.push(...scopedPackages)
        }

        debug("1 Found %o directories to search for actions", 2, dirsToSearch.length)
        debug("2 Found directories to search for actions: %o", 3, dirsToSearch)

        const visibleDirs = dirsToSearch.filter(d => !d.name.startsWith("."))

        for(const dir of visibleDirs) {
          const packageJsonFile = new FileObject("package.json", dir)

          if(!await packageJsonFile.exists)
            continue

          const packageJson = await packageJsonFile.loadData()

          if(!packageJson.bedoc)
            continue

          const {actions} = packageJson.bedoc ?? null

          if(!actions || !Array.isArray(actions))
            continue

          const moduleFileObjects = actions.map(f => new FileObject(f, dir))
          const actionObjects = await Data.asyncFilter(
            moduleFileObjects, f => f.exists)

          debug("Discovered %o modules from package.json file: %o", 2,
            actions.length,
            packageJsonFile.path
          )

          debug("Discovered from package.json files: %o", 3, actions)

          files.push(...actionObjects)
        }
      }
    }

    debug("Discovered %o modules", 2, files.length)
    debug("Discovered modules", 2, files.map(f => f.path))
    debug("Discovered modules %o", 3, files)

    const actionDefinitions = await this.#loadActionDefinitions(files, specific)
    // @TODO: We also have to do contracts here

    return actionDefinitions
  }

  /**
   * Process the discovered file objects and return the action.
   *
   * @param {Array<FileObject>} moduleFiles The module file objects to process
   * @param {object} specificModules The specific modules to load
   * @returns {Promise<object>} The discovered action
   */
  async #loadActionDefinitions(moduleFiles, specificModules) {
    const debug = this.#debug

    debug("Loading actions", 2)
    debug("Loading %o module files", 2, moduleFiles.length)
    debug("Specific modules to load: %o", 3, specificModules)

    const resultActions = {}

    Actions.actionTypes.forEach(actionType => resultActions[actionType] = [])

    // Tag the specific actions to load, so we can filter them later
    for(const [type, file] of Object.entries(specificModules)) {
      if(file) {
        debug("Tagging specific module %o as %o", 3, file.path, type)
        file.specificType = file.specificType || []
        file.specificType.push(type)
      }
    }

    const toLoad = [
      ...moduleFiles,
      ...Object.values(specificModules).filter(Boolean),
    ]

    debug("Loading %o discovered modules", 2, toLoad.length)
    debug("Modules to load: %o", 3, toLoad)

    const loadedActions = []

    for(const file of toLoad) {
      debug("Loading module %o", 2, file)

      const module = await this.#loadModule(file)
      const action = module?.default

      if(!action)
        throw Sass.new(`Unable to find default export in action ${module}`)

      loadedActions.push({file, action})
    }

    const filteredActions = []

    for(const actionType of Actions.actionTypes) {
      const module = specificModules[actionType]
      const matchingActions = []

      if(module) {
        debug("Filtering actions for specific: %o", 2, actionType)
        const found = loadedActions.find(e =>
          e.action.meta?.action === actionType &&
          e.file.specificType?.includes(actionType)
        )

        if(!found)
          throw new Error(`Could not find specific action: ${module.path}`)

        matchingActions.push(found)
      } else {
        debug("No specific action required for %o", 2, actionType)

        const found = loadedActions.filter(
          e => e.action.meta.kind === actionType
        )

        matchingActions.push(...found)
      }

      debug("Filtered %o actions for %o", 2,
        matchingActions.length, actionType
      )

      filteredActions.push(...matchingActions)
    }

    debug("Filtered %o actions", 2, filteredActions.length)
    debug("Filtered actions %o", 3, filteredActions)

    // Now check the metas for validity
    for(const filtered of filteredActions) {
      const {action, file} = filtered
      const meta = action.meta

      if(!meta)
        throw new TypeError("Action has no meta object:\n" +
          JSON.stringify(file, null, 2) + "\n" +
          JSON.stringify(action, null, 2))

      const metaAction = meta.kind

      if(!metaAction)
        throw new TypeError("Action has no meta action:\n" +
          JSON.stringify(file, null, 2) + "\n" +
          JSON.stringify(action, null, 2))

      debug("Checking action %o", 2, metaAction)

      const isValid = this.#validMeta(metaAction, {action})

      debug("Meta in action %o in %o is %o", 3,
        metaAction, file.module, isValid ? "valid" : "invalid"
      )

      if(isValid) {
        debug("Action is a valid %o action", 3, metaAction)

        resultActions[metaAction].push(filtered)
      } else {
        debug("Action is not a valid %o action", 3, metaAction)
      }

      debug("Processed action %o", 2, metaAction)
    }

    for(const actionType of Actions.actionTypes) {
      const total = resultActions[actionType].length

      debug("Found %o %o actions", 2, total, actionType)
    }

    const total = Object.keys(resultActions).reduce((acc, curr) => {
      return acc + resultActions[curr].length
    }, 0)

    debug("Loaded %o action definitions from %o modules", 2,
      total, moduleFiles.length
    )

    return resultActions
  }

  satisfyCriteria(actions, validatedConfig) {
    const debug = this.#debug

    debug("Available actions to check %o", 3, actions)

    const satisfied = {parse: [], print: []}
    const toMatch = {
      parse: {criterion: "language", config: "parser"},
      print: {criterion: "format", config: "printer"}
    }

    debug("Satisfying criteria for actions", 2)
    for(const [actionType, search] of Object.entries(toMatch)) {
      debug("Satisfying criteria for %o actions", 2, actionType)

      const {criterion, config} = search

      debug("Criterion: %o, Config: %o", 3, criterion, config)

      // First let's check if we wanted something specific
      if(validatedConfig[config]) {
        debug("Checking for specific %o action", 3, actionType)
        const found = actions[actionType].find(
          a => a.file.specificType.includes(actionType)
        )

        if(found) {
          debug("Found specific %o action", 3, actionType)
          satisfied[actionType].push(found)
          continue
        }

        debug("No specific %o action found", 3, actionType)
      }

      // Hmm! We didn't find anything specific. Let's check the criterion
      debug("Checking for %o actions with criterion %o", 3, actionType, criterion)
      debug("Validated config to check against: %o", 3, validatedConfig)
      const found = actions[actionType].filter(a => {
        debug("Meta criterion value: %o", 4, a.action.meta[criterion])
        debug("Config criterion value: %o", 4, validatedConfig[criterion])

        return !validatedConfig[criterion] ||
          (
            validatedConfig[criterion] &&
            a.action.meta[criterion] === validatedConfig[criterion]
          )
      })

      debug("Found %o %o actions with criterion %o", 3,
        found.length, actionType, criterion
      )

      // Shove them into the result!
      satisfied[actionType].push(...found)

      // That should about cover it!
    }

    return satisfied
  }

  /**
   * Load a module and return it
   *
   * @param {FileObject} file The file object to load
   * @returns {Promise<object>} The module
   */
  async #loadModule(file) {
    this.#debug("Loading module `%j`", 2, file)

    const module = await file.import()

    return module
  }

  /**
   * Validates the meta requirements for an action
   *
   * @param {string} actionType The action type to validate
   * @param {object} toValidate - The action object to validate
   * @returns {boolean} Whether the action object meets the meta requirements
   */
  #validMeta(actionType, toValidate) {
    const debug = this.#debug

    debug("Checking meta requirement for %o", 3, actionType)

    const requirements = Actions.actionMetaRequirements[actionType]

    if(!requirements)
      throw new Error(
        `No meta requirements found for action type \`${actionType}\``,
      )

    for(const requirement of requirements) {
      debug("Checking requirement %o", 4, requirement)

      if(Data.isType(requirement, "Object")) {
        for(const [key, value] of Object.entries(requirement)) {
          debug("Checking object requirement %o", 4, {key, value})

          if(toValidate.action.meta[key] !== value)
            return false

          debug("Requirement met: %o", 4, {key, value})
        }
      } else if(Data.isType(requirement, "String")) {
        debug("Checking string requirement: %o", 4, requirement)

        if(!toValidate.action.meta[requirement])
          return false

        debug("Requirement met: %o", 4, requirement)
      }
    }

    return true
  }
}
