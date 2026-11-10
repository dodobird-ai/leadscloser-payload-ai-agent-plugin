import VueBotUI from "./components/BotUI.vue";

const Plugin = {
  install: (app, options) => {
    app.component("VueBotUI", VueBotUI);

    if (options) {
      // console.log('options', options)
    }
  },
};

export default Plugin;
export { VueBotUI };
