import {Terms} from "@gesslar/negotiator"
import {Collection, Data, DirectoryObject, FileObject, Promised, Sass} from "@gesslar/toolkit"
import {execSync} from "child_process"

import Action from "./Action.js"
import {Schemer} from "@gesslar/negotiator/browser"

/**
 * @import {Glog} from "@gesslar/toolkit"
 */

export default class Discovery {
  /** @type {Glog} */
  #glog

  #options

  /**
   * Constructor for Discovery.
   *
   * @param {object} arg - Constructor argument
   * @param {object} arg.options - BeDoc options
   * @param {Glog} arg.glog - Glog instance
   */
  constructor({options = {}, glog}) {
    this.#options = options
    this.#glog = glog
  }

  /**
   * Discover actions from local or global node_modules
   *
   * @param {object} [specific] Configuration options for action discovery
   * @param {FileObject} [specific.formatter] Print-related configuration options
   * @param {FileObject} [specific.parser] Parse-related configuration options
   * @param {Function} validateBeDocSchema - The validator function for BeDoc's action schema
   * @returns {Promise<object>} A map of discovered modules
   */
  async discoverActions(specific = {}, validateBeDocSchema) {
    const glog = this.#glog

    glog.debug("Discovering actions", 2)

    glog.debug("Specific modules provided: %o", 2, Object.values(specific).filter(Boolean).length)
    glog.debug("Specific modules provided: %j", 4, specific)

    const files = []
    const options = this.#options

    if(options?.mockPath) {
      glog.debug("Discovering mock actions in %o", 2, options.mockPath)

      files.push(
        ...(await FS.getFiles([
          `${options.mockPath}/bedoc-*-formatter.js`,
          `${options.mockPath}/bedoc-*-parser.js`,
        ])),
      )
    } else {
      glog.debug("Mock path not set, discovering actions in node_modules", 2)

      glog.debug("Looking for actions in project's package.json", 2)
      if(options.project) {
        const exported = (options.project.actions || [])
          .map(m => new FileObject(m, options.basePath))
          .flat()

        glog.debug("Found %o modules in project's package.json", 2, exported.length)
        glog.debug("Found modules in project's package.json: %o", 2, exported)

        files.push(...exported)
      } else {
        glog.debug("No modules found in project's package.json", 2)
      }

      glog.debug("Looking for modules in node_modules (global and locally installed)", 2)
      const directories = [
        execSync("npm root").toString().trim(),
        execSync("npm root -g").toString().trim(),
      ]
        .filter(Boolean)
        .map(d => new DirectoryObject(d))

      const nodeModulesDirs = await Data.asyncFilter(directories, d => d.exists)

      glog.debug("Found %o directories to search for actions", 2, directories.length)

      glog.debug("Directories to search for actions: %o", 4, directories)

      for(const nodeModulesDir of nodeModulesDirs) {
        const dirsToSearch = []
        const {directories: moduleDirs} = await nodeModulesDir.read()

        glog.debug("Found %o directories in %o", 2, moduleDirs.length, nodeModulesDir.path)

        // Handle scoped packages (e.g., @bedoc/something)
        const scopedDirs = moduleDirs.filter(d => d.name.startsWith("@"))

        dirsToSearch.push(...moduleDirs)

        // If we find a scope (e.g., "@bedoc"), look inside it for bedoc modules
        for(const scopedDir of scopedDirs) {
          const {directories: scopedPackages} = await scopedDir.read()

          glog.debug("Found %o directories under scoped package %o", 2, directories.length, scopedDir.name)
          glog.debug("Found directories under scoped package %o\n%o", 2, scopedDir.path, scopedPackages.map(d => d.path))

          dirsToSearch.push(...scopedPackages)
        }

        glog.debug("Found %o directories to search for actions", 2, dirsToSearch.length)
        glog.debug("Found directories to search for actions: %o", 4, dirsToSearch)

        const visibleDirs = dirsToSearch.filter(d => !d.name.startsWith("."))

        for(const dir of visibleDirs) {
          const packageJsonFile = new FileObject("package.json", dir)

          if(!await packageJsonFile.exists)
            continue

          const packageJson = await packageJsonFile.loadData()

          if(!packageJson.bedoc)
            continue

          const {actions} = packageJson.bedoc ?? null

          if(!actions || !Array.isArray(actions))
            continue

          const moduleFileObjects = actions.map(f => new FileObject(f, dir))
          const actionObjects = await Data.asyncFilter(
            moduleFileObjects, f => f.exists)

          glog.debug("Discovered %o modules from package.json file: %o", 2,
            actions.length,
            packageJsonFile.path
          )

          glog.debug("Discovered from package.json files: %o", 3, actions)

          files.push(...actionObjects)
        }
      }
    }

    glog.debug("Discovered %o modules", 2, files.length)
    glog.debug("Discovered modules", 2, files.map(f => f.path))
    glog.debug("Discovered modules %o", 3, files)

    const loaded = await this.#loadActionsAndContracts(files, specific)

    for(const [kind, actions] of Object.entries(loaded)) {
      glog.debug("%o %o", 4, kind, actions)

      for(const {file, terms} of actions) {

        try {
          const isValid = validateBeDocSchema(terms)
          if(!isValid) {
            const {errors} = validateBeDocSchema
            const report = Schemer.reportValidationErrors(errors)

            throw Sass.new(report)
          }

        } catch(error) {
          glog.error(error)

          throw Sass.new(`Validating schema for ${file.path}`, error)
        }
      }
    }

    return loaded
  }

