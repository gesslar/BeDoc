import ValidUtil from "./util/ValidUtil.js"
import DataUtil from "./util/DataUtil.js"
import FDUtil from "./util/FDUtil.js"
import ModuleUtil from "./util/ModuleUtil.js"
import { ConfigurationParameters, ConfigurationPriorityKeys } from "./ConfigurationParameters.js"
import { FdType, FdTypes } from "./include/FD.js"

export class ConfigurationValidator {
  static async validate(options) {
    const errors = []

    const allOptions = await this._findAllOptions(options)
    const finalOptions = this._mergeOptions(allOptions)
    this._fixOptionValues(finalOptions)


    // While the entry points do wrap the entire process in a try/catch, we
    // should also do this here, so we can trap everything and instead
    // of throwing, return friendly messages back!
    try {
      const configErrors = this._validateConfigurationParameters()
      if(configErrors.length > 0) {
        errors.push(...configErrors)
        return {
          status: "error",
          error: errors.map(ConfigurationValidator._decorateError).join("\n`")
        }
      }

      // Priority keys are those which must be processed first. They are
      // specified in order of priority.
      // Find them and add them to an array; the rest will be in pushed
      // to the end of the priority array.
      const orderedSections = []
      ConfigurationPriorityKeys.forEach(key => {
        if(!ConfigurationParameters[key])
          throw new Error(`Invalid priority key: ${key}`)

        if(finalOptions[key])
          orderedSections.push({key, value: finalOptions[key]})
      })

      const remainingSections = Object.keys(ConfigurationParameters).filter(key => !ConfigurationPriorityKeys.includes(key))
      orderedSections.push(...remainingSections.map(key => {
        return { key, value: finalOptions[key] }
      }))

      // Check exclusive options
      for(const [key, param] of Object.entries(ConfigurationParameters)) {
        if(param.exclusiveOf && finalOptions[key] && finalOptions[param.exclusiveOf])
          errors.push(`Options \`${key}\` and \`${param.exclusiveOf}\` are mutually exclusive`)
      }

      for(const section of orderedSections) {
        const {key} = section

        if(key === "config")
          continue

        let {value} = section
        const param = ConfigurationParameters[key]
        const {type,required,path} = param

        if(!type) {
          // This is required for any validation to work. The ConfigurationParameters
          // object must be valid.
          errors.push(`Option \`${key}\` has no type`)
          break
        }

        if(required === true) {
          if(ValidUtil.nothing(value)) {
            errors.push(`Option \`${key}\` is required`)
            break
          }
        } else {
          if(ValidUtil.nothing(value))
            continue
        }

        const configTypes = DataUtil.typeSpec(type)
        const matched = DataUtil.typeMatch(configTypes, value)
        if(!matched) {
          const valueType = typeof value
          errors.push(`Option \`${key}\` must be of type ${type}, got ${valueType}: ${JSON.stringify(value)}`)
          break
        }

        // Additional path validation if needed
        if(path && !ValidUtil.nothing(value)) {
          const {mustExist, type: pathType} = path

          // Special for `input` because it can be a comma-separated list of
          // glob patterns.
          if(key === "input" || key === "exclude") {
            const array = configTypes.some(type => type.array)
            if(array && ValidUtil.array(value, true)) {
              value = await Promise.all(value.map(pattern => FDUtil.getFiles(pattern)))
            } else {
              value = await FDUtil.getFiles(value)
            }
            finalOptions[key] = value.flat()
            continue
          }

          if(required === true) {
            if(ValidUtil.nothing(value)) {
              errors.push(`Option \`${key}\` is required`)
              break
            }
          }

          if(mustExist === true) {
            finalOptions[key] = pathType === FdType.FILE ?
              await FDUtil.resolveFilename(value) :
              await FDUtil.resolveDirectory(value)
          }
        }
      }
    } catch(e) {
      errors.push(e.message)
    }

    if(errors.length > 0) {
      return {
        status: "error",
        error: errors.map(this._decorateError).join("\n")
      }
    } else {
      return {
        status: "success",
        validated: true,
        ...finalOptions
      }
    }
  }

  /**
   * Validate the ConfigurationParameters object. This is a sanity check to
   * ensure that the ConfigurationParameters object is valid.
   *
   * @returns {Array<string>} Errors
   */
  static _validateConfigurationParameters() {
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

  static _findAllOptions = async options => {
    const allOptions = []

    // First the environment variables
    const environmentVariables = this._getEnvironmentVariables()
    if(environmentVariables)
      allOptions.push({source: "environment", options: environmentVariables})

    // Then the package.json
    const packageJson = await FDUtil.resolveFilename("./package.json")
    const packageJsonOptions = await ModuleUtil.loadJson(packageJson)
    if(packageJsonOptions.bedoc)
      allOptions.push({source: "packageJson", options: packageJsonOptions.bedoc})

    // Then the config file, if the options specified a config file
    const useConfig = options.config || packageJsonOptions?.bedoc?.config || environmentVariables?.config
    if(useConfig) {
      const configFilename = packageJsonOptions?.bedoc?.config || options.config
      if(!configFilename)
        throw new Error("No config file specified")

      const configFile = await FDUtil.resolveFilename(configFilename)
      const config = await ModuleUtil.loadJson(configFile)
      allOptions.push({source: "config", options: config})
    }

    allOptions.push({source: "cli", options})

    return allOptions
  }

  static _mergeOptions = allOptions => {
    const cliIndex = allOptions.findIndex(option => option.source && option.source === "cli")
    const cliOptions = allOptions[cliIndex].options
    const rest = allOptions.filter(option => option.source && option.source !== "cli")
    const optionsOnly = rest.map(option => option.options)
    const mergedOptions = optionsOnly.reduce((acc, options) => {
      for(const [key, value] of Object.entries(options))
        acc[key] = value

      return acc
    }, {})

    return DataUtil.mapObject(mergedOptions, (option, value) => {
      const {value: cliValue, source: cliSource} = cliOptions[option] ?? {value: undefined, source: undefined}
      const cliDefaulted = cliSource === "default"

      if(cliValue && value !== cliValue)
        return cliDefaulted ? value : cliValue

      return value
    })
  }

  static _fixOptionValues(options) {
    for(const [key, param] of Object.entries(ConfigurationParameters)) {
      if(options[key]) {
        const configTypes = DataUtil.typeSpec(param.type)
        const arrayAllowed = Array.isArray(configTypes) ? configTypes.some(type => type.array) : configTypes.array
        const typeNames = Array.isArray(configTypes) ? DataUtil.arrayUnique(configTypes.map(type => type.typeName)) : [configTypes.typeName]

        if(typeNames.length > 1)
          throw new Error(`Option \`${key}\` must be of a single type, got ${typeNames.join(", ")}`)

        const configType = typeNames[0]

        let value = options[key]
        if(typeof value === "string" && arrayAllowed)
          if(/,/.test(value))
            value = value.split(",")

        if(ValidUtil.array(value) && arrayAllowed)
          value = value.map(item => typeof item !== "string" ? JSON.parse(item) : item)
        else
          if(typeof value === "string" && configType !== "string")
            value = JSON.parse(value)

        options[key] = value
      }
    }
  }

  static _getEnvironmentVariables() {
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

  static _decorateError = element => ` • ${element}`
}
