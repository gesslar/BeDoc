import JSON5 from "json5"
import yaml from "yaml"

import ContractUtil from "./util/ContractUtil.js"
import {Data, FileObject, Glog, Util} from "@gesslar/toolkit"

const refex = /^ref:\/\/(.*)$/

export default class ContractManager {
  static async newContract(actionType, terms) {
    // Load and validate against the BeDoc contract schema
    const schema = await ContractUtil.loadSchema()
    const validator = ContractUtil.getValidator(schema)
    const valid = validator(terms)

    if(!valid) {
      const error = ContractManager.reportValidationErrors(validator.errors)

      throw new Error(`Invalid contract terms:\n${error}`)
    }

    const dataValidator = ContractUtil.getValidator({
      "$schema": "http://json-schema.org/draft-07/schema#",
      "$id": `${actionType} Schema`,
      title: `${actionType} Schema`,
      type: "object",
      properties: terms,
    })

    return new Contract(dataValidator)
  }

  /**
   *
   *if(typeof contractData === "string") {
   *const match = refex.exec(contractData)
   *
   *if(match)
   *contractData = readFile(resolveFilename(match[1], directoryObject))
   *
   *return yaml.parse(String(contractData))
   *}
   *
   *throw new Error(`Invalid contract data: ${JSON5.stringify(contractData)}`)
   *
   * @param contractData
   * @param directoryObject
   */

  static async parse(contractData, directoryObject) {
    Glog(contractData)

    if(Data.isBaseType(contractData, "string")) {
      const match = refex.exec(contractData)

      if(match)
        return await (new FileObject(match[1], directoryObject))
          .loadData()

      return yaml.parse(contractData)
    }

    throw new Error(`Invalid contract data: ${JSON5.stringify(contractData)}`)
  }

  static reportValidationErrors(errors) {
    return errors.reduce((acc, error) => {
      let msg = `- "${error.instancePath || "(root)"}" ${error.message}`

      if(error.params) {
        const details = []

        if(error.params.type)
          details.push(`  ➜ Expected type: ${error.params.type}`)

        if(error.params.missingProperty)
          details.push(`  ➜ Missing required fielisd: ${error.params.missingProperty}`)

        if(error.params.allowedValues) {
          details.push(`  ➜ Allowed values: "${error.params.allowedValues.join('", "')}"`)
          details.push(`  ➜ Received value: "${error.data}"`)
          const closestMatch =
            Util.findClosestMatch(error.data, error.params.allowedValues)

          if(closestMatch)
            details.push(`  ➜ Did you mean: "${closestMatch}"?`)
        }

        if(error.params.pattern)
          details.push(`  ➜ Expected pattern: ${error.params.pattern}`)

        if(error.params.format)
          details.push(`  ➜ Expected format: ${error.params.format}`)

        if(error.params.additionalProperty)
          details.push(`  ➜ Unexpected property: ${error.params.additionalProperty}`)

        if(details.length)
          msg += `\n${details.join("\n")}`
      }

      return acc ? `${acc}\n${msg}` : msg
    }, "")
  }
}

class Contract {
  #validator = null

  constructor(validator) {
    this.#validator = validator
  }

  get validator() {
    return this.#validator
  }

  validate(data) {
    const validator = this.validator
    const valid = validator(data)

    if(!valid) {
      const error = ContractManager.reportValidationErrors(validator.errors)

      throw new Error(`This document violates the agreed upon contract:\n${error}`)
    }
  }
}
