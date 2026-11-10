export const mockData = {
  bot_parameters: {
    greetingMessage: '{ "en": "Hello! How can I help you today?", "fr": " Faux bonjour! Comment puis-je vous aider aujourd\'hui?" }',
    primaryColor: "#012349",
    title: "MAX AI",
    featuredImage: '',
    campaignId: "xxx",
    conversationId: "mock-conversation-123",
    maintenanceMode: "off",
    autoFetchRecommendation: "on",
    cfSiteKey: "xxx",
    inputSuggestionsJSON:
[
  {
    "id": "1",
    "group_id": "intro",
    "conversationId": "mock-conversation-123",
    "text": {
      "en": "I would like to buy a property in Mauritius with a 700K USD budget, can you show me the available options?",
      "fr": "Je souhaite acheter une propriété à l'Île Maurice avec un budget de 700K EUR, pouvez-vous me montrer les options disponibles ?"
    },
    "next_options": ["location_1", "location_2", "location_3"],
    "action": "populate_input" // Options: "populate_input" (adds to input box) | "auto_submit" (sends immediately)
  },
  {
    "id": "location_1",
    "group_id": "location",
    "conversationId": "mock-conversation-123",
    "text": {
      "en": "I am interested in properties in the North Coast",
      "fr": "Je suis intéressé par des propriétés au Nord"
    },
    "next_options": ["type_1", "type_2", "type_3"]
  },
  {
    "id": "location_2",
    "group_id": "location",
    "conversationId": "mock-conversation-123",
    "text": {
      "en": "I prefer properties in the West Coast (Tamarin, Flic en Flac, Black River)",
      "fr": "Je préfère les propriétés sur la côte ouest (Tamarin, Flic en Flac, Rivière Noire)"
    },
    "next_options": ["type_1", "type_2", "type_3"]
  },
  {
    "id": "location_3",
    "group_id": "location",
    "conversationId": "mock-conversation-123",
    "text": {
      "en": "I am looking for a property in the South or East Coast (Bel Ombre, Beau Champ)",
      "fr": "Je recherche une propriété sur la côte sud ou est (Bel Ombre, Beau Champ)"
    },
    "next_options": ["type_1", "type_2", "type_3"]
  },
  {
    "id": "type_1",
    "group_id": "property_type",
    "conversationId": "mock-conversation-123",
    "text": {
      "en": "Villas with private pool",
      "fr": "Villas avec piscine privée"
    },
    "next_options": []
  },
  {
    "id": "type_2",
    "group_id": "property_type",
    "conversationId": "mock-conversation-123",
    "text": {
      "en": "Beachfront apartments or penthouses",
      "fr": "Appartements ou penthouses en bord de mer"
    },
    "next_options": []
  },
  {
    "id": "type_3",
    "group_id": "property_type",
    "conversationId": "mock-conversation-123",
    "text": {
      "en": "Luxury estates in golf resorts",
      "fr": "Au sein des domaines golf"
    },
    "next_options": []
  }
],
    floatingQuestions: [
      {
        "id": "floating_1",
        "text": {
          "en": "What's available under 500K?",
          "fr": "Qu'y a-t-il sous 500K?"
        }
      },
      {
        "id": "floating_2",
        "text": {
          "en": "Show me beachfront properties",
          "fr": "Montrez-moi les propriétés en bord de mer"
        }
      },
      {
        "id": "floating_3",
        "text": {
          "en": "I need help choosing",
          "fr": "J'ai besoin d'aide pour choisir"
        }
      }
    ],
    apiHostname: "http://localhost:8880",
    inventoryCode: "dodo",
    view: "both",
    errorMessage: `{ "en": "Fake sorry, something went wrong. If the issue persists, please contact support for assistance.", "fr": "Faux désolé, quelque chose s'est mal passé. Si le problème persiste, veuillez contacter le support pour obtenir de l'aide." }`,
    locale: "fr",
    preview: false,
    geoFilterMode: "include", // Values: "off" | "include" | "exclude"
    geoCountries: ["MU","FR"], // Example: ["MU", "US", "FR"]
  },
};

