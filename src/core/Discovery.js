// import {process} from "node:process"
import yaml from "yaml"
import {execSync} from "child_process"
import {actionMetaRequirements,actionTypes,assert,getFiles,isType} from "#util"
import {loadJson,ls,resolveDirectory,resolveFilename} from "#util"

let debug

class Discovery {
  #logger

  constructor(core) {
    this.core = core
    this.#logger = core.logger
    debug = this.#logger.newDebug()
  }

  /**
   * Discover actions from local or global node_modules
   * @returns {Promise<object>} A map of discovered modules
   */
  async discoverActions() {
    const bucket = []
    const options = this.core.options ?? {}

    if(options?.mockPath) {
      debug(`Discovering mock actions in \`${options.mockPath}\``, 1)

      bucket.push(...(await getFiles([
        `${options.mockPath}/bedoc-*-printer.js`,
        `${options.mockPath}/bedoc-*-parser.js`
      ])))
    } else {
      debug("Discovering actions", 1)

      for(const actionType of actionTypes) {
        if(this.core.packageJson[actionType]) {
          const action = this.core.packageJson[actionType]
          debug(`Found \`${actionType}\` action in package.json`, 3, action)
          bucket.push(action)
        }
      }

      const directories = [
        // "c:/temp",
        "./node_modules",
        execSync("npm root -g").toString().trim()
      ]

      const moduleDirectories = directories.map(resolveDirectory)
      for(const moduleDirectory of moduleDirectories) {
        const {directories: dirs} = await ls(moduleDirectory.absolutePath)
        debug(`Found ${dirs.length} directories in \`${moduleDirectory.absolutePath}\``, 2)
        const bedocDirs = dirs.filter(d => d.name.startsWith("bedoc-"))
        const exports = bedocDirs.map(d => this.#getModuleExports(d))
        bucket.push(...exports.flat())
      }
    }

    return await this.#loadActionsAndContracts(bucket)
  }

  /**
   * Get the exports from a module's package.json file, resolved to file paths
   * @param {object} dirMap The directory map object
   * @returns {object[]} The discovered module exports
   */
  #getModuleExports(dirMap) {
    const packageJsonFile = resolveFilename("package.json", dirMap)
    const packageJson = loadJson(packageJsonFile)
    const bedocPackageJsonModules = packageJson.bedoc?.modules ?? []
    const bedocModuleFiles = bedocPackageJsonModules.map(
      file => resolveFilename(file, dirMap)
    )

    return bedocModuleFiles
  }

  /**
   * Process the discovered file objects and return the action and their
   * respective contracts.
   * @param {object[]} moduleFiles The module file objects to process
   * @returns {Promise<object>} The discovered action
   */
  async #loadActionsAndContracts(moduleFiles) {
    const resultActions = {}

    actionTypes.forEach(actionType => resultActions[actionType] = [])

    for(const moduleFile of moduleFiles) {
      const result = {total: 0, accepted: 0}
      const {actions,contracts} = await import(moduleFile.absoluteUri)

      debug(`Loaded actions from \`${moduleFile.absoluteUri}\``, 2)
      debug(`Found ${actions.length} actions and ${contracts.length} contracts`, 3)

      assert(actions.length === contracts.length,
        "Actions and contracts must be the same length",
        1
      )

      result.total = actions.length

      for(let i = actions.length; i--;) {
        const tempContract = contracts[i]
        if(isType(tempContract, "string")) {
          contracts[i] = yaml.parse(tempContract)
        } else if(isType(tempContract, "object")) {
          contracts[i] = tempContract
        } else {
          throw new Error(`Invalid contract type: ${typeof tempContract}`)
        }

        const curr = {
          module: moduleFile.module,
          action: actions[i],
          contract: contracts[i]
        }

        const meta = curr.action.meta
        const metaAction = meta?.action

        debug(`Checking action \`${metaAction}\``, 2)

        for(const actionType of actionTypes) {
          const isValid = this.validMeta(actionType, curr)
          debug(`Action \`${metaAction}\` in ${moduleFile.module} is ${isValid ? "valid" : "invalid"}`, 3)

          if(isValid && metaAction === actionType) {
            debug(`Action \`${metaAction}\` meets requirements`, 3)
            result.accepted++
            resultActions[actionType].push(curr)
            continue
          } else {
            debug(`Action \`${metaAction}\` does not meet requirements`, 3)
          }
        }

        debug(`Processed action \`${metaAction}\``, 2)
        debug(`Result: ${result.accepted}/${result.total} actions accepted for \`${moduleFile.module}\``, 3)
      }

      debug(`Processed ${result.total} actions from \`${moduleFile.module}\``, 2)
    }

    for(const actionType of actionTypes) {
      const total = resultActions[actionType].length
      debug(`Found ${total} \`${actionType}\` actions`, 1)
    }

    const total = Object.keys(resultActions).reduce((acc, curr) => {
      return acc + resultActions[curr].length
    }, 0)

    debug(`Loaded ${total} action definitions from ${moduleFiles.length} modules`, 1)

    return resultActions
  }

  validMeta(actionType, toValidate) {
    debug(`Checking meta requirements for \`${actionType}\``, 3)
    const requirements = actionMetaRequirements[actionType]
    if(!requirements)
      throw new Error(`No meta requirements found for action type \`${actionType}\``)

    for(const requirement of requirements) {
      debug("Checking requirement", 4, requirement)

      if(isType(requirement, "object")) {
        for(const [key, value] of Object.entries(requirement)) {
          debug(`Checking object requirement: ${key} = ${value}`, 4)
          if(toValidate.action.meta[key] !== value)
            return false
          debug(`Requirement met: ${key} = ${value}`, 4)
        }
      } else if(isType(requirement, "string")) {
        debug(`Checking string requirement: ${requirement}`, 4)
        if(!toValidate.action.meta[requirement])
          return false
        debug(`Requirement met: ${requirement}`, 4)
      }
    }

    return true
  }
}

export {
  Discovery,
}
