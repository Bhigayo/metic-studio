import { SIDE_NAMES, STAGE_NAMES, type Side, type Stage } from "./model";

export function go(path: string) {
  location.hash = `#${path}`;
}

export function SideTag({ side }: { side: Side }) {
  return <span className={`side-tag ${side}`}>{SIDE_NAMES[side]}</span>;
}

export function StageTag({ stage }: { stage: Stage }) {
  return <span className={`stage-tag ${stage}`}>{STAGE_NAMES[stage]}</span>;
}

export function Wordmark() {
  return (
    <span className="wordmark">
      METIC <em>Studio</em>
    </span>
  );
}
