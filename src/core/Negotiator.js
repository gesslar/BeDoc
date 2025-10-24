import {Sass, Schemer, Terms} from "@gesslar/toolkit"

import BeDocSchema from "./BeDocSchema"

export default class Negotiator {
  static meta = Object.freeze({
    name: "Contract"
  })

  // eslint-disable-next-line no-unused-private-class-members
  #config; #debug; #project

  constructor({debug, config, project}) {
    this.#config = config
    this.#debug = debug ?? (() => {})
    this.#project = project
  }

  async #loadActionTerms(context) {
    const debug = context.debug
    const actionSchema = await BeDocSchema.load(debug)
    const termsValidator = Schemer.getValidator(actionSchema)

    for(const [_, actionDef] of Object.entries(context.discoverActions)) {
      for(const action of actionDef) {
        debug("Configuring terms for %o", 2, action.file.module)

        const {terms, contract} = await this.#loadTerms(
          action.action.meta.terms,
          action.file,
          termsValidator,
          debug
        )

        action.terms = terms
        action.contract = contract
        debug("Terms added to %o", 2, action.file.module)
      }
    }

  }

  async #loadTerms(terms, file, validator, debug) {
    try {
      // Parse the terms data (handles ref:// and other formats)
      const parsedTerms = await Terms.parse(terms, file?.directory)

      // Create Terms instance
      const termsInstance = new Terms(parsedTerms)

      // Create Contract from the parsed terms with validation
      const contract = Negotiator.fromTerms(
        file?.module ?? "Action Terms",
        parsedTerms,
        validator,
        debug
      )

      return {terms: termsInstance, contract}
    } catch(error) {
      throw Sass.new(`Failed to load terms`, error)
    }
  }
}
