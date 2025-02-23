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
          >
            <div v-if="editChatId !== idx" class="chat-name">{{ chat.name }}</div>
            <v-text-field v-else
                          v-model="chat.name"
                          variant="solo"
                          hide-details
                          density="compact"
                          style="width: 100px"
                          @blur="editChatId = -1; saveAll()"
            />

            <v-menu v-if="currentChatId === idx">
              <template v-slot:activator="{ props }">
                <v-icon icon="mdi-dots-vertical" v-bind="props" class="tab-dots"></v-icon>
              </template>

              <v-list>
                <v-list-item>
                  <v-list-item-title @click.prevent="editChatId = idx" class="cursor-pointer">
                    <v-icon icon="mdi-pencil"></v-icon> Edit name
                  </v-list-item-title>
                </v-list-item>

                <v-list-item>
                  <v-list-item-title @click.prevent="deleteChat(idx)" class="cursor-pointer">
                    <v-icon icon="mdi-trash-can"></v-icon> Delete
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-tab>
        </v-tabs>

        <br />
        <v-col class="d-flex flex-column">
          <v-btn @click.prevent="addChat()">Add Chat</v-btn>
        </v-col>
      </v-navigation-drawer>

      <v-main>
        <Chat v-for="(chat, idx) in chats"
              :key="idx"
              v-model="chat.chat"
              :class="{ hidden: idx !== currentChatId }"
              :currentChatId="idx"
              @change="saveAll"
        />
      </v-main>
    </v-layout>
  </v-card>

  <Notivue v-slot="item">
    <Notification :item="item" />
  </Notivue>
</template>

<script setup>
  import { onMounted, ref, watch } from "vue";
  import Chat from "@/components/Chat.vue";
  import { Notivue, Notification, push } from 'notivue';
  import { useTheme } from "vuetify";

  const chats = ref([]);
  const currentChatId = ref(-1);
  const editChatId = ref(-1);

  const newChatDefaults = {
    settingsForm: {
      url: 'http://localhost:11434',
      model: null,
      temperature: '0.8',
      num_thread: '4',
      system: null,
      context_length: 2048,
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

  const theme = useTheme();

  function saveTheme() {
    localStorage.setItem('theme', theme.global.name.value);
  }

  function saveCurrentChatId() {
    localStorage.setItem('currentChatId', currentChatId.value.toString());
  }

  function saveAll() {
    const data = JSON.stringify(chats.value);
    localStorage.setItem('chats', data);
    saveCurrentChatId();
    saveTheme();
    // push.success('All was saved.');
  }

  function restoreAll() {
    let data = localStorage.getItem('chats');
    if (data) {
      chats.value = JSON.parse(data);
      if (chats.value.length > 0) {
        data = localStorage.getItem('currentChatId');
        currentChatId.value = data ? parseInt(data) : 0;
      }
    }
    data = localStorage.getItem('theme');
    if (data) {
      theme.global.name.value = data;
    }
  }

  function deleteChat(idx) {
    if (currentChatId.value === idx) {
      currentChatId.value -= 1;
    }
    chats.value.splice(idx, 1);
    saveAll();
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

  watch(currentChatId, () => {
    saveCurrentChatId();
  })
</script>

<style scoped>
  .hidden {
    display: none;
  }

  .v-theme--light .active {
    background-color: #efefef;
  }

  .v-theme--dark .active {
    background-color: #161616;
  }

  .tab-dots {
    position: absolute;
    right: 0;
  }

  .chat-name {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    width: 105px;
    text-align: left;
  }
</style>
