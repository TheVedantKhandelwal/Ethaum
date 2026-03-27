"use client";

interface QuadrantProduct {
  id: string;
  name: string;
  slug: string;
  x: number;
  y: number;
}

interface QuadrantChartProps {
  products: QuadrantProduct[];
  category: string;
}

export function QuadrantChart({ products, category }: QuadrantChartProps) {
  const size = 500;
  const padding = 40;
  const inner = size - 2 * padding;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        {category} — Market Quadrant
      </h3>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[500px]">
        {/* Background quadrants */}
        <rect x={padding} y={padding} width={inner / 2} height={inner / 2} fill="#fef3c7" opacity={0.3} />
        <rect x={padding + inner / 2} y={padding} width={inner / 2} height={inner / 2} fill="#d1fae5" opacity={0.3} />
        <rect x={padding} y={padding + inner / 2} width={inner / 2} height={inner / 2} fill="#fee2e2" opacity={0.3} />
        <rect x={padding + inner / 2} y={padding + inner / 2} width={inner / 2} height={inner / 2} fill="#dbeafe" opacity={0.3} />

        {/* Axes */}
        <line x1={padding} y1={size - padding} x2={size - padding} y2={size - padding} stroke="#d1d5db" strokeWidth={1} />
        <line x1={padding} y1={padding} x2={padding} y2={size - padding} stroke="#d1d5db" strokeWidth={1} />
        {/* Center lines */}
        <line x1={padding + inner / 2} y1={padding} x2={padding + inner / 2} y2={size - padding} stroke="#e5e7eb" strokeDasharray="4" />
        <line x1={padding} y1={padding + inner / 2} x2={size - padding} y2={padding + inner / 2} stroke="#e5e7eb" strokeDasharray="4" />

        {/* Labels */}
        <text x={size / 2} y={size - 8} textAnchor="middle" fontSize={11} fill="#6b7280">Completeness of Vision</text>
        <text x={12} y={size / 2} textAnchor="middle" fontSize={11} fill="#6b7280" transform={`rotate(-90, 12, ${size / 2})`}>Ability to Execute</text>

        {/* Quadrant labels */}
        <text x={padding + inner * 0.25} y={padding + 16} textAnchor="middle" fontSize={10} fill="#92400e" fontWeight="bold">Challengers</text>
        <text x={padding + inner * 0.75} y={padding + 16} textAnchor="middle" fontSize={10} fill="#065f46" fontWeight="bold">Leaders</text>
        <text x={padding + inner * 0.25} y={size - padding - 8} textAnchor="middle" fontSize={10} fill="#991b1b" fontWeight="bold">Niche Players</text>
        <text x={padding + inner * 0.75} y={size - padding - 8} textAnchor="middle" fontSize={10} fill="#1e40af" fontWeight="bold">Visionaries</text>

        {/* Products */}
        {products.map((p) => {
          const cx = padding + p.x * inner;
          const cy = size - padding - p.y * inner;
          return (
            <g key={p.id}>
              <circle cx={cx} cy={cy} r={8} fill="#4c6ef5" opacity={0.8} stroke="#fff" strokeWidth={2} />
              <text x={cx + 12} y={cy + 4} fontSize={10} fill="#374151" fontWeight={500}>
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
