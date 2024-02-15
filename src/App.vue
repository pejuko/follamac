<template>
  <div class="container">
<!--    <div class="left-panel"></div>-->

    <div class="central-area">
      <div id="chat" class="chat">
        <div v-for="response in responses" :class="[ 'response', response.role ]" v-html="markdownToHtml(response.content)"></div>
      </div>

      <div class="row prompt">
        <textarea v-model="userPrompt" placeholder="Enter your prompt..." />

        <div class="col">
          <button type="submit" @click.prevent="submitPrompt">Submit</button>

          <div class="row radio">
            <input id="method-chat" type="radio" v-model="settingsForm.method" value="chat" />
            <label for="method-chat" class="radio">Chat</label>
          </div>

          <div class="row radio">
            <input id="method-generate" type="radio" v-model="settingsForm.method" value="generate" />
            <label for="method-generate" class="radio">Generate</label>
          </div>
        </div>
      </div>

      <div class="row statistics">
        <span><b>Time:</b> {{ humanTime(nanosecondsToSeconds(statistics.total_time)) }}</span>
        <span><b>Prompt tokens:</b> {{ statistics.total_prompt_tokens }}</span>
        <span><b>Server tokens:</b> {{ statistics.total_eval_tokens }}</span>
      </div>
    </div>

    <div class="right-panel">
      <label for="url">Url</label>
      <input id="url" v-model="settingsForm.url" @change="getModels()" />

      <div v-if="errorMessage" class="col error">
        {{ errorMessage }}
      </div>

      <div v-if="models.length > 0" class="col">
        <label for="model">Model</label>
        <select id="model" v-model="settingsForm.model" @change="fetchCurrentModelDetails()">
          <option v-for="model in models">{{ model.name }}</option>
        </select>

        <div v-if="currentModel" class="model-detail">
          <i>Family: </i>{{ currentModel.details.family }}<br />
          <i>Format: </i>{{ currentModel.details.format }}<br />
          <i>Parametr size: </i>{{ currentModel.details.parameter_size }}<br />
          <i>Quantization level: </i>{{ currentModel.details.quantization_level }}<br />
          <i>Size: </i>{{ humanNumber(currentModel.size / 1024 / 1024) }} MiB<br />
        </div>

        <label for="temperature">Temperature</label>
        <input id="temperature" v-model="settingsForm.temperature" />

        <label for="num_thread">Threads</label>
        <input id="num_thread" v-model="settingsForm.num_thread" />

        <div v-if="settingsForm.method === 'generate'" style="margin-top: 1rem;">
          <label for="system">System</label>
          <textarea id="system" v-model="settingsForm.system" />
        </div>
      </div>

      <div v-else class="col">
        <button @click.prevent="getModels()">Reload</button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted, computed } from 'vue';
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

  const settingsForm = reactive({
    url: 'http://localhost:11434',
    model: 'mistral:latest',
    temperature: '0.8',
    num_thread: '4',
    system: null,
    context: [],
    method: 'chat',
    pastMessages: [],
  });

  const statistics = reactive({
    total_prompt_tokens: 0,
    total_eval_tokens: 0,
    total_time: 0,
  });

  const currentModelDetail = ref({});
  const errorMessage = ref(null);

  const models = ref([]);
  const responses = ref([]);
  const userPrompt = ref('');

  const currentModel = computed(() => {
    return models.value.find(m => m.name === settingsForm.model);
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

  function markdownToHtml(markdown){
    return DOMPurify.sanitize(marked.parse(
      markdown.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ''),
      {
        breaks: true,
      }
    ));
  }

  function getOlamaOptions() {
    return {
      temperature: parseFloat(settingsForm.temperature),
      num_thread: parseInt(settingsForm.num_thread),
    };
  }

  // get DOM element with id 'chat'
  function getChatElement() {
    return document.getElementById('chat');
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
          if (json.context) {
            settingsForm.context = json.context;
          }
        }
        // update last entry in the response array
        responses.value[responses.value.length - 1].content = message;
        // if ollama has nothing more to say, show statistics
        if (json.done === true) {
          if (json.message) {
            messages = [{ role: json.message.role, content: message }];
          }
          statistics.total_time += json.total_duration;
          statistics.total_prompt_tokens += json.prompt_eval_count;
          statistics.total_eval_tokens += json.eval_count;

          responses.value[responses.value.length - 1].content +=
              `<pre class="system">Total duration: ${humanNumber(nanosecondsToSeconds(json.total_duration))} seconds
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

    /**
     * part for ollama-js client
     *
    for await (const part of response) {
      total_text += part.message ? part.message.content : part.response;
      responses.value[responses.value.length - 1].content = total_text;

      // if ollama has nothing more to say, show statistics
      if (part.done === true) {
        if (part.context) {
          settingsForm.context = part.context;
        }

        statistics.total_time += part.total_duration;
        statistics.total_prompt_tokens += part.prompt_eval_count;
        statistics.total_eval_tokens += part.eval_count;

        responses.value[responses.value.length - 1].content +=
            `\n\n<pre class="system">Total duration: ${humanNumber(nanosecondsToSeconds(part.total_duration))} seconds
Load duration: ${humanNumber(nanosecondsToSeconds(part.load_duration))} seconds
Eval duration: ${humanNumber(nanosecondsToSeconds(part.eval_duration))} seconds
Prompt tokens: ${part.prompt_eval_count}
Eval tokens: ${part.eval_count}</pre>`;
      }
      chatElement.scrollTo(0, chatElement.scrollHeight);
    }
     */
  }

  // create new instance of Ollama using current url
  function getOllama() {
    return new Ollama(settingsForm.url);
  }

  // send message to the server using method chat
  async function chatWithOlama(message) {
    // scroll down the chat, so the user prompt is visible
    const chatElement = getChatElement();
    chatElement.scrollTo(0, chatElement.scrollHeight);

    let messages = [...settingsForm.pastMessages, message];

    // make a request to Ollama server
    const response = await getOllama().chat({
      model: settingsForm.model, messages: messages, stream: true, options: getOlamaOptions()
    });

    settingsForm.pastMessages = [
      ...settingsForm.pastMessages,
      ...await readOllamaResponse(response, chatElement)
    ];
  }

  // send mesage to the server using method generate
  async function generateWithOlama(message) {
    // scroll down the chat, so the user prompt is visible
    const chatElement = getChatElement();
    chatElement.scrollTo(0, chatElement.scrollHeight);

    // make a request to Ollama server
    const response = await getOllama().generate({
      model: settingsForm.model,
      prompt: message.content,
      stream: true,
      system: settingsForm.system,
      context: settingsForm.context,
      options: getOlamaOptions()
    });

    await readOllamaResponse(response, chatElement);
  }

  // Submit the prompt to the server and continuously update the chat
  function submitPrompt() {
    const message = { role: 'user', content: userPrompt.value };

    // push user prompt to chat as user and reset userPrompt
    responses.value.push(message);
    userPrompt.value = '';

    // prepare a bubble for ollama response
    responses.value.push({ role: 'ollama', content: 'Waiting...'});

    if (settingsForm.method === 'chat') {
      chatWithOlama(message);
    } else {
      generateWithOlama(message);
    }
  }

  // get list of installed models on the server
  async function getModels() {
    models.value = [];
    try {
      const list = await getOllama().list();
      models.value = list.models;
      await fetchCurrentModelDetails();
      errorMessage.value = null;
    } catch (e) {
      console.log(e);
      errorMessage.value = 'There is connection problem.';
    }
  }

  // get additional model information
  async function fetchCurrentModelDetails() {
    currentModelDetail.value = await getOllama().show({ model: settingsForm.model });
    if (currentModelDetail.value.system) {
      settingsForm.system = currentModelDetail.value.system;
    }
  }

  onMounted(() => {
    getModels();
  });
</script>

<style scoped>
  .container {
    display: flex;
    height: 100vh;
  }

  .left-panel,
  .central-area,
  .right-panel {
    display: flex;
    flex-direction: column;
    justify-items: stretch;
  }

  .left-panel {
    background-color: #f0f0f0;
    width: 25%;
    padding: 1rem;
  }

  .central-area {
    position: relative;
    background-color: #e0e0e0;
    width: 75%;
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

  .prompt textarea {
    display: flex;
    flex-grow: 2;
    border: 1px solid black;
    border-radius: 0.5rem;
    height: 5rem;
    padding: 0.5rem;
    margin-right: 1rem;
  }

  button {
    height: 2rem;
    padding: 0.5rem;
    border: 1px solid black;
    border-radius: 0.5rem;
  }

  .right-panel {
    background-color: #d0d0d0;
    width: 25%;
    padding: 1rem;
  }

  .response {
    margin: 1rem;
    padding: 1.5rem 2rem 1.5rem 2rem;
    word-wrap: anywhere;
  }

  .user {
    background: aliceblue;
    margin-left: 4rem;
    border-bottom-left-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
    border-top-left-radius: 0.5rem;
  }

  .ollama {
    background: blanchedalmond;
    margin-right: 4rem;
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