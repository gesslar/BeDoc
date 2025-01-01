module.exports = new Map([
  ["print", new Map([
    ["enter", async({name, section, meta}) => {
      if(name == "description") {
        const translated = await getDadJoke();
        if(translated.status == 'success')
          section.description = [...section.description, translated.joke];
        return translated;
      }
    }]
  ])],
]);

async function getDadJoke() {
  const url = `https://icanhazdadjoke.com`;

  try {
    const headers = new Headers();
    headers.append('Accept', 'application/json');
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });
    if(!response.ok)
      throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return {
      status: 'success',
      message: 'Joke fetched successfully',
      joke: data.joke,
    };
  } catch(error) {
    return {
      status: 'error',
      error: error,
    };
  }
}
