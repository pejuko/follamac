<template>
  <div class="container">
    <div class="central-area">
      <div class="row chat-options">
        <div class="radio">
          <label>
            <input type="radio" v-model="chatModel.settingsForm.renderAs" value="markdown" />
            Markdown
          </label>
        </div>
        <div class="radio">
          <label>
            <input type="radio" v-model="chatModel.settingsForm.renderAs" value="plaintext" />
            Plaintext
          </label>
        </div>
      </div>

      <div :id="`chat-${currentChatId}`" class="chat">
        <div v-for="response in chatModel.responses" class="row">
          <img v-if="response.role !== 'user'" src="../images/chatbot.png" class="chatbot"/>
          <div v-if="chatModel.settingsForm.renderAs === 'markdown'" :class="[ 'response', response.role ]"
               v-html="markdownToHtml(response.content)"></div>
          <div v-else :class="[ 'response', response.role ]" v-html="plaintextToHtml(response.content)"></div>
        </div>
      </div>

      <div class="row prompt">
        <textarea v-model="userPrompt" placeholder="Enter your prompt..." />

        <div class="col">
          <button type="submit" @click.prevent="submitPrompt">Submit</button>

          <div class="row radio">
            <label>
              <input type="radio" v-model="chatModel.settingsForm.method" value="chat" />
              Chat
            </label>
          </div>

          <div class="row radio">
            <label>
              <input type="radio" v-model="chatModel.settingsForm.method" value="generate"/>
              Generate
            </label>
          </div>
        </div>
      </div>

      <div class="row statistics">
        <span><b>Time:</b> {{ humanTime(nanosecondsToSeconds(chatModel.statistics.total_time)) }}</span>
        <span><b>Prompt tokens:</b> {{ chatModel.statistics.total_prompt_tokens }}</span>
        <span><b>Eval tokens:</b> {{ chatModel.statistics.total_eval_tokens }}</span>
      </div>
    </div>

    <div class="right-panel">
      <div class="col settings">
        <label>Url</label>
        <input v-model="chatModel.settingsForm.url" @change="getModels()"/>

        <div v-if="chatModel.errorMessage" class="col error">
          {{ chatModel.errorMessage }}
        </div>

        <div v-if="chatModel.models.length > 0" class="col">
          <label>Model</label>
          <select v-model="chatModel.settingsForm.model" @change="fetchCurrentModelDetails()">
            <option v-for="model in chatModel.models">{{ model.name }}</option>
          </select>

          <div v-if="currentModel" class="model-detail">
            <i>Family: </i>{{ currentModel.details.family }}<br/>
            <i>Format: </i>{{ currentModel.details.format }}<br/>
            <i>Parametr size: </i>{{ currentModel.details.parameter_size }}<br/>
            <i>Quantization level: </i>{{ currentModel.details.quantization_level }}<br/>
            <i>Size: </i>{{ humanNumber(currentModel.size / 1024 / 1024) }} MiB<br/>
          </div>

          <label>Temperature</label>
          <input v-model="chatModel.settingsForm.temperature"/>

          <label>Threads</label>
          <input v-model="chatModel.settingsForm.num_thread"/>

          <div v-if="chatModel.settingsForm.method === 'generate'" class="col">
            <label>System</label>
            <textarea v-model="chatModel.settingsForm.system"/>
          </div>
        </div>

        <div v-else class="col">
          <button @click.prevent="getModels()">Reload</button>
        </div>
      </div>

      <div class="commands">
        <button @click.prevent="confirmation = `Really delete current model ${chatModel.settingsForm.model}?`">Delete Current Model</button>
        <div v-if="confirmation" class="confirmation">
          {{ confirmation }}
          <button @click.prevent="deleteCurrentModel()">Confirm</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted, computed, watch } from 'vue';
  import { Marked } from "marked";
  import DOMPurify from 'dompurify';
  import { markedHighlight } from "marked-highlight";
  import hljs from 'highlight.js';
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
  const confirmation = ref('');

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

  // read Ollama's stream response
  async function readOllamaResponse(response, chatElement) {
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
      let chunk = null;
      let message = ''
      messages = [];
      try {
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
      ...await readOllamaResponse(response, chatElement),
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

    await readOllamaResponse(response, chatElement);
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
      chatModel.value.errorMessage = null;
    } catch (e) {
      console.log(e);
      errorMessage.value = 'There is connection problem.';
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
    if (currentModel.value) {
      const response = await getOllama().delete(currentModel.value.name);
      if (response.ok) {
        await getModels();
        chatModel.value.errorMessage = 'Model deleted.';
      } else {
        chatModel.value.errorMessage = 'Cannot delete model ' + currentModel.value.name;
      }
    }
    confirmation.value = null;
  }

  onMounted(() => {
    getModels();
  });
</script>

<style scoped>
  .container {
    box-sizing: border-box;
    display: grid;
    height: 100vh;
    grid-template-columns: calc(100% - 250px) 250px;
    grid-template-rows: 100vh;
  }

  .central-area,
  .right-panel {
    display: flex;
    flex-direction: column;
  }

  .central-area {
    background-color: #e0e0e0;
    padding: 1rem;
  }

  .right-panel {
    background-color: #d0d0d0;
    padding: 1rem;
  }

  .chat {
    display: flex;
    flex-direction: column;
    flex-grow: 2;
    margin-bottom: 1rem;
    border: 1px solid black;
    border-radius: 0.5rem;
    padding: 0.5rem;
    overflow-y: auto;
  }

  .right-panel input, .right-panel select, .right-panel textarea {
    padding: 0.5rem;
  }

  label {
    margin-top: 1rem;
  }

  label.radio {
    margin: 0;
    margin-left: 1rem;
  }

  .row.radio {
    margin-top: 0.5rem;
  }

  button:hover {
    background: #d0d0d0;
    cursor: pointer;
  }

  .row {
    display: flex;
    flex-direction: row;
  }

  .col {
    display: flex;
    flex-direction: column;
  }

  .statistics {
    margin-top: 0.5rem;
    justify-content: space-evenly;
  }

  .chat-options {
    margin-bottom: 0.5rem;
  }

  .chat-options div {
    margin-right: 1rem;
  }

  .chat-options input {
    margin-right: 0.5rem;
  }

  .prompt textarea {
    display: flex;
    flex-grow: 2;
    border: 1px solid black;
    border-radius: 0.5rem;
    height: 5rem;
    padding: 0.5rem;
    margin-right: 1rem;
  }

  .settings {
    flex-grow: 2;
  }

  button {
    height: 2rem;
    padding: 0.5rem;
    border: 1px solid black;
    border-radius: 0.5rem;
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
    margin-top: 1rem;
  }

  .ollama {
    background: blanchedalmond;
    width: calc(75% - 48px - 1rem);
    border-bottom-left-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
  }

  .model-detail {
    margin-top: 1rem;
  }

  .error {
    color: red;
    font-weight: bold;
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

  .system {
    background: brown;
    border-radius: 0.5rem;
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