<template>
  <v-card height="100vh">
    <v-layout class="h-screen">
      <v-navigation-drawer floating permanent location="right" class="pa-3" style="width: 250px;">
        <v-container class="d-flex flex-column flex-grow-1 pl-1 h-100">
          <v-row>
            <v-col>
              <v-text-field v-model="chatModel.settingsForm.url"
                            label="Url"
                            variant="outlined"
                            @change="getModels()"
              />

              <div v-if="currentModel">
                <v-select v-model="chatModel.settingsForm.model"
                          :items="chatModel.models"
                          item-title="name"
                          item-value="name"
                          variant="outlined"
                          @change="fetchCurrentModelDetails()"
                ></v-select>

                <div>
                  <i>Family: </i>{{ currentModel.details.family }}<br />
                  <i>Format: </i>{{ currentModel.details.format }}<br />
                  <i>Parametr size: </i>{{ currentModel.details.parameter_size }}<br />
                  <i>Quantization level: </i>{{ currentModel.details.quantization_level }}<br />
                  <i>Size: </i>{{ humanNumber(currentModel.size / 1024 / 1024) }} MiB<br />
                </div>
                <br />

                <v-text-field v-model="chatModel.settingsForm.temperature"
                              label="Temperature"
                              variant="outlined"
                              @change="change"
                ></v-text-field>

                <v-text-field v-model="chatModel.settingsForm.num_thread"
                              label="Threads"
                              variant="outlined"
                              @change="change"
                ></v-text-field>

                <v-text-field v-if="chatModel.settingsForm.method === 'generate'"
                              v-model="chatModel.settingsForm.system"
                              label="System message"
                              variant="outlined"
                              @change="change"
                ></v-text-field>
              </div>

              <div v-else class="col">
                <v-btn @click.prevent="getModels()">Reload</v-btn>
              </div>
            </v-col>
          </v-row>

          <v-spacer />

          <v-row v-if="currentModel" class="d-flex flex-column flex-grow-0 commands">
            <v-col>
              <v-text-field v-model="pullModelName"
                            label="Model name to pull"
                            variant="outlined"
              ></v-text-field>
              <v-btn @click.prevent="pullModel()" class="mb-3">Pull</v-btn>

              <v-dialog transition="dialog-top-transition"
                        v-model="confirmation"
              >
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props">Delete Model</v-btn>
                </template>
                <template v-slot:default="{ isActive }">
                  <v-card>
                    <v-toolbar
                        color="primary"
                        title="Delete current model"
                    ></v-toolbar>
                    <v-card-text>
                      <div class="text-h5 pa-12">Really delete current model "{{ chatModel.settingsForm.model }}"?</div>
                    </v-card-text>
                    <v-card-actions class="justify-end">
                      <v-btn @click="confirmation = false">Cancel</v-btn>
                      <v-btn @click="deleteCurrentModel()">Delete</v-btn>
                    </v-card-actions>
                  </v-card>
                </template>
              </v-dialog>
            </v-col>
          </v-row>
        </v-container>

      </v-navigation-drawer>

      <v-main class="d-flex flex-column flex-grow-1 pa-1 h-screen position-absolute"
              style="left: 150px; right: 250px; top: 0; bottom: 0;">
        <v-row class="d-flex flex-row flex-grow-0">
          <v-col cols="1">
            <v-icon icon="mdi-brightness-6"
                    class="ml-2 mt-2 cursor-pointer"
                    @click="toggleTheme()"
            />
          </v-col>
          <v-col>
            <v-radio-group v-model="chatModel.settingsForm.renderAs" inline class="d-flex flex-row flex-grow-0">
              <v-radio value="markdown" label="Markdown" />
              <v-radio value="plaintext" label="Plaintext" />
            </v-radio-group>
          </v-col>
        </v-row>

        <v-card class="d-flex flex-column flex-grow-1 pa-2">
          <v-card :id="`chat-${currentChatId}`"
                  variant="outlined"
                  class="d-flex flex-column flex-grow-1 mb-3 chat">
            <v-container>
              <v-row v-for="(response, idx) in chatModel.responses">
                <v-col v-if="response.role === 'assistant'" cols="1">
                  <div class="chatbot" />
                </v-col>
                <v-col :class="[ 'response', response.role ]">
                  <div class="text-right mb-3">
                    <v-icon icon="mdi-content-copy" class="cursor-pointer" @click="copyResponseToClipboard(response.content)"></v-icon>
                    <v-icon icon="mdi-pencil" class="ml-3 cursor-pointer" @click="editResponseId = idx"></v-icon>
                    <v-menu>
                      <template v-slot:activator="{ props }">
                        <v-icon icon="mdi-trash-can" v-bind="props" class="ml-3 cursor-pointer"></v-icon>
                      </template>

                      <v-list>
                        <v-list-item>
                          <v-list-item-title @click.prevent="deleteResponse(idx)" class="cursor-pointer">
                            <v-icon icon="mdi-trash-can"></v-icon> Delete!
                          </v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </div>
                  <div v-if="response.images && response.images.length > 0">
                    <img v-for="image in response.images" :src="image" width="auto" height="100px" />
                  </div>
                  <div v-if="chatModel.settingsForm.renderAs === 'markdown' && editResponseId !== idx"
                       v-html="markdownToHtml(response.content)" />
                  <v-textarea v-else-if="editResponseId === idx"
                              v-model="response.content"
                              variant="outlined"
                              auto-grow
                              @blur="editResponseId = -1; change()"
                  >{{ response.content }}</v-textarea>
                  <div v-else v-html="plaintextToHtml(response.content)"></div>
                  <pre v-if="response.statistics"
                       class="mt-10 system"
                  >Total duration: {{ humanNumber(nanosecondsToSeconds(response.statistics.total_duration)) }} seconds
