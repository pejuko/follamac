<img alt="screenshot" width="800" src="https://github.com/pejuko/follamac/blob/main/images/screenshot.png?raw=true" />

# Free Ollama Client

Free Ollama Client is an electron application and provides convenient way to work with
[Ollama](https://ollama.com/). Ollama works with large language models (LLMs).

The Ollama server must be running. You can start it using `sudo systemctl start ollama.service`
or `ollama serve` commands. And you need to have some models pulled in the repository. You can pull
latest mistral using command `ollama pull mistral`.

## Installing building dependencies

```bash
yarn install
```

## Running dev version

```bash
yarn start
```

## Building AppImage

```bash
yarn package
yarn build-appimage
```

## Running AppImage

```bash
./dist/Free\ Ollama\ Client-0.0.1.AppImage
```