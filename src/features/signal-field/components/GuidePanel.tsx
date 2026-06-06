import { X } from "lucide-react";
import { domainColors } from "../../../dsp/atoms";
import { ButtonRow, Eyebrow, IconButton, Panel, PanelHeader, Readout, StatusText } from "../../../components/ui";
import type { PortRef } from "../types";

export function GuidePanel({
  isOpen,
  onClose,
  pendingPort,
}: {
  isOpen: boolean;
  onClose: () => void;
  pendingPort: PortRef | null;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <Panel
      aria-labelledby="signal-field-guide-title"
      className="sticky top-[calc(4.5rem+var(--gs-gap-md))] z-20 max-h-[calc(100vh-6rem)] overflow-y-auto max-[760px]:static max-[760px]:max-h-none"
      variant="editor"
    >
      <PanelHeader>
        <div>
          <Eyebrow>Guide</Eyebrow>
          <Readout as="h3" id="signal-field-guide-title">
            How to use Signal Field
          </Readout>
        </div>
        <ButtonRow className="justify-end">
          <StatusText variant={pendingPort ? "success" : "meta"}>
            {pendingPort ? `Wiring from ${pendingPort.nodeId}.${pendingPort.handleId}` : "Ready to wire"}
          </StatusText>
          <IconButton label="Hide guide" onClick={onClose} type="button">
            <X size={18} aria-hidden="true" />
          </IconButton>
        </ButtonRow>
      </PanelHeader>

      <div className="grid gap-[var(--gs-gap-md)] text-sm leading-6 text-[var(--gs-text)] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="grid content-start gap-3 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] p-4">
          <h3 className="text-sm font-black uppercase leading-none text-[var(--gs-heading)]">Patch in six moves</h3>
          <ol className="grid gap-2 text-[var(--gs-text-muted)]">
            <li>
              <strong className="text-[var(--gs-heading)]">Add atoms:</strong> click an atom in the palette, or drag it onto the field.
            </li>
            <li>
              <strong className="text-[var(--gs-heading)]">Wire exact ports:</strong> click an output port pill, then click an input port pill. You can also drag from the round handle.
            </li>
            <li>
              <strong className="text-[var(--gs-heading)]">Read the wire:</strong> solid wires compile; dashed warning wires are kept in Lab mode but do not run.
            </li>
            <li>
              <strong className="text-[var(--gs-heading)]">Edit atoms:</strong> select a node and use the inspector controls below the field.
            </li>
            <li>
              <strong className="text-[var(--gs-heading)]">Remove wires:</strong> select a wire, then click Remove selected wire in the inspector, or press Delete/Backspace.
            </li>
            <li>
              <strong className="text-[var(--gs-heading)]">Listen:</strong> Play renders the patch and fires Manual Trigger once. Trigger does the same quick triggered preview.
            </li>
          </ol>
        </section>

        <section className="grid content-start gap-3 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] p-4">
          <h3 className="text-sm font-black uppercase leading-none text-[var(--gs-heading)]">First percussion recipe</h3>
          <div className="grid gap-2 text-[var(--gs-text-muted)]">
            <p>Build the simplest triggered tone from nothing:</p>
            <ol className="grid gap-1">
              <li>Manual Trigger.triggerOut {"->"} Decay Envelope.triggerIn</li>
              <li>Decay Envelope.controlOut {"->"} Gain.gainIn</li>
              <li>Sine Oscillator.audioOut {"->"} Gain.audioIn</li>
              <li>Gain.audioOut {"->"} Output.audioIn</li>
            </ol>
            <p>
              If it is silent, select Gain and check Base Gain. A VCA with no envelope and Base Gain 0 will mute the oscillator.
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-[var(--gs-gap-md)] text-sm leading-6 text-[var(--gs-text)] lg:grid-cols-3">
        <section className="grid content-start gap-3 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] p-4">
          <h3 className="text-sm font-black uppercase leading-none text-[var(--gs-heading)]">Signal domains</h3>
          <dl className="grid gap-2 text-[var(--gs-text-muted)]">
            <div>
              <dt className="font-bold" style={{ color: domainColors.audio }}>Audio</dt>
              <dd>Sound-rate signal. Use it for oscillators, noise, filters, mixers, VCA audio inputs, and Output.audioIn.</dd>
            </div>
            <div>
              <dt className="font-bold" style={{ color: domainColors.control }}>Control</dt>
              <dd>Continuous modulation. Envelopes usually output control and drive gain, pitch maps, or other modulation inputs.</dd>
            </div>
            <div>
              <dt className="font-bold" style={{ color: domainColors.trigger }}>Trigger</dt>
              <dd>Events, not sound. Use triggers to start envelopes, impulses, sequencers, and clocks.</dd>
            </div>
            <div>
              <dt className="font-bold" style={{ color: domainColors.parameter }}>Parameter</dt>
              <dd>Static or slow values such as Hz, seconds, scalar gain, cutoff, Q, and drive.</dd>
            </div>
          </dl>
        </section>

        <section className="grid content-start gap-3 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] p-4">
          <h3 className="text-sm font-black uppercase leading-none text-[var(--gs-heading)]">Connection modes</h3>
          <dl className="grid gap-2 text-[var(--gs-text-muted)]">
            <div>
              <dt className="font-bold text-[var(--gs-heading)]">Lab</dt>
              <dd>Default. Keeps weird wires visible and marks whether they compile.</dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--gs-heading)]">Guided</dt>
              <dd>Blocks invalid wires before they land. Use this when learning the port types.</dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--gs-heading)]">Unsafe</dt>
              <dd>Allows more experiments, but runtime safety still mutes unsafe output and blocks zero-delay feedback.</dd>
            </div>
          </dl>
        </section>

        <section className="grid content-start gap-3 rounded-[var(--gs-radius-md)] border border-[var(--gs-border-subtle)] bg-[var(--gs-surface)] p-4">
          <h3 className="text-sm font-black uppercase leading-none text-[var(--gs-heading)]">Diagnostics</h3>
          <div className="grid gap-2 text-[var(--gs-text-muted)]">
            <p>Select a wire to inspect its domain, rate, status, meter, reason, and suggested fix.</p>
            <p>Select empty canvas for patch-level status: compiler state, node/wire count, runtime peak, and graph diagnostics.</p>
            <p>Use Explain This Patch for a signal-flow trace, or Why No Sound? for deterministic silence checks.</p>
          </div>
        </section>
      </div>
    </Panel>
  );
}