Load duration: {{ humanNumber(nanosecondsToSeconds(response.statistics.load_duration)) }} seconds
Eval duration: {{ humanNumber(nanosecondsToSeconds(response.statistics.eval_duration)) }} seconds
Prompt tokens: {{ response.statistics.prompt_eval_count }}
Eval tokens: {{ response.statistics.eval_count }}</pre>
                </v-col>

              </v-row>
            </v-container>
          </v-card>

          <v-row v-if="loadedImages.length > 0">
            <v-col v-for="(image, idx) in loadedImages" :key="idx">
              <img :src="image.url" :alt="image.file.name" :title="image.file.name" width="auto" height="100px" />
            </v-col>
          </v-row>

          <v-row>
            <v-col>
              <v-file-input
                  v-model="userImages"
                  show-size
                  counter
                  multiple
                  variant="underlined"
                  density="compact"
                  hide-details
                  label="Images"
                  @change="loadImages"
              ></v-file-input>
            </v-col>
          </v-row>

          <v-row class="d-flex flex-row flex-grow-0 prompt">
            <v-col class="d-flex flex-column flex-grow-1">
              <v-textarea v-model="userPrompt"
                          placeholder="Enter your prompt..."
                          variant="outlined"
                          auto-grow
                          :max-rows="15"
              />
            </v-col>

            <v-col class="d-flex flex-column flex-grow-0">
              <v-btn @click.prevent="submitPrompt" color="blue-darken-2">Submit</v-btn>

              <v-radio-group v-model="chatModel.settingsForm.method"
                             density="compact"
                             hide-details
                             class="mt-2"
                             style="width: 125px;"
              >
                <v-radio value="chat" label="Chat" />
                <v-radio value="generate" label="Generate" />
              </v-radio-group>

              <v-select v-if="chatModel.settingsForm.method === 'chat'"
                        v-model="chatModel.settingsForm.role"
                        variant="outlined"
                        density="compact"
                        :items="['assistant', 'system', 'user']"
              ></v-select>
            </v-col>
          </v-row>
        </v-card>

        <v-row class="d-flex flex-row flex-grow-0">
          <v-col class="text-center"><b>Time:</b> {{ humanTime(nanosecondsToSeconds(chatModel.statistics.total_time)) }}
          </v-col>
          <v-col class="text-center"><b>Prompt tokens:</b> {{ chatModel.statistics.total_prompt_tokens }}</v-col>
          <v-col class="text-center"><b>Eval tokens:</b> {{ chatModel.statistics.total_eval_tokens }}</v-col>
        </v-row>
      </v-main>
    </v-layout>
  </v-card>
</template>

