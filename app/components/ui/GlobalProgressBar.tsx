import { useEffect, useRef, useState } from "react";
import { useNavigation, useFetchers } from "react-router";

// Thin rose progress bar pinned to the top of the viewport. Animates whenever
// React Router is navigating to a new route or any active <Form>/useFetcher is
// submitting/loading. Same UX pattern as NProgress / YouTube's top loader.
export function GlobalProgressBar() {
  const navigation = useNavigation();
  const fetchers = useFetchers();

  const active =
    navigation.state !== "idle" ||
    fetchers.some((f) => f.state !== "idle");

  // 0  = hidden, 1 = creeping, 2 = finishing → fades out
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [progress, setProgress] = useState(0);
  const creepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (active) {
      // Cancel any pending fade and start creeping toward 90%.
      if (fadeTimer.current) { clearTimeout(fadeTimer.current); fadeTimer.current = null; }
      setPhase(1);
      setProgress(8);
      if (creepTimer.current) clearInterval(creepTimer.current);
      creepTimer.current = setInterval(() => {
        setProgress((p) => (p < 90 ? p + (90 - p) * 0.08 : p));
      }, 200);
      return;
    }

    // Finishing: snap to 100, then fade.
    if (creepTimer.current) { clearInterval(creepTimer.current); creepTimer.current = null; }
    if (phase === 1) {
      setPhase(2);
      setProgress(100);
      fadeTimer.current = setTimeout(() => {
        setPhase(0);
        setProgress(0);
      }, 280);
    }
    return () => {
      if (creepTimer.current) clearInterval(creepTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (phase === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-rose-400 via-rose-500 to-pink-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: phase === 2 ? 0 : 1,
        }}
      />
    </div>
  );
}
