import ActionManager from "../ActionManager.js"

export default class PrintManager extends ActionManager {
  constructor(actionDefinition, logger) {
    super(actionDefinition, logger)
  }

  async print(fileMap, content) {
    const log = this.log
    const debug = log.newDebug()

    debug("Printing data for `%s`", 3, fileMap.module)

    if(this.action.init)
      this.action.init({parent: this, log})

    if(!this.action.print)
      throw new Error(`No print function found for action: ${this.module}`)

    const result = await this.action.print(fileMap.module, content)

    debug("Print complete for `%s`", 3, fileMap.module)

    return result
  }
}
