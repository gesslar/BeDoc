import process, {exit} from "node:process"
import "dotenv/config"
import MediaWikiBot from "./mediawiki-bot.js"

export const Hooks = {
  parse: {},

  print: {
    async end({module, _content, output}) {
      const toc = "{{TOC right|limit=1}}\n\n"
      const wikitext = toc + output
        .replace(
          /```c\n([\s\S]+?)```/g,
          '<syntaxhighlight lang="c">\n$1</syntaxhighlight>\n',
        )

      const {BASE_URL,BOT_USERNAME,BOT_PASSWORD} = process.env

      const wikiBot = new MediaWikiBot({
        baseUrl: BASE_URL,
        botUsername: BOT_USERNAME,
        botPassword: BOT_PASSWORD
      })

      try {
        await wikiBot.login()
        const result = await wikiBot.createOrEditPage(
          module,
          wikitext
        )
        this.log.info(`Page created/edited successfully ${BASE_URL}/index.php?title=${result.title}`)
      } catch(error) {
        this.log.error(`Error creating/editing page: ${error.message}`)
      }

      return wikitext
    },
  },
}
