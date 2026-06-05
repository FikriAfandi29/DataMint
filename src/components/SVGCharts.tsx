import { useState, useEffect, useRef } from "react";
import { ChartPoint, ChartSeries } from "../types";
import { Download } from "lucide-react";

interface ChartProps {
  data: ChartPoint[];
  series: ChartSeries[];
  title: string;
  type?: "line" | "bar" | "dual"; // dual means follow each series type declaration
}

export function CustomSVGChart({ data, series, title, type = "dual" }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 380, height: 240 });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Get active theme status
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const handleExportPNG = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    // Convert SVG element to serialized string and set standard XML schema
    const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const svgString = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const blobURL = window.URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const scale = 2.5; // Premium high density rendering
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const context = canvas.getContext("2d");
      
      if (context) {
        context.scale(scale, scale);
        
        // Draw elegant high fidelity background matching active theme
        context.fillStyle = isDark ? "#090d16" : "#ffffff";
        context.fillRect(0, 0, width, height);

        // Add a beautiful custom border to chart image matching theme borders
        context.strokeStyle = isDark ? "#1e293b" : "#f1f5f9";
        context.lineWidth = 1.5;
        context.strokeRect(0, 0, width, height);

        // Draw the serialized SVG image
        context.drawImage(image, 0, 0, width, height);
        
        // Trigger high quality secure PNG download
        const pngURL = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngURL;
        downloadLink.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_chart.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      window.URL.revokeObjectURL(blobURL);
    };

    image.onerror = (err) => {
      console.error("Failed to generate crisp chart image from SVG", err);
      window.URL.revokeObjectURL(blobURL);
    };

    image.src = blobURL;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ 
        width: Math.max(width, 150), 
        height: Math.max(height, 100) 
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dimensions;

  // Chart Layout Margins
  const padding = { top: 25, right: 20, bottom: 35, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-400 font-sans">
        No dataset available for visualization
      </div>
    );
  }

  // Get min/max Y values across all series
  const allValues = data.flatMap((item) =>
    series.map((s) => {
      const val = item[s.key];
      return typeof val === "number" ? val : parseFloat(String(val)) || 0;
    })
  );

  let tempMax = Math.max(...allValues, 1);
  let tempMin = Math.min(...allValues, 0);

  // Give some comfort padding to chart scale limits
  const range = tempMax - tempMin || 1;
  const maxVal = tempMax + range * 0.1;
  const minVal = tempMin < 0 ? tempMin - range * 0.1 : 0;
  const valDelta = maxVal - minVal;

  const getX = (valIndex: number) => {
    if (data.length <= 1) return padding.left + graphWidth / 2;
    return padding.left + (valIndex / (data.length - 1)) * graphWidth;
  };

  const getY = (numericVal: number) => {
    const ratio = (numericVal - minVal) / valDelta;
    if (type === "bar") {
      // Ground bar heights strictly on the base axis line
      return height - padding.bottom - ratio * graphHeight;
    }
    // Give line markers a beautiful 6% top/bottom visual safety margin
    const graphMarginY = graphHeight * 0.06;
    const contractedHeight = graphHeight - 2 * graphMarginY;
    return height - padding.bottom - graphMarginY - ratio * contractedHeight;
  };

  // Convert Color Labels
  const getColorHex = (colorName: string) => {
    if (colorName === "navy") return "#1e3a8a"; // Navy Blue Accent
    if (colorName === "mint") return "#10b981"; // Mint Green Accent
    return colorName;
  };

  // Calculate Gridlines
  const gridTicks = 5;
  const gridLines = Array.from({ length: gridTicks }, (_, i) => {
    const val = minVal + (i / (gridTicks - 1)) * valDelta;
    return {
      value: val.toFixed(1),
      y: getY(val),
    };
  });

  return (
    <div id="economy-chart-container" className="w-full h-full flex flex-col relative select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-2 mb-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100 font-display">
            {title}
          </span>
          <button
            id={`btn-export-png-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            onClick={handleExportPNG}
            title="Export chart as PNG"
            className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[9px] text-slate-500 dark:text-slate-400 font-semibold justify-start sm:justify-end max-w-full">
          {series.map((s) => (
            <div 
              key={s.key} 
              className="flex items-center gap-1.5 shrink-0 whitespace-nowrap bg-slate-50 dark:bg-slate-950/40 px-2 py-0.5 rounded-md border border-slate-150 dark:border-slate-800/80 shadow-[0_1px_1px_rgba(0,0,0,0.01)] transition-all"
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: getColorHex(s.color) }}
              />
              <span className="uppercase tracking-wider text-[8.5px] font-bold text-slate-600 dark:text-slate-350">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative">
        <svg 
          ref={svgRef}
          width={width} 
          height={height} 
          className="overflow-visible font-mono text-[10px] text-slate-400"
        >
          {/* Gridlines */}
          {gridLines.map((line, idx) => (
            <g key={idx} className="opacity-60">
              <line
                x1={padding.left}
                y1={line.y}
                x2={width - padding.right}
                y2={line.y}
                stroke={isDark ? "#1e293b" : "#e2e8f0"}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <text 
                x={padding.left - 8} 
                y={line.y + 3} 
                textAnchor="end" 
                fill={isDark ? "#94a3b8" : "#64748b"}
                className="fill-slate-400 font-medium font-mono"
              >
                {line.value}
              </text>
            </g>
          ))}

          {/* X Axis Line */}
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke={isDark ? "#334155" : "#cbd5e1"}
            strokeWidth={1.5}
          />

          {/* Dynamic Clustered Bars or Polylines */}
          {series.map((s, sIdx) => {
            const chartType = type === "dual" ? s.type : type;

            if (chartType === "bar") {
              const numSeries = series.length;
              const slotWidth = graphWidth / data.length;
              // Cluster takes 70% of available slot space
              const clusterWidth = slotWidth * 0.7;
              // Divide cluster width equally among series, minimum 1.5px to avoid render failures
              const barWidth = Math.max(clusterWidth / numSeries, 1.5);
              
              // Calculate starting point of the cluster relative to center
              const clusterStart = -((numSeries * barWidth) / 2);

              return (
                <g key={s.key}>
                  {data.map((item, itemIdx) => {
                    const rawVal = item[s.key];
                    const numVal = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal)) || 0;
                    const xCenter = getX(itemIdx);
                    
                    // Precise clustered bar placement
                    const x = xCenter + clusterStart + sIdx * barWidth;
                    
                    const y = getY(numVal);
                    // Determine baseline Y for the bar chart securely within grid bounds
                    const baselineY = minVal >= 0 
                      ? height - padding.bottom 
                      : maxVal <= 0 
                        ? padding.top 
                        : getY(0);

                    const barTop = numVal >= 0 ? y : baselineY;
                    const barBottom = numVal >= 0 ? baselineY : y;
                    const barHeight = Math.max(barBottom - barTop, 1);

                    const isDimmed = hoveredIdx !== null && hoveredIdx !== itemIdx;

                    return (
                      <rect
                        key={itemIdx}
                        x={x}
                        y={barTop}
                        width={barWidth}
                        height={Math.max(barHeight, 1)}
                        fill={getColorHex(s.color)}
                        opacity={isDimmed ? 0.35 : 1}
                        className="transition-all duration-200"
                        rx={barWidth > 3 ? 1 : 0.5}
                      />
                    );
                  })}
                </g>
              );
            } else {
              // Line representation
              let pathStr = "";
              data.forEach((item, itemIdx) => {
                const rawVal = item[s.key];
                const numVal = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal)) || 0;
                const x = getX(itemIdx);
                const y = getY(numVal);
                if (itemIdx === 0) {
                  pathStr += `M ${x} ${y}`;
                } else {
                  pathStr += ` L ${x} ${y}`;
                }
              });

              return (
                <g key={s.key}>
                  <path
                    d={pathStr}
                    fill="none"
                    stroke={getColorHex(s.color)}
                    strokeWidth={2}
                    opacity={hoveredIdx !== null ? 0.75 : 1}
                    className="transition-all duration-200"
                  />
                  {data.map((item, itemIdx) => {
                    const rawVal = item[s.key];
                    const numVal = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal)) || 0;
                    const x = getX(itemIdx);
                    const y = getY(numVal);

                    const isHovered = hoveredIdx === itemIdx;
                    const showAllDots = data.length <= 16;
                    const isDimmed = hoveredIdx !== null && !isHovered;

                    // Clean up cluttered line dots when there is too much data
                    if (!showAllDots && !isHovered) return null;

                    return (
                      <circle
                        key={itemIdx}
                        cx={x}
                        cy={y}
                        r={isHovered ? 4.5 : 2.5}
                        fill={isHovered ? getColorHex(s.color) : "#ffffff"}
                        stroke={getColorHex(s.color)}
                        strokeWidth={isHovered ? 2 : 1.5}
                        opacity={isDimmed ? 0.35 : 1}
                        className="transition-all duration-150 cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(itemIdx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      />
                    );
                  })}
                </g>
              );
            }
          })}

          {/* Vertical Guides on Hover */}
          {hoveredIdx !== null && (
            <line
              x1={getX(hoveredIdx)}
              y1={padding.top}
              x2={getX(hoveredIdx)}
              y2={height - padding.bottom}
              stroke={isDark ? "#475569" : "#cbd5e1"}
              strokeDasharray="2 2"
              strokeWidth={1}
              className="pointer-events-none"
            />
          )}

          {/* X Axis Labels */}
          {data.map((item, idx) => {
            const showLabel = data.length < 10 || idx % Math.ceil(data.length / 8) === 0;
            if (!showLabel) return null;
            return (
              <text
                key={idx}
                x={getX(idx)}
                y={height - padding.bottom + 16}
                textAnchor="middle"
                fill={isDark ? "#94a3b8" : "#64748b"}
                className="fill-slate-500 font-normal font-sans"
              >
                {item.label}
              </text>
            );
          })}

          {/* Transparent interaction columns for high fidelity snapping hover-tooltips */}
          {data.map((_, idx) => {
            const xCenter = getX(idx);
            const sliceWidth = data.length > 1 ? graphWidth / (data.length - 1) : graphWidth;
            const x = xCenter - sliceWidth / 2;
            return (
              <rect
                key={`hover-slice-${idx}`}
                x={x}
                y={padding.top}
                width={sliceWidth}
                height={graphHeight}
                fill="transparent"
                className="cursor-pointer pointer-events-auto"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && (
          <div
            className={`absolute z-20 p-3 rounded-xl shadow-xl border text-xs font-sans pointer-events-none transition-all duration-100 ${
              isDark 
                ? "bg-slate-950/95 text-slate-100 border-slate-800/80 shadow-emerald-950/20" 
                : "bg-white/95 text-slate-900 border-slate-200 shadow-slate-250"
            }`}
            style={{
              left: `${getX(hoveredIdx) > width * 0.6 ? getX(hoveredIdx) - 175 : getX(hoveredIdx) + 15}px`,
              top: `${Math.min(Math.max(getY(Number(data[hoveredIdx][series[0].key])) - 45, 10), height - 100)}px`,
              width: "160px",
            }}
          >
            <div className={`font-semibold text-[10px] uppercase tracking-wider mb-1.5 border-b pb-1 ${
              isDark ? "text-slate-400 border-slate-800" : "text-slate-500 border-slate-100"
            }`}>
              Period: {data[hoveredIdx].label}
            </div>
            <div className="space-y-1.5">
              {series.map((s) => (
                <div key={s.key} className="flex justify-between items-center gap-2 py-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span 
                      className="w-1.5 h-1.5 rounded-full shrink-0" 
                      style={{ backgroundColor: getColorHex(s.color) }}
                    />
                    <span className={`truncate text-[10px] font-medium ${isDark ? "text-slate-400" : "text-slate-650"}`}>
                      {s.name}:
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-500 text-[11px] shrink-0">
                    {typeof data[hoveredIdx][s.key] === "number"
                      ? (data[hoveredIdx][s.key] as number).toFixed(2)
                      : String(data[hoveredIdx][s.key])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
