// import {process} from "node:process"
import yaml from "yaml"
import {execSync} from "child_process"

import * as FDUtil from "./util/FDUtil.js"
import * as ActionUtil from "./util/ActionUtil.js"
import * as DataUtil from "./util/DataUtil.js"

const {ls, resolveDirectory, resolveFilename, getFiles} = FDUtil
const {actionTypes, actionMetaRequirements, loadJson} = ActionUtil
const {isType} = DataUtil

let debug

export default class Discovery {
  #logger

  constructor(core) {
    this.core = core
    this.#logger = core.logger
    debug = this.#logger.newDebug()
  }

  /**
   * Discover actions from local or global node_modules
   *
   * @param {object[]} specified The specified actions to discover
   * @returns {Promise<object>} A map of discovered modules
   */
  async discoverActions({printer, parser} = {}) {
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
      debug("Discovering actions", 2)

      for(const actionType of actionTypes) {
        if(this.core.packageJson[actionType]) {
          const action = this.core.packageJson[actionType]

          debug("Found action in package.json: %o", 3, action)

          bucket.push(action)
        }
      }

      const directories = [
        "./node_modules",
        execSync("npm root -g").toString().trim(),
      ]

      const moduleDirectories = directories.map(resolveDirectory)
      for(const moduleDirectory of moduleDirectories) {
        const {directories: dirs} = await ls(moduleDirectory.absolutePath)

        debug("Found %d directories in `%s`", 2,
          dirs.length, moduleDirectory.absolutePath
        )

        const bedocDirs = dirs.filter(d => d.name.startsWith("bedoc-"))
        const exports = bedocDirs.map(d => this.#getModuleExports(d))
        bucket.push(...exports.flat())
      }
    }

    return await this.#loadActionsAndContracts(
      bucket,
      {
        print: printer,
        parse: parser
      }
    )
  }

  /**
   * Get the exports from a module's package.json file, resolved to file paths
   *
   * @param {object} dirMap The directory map object
   * @returns {object[]} The discovered module exports
   */
  #getModuleExports(dirMap) {
    const packageJsonFile = resolveFilename("package.json", dirMap)
    const packageJson = loadJson(packageJsonFile)
    const bedocPackageJsonModules = packageJson.bedoc?.actions ?? []
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
    const resultActions = {}
    actionTypes.forEach(actionType => (resultActions[actionType] = []))

    // Tag the specific actions to load, so we can filter them later
    for(const [type, file] of Object.entries(specific)) {
      if(file)
        file.specificType = type
    }

    const toLoad = [
      ...moduleFiles,
      ...Object.values(specific).filter(Boolean),
    ]

    const loadedActions = []
    for(const file of toLoad) {
      const loading = await this.#loadModule(file)
      const loaded = loading.actions.map((action, index) => {
        const contract = yaml.parse(loading.contracts[index])

        return {file, action, contract}
      })
      loadedActions.push(...loaded)
    }

    const filtered = []
    for(const [type, file] of Object.entries(specific)) {
      // Find all the actions that match the specific type
      const filtering = loadedActions.filter((_f,a,_c) => a[type])

      // If the file is a specific type, filter it
      if(file?.specificType === type)
        filtered.push(loadedActions.find(
          e => e.file.specificType === type)
        )
      // Otherwise, push all the actions that match the specific type
      else
        filtered.push(...filtering)
    }

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
    const satisfied = {parse: [], print: []}
    const toMatch = {
      parse: {criterion: "language", config: "parser"},
      print: {criterion: "format", config: "printer"}
    }

    for(const [actionType, search] of Object.entries(toMatch)) {
      const {criterion, config} = search

      // First let's check if we wanted something specific
      if(validatedConfig[config]) {
        const found = actions[actionType].find(
          a => a.file.specificType === actionType
        )
        if(found) {
          satisfied[actionType].push(found)
          continue
        }
      }

      // Hmm! We didn't find anything specific. Let's check the criterion
      const found = actions[actionType].filter(
        a => a.action.meta[criterion] === validatedConfig[criterion]
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
