import {process} from "node:process"
import DataUtil from "./util/DataUtil.js"
import FDUtil from "./util/FDUtil.js"
import ModuleUtil from "./util/ModuleUtil.js"
import { ConfigurationParameters, ConfigurationPriorityKeys } from "./ConfigurationParameters.js"
import { FdType, FdTypes } from "./include/FD.js"
import ValidUtil from "./util/ValidUtil.js"

Object.prototype.insert = obj => {
  for(const [key, value] of Object.entries(obj))this[key] = value
}

export class ConfigurationValidator {
  async validate(options) {
    const finalOptions = {}
    const {nothing} = DataUtil
    const {type: atype} = ValidUtil

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
        `ConfigurationParameters validation errors: ${configValidationErrors.join(", ")}`
      )

    const allOptions = await this.#findAllOptions(options)
    Object.assign(finalOptions, await this.#mergeOptions(allOptions))
    this.#fixOptionValues(finalOptions)

    // Priority keys are those which must be processed first. They are
    // specified in order of priority.
    // Find them and add them to an array; the rest will be in pushed
    // to the end of the priority array.
    const orderedSections = []
    ConfigurationPriorityKeys.forEach(key => {
      if(!ConfigurationParameters[key])
        throw new Error(`Invalid priority key: ${key}`)

      if(finalOptions[key])
        orderedSections.push({ key, value: finalOptions[key] })
    })

    const remainingSections = Object.keys(ConfigurationParameters)
      .filter(key => !ConfigurationPriorityKeys.includes(key))
    orderedSections.push(...remainingSections.map(key => {
      return { key, value: finalOptions[key] }
    }))

    // Check exclusive options
    for(const [key, param] of Object.entries(ConfigurationParameters)) {
      if(param.exclusiveOf && finalOptions[key] &&
         finalOptions[param.exclusiveOf])
        throw new SyntaxError(`Options \`${key}\` and \`${param.exclusiveOf}\` are mutually exclusive`)
    }

    for(const section of orderedSections) {
      const {key} = section

      // Skipping config, we've already handled it
      if(key === "config")
        continue

      let {value} = section
      const isNothing = nothing(value)
      const param = ConfigurationParameters[key]
      const {type, required, path} = param

      if(isNothing) {
        if(required === true)
          throw new SyntaxError(`Option \`${key}\` is required`)
        else
          continue
      }

      atype(value, type, {allowEmpty: !required})

      // Additional path validation if needed
      if(path && !isNothing) {
        const {mustExist, type: pathType} = path

        // Special for `input` and `exclude` because they can be a comma-
        // separated list of glob patterns.
        if(key === "input" || key === "exclude") {
          if(DataUtil.type(value, "array"))
            value = await Promise.all(value.map(pattern =>
              FDUtil.getFiles(pattern))
            )
          else if(DataUtil.type(value, "string"))
            value = await FDUtil.getFiles(value)
          else
            throw new TypeError(`Option \`${key}\` must be a string or an array of strings`)

          finalOptions[key] = value.flat()
          continue
        } else {
          if(mustExist === true) {
            finalOptions[key] = pathType === FdType.FILE ?
              await FDUtil.resolveFilename(value) :
              await FDUtil.resolveDirectory(value)
          }
        }
      }
    }

    return {
      status: "success",
      validated: true,
      ...finalOptions
    }
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
        if(!(FdTypes.includes(pathType)))
          errors.push(`Option \`${key}\` has invalid path type: ${pathType}`)
      }
    }

    return errors
  }

  /**
   * Find all options from all sources
   *
   * @param {object} cliOptions
   * @returns {Promise<object[]>}
   */
  async #findAllOptions(cliOptions) {
    const allOptions = []

    const environmentVariables = this.#getEnvironmentVariables()
    if(environmentVariables)
      allOptions.push({ source: "environment", options: environmentVariables })

    const packageJson = await FDUtil.resolveFilename("./package.json")
    const packageJsonOptions = await ModuleUtil.loadJson(packageJson)
    if(packageJsonOptions.bedoc)
      allOptions.push({ source: "packageJson", options: packageJsonOptions.bedoc })

    // Then the config file, if the options specified a config file
    const useConfig = cliOptions.config
      || packageJsonOptions?.bedoc?.config
      || environmentVariables?.config

    if(useConfig) {
      const configFilename = packageJsonOptions?.bedoc?.config
        || cliOptions.config

      if(!configFilename)
        throw new Error("No config file specified")

      const configFile = await FDUtil.resolveFilename(configFilename)
      const config = await ModuleUtil.loadJson(configFile)
      allOptions.push({ source: "config", options: config })
    }

    allOptions.push({ source: "cli", options: cliOptions })

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
        env: `bedoc_${param}`.toUpperCase()
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
   * @param {object[]} allOptions
   * @returns {Promise<object>}
   */
  async #mergeOptions(allOptions) {
    const cliIndex = allOptions.findIndex(option => option.source && option.source === "cli")
    const cliOptions = allOptions[cliIndex].options
    const rest = allOptions.filter(option => option.source && option.source !== "cli")
    const optionsOnly = rest.map(option => option.options)
    const mergedOptions = optionsOnly.reduce((acc, options) => {
      for(const [key, value] of Object.entries(options))
        acc[key] = value

      return acc
    }, {})

    return await DataUtil.mapObject(mergedOptions, (option, value) => {
      const { value: cliValue, source: cliSource } =
        cliOptions[option]
        ?? { value: undefined, source: undefined }

      const cliDefaulted = cliSource === "default"

      if(cliValue && value !== cliValue)
        return cliDefaulted ? value : cliValue

      return value
    })
  }

  /**
   * Fix option values. This operation is performed in place.
   *
   * @param {object} options
   */
  #fixOptionValues(options) {
    for(const [key, param] of Object.entries(ConfigurationParameters)) {
      // If the options passed includes this configuration parameter
      if(options[key]) {
        // TODO: FILLER UNTIL FIXED TO SATISFY LINTER
        // If the parameter is a boolean, convert the string to a boolean
        if(param.type === "boolean") {
          options[key] = options[key] === "true"
        }
      }
    }
  }
}
