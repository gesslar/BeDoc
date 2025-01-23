// import {process} from "node:process"
import yaml from "yaml"
import {execSync} from "child_process"

import * as FDUtil from "./util/FDUtil.js"
import * as ActionUtil from "./util/ActionUtil.js"
import * as DataUtil from "./util/DataUtil.js"
import * as ValidUtil from "./util/ValidUtil.js"

const {ls, resolveDirectory, resolveFilename, getFiles} = FDUtil
const {actionTypes, actionMetaRequirements, loadJson} = ActionUtil
const {isType} = DataUtil
const {assert} = ValidUtil

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
   * @returns {Promise<object>} A map of discovered modules
   */
  async discoverActions() {
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
      debug("Discovering actions", 1)

      for(const actionType of actionTypes) {
        if(this.core.packageJson[actionType]) {
          const action = this.core.packageJson[actionType]

          debug("Found action in package.json: %o", 3, action)

          bucket.push(action)
        }
      }

      const directories = [
        // "c:/temp",
        "./node_modules",
        execSync("npm root -g").toString().trim(),
      ]

      const moduleDirectories = directories.map(resolveDirectory)
      for(const moduleDirectory of moduleDirectories) {
        const {directories: dirs} = await ls(moduleDirectory.absolutePath)
        debug("Found %d directories in `%s`", 2, dirs.length, moduleDirectory.absolutePath)
        const bedocDirs = dirs.filter((d) => d.name.startsWith("bedoc-"))
        const exports = bedocDirs.map((d) => this.#getModuleExports(d))
        bucket.push(...exports.flat())
      }
    }

    return await this.#loadActionsAndContracts(bucket)
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
    const bedocPackageJsonModules = packageJson.bedoc?.modules ?? []
    const bedocModuleFiles = bedocPackageJsonModules.map((file) =>
      resolveFilename(file, dirMap),
    )

    return bedocModuleFiles
  }

  /**
   * Process the discovered file objects and return the action and their
   * respective contracts.
   *
   * @param {object[]} moduleFiles The module file objects to process
   * @returns {Promise<object>} The discovered action
   */
  async #loadActionsAndContracts(moduleFiles) {
    const resultActions = {}

    actionTypes.forEach((actionType) => (resultActions[actionType] = []))

    for(const moduleFile of moduleFiles) {
      const result = {total: 0, accepted: 0}
      const {actions, contracts} = await import(moduleFile.absoluteUri)

      debug("Loaded actions from `%s`", 2, moduleFile.absoluteUri)
      debug("Found %d actions and %d contracts", 3, actions.length, contracts.length)

      assert(
        actions.length === contracts.length,
        "Actions and contracts must be the same length",
        1,
      )

      result.total = actions.length

      for(let i = actions.length; i--; ) {
        const tempContract = contracts[i]

        if(isType(tempContract, "string"))
          contracts[i] = yaml.parse(tempContract)
        else if(isType(tempContract, "object"))
          contracts[i] = tempContract
        else
          throw new Error(`Invalid contract type: ${typeof tempContract}`)

        const curr = {
          module: moduleFile.module,
          action: actions[i],
          contract: contracts[i],
        }

        const meta = curr.action.meta
        const metaAction = meta?.action

        debug("Checking action `%s`", 2, metaAction)

        for(const actionType of actionTypes) {
          const isValid = this.validMeta(actionType, curr)
          debug("Action `%o` in `%s` is %s", 3, metaAction, moduleFile.module, isValid ? "valid" : "invalid")

          if(isValid && metaAction === actionType) {
            debug("Action is a valid `%s` action", 3, actionType)
            result.accepted++
            resultActions[actionType].push(curr)
            continue
          } else {
            debug("Action is not a valid `%s` action", 3, actionType)
          }
        }

        debug("Processed action `%s`", 2, metaAction)
        debug("Result: %d/%d actions accepted", 3, result.accepted, result.total)
      }

      debug("Processed %d actions from `%s`", 2, result.total, moduleFile.module)
    }

    for(const actionType of actionTypes) {
      const total = resultActions[actionType].length
      debug("Found %d `%s` actions", 2, total, actionType)
    }

    const total = Object.keys(resultActions).reduce((acc, curr) => {
      return acc + resultActions[curr].length
    }, 0)

    debug("Loaded %d action definitions from %d modules", 2, total, moduleFiles.length)

    return resultActions
  }

  validMeta(actionType, toValidate) {
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
