import {ActionManager} from "#core"

export class ParseManager extends ActionManager {
  constructor(actionDefinition, logger) {
    super(actionDefinition, logger)
  }

  async parse(...arg) {
    const log = this.log
    const debug = log.newDebug()

    debug("Parsing data", 2)

    if(this.action.init)
      this.action.init({parent: this, log})

    if(!this.action.parse)
      throw new Error(`No parse function found for action: ${this.module}`)

    const result = await this.action.parse(...arg)

    debug("Parse complete", 2)

    return result
  }
}
