// Currency conversion service with real exchange rates
// Uses exchangerate-api.com for live rates with fallback to static rates

interface ExchangeRates {
  [key: string]: number; // currency code -> USD rate
}

class CurrencyService {
  private static instance: CurrencyService;
  private rates: ExchangeRates = {};
  private lastUpdated: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Fallback static rates (as of April 2026)
  private static readonly FALLBACK_RATES: ExchangeRates = {
    'USD': 1.0,
    'EUR': 1.08,    // 1 EUR = 1.08 USD
    'GBP': 1.27,    // 1 GBP = 1.27 USD
    'CAD': 0.74,    // 1 CAD = 0.74 USD
    'AUD': 0.66,    // 1 AUD = 0.66 USD
    'JPY': 0.0067,  // 1 JPY = 0.0067 USD
    'CHF': 1.15,    // 1 CHF = 1.15 USD
    'CNY': 0.14,    // 1 CNY = 0.14 USD
    'INR': 0.012,   // 1 INR = 0.012 USD
    'BRL': 0.18,    // 1 BRL = 0.18 USD
    'MXN': 0.055,   // 1 MXN = 0.055 USD
    'ZAR': 0.054,   // 1 ZAR = 0.054 USD
    'SGD': 0.75,    // 1 SGD = 0.75 USD
    'HKD': 0.13,    // 1 HKD = 0.13 USD
    'NOK': 0.094,   // 1 NOK = 0.094 USD
    'SEK': 0.095,   // 1 SEK = 0.095 USD
    'DKK': 0.15,    // 1 DKK = 0.15 USD
    'PLN': 0.25,    // 1 PLN = 0.25 USD
    'CZK': 0.044,   // 1 CZK = 0.044 USD
    'HUF': 0.0028,  // 1 HUF = 0.0028 USD
    'KRW': 0.00075, // 1 KRW = 0.00075 USD
    'TRY': 0.029,   // 1 TRY = 0.029 USD
    'RUB': 0.011,   // 1 RUB = 0.011 USD
    'THB': 0.029,   // 1 THB = 0.029 USD
    'MYR': 0.21,    // 1 MYR = 0.21 USD
    'IDR': 0.000066, // 1 IDR = 0.000066 USD
    'PHP': 0.018,   // 1 PHP = 0.018 USD
    'VND': 0.000041, // 1 VND = 0.000041 USD
  };

  private constructor() {}

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  /**
   * Get exchange rates from API or cache
   */
  private async fetchRates(): Promise<ExchangeRates> {
    const now = Date.now();

    // Return cached rates if still valid
    if (this.rates && Object.keys(this.rates).length > 0 && (now - this.lastUpdated) < this.CACHE_DURATION) {
      return this.rates;
    }

    try {
      // Try to fetch live rates
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (response.ok) {
        const data = await response.json();
        this.rates = data.rates || {};
        this.lastUpdated = now;
        console.log('✅ Currency rates updated from API');
        return this.rates;
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch live exchange rates, using fallback rates:', error);
    }

    // Use fallback rates
    this.rates = { ...CurrencyService.FALLBACK_RATES };
    this.lastUpdated = now;
    console.log('ℹ️ Using fallback currency rates');
    return this.rates;
  }

  /**
   * Convert amount from one currency to USD
   */
  async convertToUSD(amount: number, fromCurrency: string = 'USD'): Promise<number> {
    if (fromCurrency === 'USD') {
      return amount;
    }

    const rates = await this.fetchRates();
    const rate = rates[fromCurrency.toUpperCase()];

    if (!rate) {
      console.warn(`⚠️ No exchange rate found for ${fromCurrency}, using amount as-is`);
      return amount;
    }

    // Since rates are quoted as X per 1 USD, we need to invert for USD per X
    // Example: EUR rate = 0.93 means 1 USD = 0.93 EUR, so 1 EUR = 1/0.93 USD
    const usdAmount = amount / rate;
    return usdAmount;
  }

  /**
   * Convert amount from one currency to another
   */
  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const usdAmount = await this.convertToUSD(amount, fromCurrency);
    if (toCurrency === 'USD') {
      return usdAmount;
    }

    const rates = await this.fetchRates();
    const toRate = rates[toCurrency.toUpperCase()];

    if (!toRate) {
      console.warn(`⚠️ No exchange rate found for ${toCurrency}, returning USD amount`);
      return usdAmount;
    }

    // Convert USD to target currency
    return usdAmount * toRate;
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return Object.keys(CurrencyService.FALLBACK_RATES);
  }

  /**
   * Check if currency is supported
   */
  isSupported(currency: string): boolean {
    return currency.toUpperCase() in CurrencyService.FALLBACK_RATES;
  }

  /**
   * Format currency amount with symbol
   */
  format(amount: number, currency: string): string {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'Fr',
      'CNY': '¥',
      'INR': '₹',
      'BRL': 'R$',
      'MXN': '$',
      'ZAR': 'R',
      'SGD': 'S$',
      'HKD': 'HK$',
      'NOK': 'kr',
      'SEK': 'kr',
      'DKK': 'kr',
      'PLN': 'zł',
      'CZK': 'Kč',
      'HUF': 'Ft',
      'KRW': '₩',
      'TRY': '₺',
      'RUB': '₽',
      'THB': '฿',
      'MYR': 'RM',
      'IDR': 'Rp',
      'PHP': '₱',
      'VND': '₫',
    };

    const symbol = symbols[currency.toUpperCase()] || currency.toUpperCase();
    return `${symbol}${amount.toFixed(2)}`;
  }
}

// Export singleton instance
export const currencyService = CurrencyService.getInstance();

// Utility functions for easy use
export const convertToUSD = (amount: number, fromCurrency: string = 'USD') =>
  currencyService.convertToUSD(amount, fromCurrency);

export const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string) =>
  currencyService.convert(amount, fromCurrency, toCurrency);

export const formatCurrency = (amount: number, currency: string) =>
  currencyService.format(amount, currency);

// Hook for React components
export const useCurrencyConversion = () => {
  return {
    convertToUSD,
    convertCurrency,
    formatCurrency,
    isSupported: (currency: string) => currencyService.isSupported(currency),
    getSupportedCurrencies: () => currencyService.getSupportedCurrencies(),
  };
};