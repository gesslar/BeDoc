import process from "node:process"
import "dotenv/config"
import MediaWikiBot from "./mediawiki-bot.js"

export const Hooks = {
  parse: {},

  print: {
    async setup({log}) {
      try {
        this.log = log
        this.debug = log.newDebug()

        const {BASE_URL,BOT_USERNAME,BOT_PASSWORD} = process.env
        this.baseUrl = BASE_URL

        this.log.debug("Init hooks for: %o", 2, this)

        const bot = new MediaWikiBot({
          baseUrl: BASE_URL,
          botUsername: BOT_USERNAME,
          botPassword: BOT_PASSWORD
        })

        const login = await bot.login()
        if(!login)
          throw new Error("Failed to login to MediaWiki")

        this.bot = bot

      } catch(error) {
        log.error("Error initializing hooks: %o", error)
      }
    },

    async cleanup() {
      // Clean up
      this.bot = null
    },

    async end({module, output}) {
      const info = (...arg) => this.log.info(...arg)

      const wikitext = output
        .replace(
          /```c\n([\s\S]+?)```/g,
          '<syntaxhighlight lang="c">\n$1</syntaxhighlight>\n',
        )

      if(!this.bot)
        throw new Error("MediaWiki bot not initialized")

      try {
        const edit = await this.bot.createOrEditPage(
          module,
          wikitext
        )

        const {title,oldrevid} = edit.result
        if(oldrevid !== undefined) {
          if(oldrevid === 0) {
            info(`Page created successfully ${this.baseUrl}/index.php?title=${title}`)
          } else {
            info(`Page edited successfully ${this.baseUrl}/index.php?title=${title}`)
          }
        } else {
          info(`No change was made to page ${this.baseUrl}/index.php?title=${title}`)
        }
      } catch(error) {
        this.log.error(`Error creating/editing page: ${error.message}`, error.stack)
      }

      return wikitext
    },
  },
}
