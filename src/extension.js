const vscode = require('vscode');
const { generateDocs } = require('./core/core');

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('bedoc.generate', async() => {
      const editor = vscode.window.activeTextEditor;
      if(!editor) {
        vscode.window.showErrorMessage('No file open');
        return;
      }

      const content = editor.document.getText();
      const language = editor.document.languageId;
      const format = 'markdown'; // Default format for now

      try {
        const output = await generateDocs(language, format, content);
        vscode.window.showInformationMessage('Documentation generated!');
      } catch(err) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
      }
    })
  );
}

module.exports = { activate };
