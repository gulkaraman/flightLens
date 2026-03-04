// Obilet gibi sitelerde DOM sık değişebildiği için,
// burada her kritik eleman için *birden fazla fallback selector* tanımlıyoruz.
// Önemli: Yeni selector eklerken açıklamayı da güncelleyin; hata mesajları bu açıklamaları kullanır.

export type SelectorKind = 'css' | 'xpath';

export interface SelectorCandidate {
  kind: SelectorKind;
  selector: string;
  description: string;
}

// ---- Flight result list ----

export const flightRowCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector: 'div[data-testid="flight-card"]',
    description: 'primary: modern flight card container'
  },
  {
    kind: 'css',
    selector: '.flight-card, .flight-result-card',
    description: 'fallback: legacy flight card classes'
  },
  {
    kind: 'css',
    selector: 'li[role="listitem"][data-flight-id]',
    description: 'fallback: generic list-based flight rows'
  },
  {
    kind: 'css',
    selector: '#outbound-journeys > li.item.journey',
    description: 'fallback: Obilet desktop flight journey items'
  }
];

// ---- Pricing & airline info inside a flight row ----

export const priceCellCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector: '[data-testid="price"], .price-amount, .price .amount',
    description: 'primary: price cell with data-testid or price-amount class'
  },
  {
    kind: 'css',
    selector: '.price .amount, .flight-price .amount',
    description: 'fallback: nested price amount span'
  }
];

export const airlineNameCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector: '[data-testid="airline-name"], .airline-name, .airlines .name',
    description: 'primary: airline name label'
  },
  {
    kind: 'css',
    selector: '.carrier-name, .company-name',
    description: 'fallback: alternative carrier/company name labels'
  }
];

export const departTimeCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector: '[data-testid="departure-time"], .departure-time, .time .departure, .left .departure, .departure',
    description: 'primary: departure time label'
  },
  {
    kind: 'css',
    selector: '.time.depart, .departure .time',
    description: 'fallback: generic departure time span'
  }
];

export const arriveTimeCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector: '[data-testid="arrival-time"], .arrival-time, .time .arrival, .right .arrival, .arrival',
    description: 'primary: arrival time label'
  },
  {
    kind: 'css',
    selector: '.time.arrive, .arrival .time',
    description: 'fallback: generic arrival time span'
  }
];

// ---- Search form: city dropdowns, trip type, dates, passengers, submit ----

export const fromInputCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector: 'input[name="origin"], input[data-testid="origin-input"]',
    description: 'primary: origin input'
  },
  {
    kind: 'css',
    selector: '#origin-input, .origin-input input',
    description: 'fallback: origin input by id/class'
  }
];

export const toInputCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector: 'input[name="destination"], input[data-testid="destination-input"]',
    description: 'primary: destination input'
  },
  {
    kind: 'css',
    selector: '#destination-input, .destination-input input',
    description: 'fallback: destination input by id/class'
  }
];

export const cityOptionCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector:
      '[data-testid="autocomplete-option"], .autocomplete-item, .city-option, .airport-option',
    description: 'primary: generic autocomplete dropdown option'
  },
  {
    kind: 'css',
    selector: 'li[role="option"], [role="listbox"] [role="option"]',
    description: 'fallback: WAI-ARIA listbox options'
  }
];

export const oneWayTripTypeCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector:
      'input[type="radio"][value="oneWay"], input[type="radio"][value="one-way"], [data-testid="one-way-tab"]',
    description: 'primary: one-way trip selector'
  },
  {
    kind: 'css',
    selector:
      'button[data-trip-type="oneWay"], button[data-trip-type="one-way"], button:has(span[class*="one-way"])',
    description: 'fallback: one-way button/tab'
  }
];

export const roundTripTypeCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector:
      'input[type="radio"][value="roundTrip"], input[type="radio"][value="round-trip"], [data-testid="round-trip-tab"]',
    description: 'primary: round-trip selector'
  },
  {
    kind: 'css',
    selector:
      'button[data-trip-type="roundTrip"], button[data-trip-type="round-trip"], button:has(span[class*="round-trip"])',
    description: 'fallback: round-trip button/tab'
  }
];

export const departDateInputCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector:
      'input[name="departureDate"], input[data-testid="departure-date-input"], [data-testid="departure-date"] input',
    description: 'primary: departure date input'
  },
  {
    kind: 'css',
    selector: '.departure-date input, .date-picker-depart input',
    description: 'fallback: departure date input by container'
  }
];

