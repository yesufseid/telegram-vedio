declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: { user?: { id: number; username?: string } };
        ready(): void;
        expand(): void;
        close(): void;
        setHeaderColor?(color: string): void;
        setBackgroundColor?(color: string): void;
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Loads the Telegram WebApp SDK once. Outside Telegram it resolves silently. */
export function loadTelegramSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Telegram?.WebApp) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function webApp() {
  return typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
}

/** Raw, cryptographically signed initData string. Empty when not inside Telegram. */
export function getInitData(): string {
  return webApp()?.initData || "";
}

export function isInsideTelegram(): boolean {
  return Boolean(getInitData());
}

export function prepareWebApp() {
  const app = webApp();
  if (!app) return;
  app.ready();
  app.expand();
  app.setHeaderColor?.("#0f172a");
  app.setBackgroundColor?.("#0f172a");
}