import fetch, {FormData} from "node-fetch"

class MediaWikiUploader {
  constructor() {}

  async login({baseUrl,botUsername,botPassword}) {
    try {
      // First request to get login token
      // First get the login token
      const loginTokenResponse = await fetch(
        `${baseUrl}/api.php?action=query&meta=tokens&type=login&format=json`
      )

      if(!loginTokenResponse.ok)
        throw new Error(`HTTP error! status: ${loginTokenResponse.status} - ${loginTokenResponse.statusText}`)

      this.updateCookies(loginTokenResponse)
      const loginTokenData = await loginTokenResponse.json()

      // Check if we have the expected data structure
      if(!loginTokenData?.query?.tokens?.logintoken) {
        throw new Error(
          `Invalid login token response structure: ${JSON.stringify(loginTokenData)}`
        )
      }

      const loginToken = loginTokenData.query.tokens.logintoken

      // Login with the token
      const loginFormData = new FormData()
      loginFormData.append("action", "login")
      loginFormData.append("lgname", botUsername)
      loginFormData.append("lgpassword", botPassword)
      loginFormData.append("lgtoken", loginToken)
      loginFormData.append("format", "json")

      const loginResponse = await fetch(`${baseUrl}/api.php`, {
        method: "POST",
        body: loginFormData,
        headers: this.getHeaders()
      })
      this.updateCookies(loginResponse)
      const loginData = await loginResponse.json()

      if(!loginData?.login?.result) {
        throw new Error("Invalid login response structure: " + JSON.stringify(loginData))
      }

      if(loginData.login.result !== "Success") {
        throw new Error(`Login failed: ${loginData.login.reason || "Unknown error"}`)
      }

      // Get edit token
      try {
        const editTokenResponse = await fetch(`${baseUrl}/api.php?action=query&meta=tokens&format=json`, {
          headers: this.getHeaders()
        })
        this.updateCookies(editTokenResponse)
        const editTokenData = await editTokenResponse.json()
        const token = editTokenData.query.tokens.csrftoken

        this.baseUrl = baseUrl

        return {status: "success",token}
      } catch(error) {
        return {
          status: "error",
          error
        }
      }
    } catch(error) {
      return {
        status: "error",
        error
      }
    }
  }

  async createOrEditPage({token,title,content,summary = "Bot edit"}) {
    let response

    try {
      if(!token)
        throw new Error("Not logged in.")

      const formData = new FormData()
      formData.append("action", "edit")
      formData.append("title", title)
      formData.append("text", content)
      formData.append("token", token)
      formData.append("format", "json")
      formData.append("summary", summary)
      formData.append("bot", "true")
      formData.append("contentmodel", "wikitext")

      response = await fetch(`${this.baseUrl}/api.php`, {
        method: "POST",
        body: formData,
        headers: this.getHeaders()
      })
      this.updateCookies(response)
      const data = await response.json()

      if(data.edit && data.edit.result === "Success") {
        return {
          status: "success",
          result: data.edit
        }
      } else {
        throw new Error(JSON.stringify(data))
      }
    } catch(error) {
      return {
        status: "error",
        error
      }
    }
  }

  // Helper method to update cookies from response
  updateCookies(response) {
    const newCookies = response.headers.get("set-cookie")
    if(newCookies) {
      // Split multiple cookies and add them to our cookie store
      this.cookies = newCookies.split(",").map(cookie => cookie.split(";")[0].trim())
    }
  }

  // Helper method to get headers including cookies
  getHeaders() {
    const headers = {}
    if(this.cookies.length > 0) {
      headers.Cookie = this.cookies.join("; ")
    }

    return headers
  }
}

export default MediaWikiUploader