<script setup>
  import { ref, onMounted, computed } from 'vue';
  import { useTheme } from "vuetify";
  import { Marked } from "marked";
  import DOMPurify from 'dompurify';
  import { markedHighlight } from "marked-highlight";
  import hljs from 'highlight.js';
  import { push } from 'notivue';
  import { Ollama } from '@/clients/ollama';

  const marked = new Marked(
      markedHighlight({
        langPrefix: 'language-',
        highlight(code, lang, info) {
          const result = hljs.highlightAuto(code);
          return `<div class="content-to-copy">${DOMPurify.sanitize(code)}</div>` + result.value;
          // const language = hljs.getLanguage(lang) ? lang : 'plaintext';
          // return hljs.highlight(code, {
          //   language,
          //   ignoreIllegals: true,
          // }).value;
        },
      })
  );

  const props = defineProps({
    currentChatId: Number,
  });
  const chatModel = defineModel();
  const emit = defineEmits(['change']);

  const userImages = ref([]);
  const loadedImages = ref([]);
  const userPrompt = ref('');
  const confirmation = ref(false);
  const pullModelName = ref('');
  const editResponseId = ref(-1);

  const currentModel = computed(() => {
    return chatModel.value.models.find(m => m.name === chatModel.value.settingsForm.model);
  });

  const theme = useTheme();

  function copyResponseToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  function deleteResponse(idx) {
    chatModel.value.responses.splice(idx, 1);
    change();
  }

  function change() {
    emit('change');
  }

  function toggleTheme() {
    theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark';
    change();
  }

  function humanNumber(number) {
    const formater = new Intl.NumberFormat();
    return formater.format(number);
  }

  function humanTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const sec = Math.round((seconds % 60) * 100) / 100;
    return `${hours}:${minutes}:${sec}`;
  }

  function nanosecondsToSeconds(number) {
    return number / 1_000_000_000;
  }

  function addCopyButton(html) {
    return html.replace(
        /<pre>\s*<code/gi,
        '<div class="code-tools-container"><button onclick="copyToClipboard(this)" class="copy-to-clipboard">copy</button></div><pre><code'
    );
  }

  function markdownToHtml(markdown) {
    return addCopyButton(DOMPurify.sanitize(marked.parse(
        markdown.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ''),
        {
          breaks: true,
        }
    )));
  }

  function plaintextToHtml(content) {
    return '<pre style="background: transparent; white-space: break-spaces">' + sanitizeHtml(content) + '</pre>';
  }

  function sanitizeHtml(content) {
    return DOMPurify.sanitize(content);
  }

  function getOlamaOptions() {
    return {
      temperature: parseFloat(chatModel.value.settingsForm.temperature),
      num_thread: parseInt(chatModel.value.settingsForm.num_thread),
    };
  }

  // get DOM element with id 'chat'
  function getChatElement() {
    return document.getElementById('chat-' + props.currentChatId);
  }

  function handleChatChunks(chunks) {
    let chunk = null;
    let message = ''
    let json = null;
    // compile the message
    for (chunk of chunks) {
      json = JSON.parse(chunk);
      message += json.message ? json.message.content : json.response;
    }

    // update last entry in the response array
    chatModel.value.responses[chatModel.value.responses.length - 1].content = message;

    if (json.error) {
      console.log(json.error);
      push.error(json.error);
    }

    // if ollama has nothing more to say, show statistics
    if (json.done === true) {
      chatModel.value.responses[chatModel.value.responses.length - 1].finished = true;

      if (json.context) {
        chatModel.value.settingsForm.context = json.context;
      }

      if (json.images) {
        chatModel.value.responses[chatModel.value.responses.length - 1].images = json.images;
      }

      chatModel.value.responses[chatModel.value.responses.length - 1].statistics = {
        total_duration: json.total_duration,
        load_duration: json.load_duration,
        eval_duration: json.eval_duration,
        prompt_eval_count: json.prompt_eval_count,
        eval_count: json.eval_count,
      };

      chatModel.value.statistics.total_time += json.total_duration;
      chatModel.value.statistics.total_prompt_tokens += json.prompt_eval_count;
      chatModel.value.statistics.total_eval_tokens += json.eval_count;

      change();
    }
  }

  // read Ollama's stream response
  async function readOllamaResponse(response, chatElement, handleChunksCallback) {
    // get the reader and read the available data received from the server in a loop
    const reader = await response.body.getReader();
    let value = await reader.read();
    let total_text = '';
    let messages = [];
    while (value.done === false) {
      // convert the data to text and combine it with already received text
      // previously received text can be incomplete so we need to always update this variable
      total_text += new TextDecoder().decode(value.value);
      // split received data by new line delimiter and filter out non empty chunks
      const regex = /\n/;
      let chunks = total_text.split(regex).filter(c => c && c !== '');
      try {
        messages = handleChunksCallback(chunks);
        chatElement.scrollTo(0, chatElement.scrollHeight);
      } catch (e) {
        console.log(e);
      }
      // read next portion of data
      value = await reader.read()
    }

    return messages;
  }

  // create new instance of Ollama using current url
  function getOllama() {
    return new Ollama(chatModel.value.settingsForm.url);
  }

  // send message to the server using method chat
  async function chatWithOlama(message) {
    // scroll down the chat, so the user prompt is visible
    const chatElement = getChatElement();
    chatElement.scrollTo(0, chatElement.scrollHeight);

    let messages = chatModel.value.responses.filter(r => r.finished).map(r => {
      return {
        role: r.role,
        content: r.content,
        images: r.images ? r.images.map(i => i.split(',')[1]) : null,
      };
    });

    try {
      // make a request to Ollama server
      const response = await getOllama().chat({
        model: chatModel.value.settingsForm.model, messages: messages, stream: true, options: getOlamaOptions()
      });

      await readOllamaResponse(response, chatElement, handleChatChunks);
    } catch (e) {
      console.log(e);
      push.error(e.toString());
    }
  }

  // send mesage to the server using method generate
  async function generateWithOlama(message) {
    // scroll down the chat, so the user prompt is visible
    const chatElement = getChatElement();
    chatElement.scrollTo(0, chatElement.scrollHeight);

    try {
      // make a request to Ollama server
      const response = await getOllama().generate({
        model: chatModel.value.settingsForm.model,
        prompt: message.content,
        images: message.images,
        stream: true,
        system: chatModel.value.settingsForm.system,
        context: chatModel.value.settingsForm.context,
        options: getOlamaOptions()
      });

      await readOllamaResponse(response, chatElement, handleChatChunks);
    } catch (e) {
      console.log(e);
      push.error(e.toString());
    }
  }

  function addImage(file, b64file) {
    let image = {
      file,
      b64file: b64file.split(',')[1],
      url: b64file, // URL.createObjectURL(file),
    };
    loadedImages.value.push(image);
  }

  function loadImages() {
    if (userImages.value.length <= 0) {
      return;
    }

    userImages.value.forEach((file) => {
      const reader = new FileReader();

      reader.onload = function(event) {
        // Convert file to Base64 string
        // btoa is built int javascript function for base64 encoding
        addImage(file, event.target.result);
      };

      reader.onerror = function() {
        console.log("can't read the file");
        push.error('Cannot read the file');
      };

      reader.readAsDataURL(file);
    });
  }

  // Submit the prompt to the server and continuously update the chat
  async function submitPrompt() {
    const message = { role: chatModel.value.settingsForm.role, content: userPrompt.value };

    // push user prompt to chat as user and reset userPrompt
    chatModel.value.responses.push({...message, images: loadedImages.value.map(i => i.url), finished: true });
    message.images = loadedImages.value.map(i => i.b64file);
    userPrompt.value = '';
    userImages.value = [];
    loadedImages.value = [];

    if (message.role !== 'user') {
      return;
    }

    // prepare a bubble for ollama response
    chatModel.value.responses.push({role: 'assistant', content: 'Waiting...', finished: false });

    if (chatModel.value.settingsForm.method === 'chat') {
      await chatWithOlama(message);
    } else {
      await generateWithOlama(message);
    }
  }

  // get list of installed models on the server
  async function getModels() {
    chatModel.value.models.value = [];
    try {
      const list = await getOllama().list();
      chatModel.value.models = list.models;
      if (!currentModel.value) {
        if (chatModel.value.models.length > 0) {
          chatModel.value.settingsForm.model = chatModel.value.models[0].name;
        } else {
          chatModel.value.settingsForm.model = null;
        }
      }
      await fetchCurrentModelDetails();
    } catch (e) {
      console.log(e);
      push.error('There is connection problem.');
    }
  }

  // get additional model information
  async function fetchCurrentModelDetails() {
    chatModel.value.currentModelDetail = await getOllama().show({model: chatModel.value.settingsForm.model});
    if (chatModel.value.currentModelDetail.system) {
      chatModel.value.settingsForm.system = chatModel.value.currentModelDetail.system;
    }
    change();
  }

  async function deleteCurrentModel() {
    confirmation.value = false;
    if (currentModel.value) {
      const response = await getOllama().delete(currentModel.value.name);
      if (response.ok) {
        await getModels();
        push.success('Model deleted.');
      } else {
        push.error('Cannot delete model ' + currentModel.value.name);
      }
    }
    confirmation.value = false;
  }

  async function handlePullChunks(chunks) {
    const lastChunk = JSON.parse(chunks[chunks.length - 1]);

    if (lastChunk.error) {
      chatModel.value.responses[chatModel.value.responses.length - 1].content = lastChunk.error;
      return;
    }

    let message = lastChunk.status;

    if (lastChunk.total) {
      const completed = lastChunk.completed ?? 0;
      const percent = Math.floor((completed / lastChunk.total) * 100);
      message += `: ${percent}%`;
    }

    if (lastChunk.status === 'success') {
      message = 'Pull finished with success.';
    }

    if (message) {
      chatModel.value.responses[chatModel.value.responses.length - 1].content = message;
    }
  }

  async function pullModel() {
    if (pullModelName.value.trim() === '') {
      push.error('Model name to pull is empty.');
      return;
    }

    try {
      const response = await getOllama().pull(pullModelName.value);
      if (!response.ok) {
        push.error('Cannot start pull.');
        return;
      }
      pullModelName.value = '';

      // push message to chat as user
      const message = {role: 'assistant', content: 'Pull has started...'};
      chatModel.value.responses.push(message);

      // scroll down the chat, so the user prompt is visible
      const chatElement = getChatElement();
      chatElement.scrollTo(0, chatElement.scrollHeight);

      await readOllamaResponse(response, chatElement, handlePullChunks);
      await getModels();
    } catch (e) {
      console.log(e);
      push.error(e.toString());
    }
  }

  onMounted(() => {
    getModels();
  });
