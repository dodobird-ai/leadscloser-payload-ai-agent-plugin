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

    // Quick-access countries from backend schema (no fallback — backend is source of truth)
    const quickAccessCountries = context.attrs.quick_access_countries;

    // Create a computed property that prepends quick-access countries and sorts the rest
    const sortedAddonOptions = computed(() => {
      if (
        !element.addonOptions.value ||
        !Array.isArray(element.addonOptions.value)
      ) {
        return element.addonOptions.value;
      }

      // If backend didn't provide quick-access countries, return options as-is
      if (!Array.isArray(quickAccessCountries) || quickAccessCountries.length === 0) {
        return element.addonOptions.value;
      }

      const allOptions = [...element.addonOptions.value];

      // Find quick-access country options
      const quickAccessOptions = [];
      quickAccessCountries.forEach((countryCode) => {
        const found = allOptions.find((option) => option.value === countryCode);
        if (found) {
          quickAccessOptions.push(found);
        }
      });

      // Create separator object
      const separator = {
        value: "separator",
        label: "──────────",
        disabled: true,
        separator: true,
      };

      // Combine: quick-access countries first, then the rest
      return [...quickAccessOptions, separator, ...allOptions];
    });
    return {
      ...element,
      addonOptions: sortedAddonOptions,
    };
  },
});
</script>
