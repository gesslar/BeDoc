import console from "node:console"
import chokidar from "chokidar"
import BeDoc, {Environment} from "../../src/core/Core.js"

// Directory to watch
const watchDirectory = "./source/"

// BeDoc configuration
const bedocOptions = {
  output: "../output/wikitext/",
  language: "lpc",
  format: "wikitext",
  hooks: "./hooks/lpc-wikitext-hooks.js",
  maxConcurrent: 5
}

// Initialize file watcher
const watcher = chokidar.watch(watchDirectory, {
  ignored: /(^|[/\\])\../, // Ignore dotfiles
  persistent: true,
})

console.log(`Watching directory: ${watchDirectory}`)

// Process files on change
const processFile = async(filePath, event) => {
  console.log(`File ${event}: ${filePath}`)

  try {
    // Initialize BeDoc Core instance
    const options = Object.assign({},
      bedocOptions,
      {input: [filePath]}
    )
    const bedoc = await BeDoc.new({
      options, source: Environment.NPM
    })
    const result = await bedoc.processFiles(filePath)

    for(const {output} of result.succeeded)
      console.log("[OK] `%s`", output.path)

    for(const {input, error} of result.errored)
      console.error("[ERROR] `%s`: %s", input.path, error.message)

  } catch(error) {
    console.error(`[ERROR] Error processing file ${filePath}:`, error.message)
  }
}

// Event Handlers
watcher
  .on("add", path => processFile(path, "added"))
  .on("change", path => processFile(path, "modified"))
  .on("unlink", path => console.log(`File removed: ${path}`))

// Handle errors
watcher.on("error", error => console.error(`Watcher error: ${error}`))
