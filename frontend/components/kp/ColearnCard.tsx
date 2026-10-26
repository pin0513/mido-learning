import Link from "next/link";
import { PrintColearnButton } from "./PrintColearnButton";

interface ColearnCardProps {
  pathTitle: string;
  pathHref: string;
  colearn: string;
  questions: string[];
  scenario: string;
}

export function ColearnCard({ pathTitle, pathHref, colearn, questions, scenario }: ColearnCardProps) {
  return (
    <section aria-labelledby="kp-colearn-heading" data-testid="kp-colearn" className="kp-colearn-print mt-10 border border-[#1a1614] bg-white p-4 sm:p-6">
      <div hidden data-kp-progress-slot="reserved" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#3d3830]">家庭時間</p>
          <h2 id="kp-colearn-heading" className="mt-1 text-xl font-bold">
            一起讀這條主線
          </h2>
        </div>
        <PrintColearnButton />
      </div>
      <p className="mt-3 text-sm">
        主線：
        <Link href={pathHref} className="kp-no-print font-semibold underline-offset-4 hover:underline">
          {pathTitle}
        </Link>
        <span className="hidden print:inline font-semibold">{pathTitle}</span>
      </p>
      <p className="mt-3 text-base leading-7">{colearn}</p>
      {questions.length > 0 ? (
        <>
          <h3 className="mt-4 text-sm font-bold">可以一起問</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
            {questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </>
      ) : null}
      {scenario ? (
        <>
          <h3 className="mt-4 text-sm font-bold">一起做</h3>
          <p className="mt-2 text-sm leading-6">{scenario}</p>
        </>
      ) : null}
    </section>
  );
}
