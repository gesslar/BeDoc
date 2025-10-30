import process from "node:process"
import {setTimeout as timeoutPromise} from "node:timers/promises"
import "dotenv/config"
import MediaWikiUploader from "./mediawiki-uploader.js"

class print {
  static meta = Object.freeze({
    name: "lpc-wikitext-with-upload.print.hooks",
    kind: this.constructor.name,
  })

  #debug
  #log
  #baseUrl
  #botUsername
  #botPassword
  #retryCount = new Map()

  constructor({debug, log}) {
    this.#debug = debug
    this.#log = log

    const {BASE_URL, BOT_USERNAME, BOT_PASSWORD} = process.env
    this.#baseUrl = BASE_URL
    this.#botUsername = BOT_USERNAME
    this.#botPassword = BOT_PASSWORD

    this.#debug("Init hooks for: %o", 2, print.meta.name)
  }

  async before$render(context) {
    const {value} = context
    const next = value.remaining[0]

    if(!next)
      return

    // Trim leading and trailing empty lines from description
    if(next.description) {
      const content = next.description
      while(content.length && !content.at(0))
        content.shift()

      while(content.length && !content.at(-1))
        content.pop()
    }
  }

  /**
   * Processes output at the end, converting syntax highlighting and uploading to MediaWiki.
   * @param {object} context - The context containing module name and content
   * @returns {Promise<void>}
   */
  async after$finalise(context) {
    const {moduleName, destContent} = context
    const count = this.#retryCount.get(moduleName) ?? 0

    const wikitext = destContent
      .replace(
        /```c\n([\s\S]+?)```/g,
        '<syntaxhighlight lang="c">\n$1</syntaxhighlight>\n',
      ) + "\n{{sefun}}\n"

    context.destContent = wikitext

    // Upload to MediaWiki
    const bot = new MediaWikiUploader()
    if(!bot)
      throw new Error("MediaWiki bot not instantiated.")

    if(count > 0)
      this.#log.info(`Retrying \`${moduleName}\` #${count}...`)

    try {
      const loginResult = await bot.login({
        baseUrl: this.#baseUrl,
        botUsername: this.#botUsername,
        botPassword: this.#botPassword
      })

      if(loginResult.status === "error")
        throw loginResult.error

      const request = {
        token: loginResult.token,
        title: moduleName,
        content: wikitext
      }

      const editResult = await bot.createOrEditPage(request)

      if(editResult.status === "error") {
        const data = JSON.parse(editResult.error.message)
        const secs = 10 + (count * 2)

        if(data?.error?.code) {
          if(data.error.code === "ratelimited") {
            this.#log.warn(`Rate limited for \`${moduleName}\`. Trying again in ${secs} seconds.`)

            await timeoutPromise(secs * 1_000)
            this.#retryCount.set(moduleName, count + 1)
            return this.after$finalise(context)
          } else {
            throw new Error(`Error uploading \`${moduleName}\`: ${data.error.info}`)
          }
        }
      }

      const {title, oldrevid} = editResult.result
      const sanitizedUrl =
        `${this.#baseUrl}/index.php?title=${encodeURIComponent(title)}`
      if(oldrevid !== undefined) {
        if(oldrevid === 0) {
          this.#log.info(`Page created successfully: '${sanitizedUrl}'`)
        } else {
          this.#log.info(`Page edited successfully: '${sanitizedUrl}'`)
        }
      } else {
        this.#log.info(`No change was made to page '${sanitizedUrl}'`)
      }

      // Clear retry count on success
      this.#retryCount.delete(moduleName)
    } catch(error) {
      this.#log.error(`Error creating/editing page: ${error.message}`)
    }
  }
}

export {print}
