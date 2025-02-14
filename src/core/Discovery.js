// import {process} from "node:process"
import yaml from "yaml"
import {execSync} from "child_process"

import * as FDUtil from "./util/FDUtil.js"
import * as ActionUtil from "./util/ActionUtil.js"
import * as DataUtil from "./util/DataUtil.js"
import {composeDirectory,directoryExists} from "./util/FDUtil.js"

const {ls,fileExists,composeFilename,getFiles} = FDUtil
const {actionTypes, actionMetaRequirements, loadJson} = ActionUtil
const {isType} = DataUtil

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

    debug("Specific modules provided: %o", 2, specific)

    const bucket = []
    const options = this.core.options ?? {}

    if(options?.mockPath) {
      debug("Discovering mock actions in `%s`", 2, options.mockPath)

      bucket.push(
        ...(await getFiles([
          `${options.mockPath}/bedoc-*-printer.js`,
          `${options.mockPath}/bedoc-*-parser.js`,
        ])),
      )
    } else {
      debug("Mock path not set, discovering actions in node_modules", 2)

      debug("Looking for actions in project's package.json", 2)

      if(this.core.packageJson?.modules) {
        const actions = this.core.packageJson?.modules

        debug("Found %o actions in package.json", 3, actions)
        debug("Actions found in package.json action in package.json: %o", 3, actions)

        if(actions && typeof(actions) === "object")
          bucket.push(...actions)
        else
          debug("No actions found in package.json", 3)
      } else {
        debug("No actions found in project's package.json", 2)
      }

      debug("Looking for actions in node_modules (global and locally installed)", 2)
      const directories = [
        execSync("npm root").toString().trim(),
        execSync("npm root -g").toString().trim(),
      ].filter(Boolean)

      const nodeModulesDirs = directories
        .map(composeDirectory)
        .filter(directoryExists)

      debug("Found %o directories to search for actions", 2, directories.length)
      debug("Directories to search for actions: %o", 3, directories)

      for(const nodeModulesDir of nodeModulesDirs) {
        const dirsToSearch = []
        const {directories: moduleDirs} = await ls(nodeModulesDir.absolutePath)

        debug("Found %o directories in %o", 2, moduleDirs.length, nodeModulesDir.absolutePath)

        // Handle scoped packages (e.g., @bedoc/something)
        const scopedDirs = moduleDirs.filter(d => d.name.startsWith("@"))

        dirsToSearch.push(...moduleDirs)

        // If we find a scope (e.g., "@bedoc"), look inside it for bedoc modules
        for(const scopedDir of scopedDirs) {
          const {directories: scopedPackages} = await ls(scopedDir.absolutePath)

          debug("Found %o directories under scoped package %o", 2, directories.length, scopedDir.name)

          dirsToSearch.push(...scopedPackages)
        }

        debug("Found %o directories to search for actions", 2, dirsToSearch.length)

        const exports = dirsToSearch
          .filter(d => !d.name.startsWith("."))
          .map(d => this.#getModuleExports(d))

        debug("Found %o module exports under %o", 2, exports.length, nodeModulesDir.absolutePath)

        bucket.push(...exports.flat())
      }
    }

    debug("Discovered %d actions", 2, bucket.length)

    return await this.#loadActionsAndContracts(bucket, specific)
  }

  /**
   * Get the exports from a module's package.json file, resolved to file paths
   *
   * @param {object} dirMap The directory map object
   * @returns {object[]} The discovered module exports
   */
  #getModuleExports(dirMap) {
    const debug = this.#debug
    debug("Getting module exports from %o", 3, dirMap.absolutePath)

    const packageJsonFile = composeFilename(dirMap, "package.json")
    if(!fileExists(packageJsonFile))
      return []

    debug("Loading package.json from %o", 3, packageJsonFile.absolutePath)

    const packageJson = loadJson(packageJsonFile)
    debug("Loaded package.json from %o", 3, packageJsonFile.absolutePath)

    const bedocPackageJsonModules = packageJson.bedoc?.modules ?? []

    debug("Discovered %o published modules", 2, bedocPackageJsonModules.length)
    debug("Published modules %o", 3, bedocPackageJsonModules)

    const bedocModuleFiles = bedocPackageJsonModules
      .map(m => composeFilename(dirMap, m))
      .filter(m => fileExists(m))

    debug("Composed modules %o", 3, bedocModuleFiles)

    return bedocModuleFiles
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
    debug("Specific modules to load: %o", 2, specificModules)

    const resultActions = {}
    actionTypes.forEach(actionType => (resultActions[actionType] = []))

    // Tag the specific actions to load, so we can filter them later
    for(const [type, file] of Object.entries(specificModules)) {
      if(file) {
        debug("Tagging specific module `%s` as `%s`", 3, file.absolutePath, type)
        file.specificType = file.specificType || []
        file.specificType.push(type)
      }
    }

    const toLoad = [
      ...moduleFiles,
      ...Object.values(specificModules).filter(Boolean),
    ]

    debug("Loading %d discovered modules", 2, toLoad.length)
    debug("Modules to load: %o", 3, toLoad)

    const loadedActions = []
    for(const file of toLoad) {
      debug("Loading module `%s`", 2, file.absoluteUri)

      const loading = await this.#loadModule(file)
      const loaded = loading.actions.map((action, index) => {
        const contract = yaml.parse(loading.contracts[index])

        return {file, action, contract}
      })
      loadedActions.push(...loaded)
    }

    debug("Loaded %d actions", 2, loadedActions.length)
    debug("Loaded actions", 3, loadedActions)

    const filteredActions = []
    for(const actionType of actionTypes) {
      const module = specificModules[actionType]
      const matchingActions = []
      if(module) {
        debug("Filtering actions for specific: %o", 2, actionType)
        const found = loadedActions.find(
          e => e.file.specificType?.includes(actionType) &&
               e.action.meta?.action === actionType
        )

        if(!found)
          throw new Error(`Could not find specific action: ${module.absolutePath}`)

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

    for(const actionType of actionTypes) {
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

    debug("2 Loading module `%j`", 2, module)

    const {absoluteUri} = module
    const moduleExports = await import(absoluteUri)

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

    const requirements = actionMetaRequirements[actionType]
    if(!requirements)
      throw new Error(
        `No meta requirements found for action type \`${actionType}\``,
      )

    for(const requirement of requirements) {
      debug("Checking requirement %o", 4, requirement)

      if(isType(requirement, "object")) {
        for(const [key, value] of Object.entries(requirement)) {
          debug("Checking object requirement %o", 4, {key, value})

          if(toValidate.action.meta[key] !== value)
            return false

          debug("Requirement met: %o", 4, {key, value})
        }
      } else if(isType(requirement, "string")) {
        debug("Checking string requirement: %s", 4, requirement)

        if(!toValidate.action.meta[requirement])
          return false

        debug("Requirement met: %s", 4, requirement)
      }
    }

    return true
  }
}
