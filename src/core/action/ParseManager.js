import ActionManager from "../ActionManager.js"

export default class ParseManager extends ActionManager {
  constructor(actionDefinition, logger) {
    super(actionDefinition, logger)
  }

  async parse(fileMap, content) {
    const log = this.log
    const debug = log.newDebug()

    debug("Parsing file `%j`", 3, fileMap)

    if(this.action.init)
      this.action.init({parent: this, log})

    if(!this.action.parse)
      throw new Error(`No parse function found for action: ${this.module}`)

    const result = await this.action.parse(fileMap.path, content)

    debug("Parse complete of file `%j`", 3, fileMap)

    return result
  }
}
