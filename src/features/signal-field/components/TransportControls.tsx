import { CircleStop, Play, Volume2, VolumeX, Zap } from "lucide-react";
import { Button, ButtonRow } from "../../../components/ui";

export function TransportControls({
  isMuted,
  onPanic,
  onPlay,
  onToggleMute,
  onTrigger,
}: {
  isMuted: boolean;
  onPanic: () => void;
  onPlay: () => void;
  onToggleMute: () => void;
  onTrigger: () => void;
}) {
  return (
    <ButtonRow className="justify-end">
      <Button onClick={onPlay} type="button" variant="primary">
        <Play size={18} aria-hidden="true" />
        Play
      </Button>
      <Button onClick={onTrigger} type="button">
        <Zap size={18} aria-hidden="true" />
        Trigger
      </Button>
      <Button onClick={onToggleMute} type="button">
        {isMuted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
        {isMuted ? "Muted" : "Safe"}
      </Button>
      <Button onClick={onPanic} type="button" variant="danger">
        <CircleStop size={18} aria-hidden="true" />
        Panic
      </Button>
    </ButtonRow>
  );
}
