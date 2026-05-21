"use client";
import { useEffect, useRef } from "react";

interface Props {
  height?: number;
}

export function TradingViewChart({ height = 720 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    function mount() {
      if (cancelled || !container) return;
      container.innerHTML = "";

      const width = container.clientWidth || 800;

      const widget = document.createElement("div");
      widget.className = "tradingview-widget-container__widget";
      widget.style.height = `${height}px`;
      widget.style.width = "100%";
      container.appendChild(widget);

      const script = document.createElement("script");
      script.src =
        "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.textContent = JSON.stringify({
        width,
        height,
        symbol: "OANDA:XAUUSD",
        interval: "60",
        timezone: "Etc/UTC",
        theme: "light",
        style: "1",
        locale: "en",
        withdateranges: true,
        hide_side_toolbar: false,
        hide_top_toolbar: false,
        hide_legend: false,
        allow_symbol_change: false,
        calendar: false,
        details: true,
        hotlist: false,
        support_host: "https://www.tradingview.com",
      });
      container.appendChild(script);
    }

    // Mount after next paint so container has its real width.
    const raf = requestAnimationFrame(mount);

    // Re-mount on container resize so it adapts to viewport changes.
    const ro = new ResizeObserver(() => {
      // Debounce-style: only remount when width changes meaningfully.
      const w = container.clientWidth;
      if (Math.abs(w - (container.dataset.lastW ? +container.dataset.lastW : 0)) > 20) {
        container.dataset.lastW = String(w);
        mount();
      }
    });
    ro.observe(container);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      container.innerHTML = "";
    };
  }, [height]);

  return (
    <div
      className="tradingview-widget-container w-full"
      ref={containerRef}
      style={{ height: `${height}px`, minHeight: `${height}px` }}
    />
  );
}
