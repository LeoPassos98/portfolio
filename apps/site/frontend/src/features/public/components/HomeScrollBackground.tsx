import { useEffect, useRef } from "react";
import logoMarkup from "../../../assets/brand/logo-scroll.svg?raw";
import capturedTracks from "../../../assets/brand/logo-scroll-frames.json";

type CapturedTrack = {
  id: string;
  attr: string;
  frames: [number, string][];
};

const numberPattern = /[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi;
const duration = 3000;

// Normalize transforms so the initial translation can interpolate with matrices.
function parseFrame(time: number, value: string, attribute: string) {
  let values = (value.match(numberPattern) ?? []).map(Number);
  let parts = value.split(numberPattern);
  if (attribute === "transform") {
    if (value.startsWith("translate")) {
      values = [1, 0, 0, 1, values[0], values[1] ?? 0];
    }
    parts = ["matrix(", " ", " ", " ", " ", " ", ")"];
  }
  return { time, values, parts };
}

const tracks = (capturedTracks as CapturedTrack[]).map((track) => ({
  ...track,
  frames: track.frames.map(([time, value]) => parseFrame(time, value, track.attr)),
}));

function HomeScrollBackground() {
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const background = backgroundRef.current;
    if (!background) return;

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const elements = tracks.map((track) => ({
      ...track,
      element: background.querySelector(`#${track.id}`),
      previousValue: "",
    }));
    let frame = 0;

    function renderPosition() {
      frame = 0;
      const scrollRange = document.documentElement.scrollHeight - innerHeight;
      const progress =
        reducedMotion.matches || scrollRange <= 0
          ? 0
          : Math.min(Math.max(scrollY / scrollRange, 0), 1);
      const time = progress * duration;

      for (const track of elements) {
        if (!track.element) continue;
        let low = 0;
        let high = track.frames.length - 1;
        while (low < high) {
          const middle = (low + high + 1) >> 1;
          if (track.frames[middle].time <= time) low = middle;
          else high = middle - 1;
        }

        const start = track.frames[low];
        const end = track.frames[Math.min(low + 1, track.frames.length - 1)];
        const fraction =
          end.time === start.time ? 0 : (time - start.time) / (end.time - start.time);
        const value = start.parts.reduce((result, part, index) => {
          if (index === start.values.length) return result + part;
          const number =
            start.values[index] + (end.values[index] - start.values[index]) * fraction;
          return result + part + Number(number.toFixed(6));
        }, "");

        if (value !== track.previousValue) {
          track.element.setAttribute(track.attr, value);
          track.previousValue = value;
        }
      }
    }

    function scheduleUpdate() {
      if (!frame) frame = requestAnimationFrame(renderPosition);
    }

    function configureMotion() {
      window.removeEventListener("scroll", scheduleUpdate);
      cancelAnimationFrame(frame);
      frame = 0;
      renderPosition();
      if (!reducedMotion.matches) {
        window.addEventListener("scroll", scheduleUpdate, { passive: true });
      }
    }

    configureMotion();
    window.addEventListener("resize", scheduleUpdate);
    reducedMotion.addEventListener("change", configureMotion);
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(document.documentElement);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      reducedMotion.removeEventListener("change", configureMotion);
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={backgroundRef} className="home-scroll-background" aria-hidden="true">
      {/* Local asset contains only the captured geometry; its script was removed. */}
      <div
        className="home-scroll-art"
        dangerouslySetInnerHTML={{ __html: logoMarkup }}
      />
      <div className="home-scroll-veil" />
    </div>
  );
}

export { HomeScrollBackground };
