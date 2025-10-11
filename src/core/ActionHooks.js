import Hooks from "./abstracted/Hooks.js"

export default class ActionHooks extends Hooks {
  constructor({actionKind, hooksFile, timeOut: timeout}, debug) {
    // Pass BeDoc-specific hook events as allowed events
    super({actionKind,hooksFile,timeOut: timeout ?? 1}, debug)
  }
}
