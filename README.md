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

## Building AppImage on Linux

```bash
./build-appimage.sh
```

## Running AppImage

```bash
./dist/Free\ Ollama\ Client-0.0.1.AppImage
```

## Building Flatpak on Linux

```bash
./build-flatpak.sh
```

## Installing Flatpak from file

```bash
flatpak install -u --bundle ./dist/Free\ Ollama\ Client-0.0.1-x86_64.flatpak
```

## Building Windows exe on Linux

```bash
./build-win-portable.sh
```

## Building Windows exe on Windows

```shell
.\build-windows.bat
```

## Keyboard shortcuts

- `ctrl + i` - opens developer tools

## Attribution

<img alt="chatbot" width="64" height="64" src="https://github.com/pejuko/follamac/blob/main/src/images/chatbot.png?raw=true" />
<a href="https://www.flaticon.com/free-icons/personal-assistant" title="personal-assistant icons">Personal-assistant icons created by edt.im - Flaticon</a>