</script>

<style scoped>
  .chat {
    width: 100%;
    height: 100%;
    overflow-y: auto;
  }

  .response {
    margin: 1rem;
    padding: 1.5rem 2rem 1.5rem 2rem;
    word-wrap: anywhere;
  }

  .user {
    margin-left: 25%;
    width: 75%;
    max-width: 75%;
    border-bottom-left-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
    border-top-left-radius: 0.5rem;
  }

  .v-theme--light .user {
    background: aliceblue;
  }

  .v-theme--dark .user {
    background: #1f1f2f;
  }

  .chatbot {
    width: 32px;
    height: 32px;
    margin: 0;
    margin-top: 1rem;
    background-size: cover;
  }

  .v-theme--light .chatbot {
    background-image: url("../images/chatbot.png");
  }

  .v-theme--dark .chatbot {
    background-image: url("../images/chatbot-white.png");
  }

  .assistant {
    width: calc(75% - 48px - 1rem);
    border-bottom-left-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
  }

  .v-theme--light .assistant {
    background: blanchedalmond;
  }

  .v-theme--dark .assistant {
    background: #2f2f1f;
  }

  .system {
    max-width: 70% !important;
    margin-left: auto;
    margin-right: auto;
    border-radius: 0.5rem;
  }

  .v-theme--light .system {
    background: darkseagreen;
  }

  .v-theme--dark .system {
    background: #1f2f1f;
  }
</style>

<style>
  @import "highlight.js/styles/androidstudio.css";

  pre, code {
    background: black;
    color: white;
  }

  code {
    padding: 0 0.5rem 0 0.5rem;
  }

  pre {
    padding: 0.5rem;
    overflow-x: auto;
  }

  pre code {
    padding: 0;
  }

  p, pre {
    margin-bottom: 0.5rem;
  }

  .content-to-copy {
    display: none;
  }

  .copy-to-clipboard {
    padding: 1rem;
    color: white !important;
  }

  .code-tools-container {
    background: black;
    border-bottom: 1px solid gray;
    text-align: right;
  }
</style>