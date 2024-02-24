# Follamac

<img alt="screenshot" width="800" src="https://pejuko.github.io/follamac/images/screenshot.png" style="border: 1px solid black" />

Follamac is a desktop application which provides convenient way to work with [Ollama](https://ollama.com/)
and large language models (LLMs).

The Ollama server must be running. On Linux you can start it using `sudo systemctl start ollama.service`
or `ollama serve` commands. And you need to have some models pulled in the repository. You can pull
latest mistral using command `ollama pull mistral` or you can run Follamac and pull the model from there.

## Running locally

### install dependencies
```shell
yarn install
```

### build and start the application
```shell
yarn build
yarn start
```

## Running dev version

```shell
yarn dev
```
and then visit the url in your browser.

## Keyboard shortcuts

- `ctrl + i` - opens developer tools

## Attribution

<img alt="chatbot" width="32" height="32" src="https://github.com/pejuko/follamac/blob/main/src/images/chatbot.png?raw=true" />
<a href="https://www.flaticon.com/free-icons/personal-assistant" title="personal-assistant icons">Personal-assistant icons created by edt.im - Flaticon</a>
