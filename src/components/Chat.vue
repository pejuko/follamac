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
                ></v-text-field>

                <v-text-field v-model="chatModel.settingsForm.num_thread"
                              label="Threads"
                              variant="outlined"
                ></v-text-field>

                <v-text-field v-if="chatModel.settingsForm.method === 'generate'"
                              v-model="chatModel.settingsForm.system"
                              label="System message"
                              variant="outlined"
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
        <v-radio-group v-model="chatModel.settingsForm.renderAs" inline class="d-flex flex-row flex-grow-0">
          <v-radio value="markdown" label="Markdown" />
          <v-radio value="plaintext" label="Plaintext" />
        </v-radio-group>

        <v-card class="d-flex flex-column flex-grow-1 pa-2">
          <v-card :id="`chat-${currentChatId}`"
                  variant="outlined"
                  class="d-flex flex-column flex-grow-1 mb-3 chat">
            <v-container>
              <v-row v-for="response in chatModel.responses">
                <v-col cols="1">
                  <img v-if="response.role !== 'user'" src="../images/chatbot.png" class="chatbot" />
                </v-col>
                <v-col v-if="chatModel.settingsForm.renderAs === 'markdown'" :class="[ 'response', response.role ]"
                       v-html="markdownToHtml(response.content)"></v-col>
                <v-col v-else :class="[ 'response', response.role ]"
                       v-html="plaintextToHtml(response.content)"></v-col>
              </v-row>
            </v-container>
          </v-card>

          <v-row class="d-flex flex-row flex-grow-0 prompt">
            <v-col class="d-flex flex-column flex-grow-1">
              <v-textarea v-model="userPrompt"
                          placeholder="Enter your prompt..."
                          variant="outlined"
                          auto-grow
              />
            </v-col>

            <v-col class="d-flex flex-column flex-grow-0">
              <v-btn @click.prevent="submitPrompt" color="blue-darken-2">Submit</v-btn>

              <v-radio-group v-model="chatModel.settingsForm.method" style="width: 125px;">
                <v-radio value="chat" label="Chat" />
                <v-radio value="generate" label="Generate" />
              </v-radio-group>
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
          return hljs.highlightAuto(code).value;
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

  const userPrompt = ref('');
  const confirmation = ref(false);
  const pullModelName = ref('');

  const currentModel = computed(() => {
    return chatModel.value.models.find(m => m.name === chatModel.value.settingsForm.model);
  });

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

  function markdownToHtml(markdown) {
    return DOMPurify.sanitize(marked.parse(
        markdown.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ''),
        {
          breaks: true,
        }
    ));
  }

  function plaintextToHtml(content) {
    return '<pre style="background: transparent; color: black; white-space: break-spaces">' + DOMPurify.sanitize(content) + '</pre>';
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
    let messages = [];
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

    // if ollama has nothing more to say, show statistics
    if (json.done === true) {
      if (json.message) {
        messages = [{role: json.message.role, content: message}];
      }

      if (json.context) {
        chatModel.value.settingsForm.context = json.context;
      }

      chatModel.value.statistics.total_time += json.total_duration;
      chatModel.value.statistics.total_prompt_tokens += json.prompt_eval_count;
      chatModel.value.statistics.total_eval_tokens += json.eval_count;

      chatModel.value.responses[chatModel.value.responses.length - 1].content +=
          `\n\n<pre class="system">Total duration: ${humanNumber(nanosecondsToSeconds(json.total_duration))} seconds
Load duration: ${humanNumber(nanosecondsToSeconds(json.load_duration))} seconds
Eval duration: ${humanNumber(nanosecondsToSeconds(json.eval_duration))} seconds
Prompt tokens: ${json.prompt_eval_count}
Eval tokens: ${json.eval_count}</pre>`;
    }

    return messages;
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

    let messages = [...chatModel.value.settingsForm.pastMessages, message];

    // make a request to Ollama server
    const response = await getOllama().chat({
      model: chatModel.value.settingsForm.model, messages: messages, stream: true, options: getOlamaOptions()
    });

    chatModel.value.settingsForm.pastMessages = [
      ...messages,
      ...await readOllamaResponse(response, chatElement, handleChatChunks),
    ];
  }

  // send mesage to the server using method generate
  async function generateWithOlama(message) {
    // scroll down the chat, so the user prompt is visible
    const chatElement = getChatElement();
    chatElement.scrollTo(0, chatElement.scrollHeight);

    // make a request to Ollama server
    const response = await getOllama().generate({
      model: chatModel.value.settingsForm.model,
      prompt: message.content,
      stream: true,
      system: chatModel.value.settingsForm.system,
      context: chatModel.value.settingsForm.context,
      options: getOlamaOptions()
    });

    await readOllamaResponse(response, chatElement, handleChatChunks);
  }

  // Submit the prompt to the server and continuously update the chat
  function submitPrompt() {
    const message = {role: 'user', content: userPrompt.value};

    // push user prompt to chat as user and reset userPrompt
    chatModel.value.responses.push(message);
    userPrompt.value = '';

    // prepare a bubble for ollama response
    chatModel.value.responses.push({role: 'ollama', content: 'Waiting...'});

    if (chatModel.value.settingsForm.method === 'chat') {
      chatWithOlama(message);
    } else {
      generateWithOlama(message);
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

    const response = await getOllama().pull(pullModelName.value);
    if (!response.ok) {
      push.error('Cannot start pull.');
      return;
    }
    pullModelName.value = '';

    // push message to chat as user
    const message = {role: 'ollama', content: 'Pull has started...'};
    chatModel.value.responses.push(message);

    // scroll down the chat, so the user prompt is visible
    const chatElement = getChatElement();
    chatElement.scrollTo(0, chatElement.scrollHeight);

    await readOllamaResponse(response, chatElement, handlePullChunks);
    getModels();
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
    background: aliceblue;
    margin-left: 25%;
    width: 75%;
    max-width: 75%;
    border-bottom-left-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
    border-top-left-radius: 0.5rem;
  }

  .chatbot {
    width: 24px;
    height: 24px;
    margin: 0;
    margin-top: 1rem;
  }

  .ollama {
    background: blanchedalmond;
    width: calc(75% - 48px - 1rem);
    border-bottom-left-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
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
</style>