export type ModalState =
  | { kind: 'filters' }
  | { kind: 'review'; cookId: string }
  | { kind: 'reviewList'; cookId: string }
  | { kind: 'cook'; cookId: string }
  | { kind: 'assistant' }
  | { kind: 'chat'; cookId: string }
  | { kind: 'location' }
  | { kind: 'payoutLedger' }
  | { kind: 'priceAssistant' }
  | { kind: 'inventory' }
  | { kind: 'customerMessage'; name: string }
  | { kind: 'stories' }
  | { kind: 'cookStories' }
  | { kind: 'plan' }
  | { kind: 'planCookPicker' }
  | { kind: 'todaySpecials' }
  | { kind: 'festivalFoods' }
  | { kind: 'catering' }
  | { kind: 'cookTool'; tool: 'calendar' | 'orders' | 'analytics' }
  | { kind: 'tracking'; orderId?: string }
  | { kind: 'checkout' }
  | { kind: 'favourites' }
  | { kind: 'myReviews' }
  | { kind: 'preferences' }
  | { kind: 'payments' }
  | { kind: 'account' }
  | { kind: 'auth'; mode: 'login' | 'register' };
