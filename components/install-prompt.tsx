"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(
    null
  );
  const [isIos, setIsIos] = useState(false);
  const [isMacSafari, setIsMacSafari] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const userAgent = navigator.userAgent;
    const isAppleMobile =
      /iPhone|iPad|iPod/i.test(userAgent) ||
      (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
    const isSafari =
      /Safari/i.test(userAgent) &&
      !/(Chrome|Chromium|CriOS|FxiOS|Firefox|Edg|OPR)/i.test(userAgent);
    const isMac = /Macintosh|Mac OS X/i.test(userAgent);
    const detectionFrame = window.requestAnimationFrame(() => {
      setIsIos(isAppleMobile && !isStandalone);
      setIsMacSafari(isMac && isSafari && !isStandalone);
    });
    if (isStandalone) {
      return () => window.cancelAnimationFrame(detectionFrame);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallEvent(null);
      setIsIos(false);
      setIsMacSafari(false);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.cancelAnimationFrame(detectionFrame);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  if (!installEvent && !isIos && !isMacSafari) return null;

  if (installEvent) {
    return (
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={install}
      >
        <Download aria-hidden="true" className="h-4 w-4" />
        Install app
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11">
          <Download aria-hidden="true" className="h-4 w-4" />
          Install app
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isMacSafari
              ? "Add Quick Fiji News to your Dock"
              : "Add Quick Fiji News to your Home Screen"}
          </DialogTitle>
          <DialogDescription>
            {isMacSafari
              ? "Add the web app to your Dock for quick access to Fiji’s latest headlines."
              : "Install the app for quick access to Fiji's latest headlines."}
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm text-foreground">
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
              1
            </span>
            <span className="pt-1">
              {isMacSafari ? (
                <>
                  In Safari, open the <strong>File</strong> menu.
                </>
              ) : (
                <>
                  In Safari, tap the{" "}
                  <Share aria-hidden="true" className="inline h-4 w-4" /> Share
                  button.
                </>
              )}
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
              2
            </span>
            <span className="pt-1">
              {isMacSafari
                ? 'Choose “Add to Dock”.'
                : 'Choose “Add to Home Screen”.'}
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
              3
            </span>
            <span className="pt-1">
              {isMacSafari
                ? "Confirm to add the app to your Dock."
                : 'Tap “Add” to finish.'}
            </span>
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}
