import process from "node:process"
import {Environment} from "./Core.js"
import JSON5 from "json5"

import {
  ConfigurationParameters,
  ConfigurationPriorityKeys,
} from "./ConfigurationParameters.js"

import * as ActionUtil from "./util/ActionUtil.js"
import * as DataUtil from "./util/DataUtil.js"
import * as FDUtil from "./util/FDUtil.js"

const {loadJson} = ActionUtil
const {isNothing, isType, mapObject} = DataUtil
const {getFiles, composeFilename, fileExists} = FDUtil
const {resolveDirectory, resolveFilename} = FDUtil
const {fdType, fdTypes} = FDUtil

export default class Configuration {
  async validate({options, source}) {
    const finalOptions = {}

    this.#mapEntryOptions({options, source})

    // While the entry points do wrap the entire process in a try/catch, we
    // should also do this here, so we can trap everything and instead
    // of throwing, return friendly messages back!

    // If the configuration parameters are invalid, we can't proceed. No error
    // collection is needed here, because the ConfigurationParameters object
    // is a static object and should be correct. OUT WITH THE TRASH!!! (I mean
    // the error collection, not the ConfigurationParameters object)
    // (Edit: No, I mean the ConfigurationParameters object. It's trash. Fix it
    // if you get this error.)
    const configValidationErrors = this.#validateConfigurationParameters()
    if(configValidationErrors.length > 0)
      throw new AggregateError(
        configValidationErrors,
        `ConfigurationParameters validation errors: `+
          `${configValidationErrors.join(", ")}`,
      )

    const allOptions = this.#findAllOptions(options)

    Object.assign(finalOptions, await this.#mergeOptions(allOptions))

    this.#fixOptionValues(finalOptions)

    // Priority keys are those which must be processed first. They are
    // specified in order of priority.
    // Find them and add them to an array; the rest will be in pushed to the
    // end of the priority array.
    const orderedSections = []
    ConfigurationPriorityKeys.forEach(key => {
      if(!ConfigurationParameters[key])
        throw new Error(`Invalid priority key: ${key}`)

      if(finalOptions[key])
        orderedSections.push({key, value: finalOptions[key]})
    })

    const remainingSections = Object.keys(ConfigurationParameters).filter(
      key => !ConfigurationPriorityKeys.includes(key),
    )
    orderedSections.push(
      ...remainingSections.map(key => {
        return {key, value: finalOptions[key]}
      }),
    )

    // Check exclusive options
    for(const [key, param] of Object.entries(ConfigurationParameters)) {
      if(
        param.exclusiveOf &&
        finalOptions[key] &&
        finalOptions[param.exclusiveOf]
      )
        throw new SyntaxError(
          `Options \`${key}\` and \`${param.exclusiveOf}\` are mutually exclusive`,
        )
    }

    // Check for mandatory values
    for(const [key, {required}] of Object.entries(ConfigurationParameters)) {
      if(required && !orderedSections.find(s => s.key === key))
        throw new SyntaxError(`Missing mandatory key \`${key}\``)
    }

    for(const section of orderedSections) {
      const {key} = section

      // Skipping config, we've already handled it
      if(key === "config")
        continue

      let {value} = section
      const nothing = isNothing(value)
      const param = ConfigurationParameters[key]
      const {required, path} = param

      if(nothing) {
        if(required === true)
          throw new SyntaxError(`Option \`${key}\` is required`)
        else
          continue
      }

      // Additional path validation if needed
      if(path && !nothing) {
        const {mustExist, type: pathType} = path

        // Special for `input` and `exclude` because they can be a comma-
        // separated list of glob patterns.
        if(key === "input" || key === "exclude") {
          if(isType(value, "array"))
            value = await Promise.all(
              value.map(pattern => getFiles(pattern)),
            )
          else if(isType(value, "string"))
            value = await getFiles(value)
          else
            throw new TypeError(
              `Option \`${key}\` must be a string or an array of strings`,
            )

          finalOptions[key] = value.flat()

          continue
        } else {
          if(mustExist === true) {
            finalOptions[key] =
              pathType === fdType.FILE
                ? resolveFilename(value)
                : resolveDirectory(value)
          }
        }
      }
    }

    return {
      status: "success",
      validated: true,
      ...finalOptions,
    }
  }

  #mapEntryOptions({options = {}, source}) {
    // CLI already has done all the work via commander
    if(source === Environment.CLI)
      return options

    for(const [key, value] of Object.entries(options)) {
      options[key] = {value, source}
    }

    // We will need to inject some options if they are not available
    const cwd = process.cwd()
    const dir = resolveDirectory(cwd)

    // Inject basePath if not available
    if(!options.basePath)
      options.basePath = {value: dir, source}

    // Add defaults which are missing
    for(const [key, param] of Object.entries(ConfigurationParameters)) {
      if(options[key] === undefined && param.default !== undefined)
        options[key] = {value: param.default, source: "default"}
    }

    return options
  }

