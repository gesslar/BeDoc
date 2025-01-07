import DataUtil from "./util/DataUtil.js"

/**
 * A module contract is a contract that a module must implement, describing
 * what it provides or requires.
 */

export default class ModuleContract {
  constructor(core) {
    this.core = core
  }

  /**
   * Check if the module satisfies the contract
   *
   * @returns {boolean}
   */
  satisfies = (provides, accepts) => {
    const providerName = provides.constructor.name
    const receiverName = accepts.constructor.name

    const providerContract = provides?.meta?.contract?.provides
    const receiverContract = accepts?.meta?.contract?.accepts

    if(!providerContract)
      throw new Error(`Provides contract is not defined in ${providerName}`)
    if(!receiverContract)
      throw new Error(`Accepts contract is not defined in ${receiverName}`)

    this._sanityCheck(providerContract)
    this._sanityCheck(receiverContract)

    return this._negotiate(providerContract, receiverContract)
  }

  _negotiate = (provides, accepts) => {
    const errors = []

    for(const [key, value] of Object.entries(accepts)) {
      if(value.required) {
        if(!provides[key]) {
          errors.push(`Missing required key: ${key}`)
          continue
        }
      }

      const acceptsDataType = DataUtil.typeSpec(value.dataType)
      const providesDataType = DataUtil.typeSpec(provides[key].dataType)

      if(acceptsDataType.typeName !== providesDataType.typeName ||
         acceptsDataType.isArray !== providesDataType.isArray) {
        errors.push(`Data type mismatch for ${key}: ${acceptsDataType.typeName} !== ${providesDataType.typeName}`)
        continue
      }

      if(value.contains) {
        const result = this._negotiate(provides[key], value.contains)
        if(!result.success)
          return { success: false, errors: [...errors, ...result.errors] }
      }
    }

    return { success: true, errors }
  }

  _sanityCheck = (contract) => {
    for(const [key, value] of Object.entries(contract)) {
      if(!"dataType" in value)
        throw new Error(`Missing dataType for ${key}`)
      if(value.contains)
        this._sanityCheck(value.contains)
    }
  }
}
