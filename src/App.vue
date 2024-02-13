<template>
  <div class="container">
<!--    <div class="left-panel"></div>-->

    <div class="central-area">
      <div id="chat" class="chat">
        <div v-for="response in responses" :class="[ 'response', response.who ]" v-html="markdownToHtml(response.value)"></div>
      </div>

      <div class="prompt">
        <div class="row">
          <textarea v-model="userPrompt" placeholder="Enter your prompt..." />
          <button type="submit" @click.prevent="submitPrompt">Submit</button>
        </div>
      </div>
    </div>

    <div class="right-panel">
      <label for="url">Url</label>
      <input id="url" v-model="settingsForm.url" />

      <label for="model">Model</label>
      <select id="model" v-model="settingsForm.model">
        <option v-for="model in models">{{ model.model }}</option>
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
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted, computed } from 'vue';
  import { Marked } from "marked";
  import DOMPurify from 'dompurify';
  import { markedHighlight } from "marked-highlight";
  import hljs from 'highlight.js';

  const marked = new Marked(
    markedHighlight({
      langPrefix: 'language-',
      highlight(code, lang, info) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlightAuto(code).value;
        return hljs.highlight(code, {
          language,
          ignoreIllegals: true,
        }).value;
      },
    })
  );

  const settingsForm = reactive({
    url: 'http://localhost:11434',
    model: 'mistral:latest',
    temperature: '0.8',
    num_thread: '4',
  });

  const models = ref([]);
  const responses = ref([]);
  const userPrompt = ref('');

  const currentModel = computed(() => {
    return models.value.find(m => m.model === settingsForm.model);
  });

  function humanNumber(number) {
    const formater = new Intl.NumberFormat();
    return formater.format(number);
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

  // Submit the prompt to the server and continuously update the chat
  async function submitPrompt() {
    let data = {
      prompt: userPrompt.value,
      model: settingsForm.model,
      options: {
        temperature: parseFloat(settingsForm.temperature),
        num_thread: parseInt(settingsForm.num_thread),
      }
    }

    // push user prompt to chat as user and reset userPrompt
    responses.value.push({ who: 'user', value: userPrompt.value });
    userPrompt.value = '';

    // scroll down the chat, so the user prompt is visible
    const chatElement = document.getElementById('chat');
    chatElement.scrollTo(0, chatElement.scrollHeight);

    // prepare a bubble for ollama response
    responses.value.push({ who: 'ollama', value: 'Waiting...'});

    // make a POST request to ollama server
    const response = await fetch(settingsForm.url + '/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // remove the Waiting... message
    responses.value[responses.value.length - 1].value = '';

    // get the reader and read the available data received from the server in a loop
    const reader = await response.body.getReader();
    let value = await reader.read();
    let total_text = '';
    while (value.done === false) {
      // convert the data to text and combine it with already received text
      // previously received text can be incomplete so we need to always update this variable
      total_text += new TextDecoder().decode(value.value);

      // split received data by new line delimiter and filter out non empty chunks
      const regex = /\n/;
      let chunks = total_text.split(regex).filter(c => c);
      let chunk = null;
      let message = ''
      try {
        let json = null;

        // compile the message
        for (chunk of chunks) {
          if (chunk === '') {
            continue;
          }
          json = JSON.parse(chunk);
          message += json.response;
        }

        // update last entry in the response array
        responses.value[responses.value.length - 1].value = message;

        // if ollama has nothing more to say, show statistics
        if (json.done === true) {
          responses.value[responses.value.length - 1].value +=
              `\n\n<pre class="system"><code>Total duration: ${humanNumber(nanosecondsToSeconds(json.total_duration))} seconds
Load duration: ${humanNumber(nanosecondsToSeconds(json.load_duration))} seconds
Eval duration: ${humanNumber(nanosecondsToSeconds(json.eval_duration))} seconds
Prompt tokens: ${json.prompt_eval_count}
Eval tokens: ${json.eval_count}</code></pre>`;
        }

        // scroll only if the scrollbar is at the bottom
        // const total = (chatElement.scrollHeight - chatElement.scrollTop) - chatElement.clientHeight;
        // if (total < 200) {
          chatElement.scrollTo(0, chatElement.scrollHeight);
        // }
      } catch (e) {
        console.log(e);
      }

      // read next portion of data
      value = await reader.read()
    }
  }

  // get list of installed models on the server
  async function getModels() {
    // send get request
    const response = await fetch(settingsForm.url + '/api/tags', {
      headers: {
        'Content-Type': 'appication/json',
      }
    });

    // convert to json and store list of models in variable
    const json = await response.json();
    models.value = json.models;
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
    overflow-y: scroll;
  }

  .right-panel input, .right-panel select {
    padding: 0.5rem;
  }

  label {
    margin-top: 1rem;
  }

  button:hover {
    background: #d0d0d0;
    cursor: pointer;
  }

  .row {
    display: flex;
    flex-direction: row;
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

  .prompt button {
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
</style>

<style>
  @import "highlight.js/styles/androidstudio.css";

  pre {
    background: black;
    color: white;
  }

  code {
    background: transparent;
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