import ActionManager from "../ActionManager.js"

export default class PrintManager extends ActionManager {
  constructor(actionDefinition, logger) {
    super(actionDefinition, logger)
  }

  async print(...arg) {
    const log = this.log
    const debug = log.newDebug()

    debug("Printing data", 2)

    if(this.action.init)
      this.action.init({parent: this, log})

    if(!this.action.print)
      throw new Error(`No print function found for action: ${this.module}`)

    const result = await this.action.print(...arg)

    debug("Print complete", 2)

    return result
  }
}
