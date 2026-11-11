<!-- NationalityElement.vue -->

<template>
  <ElementLayout>
    <template #element>
      <div :class="classes.container">
        <!-- Nationality Selection Buttons -->
        <div :class="classes.buttonsWrapper">
          <button
            v-for="nationality in predefinedNationalities"
            :key="nationality"
            type="button"
            :class="[
              classes.nationalityButton,
              {
                [classes.active]: selectedNationality === nationality,
              },
            ]"
            @click="selectNationality(nationality)"
          >
            {{ nationality }}
          </button>

          <!-- Others Dropdown Button -->
          <div :class="classes.dropdownWrapper">
            <button
              type="button"
              :class="[
                classes.nationalityButton,
                classes.dropdownButton,
                { [classes.active]: isOthersSelected },
              ]"
              @click="toggleDropdown"
            >
              {{
                isOthersSelected && selectedNationality
                  ? selectedNationality
                  : "Others"
              }}
              <span
                :class="[
                  classes.dropdownArrow,
                  { [classes.rotated]: showDropdown },
                ]"
                >▼</span
              >
            </button>

            <!-- Dropdown Menu -->
            <div v-if="showDropdown" :class="classes.dropdown">
              <div :class="classes.searchWrapper">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search"
                  :class="classes.searchInput"
                  @click.stop
                />
              </div>
              <div :class="classes.dropdownList">
                <button
                  v-for="nationality in filteredNationalities"
                  :key="nationality"
                  type="button"
                  :class="classes.dropdownItem"
                  @click="selectNationalityFromDropdown(nationality)"
                >
                  {{ nationality }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-for="(component, slot) in elementSlots" #[slot]>
      <slot :name="slot" :el$="el$">
        <component :is="component" :el$="el$" />
      </slot>
    </template>
  </ElementLayout>
</template>

<script>
import { defineElement } from "@vueform/vueform";
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

export default defineElement({
  name: "NationalityElement",
  setup(props, context) {
    const { element } = context;
    const showDropdown = ref(false);
    const searchQuery = ref("");
    const selectedNationality = ref(null);
    const defaultNationality = ref("");

    // Predefined nationalities from backend schema via attrs (no fallback — backend is source of truth)
    const schemaPredefined = context.attrs.predefined_nationalities;
    const predefinedNationalities = ref(
      Array.isArray(schemaPredefined) ? schemaPredefined : []
    );

    // All nationalities for the dropdown
    const allNationalities = ref([
      "Afghan",
      "Albanian",
      "Algerian",
      "American",
      "Andorran",
      "Angolan",
      "Antiguan and Barbudan",
      "Argentinian",
      "Armenian",
      "Australian",
      "Austrian",
      "Azerbaijani",
      "Bahamian",
      "Bahraini",
      "Bangladeshi",
      "Barbadian",
      "Belarusian",
      "Belgian",
      "Belizean",
      "Beninese",
      "Bhutanese",
      "Bolivian",
      "Bosnian",
      "Botswanan",
      "Brazilian",
      "British",
      "Bruneian",
      "Bulgarian",
      "Burkinabe",
      "Burundian",
      "Cambodian",
      "Cameroonian",
      "Canadian",
      "Cape Verdean",
      "Central African",
      "Chadian",
      "Chilean",
      "Chinese",
      "Colombian",
      "Comoran",
      "Congolese (Congo)",
      "Congolese (DRC)",
      "Costa Rican",
      "Croatian",
      "Cuban",
      "Cypriot",
      "Czech",
      "Danish",
      "Djiboutian",
      "Dominican",
      "Dutch",
      "East Timorese",
      "Ecuadorean",
      "Egyptian",
      "Emirati",
      "Equatorial Guinean",
      "Eritrean",
      "Estonian",
      "Ethiopian",
      "Fijian",
      "Filipino",
      "Finnish",
      "French",
      "Gabonese",
      "Gambian",
      "Georgian",
      "German",
      "Ghanaian",
      "Greek",
      "Grenadian",
      "Guatemalan",
      "Guinean",
      "Guyanese",
      "Haitian",
      "Honduran",
      "Hungarian",
      "Icelandic",
      "Indian",
      "Indonesian",
      "Iranian",
      "Iraqi",
      "Irish",
      "Israeli",
      "Italian",
      "Ivorian",
      "Jamaican",
      "Japanese",
      "Jordanian",
      "Kazakhstani",
      "Kenyan",
      "Kittitian and Nevisian",
      "Kuwaiti",
      "Kyrgyz",
      "Laotian",
      "Latvian",
      "Lebanese",
      "Liberian",
      "Libyan",
      "Liechtensteiner",
      "Lithuanian",
      "Luxembourger",
      "Macedonian",
      "Malagasy",
      "Malawian",
      "Malaysian",
      "Maldivian",
      "Malian",
      "Maltese",
      "Marshallese",
      "Mauritanian",
      "Mauritian",
      "Mexican",
      "Micronesian",
      "Moldovan",
      "Monegasque",
      "Mongolian",
      "Montenegrin",
      "Moroccan",
      "Mozambican",
      "Namibian",
      "Nauruan",
      "Nepalese",
      "New Zealander",
      "Nicaraguan",
      "Nigerien",
      "Nigerian",
      "North Korean",
      "Norwegian",
      "Omani",
      "Pakistani",
      "Palauan",
      "Palestinian",
      "Panamanian",
      "Papua New Guinean",
      "Paraguayan",
      "Peruvian",
      "Polish",
      "Portuguese",
      "Qatari",
      "Romanian",
      "Russian",
      "Rwandan",
      "Saint Lucian",
      "Salvadoran",
      "Sammarinese",
      "Samoan",
      "Sao Tomean",
      "Saudi Arabian",
      "Senegalese",
      "Serbian",
      "Seychellois",
      "Sierra Leonean",
      "Singaporean",
      "Slovak",
      "Slovenian",
      "Solomon Islander",
      "Somali",
      "South African",
      "South Korean",
      "South Sudanese",
      "Spanish",
      "Sri Lankan",
      "Sudanese",
      "Surinamese",
      "Swazi",
      "Swedish",
      "Swiss",
      "Syrian",
      "Taiwanese",
      "Tajikistani",
      "Tanzanian",
      "Thai",
      "Togolese",
      "Tongan",
      "Trinidadian and Tobagonian",
      "Tunisian",
      "Turkish",
      "Turkmen",
      "Tuvaluan",
      "Ugandan",
      "Ukrainian",
      "Uruguayan",
      "Uzbekistani",
      "Vanuatuan",
      "Vatican",
      "Venezuelan",
      "Vietnamese",
      "Yemeni",
      "Zambian",
      "Zimbabwean",
    ]);

    // Filtered nationalities based on search
    const filteredNationalities = computed(() => {
      if (!searchQuery.value) return allNationalities.value;
      return allNationalities.value.filter((nationality) =>
        nationality.toLowerCase().includes(searchQuery.value.toLowerCase())
      );
    });

    // Check if "Others" is selected (nationality not in predefined list)
    const isOthersSelected = computed(() => {
      if (!selectedNationality.value) return false;
      return !predefinedNationalities.value.includes(selectedNationality.value);
    });

    // Select nationality from buttons
    const selectNationality = (nationality) => {
      selectedNationality.value = nationality;
      updateModel();
    };

    // Select nationality from dropdown
    const selectNationalityFromDropdown = (nationality) => {
      selectedNationality.value = nationality;
      showDropdown.value = false;
      searchQuery.value = "";
      updateModel();
    };

    // Toggle dropdown visibility
    const toggleDropdown = () => {
      showDropdown.value = !showDropdown.value;
      if (!showDropdown.value) {
        searchQuery.value = "";
      }
    };

    // Close dropdown when clicking outside
    const closeDropdown = (event) => {
      if (!event.target.closest(".dropdown-wrapper")) {
        showDropdown.value = false;
        searchQuery.value = "";
      }
    };

    // Update the element's model value
    const updateModel = () => {
      const value = {
        name: selectedNationality.value || "",
      };
      element.model.value = value;
    };

    // Initialize from existing model value
    const initializeFromModel = () => {
      if (element.model.value && typeof element.model.value === "object") {
        const modelValue = element.model.value;

        if (modelValue.name) {
          // Find nationality by name
          const nationality = [
            ...predefinedNationalities.value,
            ...allNationalities.value,
          ].find((n) => n === modelValue.name);
          if (nationality) {
            selectedNationality.value = nationality;
          }
        }
      } else if (!selectedNationality.value) {
        // Auto-select the default nationality if no nationality is currently selected
        const nationality = [
          ...predefinedNationalities.value,
          ...allNationalities.value,
        ].find((n) => n === defaultNationality.value);
        if (nationality) {
          selectedNationality.value = nationality;
          updateModel();
        }
      }
    };

    // Watch for model changes and reinitialize
    watch(
      () => element.model.value,
      (newValue) => {
        if (newValue) {
          initializeFromModel();
        }
      },
      { deep: true }
    );

    onMounted(() => {
      document.addEventListener("click", closeDropdown);
      defaultNationality.value =
        element.defaultValue.value || predefinedNationalities.value[0];
      initializeFromModel();
    });

    onUnmounted(() => {
      document.removeEventListener("click", closeDropdown);
    });

    return {
      showDropdown,
      searchQuery,
      selectedNationality,
      predefinedNationalities,
      allNationalities,
      filteredNationalities,
      isOthersSelected,
      selectNationality,
      selectNationalityFromDropdown,
      toggleDropdown,
      updateModel,
    };
  },
  data() {
    return {
      defaultClasses: {
        container: "nationality-container",
        buttonsWrapper: "nationality-buttons-wrapper",
        nationalityButton: "nationality-button",
        active: "active",
        dropdownWrapper: "dropdown-wrapper",
        dropdownButton: "dropdown-button",
        dropdownArrow: "dropdown-arrow",
        rotated: "rotated",
        dropdown: "xdropdown-menu",
        searchWrapper: "search-wrapper",
        searchInput: "search-input",
        dropdownList: "dropdown-list",
        dropdownItem: "dropdown-item",
        selectedNationality: "selected-nationality",
        flag: "flag",
        nationalityName: "nationality-name",
      },
    };
  },
});
</script>

<style lang="scss" scoped>
@import '@/assets/scss/variables';
.nationality-container {
  width: 100%;
}

.nationality-buttons-wrapper {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  position: relative;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.nationality-button {
  padding: 0.75rem 0.5rem;
  border: 1px solid #dee2e6;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  text-align: center;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  word-break: break-word;
  hyphens: auto;
  line-height: 1.3;
  width: 100%;
  max-width: 100%;

  &:hover {
    color: #e9ecef;
  }

  &.active {
    color: white;
  }
}

.dropdown-wrapper {
  position: relative;
  display: flex;
  align-items: stretch;
}

.dropdown-button {
  flex: 1;
  gap: 0.5rem;
}

.dropdown-arrow {
  font-size: 0.75rem;
  transition: transform 0.2s ease;

  &.rotated {
    transform: rotate(180deg);
  }
}

.xdropdown-menu {
  position: absolute;
  bottom: 100%;
  left: 50%;
  width: 200px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: $z-index-root + 3;
  max-height: 300px;
  overflow: hidden;
  margin-bottom: 0.25rem;
  transform: translateX(-50%);
}

.search-wrapper {
  padding: 0.5rem;
}

.search-input {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
}

.dropdown-list {
  padding: 0.5rem;
  max-height: 240px;
  overflow-y: auto;
}

.dropdown-item {
  width: 100%;
  padding: 0.5rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.875rem;
  border-bottom: 1px solid #f8f9fa;

  &:hover {
    background-color: #f8f9fa;
  }

  &:last-child {
    border-bottom: none;
  }
}

.selected-nationality {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.flag {
  font-size: 1.125rem;
}

.nationality-name {
  font-weight: 500;
  color: #495057;
}
</style>
