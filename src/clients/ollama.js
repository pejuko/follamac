export class Ollama {
  constructor(url) {
    this.url = url;
    this.headers = {
      'Content-Type': 'appication/json',
    };
  }

  async chat(chatRequest) {
    let data = Object.assign({}, chatRequest);

    // make a POST request to ollama server
    const response = await fetch(this.url + '/api/chat', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });

    return response;
  }

  async generate(generateRequest) {
    let data = Object.assign({}, generateRequest);

    // make a POST request to ollama server
    const response = await fetch(this.url + '/api/generate', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });

    return response;
  }

  async list() {
    // make a GET request to ollama server
    const response = await fetch(this.url + '/api/tags', {
      headers: this.headers,
    });

    return await response.json();
  }

  async show(showRequest) {
    // make a POST request to ollama server
    const response = await fetch(this.url + '/api/show', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(showRequest),
    });

    return await response.json();
  }

  async delete(name) {
    // make a DELETE request to ollama server
    const response = await fetch(this.url + '/api/delete', {
      method: 'DELETE',
      headers: this.headers,
      body: JSON.stringify({ name }),
    });

    return response;
  }

  async pull(name) {
    // make a POST request to ollama server
    const response = await fetch(this.url + '/api/pull', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ name }),
    });

    return response;
  }
}