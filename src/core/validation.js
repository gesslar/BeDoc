import ValidUtil from "./util/valid.js" ;
import FDUtil from "./util/fd.js" ;
import ModuleUtil from "./util/module.js" ;
import { ConfigurationParameters }from "./configuration.js" ;
import { FD_TYPES }from "./include/fd.js" ;

const fd = new FDUtil() ;

export class ConfigValidator {
  static async validate(options) {
    const errors = [] ;

    // Load config file if specified
    if(options.config) {
      const configFile = await fd.resolveFile(options.config) ;
      const config = ModuleUtil.require(configFile.path) ;
      options = { ...options, ...config } ;
      options.config = configFile ; // Store full FileMap
    }

    // Check exclusive options
    for(const [key, param]of Object.entries(ConfigurationParameters)) {
      if(param.exclusiveOf && options[key] && options[param.exclusiveOf])
        errors.push(`Options \`${key}\` and \`${param.exclusiveOf}\` are mutually exclusive`) ;
    }

    // Check type validation and path subtypes
    for(const [key, param]of Object.entries(ConfigurationParameters)) {
      // Skip `config`, it is already resolved
      if(key === "config")
        continue ;

      const match = /^(\w+)(\[\])?$/.exec(param.type) || [null, "", undefined] ;
      const [_, type, isArray] = match ;

      if(isArray) {
        if(!ValidUtil.array(options[key], param.required))
          errors.push(`Option \`${key}\` must be an array${param.required ? " and is required" : ""}`) ;
        else if(options[key] && !ValidUtil.arrayUniform(options[key], type))
          errors.push(`Option \`${key}\` must be an array of \`${type}\``) ;
      } else if(!ValidUtil.type(options[key], type, param.required)) {
        errors.push(`Option \`${key}\` must be of type \`${type}\`${param.required ? " and is required" : ""}`) ;
      }

      // Additional path validation if needed
      if(param.subtype?.path && !ValidUtil.nothing(options[key])) {
        const pathType = param.subtype.path.type ;
        if(pathType !== FD_TYPES.FILE && pathType !== FD_TYPES.DIRECTORY) {
          errors.push(`Option \`${key}\` has invalid path type: ${pathType}`) ;
          continue ;
        }

        // Special: Input may be a comma-separated list of glob patterns.
        // If so, split it into an array of strings to be resolved further
        // down.
        if(key === "input" && typeof options[key] === "string") {
          const inputArr = (options[key]).split(",") ;
          if(inputArr.length > 1)
            options[key] = inputArr ;  // Will be resolved to FileMap[] later
        }

        // Handle array paths (like input) vs single paths
        if(key === "input" || isArray) {
          const paths = Array.isArray(options[key]) ? options[key] : [options[key]] ;
          if(key === "input") {
            if(ValidUtil.string(options[key]) || ValidUtil.arrayUniform(options[key], "string")) {
              const patterns = [];
              // If input is a comma-separated list of glob patterns,
              // resolve it to an array of FileMap objects
              const value = options[key] ;
              if(typeof value === "string") {
                patterns.push(...value.split(","));
              } else if(ValidUtil.arrayUniform(value, "string")) {
                patterns.push(...value);
              }
              options[key] = await fd.getFiles(patterns);
            } else {
              errors.push(`Option \`${key}\` must be a string or an array of strings`) ;
            }
          } else if(param.subtype.path.mustExist) {
            const resolvedPaths = await Promise.all(paths.map(async(path) => {
              return pathType === FD_TYPES.FILE ?
                await fd.resolveFile(path) :
                await fd.resolveDir(path) ;
            })) ;
            options[key] = resolvedPaths ;
          }
        } else if(param.subtype.path.mustExist) {
          options[key] = pathType === FD_TYPES.FILE ?
            await fd.resolveFile(options[key]) :
            await fd.resolveDir(options[key]) ;
        }
      }
    }

    if(errors.length > 0)
      throw new Error(`Configuration validation failed:\n${errors.join("\n")}`) ;

    // Mark options as validated
    options.validated = true ;

    return options ;
  }
}
