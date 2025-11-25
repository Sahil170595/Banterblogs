'use client';

interface Annotation {
    type: 'point' | 'threshold' | 'range';
    label: string;
    x?: number;
    y?: number;
    color?: string;
    threshold?: number;
    range?: [number, number];
}

interface AnnotationLayerProps {
    annotations: Annotation[];
    scaleX: (value: number) => number;
    scaleY: (value: number) => number;
    width: number;
    margin: { top: number; right: number; bottom: number; left: number };
}

export function AnnotationLayer({ annotations, scaleX, scaleY, width, margin }: AnnotationLayerProps) {
    return (
        <g className="annotations">
            {annotations.map((annotation, i) => {
                if (annotation.type === 'threshold' && annotation.threshold !== undefined) {
                    const y = scaleY(annotation.threshold);
                    const color = annotation.color || 'hsl(var(--destructive))';

                    return (
                        <g key={i}>
                            <line
                                x1={margin.left}
                                x2={width - margin.right}
                                y1={y}
                                y2={y}
                                stroke={color}
                                strokeWidth={1.5}
                                strokeDasharray="4,4"
                                opacity={0.6}
                            />
                            <rect
                                x={width - margin.right - 80}
                                y={y - 12}
                                width={75}
                                height={18}
                                fill="hsl(var(--background))"
                                stroke={color}
                                strokeWidth={1}
                                rx={3}
                                opacity={0.9}
                            />
                            <text
                                x={width - margin.right - 42}
                                y={y + 2}
                                textAnchor="middle"
                                fill={color}
                                fontSize={9}
                                fontWeight={600}
                                fontFamily="var(--font-mono)"
                            >
                                {annotation.label}
                            </text>
                        </g>
                    );
                }

                if (annotation.type === 'point' && annotation.x !== undefined && annotation.y !== undefined) {
                    const x = scaleX(annotation.x);
                    const y = scaleY(annotation.y);
                    const color = annotation.color || 'hsl(var(--primary))';

                    return (
                        <g key={i}>
                            <circle
                                cx={x}
                                cy={y}
                                r={4}
                                fill={color}
                                stroke="hsl(var(--background))"
                                strokeWidth={2}
                            />
                            <rect
                                x={x + 8}
                                y={y - 10}
                                width={annotation.label.length * 6 + 8}
                                height={16}
                                fill="hsl(var(--background))"
                                stroke={color}
                                strokeWidth={1}
                                rx={3}
                                opacity={0.95}
                            />
                            <text
                                x={x + 12}
                                y={y + 1}
                                fill={color}
                                fontSize={9}
                                fontWeight={600}
                                fontFamily="var(--font-mono)"
                            >
                                {annotation.label}
                            </text>
                        </g>
                    );
                }

                if (annotation.type === 'range' && annotation.range) {
                    const [min, max] = annotation.range;
                    const yMin = scaleY(min);
                    const yMax = scaleY(max);
                    const color = annotation.color || 'hsl(var(--muted))';

                    return (
                        <g key={i}>
                            <rect
                                x={margin.left}
                                y={yMax}
                                width={width - margin.left - margin.right}
                                height={yMin - yMax}
                                fill={color}
                                opacity={0.1}
                            />
                            <text
                                x={margin.left + 8}
                                y={yMax + 12}
                                fill={color}
                                fontSize={9}
                                fontWeight={500}
                                opacity={0.8}
                            >
                                {annotation.label}
                            </text>
                        </g>
                    );
                }

                return null;
            })}
        </g>
    );
}
