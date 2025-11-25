'use client';

interface AxisProps {
    type: 'x' | 'y';
    scale: (value: number) => number;
    domain: [number, number];
    ticks?: number;
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    label?: string;
    formatTick?: (value: number) => string;
}

function formatNumber(value: number): string {
    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(1);
    return value.toFixed(value % 1 === 0 ? 0 : 2);
}

export function Axes({ type, scale, domain, ticks = 5, width, height, margin, label, formatTick }: AxisProps) {
    const [min, max] = domain;
    const tickValues = Array.from({ length: ticks }, (_, i) => min + ((max - min) / (ticks - 1)) * i);
    const format = formatTick || formatNumber;

    if (type === 'x') {
        const y = height - margin.bottom;
        return (
            <g className="axis axis-x">
                {/* Axis line */}
                <line
                    x1={margin.left}
                    x2={width - margin.right}
                    y1={y}
                    y2={y}
                    stroke="hsl(var(--muted-foreground))"
                    strokeOpacity={0.3}
                />

                {/* Ticks and labels */}
                {tickValues.map((value, i) => {
                    const x = scale(value);
                    return (
                        <g key={i}>
                            <line
                                x1={x}
                                x2={x}
                                y1={y}
                                y2={y + 4}
                                stroke="hsl(var(--muted-foreground))"
                                strokeOpacity={0.5}
                            />
                            <text
                                x={x}
                                y={y + 16}
                                textAnchor="middle"
                                fill="hsl(var(--muted-foreground))"
                                fontSize={10}
                                fontFamily="var(--font-mono)"
                            >
                                {format(value)}
                            </text>
                        </g>
                    );
                })}

                {/* Axis label */}
                {label && (
                    <text
                        x={(margin.left + width - margin.right) / 2}
                        y={height - 4}
                        textAnchor="middle"
                        fill="hsl(var(--foreground))"
                        fontSize={11}
                        fontWeight={500}
                    >
                        {label}
                    </text>
                )}
            </g>
        );
    }

    // Y-axis
    const x = margin.left;
    return (
        <g className="axis axis-y">
            {/* Axis line */}
            <line
                x1={x}
                x2={x}
                y1={margin.top}
                y2={height - margin.bottom}
                stroke="hsl(var(--muted-foreground))"
                strokeOpacity={0.3}
            />

            {/* Ticks and labels */}
            {tickValues.map((value, i) => {
                const y = scale(value);
                return (
                    <g key={i}>
                        <line
                            x1={x - 4}
                            x2={x}
                            y1={y}
                            y2={y}
                            stroke="hsl(var(--muted-foreground))"
                            strokeOpacity={0.5}
                        />
                        <text
                            x={x - 8}
                            y={y + 3}
                            textAnchor="end"
                            fill="hsl(var(--muted-foreground))"
                            fontSize={10}
                            fontFamily="var(--font-mono)"
                        >
                            {format(value)}
                        </text>
                    </g>
                );
            })}

            {/* Axis label */}
            {label && (
                <text
                    x={-((margin.top + height - margin.bottom) / 2)}
                    y={12}
                    textAnchor="middle"
                    fill="hsl(var(--foreground))"
                    fontSize={11}
                    fontWeight={500}
                    transform={`rotate(-90)`}
                >
                    {label}
                </text>
            )}
        </g>
    );
}
