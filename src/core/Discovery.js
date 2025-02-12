// import {process} from "node:process"
import yaml from "yaml"
import {execSync} from "child_process"

import * as FDUtil from "./util/FDUtil.js"
import * as ActionUtil from "./util/ActionUtil.js"
import * as DataUtil from "./util/DataUtil.js"
import {composeDirectory,directoryExists} from "./util/FDUtil.js"

const {ls,resolveFilename,getFiles} = FDUtil
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

    const bucket = []
    const options = this.core.options ?? {}

    if(options?.mockPath) {
      debug("Discovering mock actions in `%s`", 1, options.mockPath)

      bucket.push(
        ...(await getFiles([
          `${options.mockPath}/bedoc-*-printer.js`,
          `${options.mockPath}/bedoc-*-parser.js`,
        ])),
      )
    } else {
      debug("Mock path not set, discovering actions in node_modules", 1)

      debug("Looking for actions in project's package.json", 2)
      if(this.core.packageJson?.bedoc?.modules) {
        const actions = this.core.packageJson?.bedoc?.modules

        debug("Found %d actions in package.json: %d", 3, actions)
        debug("Actions found in package.json action in package.json: %o", 3, actions)

        if(actions && typeof(actions) === "object")
          bucket.push(...actions)
        else
          debug("No actions found in package.json", 3)
      } else {
        debug("No actions found in project's package.json", 2)
      }

      debug("Looking for actions in node_modules (global and locally installed", 2)
      const directories = [
        "./node_modules",
        execSync("npm root -g").toString().trim(),
      ]

      debug("Found %d directories to search for actions", 2, directories.length)
      debug("Directories to search for actions: %o", 3, directories)

      const moduleDirectories = directories
        .map(composeDirectory)
        .filter(directoryExists)
      for(const moduleDirectory of moduleDirectories) {
        const {directories: dirs} = await ls(moduleDirectory.absolutePath)

        debug("Found %d directories in `%s`", 2,
          dirs.length, moduleDirectory.absolutePath
        )

        const bedocDirs = dirs.filter(d => d.name.startsWith("bedoc-"))
        debug("Found %d bedoc directories under %s", 2, bedocDirs.length, moduleDirectory.absolutePath)

        const exports = bedocDirs.map(d => this.#getModuleExports(d))
        debug("Found %d module exports under %s", 2, exports.length, moduleDirectory.absolutePath)

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
    debug("Getting module exports from `%s`", 3, dirMap.absolutePath)

    const packageJsonFile = resolveFilename("package.json", dirMap)
    debug("Loading package.json from `%s`", 3, packageJsonFile.absolutePath)

    const packageJson = loadJson(packageJsonFile)
    debug("Loaded package.json from `%s`", 3, packageJsonFile.absolutePath)

    const bedocPackageJsonModules = packageJson.bedoc?.modules ?? []
    const bedocModuleFiles = bedocPackageJsonModules.map(file =>
      resolveFilename(file, dirMap)
    )

    return bedocModuleFiles
  }

  /**
   * Process the discovered file objects and return the action and their
   * respective contracts.
   *
   * @param {object[]} moduleFiles The module file objects to process
   * @param {object} specific The specific actions to load
   * @returns {Promise<object>} The discovered action
   */
  async #loadActionsAndContracts(moduleFiles, specific) {
    const debug = this.#debug

    debug("Loading actions and contracts", 2)
    debug("Loading %d module files", 2, moduleFiles.length)
    debug("Specific actions to load: %o", 2, specific)

    const resultActions = {}
    actionTypes.forEach(actionType => (resultActions[actionType] = []))

    // Tag the specific actions to load, so we can filter them later
    for(const [type, file] of Object.entries(specific)) {
      if(file) {
        debug("Tagging specific action `%s` as `%s`", 3, file.absolutePath, type)
        file.specificType = type
      }
    }

    const toLoad = [
      ...moduleFiles,
      ...Object.values(specific).filter(Boolean),
    ]

    debug("Loading %d combined actions", 2, toLoad.length)
    debug("Actions to load: %o", 3, toLoad)

    const loadedActions = []
    for(const file of toLoad) {
      debug("Loading module `%s`", 2, file.absolutePath)

      const loading = await this.#loadModule(file)
      const loaded = loading.actions.map((action, index) => {
        const contract = yaml.parse(loading.contracts[index])

        return {file, action, contract}
      })
      loadedActions.push(...loaded)
    }

    debug("Loaded %d actions", 2, loadedActions.length)

    const filtered = []
    for(const actionType of actionTypes) {
      const file = specific[actionType]
      const matchingActions = []
      if(file) {
        debug("Filtering actions for specific `%s`", 2, actionType)
        const found = loadedActions.find(
          e => e.file.absolutePath === file.absolutePath
        )

        if(!found)
          throw new Error(`Could not find specific action: ${file.absolutePath}`)

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

      filtered.push(...matchingActions)
    }

    debug("Filtered %d actions", 2, filtered.length)

    // Now check the metas for validity
    for(const e of filtered) {
      const {action, contract, file: moduleFile} = e
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

      debug("Checking action `%s`", 2, metaAction)

      const isValid = this.#validMeta(metaAction, {action, contract})

      debug("Action `%o` in `%s` is %s", 3,
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
      debug("Found %d `%s` actions", 2, total, actionType)
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
        debug("Checking for specific `%s` action", 3, actionType)
        const found = actions[actionType].find(
          a => a.file.specificType === actionType
        )
        if(found) {
          debug("Found specific `%s` action", 3, actionType)
          satisfied[actionType].push(found)
          continue
        }

        debug("No specific `%s` action found", 3, actionType)
      }

      // Hmm! We didn't find anything specific. Let's check the criterion
      debug("Checking for `%s` actions with criterion `%s`", 3, actionType, criterion)
      const found = actions[actionType].filter(a => {
        debug("Meta criterion value: %o", 4, a.action.meta[criterion])
        debug("Config criterion value: %o", 4, validatedConfig[criterion])
        return a.action.meta[criterion] === validatedConfig[criterion]
      })

      debug("Found %d `%s` actions with criterion `%s`", 3,
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
    debug("Checking meta requirements for `%s`", 3, actionType)

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
