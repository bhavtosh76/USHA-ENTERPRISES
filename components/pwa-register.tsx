"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallWindow = Window & { __ushaInstallPrompt?: InstallPromptEvent };

const HIDE_KEY = "usha-install-hint-hidden";

export function PwaRegister() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    let hiddenUntil = 0;
    try {
      hiddenUntil = Number(localStorage.getItem(HIDE_KEY) || 0);
    } catch {
      hiddenUntil = 0;
    }

    const showIfAllowed = (event: InstallPromptEvent) => {
      setDeferred(event);
      if (Date.now() > hiddenUntil) setVisible(true);
    };

    const w = window as InstallWindow;
    if (w.__ushaInstallPrompt) showIfAllowed(w.__ushaInstallPrompt);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      showIfAllowed(event as InstallPromptEvent);
    };
    const onReady = () => {
      const stored = (window as InstallWindow).__ushaInstallPrompt;
      if (stored) showIfAllowed(stored);
    };
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("usha-installable", onReady);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari has no install prompt event — show a short manual hint instead.
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIos && isSafari && Date.now() > hiddenUntil) {
      timer = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 3500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("usha-installable", onReady);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(HIDE_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setDeferred(null);
  }

  if (installed || !visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] sm:left-auto sm:right-4 sm:bottom-4 sm:w-80">
      <div className="rounded-2xl border border-white/10 bg-navy-950/95 p-4 text-white shadow-2xl backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-solar-500 text-white">
            {iosHint ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">USHA Solar app install karein</p>
            {iosHint ? (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                Safari me neeche <span className="font-semibold text-solar-300">Share</span> button
                dabayein, phir <span className="font-semibold text-solar-300">Add to Home Screen</span>{" "}
                chunein.
              </p>
            ) : (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                Home screen se full-screen app ki tarah kholein — ERP aur website dono.
              </p>
            )}
            {!iosHint && (
              <button
                onClick={install}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-solar-500 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-solar-600"
              >
                <Download className="h-3.5 w-3.5" /> Install app
              </button>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
