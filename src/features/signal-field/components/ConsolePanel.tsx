import { Bug, Download, FileJson, HelpCircle, Upload } from "lucide-react";
import {
  Button,
  ButtonRow,
  Eyebrow,
  IconButton,
  Panel,
  PanelHeader,
  Readout,
  TextArea,
} from "../../../components/ui";
import type { CompileResult, RenderedPatch } from "../types";
import { DiagnosticList } from "./Diagnostics";

export function ConsolePanel({
  compileResult,
  jsonDraft,
  onDraftChange,
  onExplain,
  onExport,
  onImport,
  onNoSound,
  onPickFile,
  runtime,
}: {
  compileResult: CompileResult;
  jsonDraft: string;
  onDraftChange: (value: string) => void;
  onExplain: () => void;
  onExport: () => void;
  onImport: () => void;
  onNoSound: () => void;
  onPickFile: () => void;
  runtime: RenderedPatch;
}) {
  return (
    <Panel variant="editor">
      <PanelHeader>
        <div>
          <Eyebrow>Diagnostics Console</Eyebrow>
          <Readout as="h3">Explain silence</Readout>
        </div>
        <ButtonRow className="justify-end">
          <Button onClick={onExplain} type="button">
            <HelpCircle size={18} aria-hidden="true" />
            Explain This Patch
          </Button>
          <Button onClick={onNoSound} type="button">
            <Bug size={18} aria-hidden="true" />
            Why No Sound?
          </Button>
        </ButtonRow>
      </PanelHeader>
      <div className="grid gap-2 text-sm text-[var(--gs-text-muted)] md:grid-cols-3">
        <span>{compileResult.diagnostics.length} diagnostics</span>
        <span>Runtime peak {runtime.output.peak.toFixed(3)}</span>
        <span>{runtime.output.safetyMuted ? "Safety muted" : "Limiter ready"}</span>
      </div>
      <DiagnosticList diagnostics={[...compileResult.diagnostics, ...runtime.graphWarnings].slice(0, 6)} empty="No diagnostics." />
      <div className="grid gap-[var(--gs-gap-sm)]">
        <TextArea
          aria-label="Patch JSON and reports"
          onChange={(event) => onDraftChange(event.currentTarget.value)}
          placeholder="Export a PatchGraph JSON or run a diagnostic report."
          value={jsonDraft}
        />
        <ButtonRow>
          <Button onClick={onExport} type="button">
            <Download size={18} aria-hidden="true" />
            Export JSON
          </Button>
          <Button disabled={jsonDraft.trim().length === 0} onClick={onImport} type="button">
            <Upload size={18} aria-hidden="true" />
            Load JSON
          </Button>
          <IconButton label="Load patch file" onClick={onPickFile} type="button">
            <FileJson size={18} aria-hidden="true" />
          </IconButton>
        </ButtonRow>
      </div>
    </Panel>
  );
}
