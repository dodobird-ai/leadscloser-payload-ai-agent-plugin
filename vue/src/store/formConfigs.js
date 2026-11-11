import { useBotStore } from "@/store/bot";
import { botHelper } from "@/helpers/bot";
import { setGlobalLocale, getGlobalLocale, t } from "@/i18n";
import { uuidv7 } from "uuidv7";
// import NationalityElement from "@/components/forms/elements/NationalityElement.vue";

export const formConfigs = {
  localeForm: {
    schema: {
      language: {
        type: "select",
        label: { en: "Language", fr: "Langue" },
        info: { en: "Your preferred language", fr: "Votre langue préférée" },
        size: "sm",
        fieldName: "language",
        rules: ["required"],
        items: [
          {
            value: "en",
            label: { en: "English", fr: "English" },
          },
          {
            value: "fr",
            label: { en: "Français", fr: "Français" },
          },
        ],
        native: false,
        floating: false,
        search: false,
        canDeselect: false,
        canClear: false,
        default: "en",
        openDirection: "bottom",
      },
      currency: {
        type: "select",
        label: { en: "Currency", fr: "Devise" },
        info: { en: "Your preferred currency", fr: "Votre devise préférée" },
        size: "sm",
        fieldName: "currency",
        rules: ["required"],
        items: [
          {
            value: "USD",
            label: { en: "USD ($)", fr: "USD ($)" },
          },
          {
            value: "MUR",
            label: { en: "MUR (Rs)", fr: "MUR (Rs)" },
          },
          {
            value: "EUR",
            label: { en: "EUR (€)", fr: "EUR (€)" },
          },
          {
            value: "ZAR",
            label: {
              en: "South African Rand (ZAR)",
              fr: "Rand sud-africain (ZAR)",
            },
          },
        ],
        native: false,
        floating: false,
        search: false,
        canDeselect: false,
        canClear: false,
        default: "USD",
        openDirection: "bottom",
      },
      is_foreigner: {
        type: "radiogroup",
        fieldName: "is_foreigner",
        items: [
          {
            value: false,
            label: { en: "No", fr: "Non" },
          },
          {
            value: true,
            label: { en: "Yes", fr: "Oui" },
          },
        ],
        default: false,
        label: { en: "Are you Mauritian?", fr: "Êtes vous Mauricien? " },
        view: "tabs",

        rules: ["required"],
      },
      purpose: {
        type: "radiogroup",
        default: "Buy",

        items: [
          {
            value: "Buy",
            label: { en: "Buy", fr: "Acheter" },
          },
          {
            value: "Rent",
            label: { en: "Rent", fr: "Louer" },
          },
        ],
        label: { en: "Purpose: ", fr: "Souhait: " },
        view: "tabs",
        rules: ["required"],
      },
      divider: {
        type: "static",
        bottom: "0",
        size: "sm",
        top: "0",
        content: "<div></div>",
      },
    },
    title: {
      en: "Before I submit your message, please fill in the info below",
      fr: "Avant de soumettre votre message, veuillez remplir les informations ci-dessous"
    },
    subTitle: null,
    quit: false,
    submit: async (data) => {
      const botStore = useBotStore();

      // Transform is_foreigner boolean to accessible_property_types array
      // true (Mauritian) → can access both local (0) and foreigner (1) properties
      // false (Foreigner) → can only access foreigner (1) properties
      const transformedData = {
        ...data
      };
      transformedData.is_foreigner = data.is_foreigner ? ["0", "1"] : ["1"]

      // 1. Save State
      botStore.setDynamicFormData("localeForm", transformedData);
      setGlobalLocale(data.language);
      botStore.setDynamicForm({
        show: false,
      });
      botStore.setConversationId(uuidv7());
      botStore.createConversation()
      if (botStore.messagesDataForCurrentConversation.length < 1) {
        const greetingMessage = botStore.botParameters.greetingMessage
          ? JSON.parse(botStore.botParameters.greetingMessage)[
              getGlobalLocale()
            ]
          : t("text.greetingMessage");
        botStore.setMessagesData({
          id: uuidv7(),
          conversation_id: botStore.session.conversationId,
          sender_id: null,
          content: greetingMessage,
          delivered: false,
          viewed: false,
          sent_at: null,
          message_type: "bot",
          metadata: {},
          tags: {},
          tenantId: null,
        });
      }
    },
  },
  contactForm: {
    schema: {
      // pageTitle: {
      //   type: "static",
      //   content: { en: "Introduce yourself", fr: "Présentez-vous" },
      //   size: "sm",
      //   tag: "h3"
      // },
      // pageSubtitle: {
      //   type: "static",
      //   content: {
      //     en: "We collect this to ensure premium support, even after disconnection.",
      //     fr: "Nous collectons ces informations pour garantir un support premium, même après la déconnexion.",
      //   },
      //   size: "sm",
      //   tag: "p"
      // },
      first_name: {
        type: "text",
        placeholder: "John",
        size: "sm",
        rules: ["required", "min:2", "max:50"],
        fieldName: "first_name",
        info: { en: "Your first name", fr: "Votre prénom" },
        label: { en: "First Name", fr: "Prénom" },
        floating: false,
      },
      last_name: {
        type: "text",
        placeholder: "Doe",
        size: "sm",
        rules: ["required", "min:2", "max:50"],
        fieldName: "last_name",
        info: { en: "Your last name", fr: "Votre nom de famille" },
        label: { en: "Last Name", fr: "Nom de famille" },
        floating: false,
      },
      email: {
        type: "text",
        label: { en: "Email Address", fr: "Adresse e-mail" },
        placeholder: "visitor@example.com",
        size: "sm",
        rules: ["required", "email"],
        fieldName: "email",
        info: {
          en: "Your personal email address",
          fr: "Votre adresse e-mail personnelle",
        },
        floating: false,
      },
      nationality: {
        type: 'nationality',
        label: { en: "Nationality", fr: "Nationalité" },
        size: "sm",
        info: { en: "Your nationality", fr: "Votre nationalité" },

        rules: ["required"],
      },
      phone_number: {
        //   type: "phone",
        //   size: "sm",
        type: "custom_phone",
        placeholder: "+1234567890",
        label: { en: "Phone", fr: "Téléphone" },
        info: { en: "Your phone number", fr: "Votre numéro de téléphone" },
        floating: false,
        rules: ["required", "string"],
        fieldName: "phone_number",
        allowIncomplete: true,
        unmask: true,
        favorites: ["MU", "FR", "ZA", "BE", "GB", "DE", "AE", "CH"],
      },
      privacy_policy_notice: {
        type: "static",
        content: {
          en: 'By clicking Submit, I agree with the <a href="https://sothebysrealty.mu/privacy-policy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a>',
          fr: 'En cliquant sur Soumettre, j\'accepte la <a href="https://sothebysrealty.mu/privacy-policy/" target="_blank" rel="noopener noreferrer">Politique de Confidentialité</a>'
        },
        size: "sm",
        tag: "p",
        attrs: {
          style: "font-size: 0.85rem; color: #6c757d; margin-top: 0.25rem; margin-bottom: 0;"
        }
      },
      divider: {
        type: "static",
        bottom: "0",
        size: "sm",
        content: "<div></div>",
      },
    },
    quit: true,
    submit: async (data) => {
      const botStore = useBotStore();

      // 1. Save State
      botStore.setDynamicFormData("contactForm", data);

      // 2. Submit to backend
      await botStore.actionExecuteBackend({
        url: "save_user",
        params: data,
      });

      botStore.setDynamicForm({
        show: false,
      });

      await botHelper.executePendingAction(botStore);
    },
  },
  emailOnlyForm: {
    schema: {
      form_header: {
        type: "static",
        content: {
          en: "<p style='margin-bottom: 0.5rem; font-size: 0.95rem;'>If you'd like to receive our exclusive <strong>Buyer's Guide</strong>, please enter your email below:</p>",
          fr: "<p style='margin-bottom: 0.5rem; font-size: 0.95rem;'>Si vous souhaitez recevoir notre <strong>Guide Acheteur</strong> exclusif, veuillez entrer votre email ci-dessous:</p>",
        },
        size: "sm",
      },
      email: {
        type: "text",
        label: { en: "Email Address", fr: "Adresse e-mail" },
        placeholder: "visitor@example.com",
        size: "sm",
        rules: ["required", "email"],
        fieldName: "email",
        floating: false,
      },
      wants_expert_support: {
        type: "radiogroup",
        fieldName: "wants_expert_support",
        items: [
          { value: true, label: { en: "Yes", fr: "Oui" } },
          { value: false, label: { en: "No", fr: "Non" } },
        ],
        label: {
          en: "Would you like to be contacted by an expert?",
          fr: "Souhaitez-vous être contacté par un expert?",
        },
        view: "tabs",
        rules: ["required"],
        conditions: [["email", "not_empty"]],
      },
    },
    title: null,
    subTitle: null,
    quit: false,
  },
};
