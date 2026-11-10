import { createI18n } from "vue-i18n";

const i18n = createI18n({
    locale: "en",
    fallbackLocale: "en",
    messages: {
        en: {
            btn: {
                sidebarView: "Sidebar View (Beta)",
                chatbotView: "Chatbot View",
                typeAnything: "type anything",
                sendFeedback: "send feedback",
                newChat: "new chat",
                loading: "loading",
                submit: "Submit",
                viewItem: "View",
                viewRecentChats: "View recent chats",
                sendMessageToAgent: "Send Message to Agent",
                viewDetailedPage: "Visit Detailed Page",
            },
            placeholder: {
                askMaxAI: "Ask Max AI...",
                continueConversation: "Continue conversation",
                typeMessage: "Ask anything",
            },
            text: {
                disclaimer: "{botTitle} can make mistakes. Check important info.",
                greetingMessage: "Hello! How can I help you today?",
                errorMessage:
                    "Sorry, something went wrong. If the issue persists, please contact support for assistance.",
                readMore: "Read more",
                readLess: "Read less",
                publicPrice: "public price",
                itemImageNotAvailable: "Item image not available",
                yourSearchCriteria: "Your Search Criteria",
                privacyPolicyAgreement: 'I agree to the <a href="https://sothebysrealty.mu/privacy-policy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a>',
                description: "Description",
                contactAgent: "Contact Agent",
                bedrooms: "Bedrooms",
                bathrooms: "Bathrooms",
                toilets: "Toilets",
                lot: "Lot",
                terrace: "Terrace",
                parkingSpaces: "Parking",
                built: "Built in",
                featuresAmenities: "Features & Amenities",
            },
            exitIntent: {
                title: "Before you go!",
                message: "It was great chatting with you. Would you like to leave your contact details so one of our agents can follow up with personalized property recommendations?",
                yesButton: "Yes, I'd like that",
                noButton: "No thanks, close",
            },
        },
        fr: {
            btn: {
                sidebarView: "Vue en barre latérale (Bêta)",
                chatbotView: "Vue du chatbot",
                typeAnything: "tapez n'importe quoi",
                sendFeedback: "envoyer des commentaires",
                newChat: "nouvelle discussion",
                loading: "chargement",
                submit: "Soumettre",
                viewItem: "Voir",
                viewRecentChats: "Voir les discussions récentes",
                sendMessageToAgent: "Envoyer un message à l'agent",
                viewDetailedPage: "Visiter la page détaillée",
            },
            placeholder: {
                askMaxAI: "Demandez à Max AI...",
                continueConversation: "Continuer la conversation",
                typeMessage: "Demandez n'importe quoi",
            },
            text: {
                disclaimer:
                    "{botTitle} peut faire des erreurs. Vérifiez les informations importantes.",
                greetingMessage: "Bonjour! Comment puis-je vous aider aujourd'hui?",
                errorMessage:
                    "Désolé, quelque chose s'est mal passé. Si le problème persiste, veuillez contacter le support pour obtenir de l'aide.",
                readMore: "Lire la suite",
                readLess: "Lire moins",
                publicPrice: "prix public",
                itemImageNotAvailable: "Image de l'item non disponible",
                yourSearchCriteria: "Vos critères de recherche",
                privacyPolicyAgreement: 'J\'accepte la <a href="https://sothebysrealty.mu/privacy-policy/" target="_blank" rel="noopener noreferrer">Politique de Confidentialité</a>',
                description: "Description",
                contactAgent: "Contacter l'agent",
                bedrooms: "Chambres",
                bathrooms: "Salles de bain",
                toilets: "Toilettes",
                lot: "Terrain",
                terrace: "Terrasse",
                parkingSpaces: "Parking",
                built: "Construit en",
                featuresAmenities: "Caractéristiques & Équipements",
            },
            exitIntent: {
                title: "Avant de partir!",
                message: "C'était super de discuter avec vous. Souhaitez-vous laisser vos coordonnées pour qu'un de nos agents puisse vous recontacter avec des recommandations personnalisées?",
                yesButton: "Oui, je veux bien",
                noButton: "Non merci, fermer",
            },
        },
    },
});

const setGlobalLocale = (locale) => {
    i18n.global.locale = locale;
};

const getGlobalLocale = () => {
    return i18n.global.locale;
};

const t = (key, values = {}) => {
    return i18n.global.t(key, values);
};

export { setGlobalLocale, getGlobalLocale, t };
export default i18n;
