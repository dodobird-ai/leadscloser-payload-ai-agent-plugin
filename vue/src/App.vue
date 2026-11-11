<template lang="pug">
.dodo-ai-chat(:class="{ 'dev-mode': debug }")
  .background(:class="{ 'full-screen': statusActive && (urlParams.fullscreen || statusSmallScreen) }" v-if="!isPreview")
  DevToolbar(v-if="debug")
  //- iframe(src="https://sir.mu" frameborder="0" class="dev-bg" v-if="debug")
  VueBotUI
</template>
<script>
import Cookies from "js-cookie";
import { uuidv7 } from "uuidv7";
import { useBotStore } from "@/store/bot";
import { mapState, mapActions } from "pinia";
import DevToolbar from "@/components/DevToolBar.vue";

export default {
  name: "DodoAiChat",
  components: {
    DevToolbar,
  },
  data() {
    return {
      debug: process.env.NODE_ENV === "development",
      savedScrollY: undefined,
      isPreview: window.bot_parameters.preview || false
    };
  },
  computed: {
    ...mapState(useBotStore, [
      "statusActive",
      "urlParams",
      "statusSmallScreen",
    ]),
  },
  created() {
    if (!this.isPreview) {
      this.fetchAuthToken();
      const httpsProtocol =
        window.location.protocol === "https:" ? true : false;
      if (!Cookies.get(this.$dodoCookies.session)) {
        Cookies.set(this.$dodoCookies.session, uuidv7(), {
          sameSite: "Strict",
          // domain: window.location.hostname.replace(/^www\./, ''),
          secure: httpsProtocol ? true : false,
        });
      }
      if (!Cookies.get(this.$dodoCookies.user)) {
        Cookies.set(this.$dodoCookies.user, uuidv7(), {
          expires: 730,
          sameSite: "Strict",
          // domain: window.location.hostname.replace(/^www\./, ''),
          secure: httpsProtocol ? true : false,
        });
      } else {
        Cookies.set(
          this.$dodoCookies.user,
          Cookies.get(this.$dodoCookies.user),
          {
            expires: 730,
            sameSite: "Strict",
            // domain: window.location.hostname.replace(/^www\./, ''),
            secure: httpsProtocol ? true : false,
          }
        );
      }
    }
    this.setStatusMaintenanceMode(true);
  },
  mounted() {
    this.setStatusSmallScreen(
      window.innerWidth < this.$dodoStyles.breakpoints.medium ? true : false
    );

    window.addEventListener("resize", () => {
      this.setStatusSmallScreen(
        window.innerWidth < this.$dodoStyles.breakpoints.medium ? true : false
      );
    });
  },
  methods: {
    ...mapActions(useBotStore, [
      "fetchAuthToken",
      "setStatusMaintenanceMode",
      "setStatusSmallScreen",
    ]),
    toggleBodyScroll(disable) {
      const body = document.body;

      if (disable) {
        // Save current scroll position
        this.savedScrollY = window.scrollY;

        // Disable scrolling and apply fixed positioning with the current scroll offset
        body.style.overflow = "hidden";
        body.style.position = "fixed";
        body.style.top = `-${this.savedScrollY}px`;
        body.style.width = "100%";
      } else {
        // Restore normal scrolling and positioning
        body.style.overflow = "";
        body.style.position = "";
        body.style.top = "";
        body.style.width = "";

        // Restore scroll position using saved value
        if (this.savedScrollY !== undefined) {
          window.scrollTo(0, this.savedScrollY);
          this.savedScrollY = undefined;
        }
      }
    },
  },
};
</script>
<style>
html {
  scrollbar-gutter: stable;
}

.dev-bg {
  width: 100%;
  height: 110vh;
  object-fit: cover;
}

/* Development mode background for testing blur effects */
.dodo-ai-chat.dev-mode {
  min-height: 300vh; /* Make it scrollable */
  position: relative;
  background:
    repeating-linear-gradient(
      180deg,
      #1e3a8a 0px,        /* Dark blue */
      #1e3a8a 50vh,       /* Dark blue section */
      #ffffff 50vh,        /* White */
      #ffffff 100vh        /* White section */
    );
}

/* Text overlay for blur test */
.dodo-ai-chat.dev-mode::before {
  content: 'TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• ';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  font-size: 18px;
  font-weight: bold;
  line-height: 1.8;
  background: repeating-linear-gradient(
    180deg,
    transparent 0px,
    transparent 50vh,
    rgba(255, 255, 255, 0.1) 50vh,
    rgba(255, 255, 255, 0.1) 100vh
  );
  background-clip: text;
  -webkit-background-clip: text;
  color: rgba(255, 255, 255, 0.3); /* Light text on dark sections */
  word-wrap: break-word;
  padding: 20px;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

/* Add darker text on white sections using a pseudo-element approach */
.dodo-ai-chat.dev-mode::after {
  content: 'TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• TESTING BLUR EFFECT ••• ';
  position: absolute;
  top: 50vh;
  left: 0;
  width: 100%;
  height: 100%;
  font-size: 18px;
  font-weight: bold;
  line-height: 1.8;
  color: rgba(0, 0, 0, 0.15); /* Dark text on white sections */
  word-wrap: break-word;
  padding: 20px;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  clip-path: polygon(
    0 0,
    100% 0,
    100% 50vh,
    0 50vh,
    0 0,
    0 100vh,
    100% 100vh,
    100% 150vh,
    0 150vh
  );
}

@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&family=Plaster&family=Urbanist:wght@400&display=swap");
</style>
