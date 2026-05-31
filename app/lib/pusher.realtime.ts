import { useEffect, useRef } from "react";
import type { Channel, default as Pusher } from "pusher-js";
import { PUSHER_CHANNELS, PUSHER_EVENTS } from "./pusher.shared";

export { PUSHER_CHANNELS, PUSHER_EVENTS };

// ── Lazy client (dynamic import keeps pusher-js out of the server bundle) ────
let clientPromise: Promise<Pusher | null> | null = null;

function getPusherClient(): Promise<Pusher | null> | null {
  if (typeof window === "undefined") return null;
  if (clientPromise) return clientPromise;

  const key = import.meta.env.VITE_PUSHER_KEY as string | undefined;
  const cluster = import.meta.env.VITE_PUSHER_CLUSTER as string | undefined;
  if (!key || !cluster) {
    console.warn("[pusher] VITE_PUSHER_KEY / VITE_PUSHER_CLUSTER missing — real-time disabled.");
    return null;
  }

  clientPromise = import("pusher-js").then((mod) => new mod.default(key, { cluster }));
  return clientPromise;
}

// ── Notification sound (MP3) ─────────────────────────────────────────────────
//
// Browsers block audio playback until the page has seen user interaction.
// `primeAudio()` is called once per page-load: on the first click/keydown/touch
// it does a silent play+pause to "unlock" the <audio> element, so subsequent
// `playNotifySound()` calls are audible.
const NOTIFY_SOUND_URL = "/sounds/messeger.mp3";

let notifyAudio: HTMLAudioElement | null = null;
let audioPrimed = false;
let audioUnlocked = false;

function ensureAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!notifyAudio) {
    notifyAudio = new Audio(NOTIFY_SOUND_URL);
    notifyAudio.preload = "auto";
    notifyAudio.volume = 0.8;
  }
  return notifyAudio;
}

export function primeAudio() {
  if (typeof window === "undefined" || audioPrimed) return;
  audioPrimed = true;
  const unlock = () => {
    const a = ensureAudio();
    if (!a) return;
    const prevVolume = a.volume;
    a.volume = 0;
    a
      .play()
      .then(() => {
        a.pause();
        a.currentTime = 0;
        a.volume = prevVolume;
        audioUnlocked = true;
      })
      .catch(() => {
        a.volume = prevVolume;
      });
    window.removeEventListener("click", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("click", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
}

export function playNotifySound() {
  if (typeof window === "undefined") return;
  const a = ensureAudio();
  if (!a) return;
  try {
    a.currentTime = 0;
    a.play().catch((err) => {
      // First call before user interaction — browsers will block. Once the
      // user clicks anywhere, primeAudio() unlocks and subsequent calls work.
      if (!audioUnlocked) return;
      console.warn("[pusher] sound playback failed:", err);
    });
  } catch (err) {
    console.warn("[pusher] sound playback failed:", err);
  }
}

// ── React hook: subscribe to (channel, event) and call handler ───────────────
type Handler = (payload: unknown) => void;

export function usePusherChannel(channelName: string | null, handlers: Record<string, Handler>) {
  // Pin the latest handlers in a ref so re-renders don't re-subscribe.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    primeAudio();
    if (!channelName) return;

    let cancelled = false;
    let channel: Channel | null = null;
    const bound: Array<[string, Handler]> = [];

    const clientP = getPusherClient();
    if (!clientP) return;

    clientP.then((client) => {
      if (cancelled || !client) return;
      channel = client.subscribe(channelName);
      for (const evt of Object.keys(handlersRef.current)) {
        const bind: Handler = (data) => handlersRef.current[evt]?.(data);
        channel.bind(evt, bind);
        bound.push([evt, bind]);
      }
    });

    return () => {
      cancelled = true;
      if (channel) {
        for (const [evt, bind] of bound) channel.unbind(evt, bind);
      }
      // Best-effort unsubscribe; safe to call even if channel never bound.
      getPusherClient()?.then((client) => client?.unsubscribe(channelName));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);
}
