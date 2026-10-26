import Link from "next/link";

export interface MatrixLayer {
  id: string;
  name: string;
  role: string;
}

export interface MatrixStage {
  id: string;
  name: string;
}

interface LayerStageMatrixProps {
  layers: MatrixLayer[];
  stages: MatrixStage[];
  count: (layerId: string, stageId: string) => number;
}

const cellLink =
  "flex min-h-11 items-center justify-between gap-2 border border-[#c0bab2] bg-white px-3 py-2 text-sm hover:border-[#1a1614] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1614]";

/** 層級（縱）× 階段（橫）。之後的城市地圖是疊在這張表上的總覽，不取代它。 */
export function LayerStageMatrix({ layers, stages, count }: LayerStageMatrixProps) {
  return (
    <div data-testid="kp-layer-stage">
      <ul className="grid gap-3 md:hidden">
        {layers.map((layer) => (
          <li key={layer.id} className="border border-[#c0bab2] bg-white p-3">
            <h3 className="font-bold">
              <Link href={`/kp/layer/${layer.id}`} className="underline-offset-4 hover:underline">
                {layer.name}
              </Link>
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#3d3830]">{layer.role}</p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {stages.map((stage) => {
                const total = count(layer.id, stage.id);
                return (
                  <li key={stage.id}>
                    <Link href={`/kp/layer/${layer.id}?stage=${stage.id}`} className={cellLink}>
                      <span>{stage.name}</span>
                      <span className="font-bold">{total}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">層級與階段的知識點數量</caption>
          <thead>
            <tr>
              <th scope="col" className="border border-[#c0bab2] bg-white px-3 py-3 text-left">
                層級
              </th>
              {stages.map((stage) => (
                <th key={stage.id} scope="col" className="border border-[#c0bab2] bg-white px-3 py-3 text-left">
                  <Link href={`/kp/stage/${stage.id}`} className="underline-offset-4 hover:underline">
                    {stage.name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {layers.map((layer) => (
              <tr key={layer.id}>
                <th scope="row" className="border border-[#c0bab2] bg-white px-3 py-3 text-left font-bold">
                  <Link href={`/kp/layer/${layer.id}`} className="underline-offset-4 hover:underline">
                    {layer.name}
                  </Link>
                  <span className="mt-1 block text-xs font-normal text-[#3d3830]">{layer.role}</span>
                </th>
                {stages.map((stage) => {
                  const total = count(layer.id, stage.id);
                  return (
                    <td key={stage.id} className="border border-[#c0bab2] bg-white px-3 py-3">
                      <Link href={`/kp/layer/${layer.id}?stage=${stage.id}`} className="font-bold underline-offset-4 hover:underline">
                        {total}
                        <span className="sr-only">
                          {" "}
                          筆{layer.name}
                          {stage.name}
                        </span>
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
