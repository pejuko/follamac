<template>
  <v-card height="100vh" width="100vw">
    <v-layout>
      <v-navigation-drawer floating permanent width="150px">
        <v-tabs
            v-model="currentChatId"
            direction="vertical"
            style="width: 100%;"
            selected-class="active"
            grow
        >
          <v-tab v-for="(chat, idx) in chats"
                 :value="idx"
          >{{ chat.name }}</v-tab>
        </v-tabs>

        <br />
        <v-col class="d-flex flex-column">
          <v-btn @click.prevent="addChat()">Add Chat</v-btn>
          <br />
          <v-btn @click.prevent="saveAll()">Save All</v-btn>
          <br />
          <v-btn @click.prevent="clearAll()" color="red-darken-4">Clear All</v-btn>
        </v-col>
      </v-navigation-drawer>

      <v-main>
        <Chat v-for="(chat, idx) in chats" :key="idx" v-model="chat.chat" :class="{ hidden: idx !== currentChatId }" :currentChatId="idx" />
      </v-main>
    </v-layout>
  </v-card>

  <Notivue v-slot="item">
    <Notification :item="item" />
  </Notivue>
</template>

<script setup>
  import { onMounted, ref } from "vue";
  import Chat from "@/components/Chat.vue";
  import { Notivue, Notification, push } from 'notivue';

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
      role: 'user',
    },

    statistics: {
      total_prompt_tokens: 0,
      total_eval_tokens: 0,
      total_time: 0,
    },

    models: [],
    responses: [],
    currentModelDetail: {},
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

  function saveAll() {
    const data = JSON.stringify(chats.value);
    localStorage.setItem('chats', data);
    push.success('All was saved.');
  }

  function restoreAll() {
    let data = localStorage.getItem('chats');
    if (data) {
      chats.value = JSON.parse(data);
      if (chats.value.length > 0) {
        currentChatId.value = 0;
      }
    }
  }

  function clearAll() {
    currentChatId.value = -1;
    chats.value = [];
    addChat();
    localStorage.removeItem('chats');
  }

  onMounted(() => {
    restoreAll();
    if (chats.value.length <= 0) {
      addChat();
    }
  });
</script>

<style scoped>
  .hidden {
    display: none;
  }

  .active {
    background-color: #efefef;
  }

  .tab {
    padding: 0.5rem;
  }

  .tab.warning {
    background-color: #c06718;
  }
</style>
