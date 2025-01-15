// TODO: Implement the extension
const {require} = import.meta

const vscode = require("vscode")

/**
 *
 * @param context
 */
function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("bedoc.generate", async() => {
      const editor = vscode.window.activeTextEditor
      if(!editor) {
        vscode.window.showErrorMessage("No file open")
        return
      }

      // const content = editor.document.getText()
      // const language = editor.document.languageId
      // const format = "markdown" // Default format for now

      try {
        // TODO: Do something with the output
        // const output = await generateDocs(language, format, content)
        vscode.window.showInformationMessage("Documentation generated!")
      } catch(err) {
        vscode.window.showErrorMessage(`Error: ${err.message}`)
      }
    })
  )
}

export default { activate }
