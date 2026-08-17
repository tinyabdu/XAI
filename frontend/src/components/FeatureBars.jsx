import { BarChart3 } from 'lucide-react';

function Bars({ rows }) {
  if (!rows || !rows.length) return <p className="text-xs text-gray-400">No attribution data available.</p>;
  const max = Math.max(...rows.map(r => Math.abs(r.weight)), 0.0001);
  return (
    <ul className="space-y-2">
      {rows.slice(0, 8).map((r, i) => {
        const pct = Math.round(Math.abs(r.weight) / max * 100);
        const positive = r.weight >= 0;
        return (
          <li key={i}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-700">{r.label}</span>
              <span className={`font-mono font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
                {positive ? '+' : ''}{r.weight.toFixed(3)}
              </span>
            </div>
            <div className="h-2 rounded bg-gray-100 overflow-hidden">
              <div
                className={`h-2 rounded ${positive ? 'bg-green-500' : 'bg-red-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function FeatureBars({ features }) {
  if (!features || (!features.shap && !features.lime)) return null;
  const probs = features.probabilities || {};
  return (
    <div className="mt-5 pt-4 border-t">
      <h4 className="text-xs uppercase text-gray-400 mb-1 inline-flex items-center gap-1.5">
        <BarChart3 size={13} /> ML feature attribution — {features.model || 'model'}
      </h4>
      {Object.keys(probs).length > 0 && (
        <p className="text-xs text-gray-500 mb-3">
          Model probabilities: {Object.entries(probs).map(([k, v]) => (
            <span key={k} className="mr-2">
              {k} <b className="font-mono">{(v * 100).toFixed(1)}%</b>
            </span>
          ))}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">SHAP — how each factor pushed the decision</p>
          <Bars rows={features.shap} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">LIME — local surrogate model weights</p>
          <Bars rows={features.lime} />
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-3">Positive values increased the admission likelihood; negative values decreased it.</p>
    </div>
  );
}
