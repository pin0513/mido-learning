"use client";

import { useMemo, useState } from "react";

/** 三點估算。(O + 4M + P) / 6，範圍 ±(P − O) / 6。數字是範例。 */
export function Estimator() {
  const [optimistic, setOptimistic] = useState(4);
  const [likely, setLikely] = useState(8);
  const [pessimistic, setPessimistic] = useState(16);

  const result = useMemo(() => {
    const expected = (optimistic + likely * 4 + pessimistic) / 6;
    const spread = Math.abs(pessimistic - optimistic) / 6;
    return { expected, spread };
  }, [optimistic, likely, pessimistic]);

  const field = (label: string, value: number, set: (next: number) => void) => (
    <label>
      {label}
      <input
        type="number"
        min={0}
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => set(Number(event.target.value))}
      />
    </label>
  );

  return (
    <form className="est" data-ui onSubmit={(event) => event.preventDefault()}>
      <p className="small">範例數字。樂觀、最可能、悲觀，單位是小時。</p>
      <div className="row">
        {field("樂觀", optimistic, setOptimistic)}
        {field("最可能", likely, setLikely)}
        {field("悲觀", pessimistic, setPessimistic)}
      </div>
      <p className="out" aria-live="polite">
        預期工時 <b className="num">{result.expected.toFixed(1)}</b> 小時
        <span>大約 ±{result.spread.toFixed(1)}</span>
      </p>
    </form>
  );
}
