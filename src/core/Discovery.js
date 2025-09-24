import {Data, DirectoryObject, FileObject, FS, Glog} from "@gesslar/toolkit"
import {execSync} from "child_process"

import ContractManager from "./ContractManager.js"
import ActionUtil from "./util/ActionUtil.js"

export default class Discovery {
  #logger
  #debug

  constructor(core) {
    this.core = core
    this.#logger = core.logger
    this.#debug = this.#logger.newDebug()
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
    const options = this.core.options ?? {}

    if(options?.mockPath) {
      debug("Discovering mock actions in `%s`", 2, options.mockPath)

      files.push(
        ...(await FS.getFiles([
          `${options.mockPath}/bedoc-*-printer.js`,
          `${options.mockPath}/bedoc-*-parser.js`,
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

      Glog(nodeModulesDirs)

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

          debug("Discovered %d modules from package.json file: %o", 2,
            actions.length,
            packageJsonFile.path
          )

          debug("Discovered from package.json files: %o", 3, actions)

          files.push(...actionObjects)
        }
      }
    }

    debug("Discovered %d modules", 2, files.length)
    debug("Discovered modules", 2, files.map(f => f.path))
    debug("Discovered modules %o", 3, files)

    // const available = files.map(f => this.#getModuleExports(f))

    return await this.#loadActionsAndContracts(files, specific)
  }

  /**
   * Process the discovered file objects and return the action and their
   * respective contracts.
   *
   * @param {object[]} moduleFiles The module file objects to process
   * @param {object} specificModules The specific modules to load
   * @returns {Promise<object>} The discovered action
   */
  async #loadActionsAndContracts(moduleFiles, specificModules) {
    const debug = this.#debug

    debug("Loading actions and contracts", 2)
    debug("Loading %d module files", 2, moduleFiles.length)
    debug("Specific modules to load: %o", 3, specificModules)

    const resultActions = {}

    ActionUtil.actionTypes.forEach(actionType => resultActions[actionType] = [])

    // Tag the specific actions to load, so we can filter them later
    for(const [type, file] of Object.entries(specificModules)) {
      if(file) {
        debug("Tagging specific module `%s` as `%s`", 3, file.path, type)
        file.specificType = file.specificType || []
        file.specificType.push(type)
      }
    }

    const toLoad = [
      ...moduleFiles,
      ...Object.values(specificModules).filter(Boolean),
    ]

    Glog(toLoad)

    debug("Loading %d discovered modules", 2, toLoad.length)
    debug("Modules to load: %o", 3, toLoad)

    const loadedActions = []

    for(const file of toLoad) {
      debug("Loading module `%s`", 2, file)

      const loading = await this.#loadModule(file)

      for(let index = 0; index < loading.actions.length; index++) {
        const action = loading.actions[index]

        debug(`Loading %o contract from %s`, 2, action.meta.action, file)

        const terms = await ContractManager.parse(
          loading.contracts[index],
          file.directory
        )

        const contract = await ContractManager.newContract(
          action.meta.action,
          terms
        )

        loadedActions.push({file, action, contract})
      }
    }

    debug("Loaded %d actions", 2, loadedActions.length)
    debug("Loaded actions", 3, loadedActions)

    const filteredActions = []

    for(const actionType of ActionUtil.actionTypes) {
      const module = specificModules[actionType]
      const matchingActions = []

      if(module) {
        debug("Filtering actions for specific: %o", 2, actionType)
        const found = loadedActions.find(
          e => e.file.specificType?.includes(actionType) &&
               e.action.meta?.action === actionType
        )

        if(!found)
          throw new Error(`Could not find specific action: ${module.path}`)

        matchingActions.push(found)
      } else {
        debug("No specific action required for `%s`", 2, actionType)

        const found = loadedActions.filter(
          e => e.action.meta.action === actionType
        )

        matchingActions.push(...found)
      }

      debug("Filtered %d actions for `%s`", 2,
        matchingActions.length, actionType
      )

      filteredActions.push(...matchingActions)
    }

    debug("Filtered %d actions", 2, filteredActions.length)
    debug("Filtered actions %o", 3, filteredActions)

    // Now check the metas for validity
    for(const filtered of filteredActions) {
      const {action, contract, file: moduleFile} = filtered
      const meta = action.meta

      if(!meta)
        throw new TypeError("Action has no meta object:\n" +
          JSON.stringify(moduleFile, null, 2) + "\n" +
          JSON.stringify(action, null, 2))

      const metaAction = meta.action

      if(!metaAction)
        throw new TypeError("Action has no meta action:\n" +
          JSON.stringify(moduleFile, null, 2) + "\n" +
          JSON.stringify(action, null, 2))

      debug("Checking action %o", 2, metaAction)

      const isValid = this.#validMeta(metaAction, {action, contract})

      debug("Meta in action %o in %o is %o", 3,
        metaAction, moduleFile.module, isValid ? "valid" : "invalid"
      )

      if(isValid) {
        debug("Action is a valid `%s` action", 3, metaAction)

        resultActions[metaAction].push({file: moduleFile, action, contract})
      } else {
        debug("Action is not a valid `%s` action", 3, metaAction)
      }

      debug("Processed action `%s`", 2, metaAction)
    }

    for(const actionType of ActionUtil.actionTypes) {
      const total = resultActions[actionType].length

      debug("Found %o %o actions", 2, total, actionType)
    }

    const total = Object.keys(resultActions).reduce((acc, curr) => {
      return acc + resultActions[curr].length
    }, 0)

    debug("Loaded %d action definitions from %d modules", 2,
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
      debug("Satisfying criteria for `%s` actions", 2, actionType)

      const {criterion, config} = search

      debug("Criterion: %s, Config: %s", 3, criterion, config)

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

        debug("No specific `%s` action found", 3, actionType)
      }

      // Hmm! We didn't find anything specific. Let's check the criterion
      debug("Checking for %o actions with criterion %o", 3, actionType, criterion)
      debug("Validated config to check against: %o", 3, validatedConfig)
      const found = actions[actionType].filter(a => {
        debug("Meta criterion value: %o", 4, a.action.meta[criterion])
        debug("Config criterion value: %o", 4, validatedConfig[criterion])

        return a.action.meta[criterion] === validatedConfig[criterion]
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
   * Load a module and return its exports
   *
   * @param {object} module The module object to load
   * @returns {Promise<object>} The module exports {actions, contracts}
   */
  async #loadModule(module) {
    const debug = this.#debug

    debug("Loading module `%j`", 2, module)

    const {uri} = module
    const moduleExports = await import(uri)

    return {file: module, ...moduleExports}
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

    debug("Checking meta requirements for %o", 3, actionType)

    const requirements = ActionUtil.actionMetaRequirements[actionType]

    if(!requirements)
      throw new Error(
        `No meta requirements found for action type \`${actionType}\``,
      )

    for(const requirement of requirements) {
      debug("Checking requirement %o", 4, requirement)

      if(Data.isType(requirement, "object")) {
        for(const [key, value] of Object.entries(requirement)) {
          debug("Checking object requirement %o", 4, {key, value})

          if(toValidate.action.meta[key] !== value)
            return false

          debug("Requirement met: %o", 4, {key, value})
        }
      } else if(Data.isType(requirement, "string")) {
        debug("Checking string requirement: %s", 4, requirement)

        if(!toValidate.action.meta[requirement])
          return false

        debug("Requirement met: %s", 4, requirement)
      }
    }

    return true
  }
}
