import {Contract, Sass, Schemer, Terms} from "@gesslar/toolkit"

import BeDocSchema from "./BeDocSchema.js"

/**
 * Negotiator orchestrates the discovery and compatibility matching of actions
 * (parsers/printers) within the BeDoc pipeline. It loads action terms,
 * validates them against schemas, and determines compatible pairs based on
 * contract satisfaction.
 *
 * @class Negotiator
 * @exports
 */
export default   class Negotiator {
  static meta = Object.freeze({
    name: "Contract"
  })

  #debug

  setup = ab => ab
    .do("Initialise Discovery", this.#init)
    .do("Load the terms for each action", this.#loadActionTerms)
    .do("Find compatible actions", this.#findCompatibleActions)
    .do("Finalize the result into a single object", this.#finalizeActionObject)

  /**
   * Initialise the Negotiator with the provided value context.
   * Sets up the debug logger for this instance.
   *
   * @private
   * @param {object} value - The context object containing initialization data
   * @returns {Promise<object>} The updated context object
   */
  async #init(value) {
    const {glog} = value

    this.#debug = glog.newDebug(this.constructor.name)

    this.#debug(`${this.constructor.name} initialised`, 2)

    return value
  }

  /**
   * Loads and validates the terms for each discovered action.
   * Attaches terms and contract objects to each action definition.
   *
   * @private
   * @param {object} value - The context object containing discovered actions
   * @returns {Promise<object>} The updated context object with terms/contracts attached
   */
  async #loadActionTerms(value) {
    const {content} = value

    const actionSchema = await BeDocSchema.load(this.#debug)
    const termsValidator = Schemer.getValidator(actionSchema)
    const discoveredActions = content

    this.#debug("Loading terms from actions", 2)

    for(const [_, actionDefs] of Object.entries(discoveredActions)) {
      for(const actionDef of actionDefs) {
        this.#debug("Configuring terms for %o", 2, actionDef.action.name)

        const {terms, contract} = await this.#loadTerms(
          actionDef.action.meta.terms,
          actionDef.file,
          termsValidator,
          this.#debug
        )

        actionDef.terms = terms
        actionDef.contract = contract
        this.#debug("Terms added to %o", 2, actionDef.file.module)
      }
    }

    value.content = discoveredActions

    return value
  }

  /**
   * Loads and parses the terms for a single action, validates them,
   * and constructs a contract instance.
   *
   * @private
   * @param {object|undefined} terms - The terms definition for the action
   * @param {object|undefined} file - The file metadata for the action
   * @param {(value: unknown) => unknown} validator - The schema validator function
   * @param {(...args: unknown[]) => void} [debug] - Optional debug function to use while loading
   * @returns {Promise<{terms: Terms, contract: Contract}>} Parsed terms and contract
   * @throws {Error} If terms parsing or contract creation fails
   */
  async #loadTerms(terms, file, validator, debug) {
    const dbg = debug ?? this.#debug
    try {
      // Parse the terms data (handles ref:// and other formats)
      const parsedTerms = await Terms.parse(terms, file?.directory)

      // Create Terms instance
      const termsInstance = new Terms(parsedTerms)

      // Create Contract from the parsed terms with validation
      const contract = Contract.fromTerms(
        file?.module ?? "Action Terms",
        parsedTerms,
        validator,
        dbg
      )

      return {terms: termsInstance, contract}
    } catch(error) {
      throw Sass.new(`Failed to load terms`, error)
    }
  }

  /**
   * Finds compatible parser/printer pairs based on contract compatibility.
   * Updates the context with arrays of compatible print and parse actions.
   *
   * @private
   * @param {object} value - The context object containing discovered actions
   * @returns {Promise<object>} The updated context object with compatible actions
   */
  async #findCompatibleActions(value) {
    const {content, glog} = value

    const compatibleActions = {print: [], parse: []}

    for(const printer of content.print) {
      this.#debug("Checking %o", 3, printer.file.module)

      const satisfied = []

      for(const parser of content.parse) {
        this.#debug("Checking %o", 3, parser.file.module)

        try {
          // Try to create a contract between printer (provider) and parser (consumer)
          new Contract(printer.terms, parser.terms, {debug: glog.newDebug("Contract")})

          this.#debug("Parser %o compatible with printer %o", 3, parser.file.module, printer.file.module)
          satisfied.push(parser)
        } catch(error) {
          this.#debug("Parser %o incompatible with printer %o: %o", 3, parser.file.module, printer.file.module, error.message)
        }
      }

      if(satisfied.length > 0) {
        compatibleActions.print.push(printer)
        compatibleActions.parse.push(...satisfied)
        this.#debug("Added %o with %o compatible parsers", 2, printer.file.module, satisfied.length)
      } else {
        this.#debug("Printer %o has no compatible parsers", 1, printer.file.module)
      }
    }

    value.content = compatibleActions

    return value
  }

  /**
   * Selects final actions, ensuring exactly one parser and one printer
   *
   * @param {object} value - The context object containing compatible actions
   * @returns {object} Final actions object with print and parse keys
   * @throws {Error} If no matching actions found or multiple matches exist
   */
  #finalizeActionObject(value) {
    const {content} = value
    const finalActions = {}

    for(const [key, value] of Object.entries(content))
      if(value.length === 1)
        finalActions[key] = content[key][0]

    value.content = finalActions

    return value
  }

}
