import ValidUtil from "./util/ValidUtil.js"
import FDUtil from "./util/FDUtil.js"
import ModuleUtil from "./util/ModuleUtil.js"
import { ConfigurationParameters } from "./ConfigurationParameters.js"
import { FdTypes } from "./include/fd.js"

export class ConfigValidator {
  static async validate(options) {
    const errors = []

    // File the entry points do wrap the entire process in a try/catch, we
    // should also do this here, so we can trap everything and instead
    // of throwing, return friendly messages back!
    try {
      const configErrors = this._validateConfigurationParameters()
      if(configErrors.length > 0) {
        errors.push(...configErrors)
        return {
          status: "error",
          error: errors.map(ConfigValidator._decorateError).join("\n`")
        }
      }

      // Load config file if specified
      if(options.config) {
        const configFile = await FDUtil.resolveFile(options.config)
        const config = ModuleUtil.require(configFile.path)
        options = { ...options, ...config }
        options.config = configFile  // Store full FileMap
      }

      // Check exclusive options
      for(const [key, param] of Object.entries(ConfigurationParameters)) {
        if(param.exclusiveOf && options[key] && options[param.exclusiveOf])
          errors.push(`Options \`${key}\` and \`${param.exclusiveOf}\` are mutually exclusive`)
      }

      // Check type validation and path subtypes
      for(const [key, param] of Object.entries(ConfigurationParameters)) {
      // Skip `config`, it is already resolved
        if(key === "config")
          continue

        const type = param?.type
        if(!type) {
        // This is required for any validation to work. The ConfigurationParameters
        // object must be valid.
          errors.push(`Option \`${key}\` has no type`)
          break
        }

        // Additional path validation if needed
        if(param.subtype?.path && !ValidUtil.nothing(options[key])) {
          const pathType = param.subtype.path.type

          // Special for `input` because it can be a comma-separated list of
          // glob patterns.
          if(key === "input") {
            const inputString = options[key]

            if(!ValidUtil.string(inputString, true)) {
              errors.push(`Option ${key} must be string.`)
              continue
            }

            const patterns = inputString.split(",")
            options[key] = await FDUtil.getFiles(patterns)
          } else if(param.subtype.path.mustExist) {
            options[key] = pathType === FdTypes.FILE ?
              await FDUtil.resolveFile(options[key]) :
              await FDUtil.resolveDirectory(options[key])
          }
        }
      }
    } catch(e) {
      errors.push(e.message)
    }

    if(errors.length > 0) {
      options = {
        status: "error",
        error: errors.map(this._decorateError).join("\n")
      }
    } else {
      options = {
        status: "success",
        validated: true,
        ...options
      }
    }

    return options
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

  static _decorateError = element => ` • ${element}`
}
