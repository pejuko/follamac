<template>
  <div class="main-container">
    <div class="col left-panel">
      <button v-for="(chat, idx) in chats" @click.prevent="switchChat(idx)" :class="{ active: idx === currentChatId }">{{ chat.name }}</button>
      <button @click.prevent="addChat()"> + </button>
    </div>

    <Chat v-for="(chat, idx) in chats" :key="idx" v-model="chat.chat" :class="{ hidden: idx !== currentChatId }" :currentChatId="idx" />
  </div>
</template>

<script setup>
  import { onMounted, ref } from "vue";
  import Chat from "@/components/Chat.vue";

  const chats = ref([]);
  const currentChatId = ref(-1);

  const newChatDefaults = {
    settingsForm: {
      url: 'http://localhost:11434',
      model: 'mistral:latest',
      temperature: '0.8',
      num_thread: '4',
      system: null,
      context: [],
      method: 'chat',
      pastMessages: [],
      renderAs: 'markdown',
    },

    statistics: {
      total_prompt_tokens: 0,
      total_eval_tokens: 0,
      total_time: 0,
    },

    models: [],
    responses: [],
    currentModelDetail: {},
    errorMessage: null,
  };

  function getNewChat() {
    return JSON.parse(JSON.stringify(newChatDefaults));
  }

  function addChat() {
    const id = chats.value.length;
    chats.value.push({ name: `Chat ${id + 1}`, chat: getNewChat() });
    currentChatId.value = id;
  }

  function switchChat(id) {
    if (id === currentChatId.value) {
      return;
    }

    currentChatId.value = id;
  }

  onMounted(() => {
    if (chats.value.length <= 0) {
      addChat();
    }
  });
</script>

<style scoped>
  .main-container {
    box-sizing: border-box;
    display: grid;
    height: 100vh;
    grid-template-columns: 100px calc(100% - 100px);
    grid-template-rows: 100vh;
  }

  .left-panel {
    display: flex;
    flex-direction: column;
    background-color: #f0f0f0;
    padding: 1rem;
    padding-right: 0;
  }

  button:hover {
    cursor: pointer;
  }

  button {
    height: 2rem;
    padding: 0.5rem;
    width: 100%;
    border: 1px solid black;
    border-right: 0;
    border-top-left-radius: 0.5rem;
    border-bottom-left-radius: 0.5rem;
  }

  button.active {
    background-color: #e0e0e0;
  }

  .hidden {
    display: none;
  }
</style>
