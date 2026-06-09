export function getCurrencySymbol(code) {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    MAD: 'DH',
    JPY: '¥',
  };

  return symbols[code] || code || 'USD';
}