  /**
   * Process the discovered file objects and return the action and their
   * respective contracts.
   *
   * @param {Array<FileObject>} moduleFiles - The module file objects to process
   * @param {{parser: FileObject, formatter: FileObject}} specificModules - The specific modules to load
   * @returns {Promise<object>} The discovered actions
   */
  async #loadActionsAndContracts(moduleFiles, specificModules) {
    const glog = this.#glog

    glog.debug("Loading actions and contracts", 2)
    glog.debug("Loading %o module files", 2, moduleFiles.length)
    glog.debug("Specific modules to load: %o", 4, specificModules)

    const resultActions = await Collection.allocateObject(
      Action.actionTypes,
      Action.actionTypes.map(() => new Array())
    )

    // Tag the specific actions to load, so we can filter them later
    for(const [type, file] of Object.entries(specificModules)) {
      if(file) {
        glog.debug("Tagging specific module `%o` as `%o`", 3, file.path, type)
        file.specificType = file.specificType || []
        file.specificType.push(type)
      }
    }

    const toLoad = [
      ...moduleFiles,
      ...Object.values(specificModules).filter(Boolean),
    ]

    glog.debug("Loading %o discovered modules", 2, toLoad.length)
    glog.debug("Modules to load: %o", 4, toLoad)

    // Load the BeDoc action schema once for validating all contract terms
    // const schemaValidator = await this.#loadSchemaValidator()

    const settledLoading = await Promised.settle(
      toLoad.map(async file => {
        const action = await file.import()

        if(!action.default?.meta)
          return null

        const {terms: actionTerms} = action.default.meta

        const terms = await Terms.parse(actionTerms, file.parent)

        return {file, action, terms}
      })
    )

    if(Promised.hasRejected(settledLoading))
      Promised.throw(settledLoading)

    const loadedActions = Promised.values(settledLoading).filter(Boolean)

    glog.debug("Loaded %o actions", 2, loadedActions.length)
    glog.debug("Loaded actions", 4, loadedActions)

    const filteredActions = []

    for(const actionType of Action.actionTypes) {
      const moduleFile = specificModules[actionType]
      const matchingActions = []

      if(moduleFile) {
        glog.debug("Filtering actions for specific: %o", 2, actionType)
        const found = loadedActions.find(
          e => e.file.specificType?.includes(actionType) &&
               e.action.default.meta.kind === actionType
        )

        if(!found)
          throw Sass.new(`Could not find specific action: ${moduleFile.path}`)

        matchingActions.push(found)
      } else {
        glog.debug("No specific action required for %o", 2, actionType)

        const found = loadedActions.filter(
          e => e.action.default.meta.kind === actionType
        )

        matchingActions.push(...found)
      }

      glog.debug("Filtered %o actions for %o", 2,
        matchingActions.length, actionType
      )

      filteredActions.push(...matchingActions)
    }

    glog.debug("Filtered %o actions", 2, filteredActions.length)
    glog.debug("Filtered actions %o", 4, filteredActions)

