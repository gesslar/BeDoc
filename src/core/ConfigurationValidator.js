import ValidUtil from "./util/ValidUtil.js"
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

        const types = type.split("|")
        const allTypeMatches = types.map(type => {
          const typeMatches = /(\w+)(\[\])?/.exec(type)
          const [_, theType, theArray] = typeMatches
          const result = {
            type: theType,
            array: theArray === "[]"
          }
          return result
        })

        const valueType = typeof value

        const filteredTypeMatches = allTypeMatches.filter(typeMatch => {
          if(typeMatch.type === valueType)
            return true
          if(typeMatch.array && ValidUtil.array(value, true))
            return true
          return false
        })

        const numTypeMatches = filteredTypeMatches.length
        if(numTypeMatches === 0) {
          errors.push(`Option \`${key}\` must be of type ${types.join("|")}, got ${valueType}`)
          break
        }
        if(numTypeMatches > 1) {
          errors.push(`Option \`${key}\` must be of type ${types.join("|")}, got ${valueType}`)
          break
        }

        const {type: typeName, array: allowArray} = filteredTypeMatches[0]

        // Additional path validation if needed
        if(path && !ValidUtil.nothing(value)) {
          const {mustExist, type: pathType} = path

          // Special for `input` because it can be a comma-separated list of
          // glob patterns.
          if(key === "input" || key === "exclude") {
            if(allowArray && ValidUtil.array(value, true)) {
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

    // First the package.json
    const packageJson = await FDUtil.resolveFilename("./package.json")
    const packageJsonOptions = await ModuleUtil.loadJson(packageJson)
    if(packageJsonOptions.bedoc)
      allOptions.push(packageJsonOptions.bedoc)

    // Then the config file, if the options specified a config file
    if(options.config || packageJsonOptions?.bedoc?.config) {
      const configFilename = packageJsonOptions?.bedoc?.config || options.config
      if(!configFilename)
        throw new Error("No config file specified")

      const configFile = await FDUtil.resolveFilename(configFilename)
      const config = await ModuleUtil.loadJson(configFile)
      allOptions.push(config)
    }

    allOptions.push(options)

    return allOptions
  }

  static _mergeOptions = allOptions => {
    const mergedOptions = allOptions.reduce((acc, options) => {
      return { ...acc, ...options }
    }, {})
    return mergedOptions
  }

  static _fixOptionValues(options) {
    for(const [key, param] of Object.entries(ConfigurationParameters)) {
      if(options[key]) {
        const typeMatches = /(\w+)(\[\])?/.exec(param.type)
        if(!typeMatches || typeMatches.length !== 3)
          throw new Error(`Invalid type: ${param.type}`)

        const [_, typeName, allowArray] = typeMatches

        let value = options[key]
        if(typeof value === "string")
          if(/,/.test(value))
            value = value.split(",")

        if(ValidUtil.array(value))
          value = value.map(item => typeof item !== "string" ? JSON.parse(item) : item)
        else
          if(typeName !== "string")
            value = JSON.parse(value)

        console.log("Final value:", value)
        options[key] = value
      }
    }
  }


  static _decorateError = element => ` • ${element}`
}
