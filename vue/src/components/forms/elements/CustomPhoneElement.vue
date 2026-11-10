<!-- CustomElement.vue -->

<script>
import { defineElement, PhoneElement } from "@vueform/vueform";
import { PhoneElement as PhoneElementTemplate } from "@vueform/vueform/dist/bootstrap";
import { computed } from "vue";

export default defineElement({
  ...PhoneElement, // adding props, mixins, emits
  ...PhoneElementTemplate,
  name: "CustomPhoneElement",
  setup(props, context) {
    const element = PhoneElement.setup(props, context);
    const favoriteCountries = context.attrs.favorites;

    // Create a computed property that prepends favorites and sorts the rest
    const sortedAddonOptions = computed(() => {
      if (
        !element.addonOptions.value ||
        !Array.isArray(element.addonOptions.value)
      ) {
        return element.addonOptions.value;
      }

      const allOptions = [...element.addonOptions.value];

      // Find favorite country options
      const favoriteOptions = [];
      favoriteCountries.forEach((countryCode) => {
        const found = allOptions.find((option) => option.value === countryCode);
        if (found) {
          favoriteOptions.push(found);
        }
      });

      // Create separator object
      const separator = {
        value: "separator",
        label: "──────────",
        disabled: true,
        separator: true,
      };

      // Combine: favorites first, then the rest
      return [...favoriteOptions, separator, ...allOptions];
    });
    return {
      ...element,
      addonOptions: sortedAddonOptions,
    };
  },
});
</script>