    // Now check the metas for validity
    for(const filtered of filteredActions) {
      const {action, terms, file: moduleFile} = filtered
      const {meta} = action.default
      const {kind} = meta

      glog.debug("Checking %o action", 2, kind)

      const isValid = this.#validMeta(kind, {action, terms})

      glog.debug("Meta in action %o in %o is %o", 3,
        kind, moduleFile.module, isValid ? "valid" : "invalid"
      )

      if(isValid) {
        glog.debug("Action is a valid %o action", 3, kind)

        resultActions[kind].push({
          file: moduleFile,
          action,
          terms,
        })
      } else {
        glog.debug("Action is not a valid %o action", 3, kind)
      }

      glog.debug("Processed %o action", 2, kind)
    }

    for(const actionType of Action.actionTypes) {
      const total = resultActions[actionType].length

      glog.debug("Found %o %o actions", 2, total, actionType)
    }

    const total = Object.keys(resultActions).reduce((acc, curr) => {
      return acc + resultActions[curr].length
    }, 0)

    glog.debug("Loaded %o action definitions from %o modules", 2,
      total, moduleFiles.length
    )

    return resultActions
  }

  satisfyCriteria(actions, validatedConfig) {
    const glog = this.#glog

    glog.debug("Available actions to check %o", 4, actions)

    const satisfied = {parser: [], formatter: []}
    const toMatch = {
      // TODO: investigate
      parser: {metaKey: "input", configKey: "language", config: "parser"},
      formatter: {metaKey: "format", configKey: "format", config: "formatter"},
    }

    glog.debug("Satisfying criteria for actions", 2)
    for(const [actionType, search] of Object.entries(toMatch)) {
      glog.debug("Satisfying criteria for %o actions", 2, actionType)

      const {metaKey, configKey, config} = search

      glog.debug("Meta key: %o, Config key: %o", 3, metaKey, configKey)

      // First let's check if we wanted something specific
      if(validatedConfig[config]) {
        glog.debug("Checking for specific %o action", 3, actionType)
        const found = actions[actionType].find(
          a => a.file.specificType.includes(actionType)
        )

        if(found) {
          glog.debug("Found specific %o action", 3, actionType)
          satisfied[actionType].push(found)
          continue
        }

        glog.debug("No specific %o action found", 3, actionType)
      }

      // Hmm! We didn't find anything specific. Let's check the criterion
      glog.debug("Checking for %o actions with meta key %o", 3, actionType, metaKey)
      glog.debug("Validated config to check against: %O", 3, validatedConfig)

      const found = actions[actionType].filter(a => {
        glog.debug("Meta criterion value: %o", 4, a.action.default.meta[metaKey])
        glog.debug("Config criterion value: %o", 4, validatedConfig[configKey])

        return a.action.default.meta[metaKey] === validatedConfig[configKey]
      })
      glog.debug("Found %o %o actions with criterion %o", 3, found.length, actionType, metaKey)

      // Shove them into the result!
      satisfied[actionType].push(...found)

      // That should about cover it!
    }

    return satisfied
  }

  /**
   * Validates the meta requirements for an action
   *
   * @param {string} actionType The action type to validate
   * @param {object} toValidate - The action object to validate
   * @returns {boolean} Whether the action object meets the meta requirements
   */
  #validMeta(actionType, toValidate) {
    const glog = this.#glog

    glog.debug("Checking meta requirements for %o", 3, actionType)

    const requirements = Action.actionMetaRequirements[actionType]

    if(!requirements)
      throw Sass.new(
        `No meta requirements found for action type \`${actionType}\``,
      )

    for(const requirement of requirements) {
      glog.debug("Checking requirement %o", 4, requirement)

      if(Data.isType(requirement, "object")) {
        for(const [key, value] of Object.entries(requirement)) {
          glog.debug("Checking object requirement %o", 4, {key, value})

          if(toValidate.action.default.meta[key] !== value)
            return false

          glog.debug("Requirement met: %o", 4, {key, value})
        }
      } else if(Data.isType(requirement, "string")) {
        glog.debug("Checking string requirement: %o", 4, requirement)

        if(!toValidate.action.default.meta[requirement])
          return false

        glog.debug("Requirement met: %o", 4, requirement)
      }
    }

    return true
  }
}
