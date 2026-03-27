import { Check, X } from "lucide-react";

interface FeatureMatrixProps {
  products: any[];
}

export function FeatureMatrix({ products }: FeatureMatrixProps) {
  // Build union of all features across products
  const allFeatures = new Set<string>();
  products.forEach((p) => {
    (p.features?.list || []).forEach((f: string) => allFeatures.add(f));
  });
  const features = Array.from(allFeatures).sort();

  if (features.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[500px] border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 pr-4 text-left text-sm font-medium text-gray-500">Feature</th>
            {products.map((p: any) => (
              <th key={p.id} className="px-4 py-2 text-center text-sm font-semibold text-gray-900">
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {features.map((feature) => (
            <tr key={feature}>
              <td className="py-2 pr-4 text-sm text-gray-600">{feature}</td>
              {products.map((p: any) => {
                const has = (p.features?.list || []).includes(feature);
                return (
                  <td key={p.id} className="px-4 py-2 text-center">
                    {has ? (
                      <Check className="mx-auto h-4 w-4 text-green-500" />
                    ) : (
                      <X className="mx-auto h-4 w-4 text-gray-300" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
