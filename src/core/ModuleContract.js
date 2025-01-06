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
  satisfies = (provider) => {
    return true
  }

}
