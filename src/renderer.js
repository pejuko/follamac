/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import { createApp } from 'vue';

import { createNotivue } from 'notivue'
import 'notivue/notifications.css' // Only needed if using built-in notifications
import 'notivue/animations.css' // Only needed if using built-in animations

import App from './App.vue';

const app = createApp(App);
const notivue = createNotivue({
  notifications: {
    global: {
      duration: Infinity,
    },
  },
});

app.use(notivue);

app.mount('#app');