  /**
   * Validate the ConfigurationParameters object. This is a sanity check to
   * ensure that the ConfigurationParameters object is valid.
   *
   * @returns {string[]} Errors
   */
  #validateConfigurationParameters() {
    const errors = []

    for(const [key, param] of Object.entries(ConfigurationParameters)) {
      // Type
      if(!param.type) {
        errors.push(`Option \`${key}\` has no type`)
        continue
      }

      // Paths
      if(param.subtype?.path) {
        const pathType = param.subtype.path?.type

        // Check if pathType is defined
        if(!pathType)
          errors.push(`Option \`${key}\` has no path type`)

        // Check if pathType is a valid key in FdTypes
        if(!fdTypes.includes(pathType))
          errors.push(`Option \`${key}\` has invalid path type: ${pathType}`)
      }
    }

    return errors
  }

  /**
   * Find all options from all sources
   *
   * @param {object} entryOptions - The command line options.
   * @returns {Promise<object[]>} All options from all sources.
   */
  #findAllOptions(entryOptions) {
    const allOptions = []
    const environmentVariables = this.#getEnvironmentVariables()
    if(environmentVariables)
      allOptions.push({source: "environment", options: environmentVariables})

    const packageJson = entryOptions?.packageJson
    if(packageJson) {
      allOptions.push({source: "packageJson", options: packageJson})
    } else {
      const packageJsonFile = composeFilename(process.cwd(), "package.json")
      if(fileExists(packageJsonFile)) {
        const packageJson = loadJson(packageJsonFile)

        if(packageJson.bedoc)
          allOptions.push({source: "packageJson", options: packageJson.bedoc})
      }
    }

    // Then the config file, if the options specified a config file
    const useConfig =
      entryOptions?.config ||
      packageJson?.config ||
      environmentVariables?.config

    if(useConfig) {
      const configFile =
        packageJson?.config
          ? resolveFilename(packageJson?.config)
          : entryOptions.config?.value
            ? resolveFilename(entryOptions.config.value)
            : null

      if(!configFile)
        throw new Error("No config file specified")

      const config = loadJson(configFile)

      allOptions.push({source: "config", options: config})
    }

    allOptions.push({source: "entry", options: entryOptions})

    return allOptions
  }

  /**
   * Get environment variables
   *
   * @returns {object} Environment variables
   */
  #getEnvironmentVariables() {
    const environmentVariables = {}
    const params = Object.keys(ConfigurationParameters).map(param => {
      return {
        param,
        env: `bedoc_${param}`.toUpperCase(),
      }
    })

    for(const param of params) {
      if(process.env[param.env])
        environmentVariables[param.param] = process.env[param.env]
    }

    return environmentVariables
  }

  /**
   * Merge all options into one object
   *
   * @param {object[]} allOptions - All options from all sources.
   * @returns {Promise<object>} The merged options.
   */
  async #mergeOptions(allOptions) {
    const entryIndex = allOptions.findIndex(
      option => option.source && option.source === "entry",
    )
    const entryOptions = allOptions[entryIndex].options
    const nonEntryOptions = allOptions.filter(
      option => option.source && option.source !== "entry",
    )
    const optionsOnly = nonEntryOptions.map(option => option.options)
    const mergedOptions = optionsOnly.reduce((acc, options) => {
      for(const [key, value] of Object.entries(options))
        acc[key] = value

      return acc
    }, {})

    const mappedOptions = await mapObject(mergedOptions, (option, value) => {
      const {value: entryValue, source: entrySource} = entryOptions[option] ?? {
        value: undefined,
        source: undefined,
      }

      const entryDefaulted = entrySource === "default"

      if(entryValue && value !== entryValue)
        return entryDefaulted ? value : entryValue

      return value
    })

    // Last, but not least, add any defaulted options that are not in the
    // mapped options
    for(const [key, value] of Object.entries(entryOptions ?? {})) {
      if(!mappedOptions[key]) {
        if(value.source)
          mappedOptions[key] = value.value
      } else {
        if(value.source !== "default")
          mappedOptions[key] = value.value
      }
    }

    return mappedOptions
  }

  /**
   * Fix option values. This operation is performed in place.
   *
   * @param {object} options - The options to fix.
   */
  #fixOptionValues(options) {
    for(const [key, param] of Object.entries(ConfigurationParameters)) {
      // If the options passed includes this configuration parameter
      if(options[key]) {
        if(typeof options[key] === "string" && param.type !== "string") {
          switch(param.type.toString()) {
            case "boolean":
            case "number":
              options[key] = JSON5.parse(options[key])
              break
          }
        }
      }
    }
  }
}
