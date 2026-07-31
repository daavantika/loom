export interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency?: string;
  name?: string;
  description?: string;
}

export interface RazorpayCheckoutResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions & { handler: (r: RazorpayCheckoutResult) => void; modal?: { ondismiss?: () => void } }) => {
      open: () => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Injects Razorpay's hosted Checkout.js once, reused across calls — never re-injected per checkout attempt. */
export function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load the payment gateway. Check your connection and try again.'));
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

/** Opens Razorpay's hosted modal; resolves with the checkout result on success, rejects if the customer dismisses it. */
export function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<RazorpayCheckoutResult> {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Payment gateway did not load'));
      return;
    }
    const rzp = new window.Razorpay({
      ...options,
      name: options.name ?? 'LOOM',
      handler: (result) => resolve(result),
      modal: { ondismiss: () => reject(new Error('Payment was not completed')) },
    });
    rzp.open();
  });
}
