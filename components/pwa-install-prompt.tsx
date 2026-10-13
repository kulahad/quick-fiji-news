"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function getInstallInstructions(): string {
  const userAgent = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return "Tap Share, then Add to Home Screen.";
  }
  if (/SamsungBrowser/i.test(userAgent)) {
    return "Open the browser menu and choose Add page to, then Home screen.";
  }
  return "Open your browser menu and choose Install app or Add to Home screen.";
}

export default function PwaInstallPrompt() {
  const [mobile, setMobile] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const mobileDevice = window.matchMedia("(max-width: 767px)").matches;
    setMobile(mobileDevice);
    setInstalled(isStandalone());
    setInstructions(getInstallInstructions());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  if (!mobile || installed || dismissed) return null;

  return (
    <aside
      aria-label="Install Quick Fiji News"
      className="fixed inset-x-3 bottom-3 z-50 rounded-xl border border-border bg-background p-4 shadow-lg md:hidden"
    >
      <div className="flex items-start gap-3">
        <Download aria-hidden="true" className="mt-1 size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Get Fiji news on your home screen</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {installPrompt
              ? "Install Quick Fiji News for quick access."
              : showInstructions
                ? instructions
                : "Add Quick Fiji News to your home screen for quick access."}
          </p>
          {!showInstructions && (
            <button
              type="button"
              onClick={installApp}
              className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {installPrompt ? "Install app" : "Show install steps"}
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss install prompt"
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </aside>
  );
}
