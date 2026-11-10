import en from "@vueform/vueform/locales/en";
import fr from "@vueform/vueform/locales/fr";
import bootstrap from "@vueform/vueform/dist/bootstrap";
import { defineConfig } from "@vueform/vueform";
import { NationalityElement, CustomPhoneElement } from "./components/forms/elements";

const vueformConfig = defineConfig({
  theme: bootstrap,
  locales: { en, fr },
  locale: "en",
  elements: [
    NationalityElement,
    CustomPhoneElement,
  ],
});

export default vueformConfig;