export const returnDateInputCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector:
      'input[name="returnDate"], input[data-testid="return-date-input"], [data-testid="return-date"] input',
    description: 'primary: return date input'
  },
  {
    kind: 'css',
    selector: '.return-date input, .date-picker-return input',
    description: 'fallback: return date input by container'
  }
];

export const passengerOpenCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector:
      '[data-testid="passenger-select"], .passenger-select, button[data-testid="passenger-open"]',
    description: 'primary: passenger selector opener'
  },
  {
    kind: 'css',
    selector: '.passenger-summary, .passenger-input',
    description: 'fallback: passenger summary element'
  }
];

export const adultPlusCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector:
      '[data-testid="adult-increment"], button[data-passenger-type="adult"][data-action="increment"]',
    description: 'primary: adult plus button'
  },
  {
    kind: 'css',
    selector: '.adult .counter-plus, .adult .increment',
    description: 'fallback: adult increment button'
  }
];

export const adultCountCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector:
      '[data-testid="adult-count"], .adult .counter-value, .adult .count, .adult .value, .adult-count',
    description: 'primary: adult count label'
  }
];

export const childPlusCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector:
      '[data-testid="child-increment"], button[data-passenger-type="child"][data-action="increment"]',
    description: 'primary: child plus button'
  },
  {
    kind: 'css',
    selector: '.child .counter-plus, .child .increment',
    description: 'fallback: child increment button'
  }
];

export const childCountCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector:
      '[data-testid="child-count"], .child .counter-value, .child .count, .child .value, .child-count',
    description: 'primary: child count label'
  }
];

export const passengerApplyCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector:
      '[data-testid="passenger-apply"], button[data-testid="passenger-apply"], .passenger-apply button',
    description: 'primary: passenger selection apply/save button'
  },
  {
    kind: 'css',
    selector: '.passenger-footer button[type="button"], .passenger-actions button',
    description: 'fallback: generic passenger footer button'
  }
];

export const searchButtonCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector:
      '[data-testid="search-button"], button[type="submit"].search-button, button.search-button',
    description: 'primary: search button with data-testid or dedicated class'
  },
  {
    kind: 'css',
    selector:
      'form button[type="submit"], .search-actions button[type="submit"], .search-bar button[type="submit"]',
    description: 'fallback: generic form submit search button'
  }
];

export const directFilterCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector:
      '[data-testid="direct-filter"], [data-testid="direct-only"], input[type="checkbox"][value="direct"] + label',
    description: 'primary: direct-only filter checkbox or related label'
  },
  {
    kind: 'css',
    selector:
      'label:has(input[type="checkbox"][value="direct"]), .filter-direct, .direct-filter label',
    description: 'fallback: label wrapping the direct-only checkbox'
  },
  {
    kind: 'xpath',
    selector:
      '//label[contains(normalize-space(.), "Aktarmasız") or contains(normalize-space(.), "Direct")]',
    description: 'fallback: label containing "Aktarmasız" or "Direct" text'
  }
];

export const resultsContainerCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector: '[data-testid="flight-list"], .flight-list, .results-list, .search-results',
    description: 'primary: container for flight result rows'
  }
];

// ---- Fallback: card expand / select button & expanded summary price ----
// TODO: Bu selector'lar Obilet DOM’una göre güncellenmeli.

export const selectFlightButtonInCardCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector: 'button[data-testid="select-flight"], button:has(span:contains("Seç"))',
    description: 'placeholder: flight card "Seç" / "Gidişi seç" button inside card'
  }
];

export const expandedSummaryPriceCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector: '.fare-summary [data-testid="price"], .fare-summary .price, .basket-summary .price',
    description: 'placeholder: expanded panel/summary price element'
  }
];

export const closeExpandedPanelCandidates: SelectorCandidate[] = [
  {
    kind: 'css',
    selector: 'button[data-testid="close-modal"], button:has(span:contains("Kapat"))',
    description: 'placeholder: close button for expanded fare panel/modal'
  }
];

export function selectorSummary(candidates: SelectorCandidate[]): string {
  return candidates.map((c) => `${c.kind}:${c.selector} (${c.description})`).join(' | ');
}

