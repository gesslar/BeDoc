import axios from "axios"
import FormData from "form-data"
import console from "node:console"

class MediaWikiBot {
  constructor(config) {
    this.baseUrl = config.baseUrl
    this.botUsername = config.botUsername
    this.botPassword = config.botPassword
    this.token = null

    // Create axios instance with cookie handling
    this.client = axios.create()
    this.cookies = []

    // Store cookies from responses
    this.client.interceptors.response.use(response => {
      const setCookie = response.headers["set-cookie"]
      if(setCookie)
        this.cookies = setCookie

      return response
    })

    // Add cookies to requests
    this.client.interceptors.request.use(config => {
      if(this.cookies.length > 0)
        config.headers.Cookie = this.cookies.join("; ")

      return config
    })
  }

  async login() {
    try {
      // First request to get login token
      const loginTokenResponse = await this.client.get(`${this.baseUrl}/api.php`, {
        params: {
          action: "query",
          meta: "tokens",
          type: "login",
          format: "json"
        }
      })

      const loginToken = loginTokenResponse.data.query.tokens.logintoken

      // Now login with the token
      const formData = new FormData()
      formData.append("action", "login")
      formData.append("lgname", this.botUsername)
      formData.append("lgpassword", this.botPassword)
      formData.append("lgtoken", loginToken)
      formData.append("format", "json")

      const loginResponse = await this.client.post(`${this.baseUrl}/api.php`, formData, {
        headers: formData.getHeaders()
      })

      if(loginResponse.data.login.result !== "Success")
        throw new Error(`Login failed: ${loginResponse.data.login.reason || "Unknown error"}`)

      // Get edit token
      const editTokenResponse = await this.client.get(`${this.baseUrl}/api.php`, {
        params: {
          action: "query",
          meta: "tokens",
          format: "json"
        }
      })

      this.token = editTokenResponse.data.query.tokens.csrftoken

      return true
    } catch(error) {
      if(error.response)
        console.error("Response data:", error.response.data)

      throw error
    }
  }

  async createOrEditPage(title, content, summary = "Bot edit") {
    if(!this.token)
      throw new Error("Not logged in. Call login() first.")

    const formData = new FormData()
    formData.append("action", "edit")
    formData.append("title", title)
    formData.append("text", content)
    formData.append("token", this.token)
    formData.append("format", "json")
    formData.append("summary", summary)
    formData.append("bot", "true")
    formData.append("contentmodel", "wikitext")


    const response = await this.client.post(`${this.baseUrl}/api.php`, formData, {
      headers: formData.getHeaders()
    })

    if(response.data.edit && response.data.edit.result === "Success") {
      return {
        success: true,
        result: response.data.edit
      }
    } else {
      throw new Error(`Edit failed: ${JSON.stringify(response.data)}`)
    }
  } catch(error) {
    console.error("Edit error:", error.message)

    if(error.response)
      console.error("Response data:", error.response.data)

    throw error
  }
}

export default MediaWikiBot
