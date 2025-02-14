import console from "node:console"
import chokidar from "chokidar"
import {exec} from "child_process"
import path from "node:path"
import process from "node:process"

// Directory to watch
const watchDirectory = "./source/"

// Initialize file watcher
const watcher = chokidar.watch(watchDirectory, {
  ignored: /(^|[/\\])\../, // Ignore dotfiles
  persistent: true,
})

console.log(`Watching directory: ${watchDirectory}`)
const standardOptions = [
  "--debug",
  "--debugLevel",
  "1",
  "--output",
  "./examples/output/wikitext",
  "--language",
  "lpc",
  "--format",
  "wikitext",
  "--hooks",
  "examples/hooks/lpc-wikitext-hooks-with-upload.js",
  "--maxConcurrent",
  "50"
]

// Process files on change
const processFile = (path, event) => {
  console.log(`File ${event}: ${path}`)
  exec(`cd ../.. && bedoc ${standardOptions.join(" ")} --input "${path}"`, (error, stdout, stderr) => {
    if(error) {
      console.error(`Error processing file ${path}:`, error.message)
      return
    }

    console.log(`Processed ${path} successfully${stdout? `:\n${stdout}`: "."}`)

    if(stderr)
      console.warn(`Warnings:\n${stderr}`)
  })
}

// Event Handlers
watcher
  .on("add", filePath => processFile(path.resolve(process.cwd(), filePath), "added"))
  .on("change", filePath => processFile(path.resolve(process.cwd(), filePath), "modified"))
  .on("unlink", filePath => console.log(`File removed: ${filePath}`))

// Handle errors
watcher.on("error", error => console.error(`Watcher error: ${error}`))
