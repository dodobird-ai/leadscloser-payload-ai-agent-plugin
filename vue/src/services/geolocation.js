/**
 * Geolocation service to detect user's country based on IP address
 */

// Map country codes to currency codes for auto-detection
// Only EUR, USD, ZAR, and MUR are supported
// All other countries (including UK, Switzerland, UAE) default to USD
const COUNTRY_TO_CURRENCY = {
  'MU': 'MUR',  // Mauritius
  'FR': 'EUR', 'DE': 'EUR', 'BE': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR',
  'AT': 'EUR', 'PT': 'EUR', 'IE': 'EUR', 'FI': 'EUR', 'GR': 'EUR', 'LU': 'EUR',
  'ZA': 'ZAR',  // South Africa
  // GB (UK), CH (Switzerland), AE (UAE), US, and all others -> USD (default fallback)
};

// Map country codes to nationality names that match the nationality element
const COUNTRY_TO_NATIONALITY = {
  'MU': 'Mauritian',
  'FR': 'French', 
  'ZA': 'South African',
  'BE': 'Belgian',
  'GB': 'British',
  'DE': 'German',
  'AE': 'Emirati',
  'CH': 'Swiss',
  'US': 'American',
  'CA': 'Canadian',
  'AU': 'Australian',
  'IN': 'Indian',
  'CN': 'Chinese',
  'JP': 'Japanese',
  'BR': 'Brazilian',
  'IT': 'Italian',
  'ES': 'Spanish',
  'NL': 'Dutch',
  'SE': 'Swedish',
  'NO': 'Norwegian',
  'DK': 'Danish',
  'FI': 'Finnish',
  'PT': 'Portuguese',
  'AT': 'Austrian',
  'IE': 'Irish',
  'NZ': 'New Zealander',
  'SG': 'Singaporean',
  'MY': 'Malaysian',
  'TH': 'Thai',
  'VN': 'Vietnamese',
  'KR': 'South Korean',
  'PH': 'Filipino',
  'ID': 'Indonesian',
  'BD': 'Bangladeshi',
  'PK': 'Pakistani',
  'LK': 'Sri Lankan',
  'EG': 'Egyptian',
  'MA': 'Moroccan',
  'TN': 'Tunisian',
  'DZ': 'Algerian',
  'NG': 'Nigerian',
  'KE': 'Kenyan',
  'GH': 'Ghanaian',
  'UG': 'Ugandan',
  'TZ': 'Tanzanian',
  'ZW': 'Zimbabwean',
  'BW': 'Botswanan',
  'NA': 'Namibian',
  'ZM': 'Zambian',
  'MW': 'Malawian',
  'MZ': 'Mozambican',
  'MG': 'Malagasy',
  'SC': 'Seychellois',
  'RE': 'Reunionese',
  'MX': 'Mexican',
  'AR': 'Argentine',
  'CL': 'Chilean',
  'CO': 'Colombian',
  'PE': 'Peruvian',
  'VE': 'Venezuelan',
  'EC': 'Ecuadorian',
  'BO': 'Bolivian',
  'UY': 'Uruguayan',
  'PY': 'Paraguayan',
  'GY': 'Guyanese',
  'SR': 'Surinamese',
  'FK': 'Falkland Islander',
  'GF': 'French Guianese',
  'TR': 'Turkish',
  'GR': 'Greek',
  'CY': 'Cypriot',
  'MT': 'Maltese',
  'HR': 'Croatian',
  'SI': 'Slovenian',
  'SK': 'Slovak',
  'CZ': 'Czech',
  'PL': 'Polish',
  'HU': 'Hungarian',
  'RO': 'Romanian',
  'BG': 'Bulgarian',
  'RS': 'Serbian',
  'BA': 'Bosnian',
  'ME': 'Montenegrin',
  'MK': 'Macedonian',
  'AL': 'Albanian',
  'LT': 'Lithuanian',
  'LV': 'Latvian',
  'EE': 'Estonian',
  'RU': 'Russian',
  'UA': 'Ukrainian',
  'BY': 'Belarusian',
  'MD': 'Moldovan',
  'GE': 'Georgian',
  'AM': 'Armenian',
  'AZ': 'Azerbaijani',
  'KZ': 'Kazakhstani',
  'UZ': 'Uzbek',
  'TM': 'Turkmen',
  'KG': 'Kyrgyz',
  'TJ': 'Tajik',
  'AF': 'Afghan',
  'IR': 'Iranian',
  'IQ': 'Iraqi',
  'SY': 'Syrian',
  'LB': 'Lebanese',
  'JO': 'Jordanian',
  'IL': 'Israeli',
  'PS': 'Palestinian',
  'SA': 'Saudi Arabian',
  'YE': 'Yemeni',
  'OM': 'Omani',
  'QA': 'Qatari',
  'BH': 'Bahraini',
  'KW': 'Kuwaiti'
};

class GeolocationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
    this.sessionStorageKey = 'dodo_user_country';
  }

  /**
   * Get user's country from IP address using Country.is API
   * Uses sessionStorage for caching to persist across page reloads
   * @returns {Promise<string|null>} Country code or null if detection fails
   */
  async getUserCountry() {
    // Check sessionStorage first (persists across page reloads)
    try {
      const sessionData = sessionStorage.getItem(this.sessionStorageKey);
      if (sessionData) {
        const { countryCode, timestamp } = JSON.parse(sessionData);
        if (countryCode && Date.now() - timestamp < this.cacheTimeout) {
          return countryCode;
        }
      }
    } catch (error) {
      console.warn('Failed to read country from sessionStorage:', error);
    }

    // Fetch from API with timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      // Using Country.is - privacy-conscious, free, no API key required
      const response = await fetch('https://api.country.is/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const countryCode = data.country; // Country.is returns { country: "US" }

      if (countryCode) {
        // Store in both memory cache and sessionStorage
        this.cache.set('user_country', {
          countryCode,
          timestamp: Date.now()
        });

        try {
          sessionStorage.setItem(this.sessionStorageKey, JSON.stringify({
            countryCode,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.warn('Failed to cache country in sessionStorage:', error);
        }
      }

      return countryCode;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Country detection timed out after 5 seconds');
      } else {
        console.warn('Failed to detect user country from IP:', error);
      }
      return null;
    }
  }

  /**
   * Get nationality name from country code
   * @param {string} countryCode - ISO 3166-1 alpha-2 country code
   * @returns {string|null} Nationality name or null if not found
   */
  getNationalityFromCountryCode(countryCode) {
    if (!countryCode) return null;
    return COUNTRY_TO_NATIONALITY[countryCode.toUpperCase()] || null;
  }

  /**
   * Get default nationality based on user's IP location
   * @returns {Promise<string|null>} Nationality name or null if detection fails
   */
  async getDefaultNationality() {
    try {
      const countryCode = await this.getUserCountry();
      return this.getNationalityFromCountryCode(countryCode);
    } catch (error) {
      console.warn('Failed to get default nationality:', error);
      return null;
    }
  }

  /**
   * Get currency code from country code
   * @param {string} countryCode - ISO 3166-1 alpha-2 country code
   * @returns {string} Currency code (defaults to 'USD')
   */
  getCurrencyFromCountryCode(countryCode) {
    if (!countryCode) return 'USD';
    return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] || 'USD';
  }

  /**
   * Get default currency based on user's IP location
   * @returns {Promise<string>} Currency code (defaults to 'USD')
   */
  async getDefaultCurrency() {
    try {
      const countryCode = await this.getUserCountry();
      return this.getCurrencyFromCountryCode(countryCode);
    } catch (error) {
      console.warn('Failed to get default currency:', error);
      return 'USD';
    }
  }

  /**
   * Check if user is a foreigner (non-Mauritian) based on IP
   * @returns {Promise<boolean>} true if foreigner (not in Mauritius), false if Mauritian
   */
  async getIsForeigner() {
    try {
      const countryCode = await this.getUserCountry();
      // is_foreigner = true means NOT Mauritian (foreigner)
      // is_foreigner = false means Mauritian
      return countryCode !== 'MU';
    } catch (error) {
      console.warn('Failed to detect foreigner status:', error);
      return true; // Default to foreigner if detection fails
    }
  }

  /**
   * Detect user's preferred language from browser settings
   * @param {string[]} supportedLocales - List of supported locale codes (e.g., ['en', 'fr'])
   * @returns {string} Language code (defaults to 'en')
   */
  detectLanguage(supportedLocales = ['en', 'fr']) {
    try {
      // Get browser language (e.g., 'en-US', 'fr-FR', 'fr')
      const browserLang = navigator.language || navigator.userLanguage || 'en';
      // Extract base language code (e.g., 'en' from 'en-US')
      const baseLang = browserLang.split('-')[0].toLowerCase();
      // Return if supported, otherwise default to 'en'
      return supportedLocales.includes(baseLang) ? baseLang : 'en';
    } catch (error) {
      console.warn('Failed to detect browser language:', error);
      return 'en';
    }
  }

  /**
   * Get all locale form defaults from IP and browser detection
   * Used for silent form auto-population
   * @param {string[]} supportedLocales - List of supported locale codes
   * @returns {Promise<Object>} Object with language, currency, is_foreigner
   */
  async getLocaleDefaults(supportedLocales = ['en', 'fr']) {
    const [currency, isForeigner] = await Promise.all([
      this.getDefaultCurrency(),
      this.getIsForeigner(),
    ]);

    return {
      language: this.detectLanguage(supportedLocales),
      currency,
      is_foreigner: !isForeigner, // Note: is_foreigner=true means "Yes, I am Mauritian" in the form
    };
  }

  /**
   * Clear the cache (both memory and sessionStorage)
   */
  clearCache() {
    this.cache.clear();
    try {
      sessionStorage.removeItem(this.sessionStorageKey);
    } catch (error) {
      console.warn('Failed to clear country cache from sessionStorage:', error);
    }
  }
}

// Export singleton instance
export const geolocationService = new GeolocationService();
export default geolocationService;