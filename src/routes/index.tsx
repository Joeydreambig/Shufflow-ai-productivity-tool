import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Check, Pencil, Plus, Settings } from "lucide-react";
import { Cube } from "@/components/cube/Cube";
import { useAppStore } from "@/lib/store";
import type { Flow } from "@/lib/types";
import { colorForFlow, uid } from "@/lib/utils-flow";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Shufflow" }] }),
  component: Home,
});

function Home() {
  const t = useT();
  const navigate = useNavigate();
  const flows = useAppStore((state) => state.flows);
  const hydrated = useAppStore((state) => state.hydrated);
  const upsertFlow = useAppStore((state) => state.upsertFlow);
  const [tab, setTab] = useState<"new" | "mine">("new");
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [creatingFlow, setCreatingFlow] = useState(false);
  const [newFlowTitle, setNewFlowTitle] = useState("");
  const { active, completed } = useMemo(
    () => ({
      active: flows.filter((flow) => flow.status !== "completed"),
      completed: flows.filter((flow) => flow.status === "completed"),
    }),
    [flows],
  );

  const createFlow = () => {
    const now = Date.now();
    const flow: Flow = {
      id: uid(),
      title: t("untitled_flow"),
      emoji: "✨",
      tags: [],
      tasks: [],
      totalDurationMinutes: 0,
      progress: 0,
      isRecurring: false,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    upsertFlow(flow);
    navigate({ to: "/flows/$flowId", params: { flowId: flow.id } });
  };

  const createNamedFlow = () => {
    const title = newFlowTitle.trim();
    if (!title) return;
    const now = Date.now();
    const flow: Flow = {
      id: uid(),
      title,
      emoji: "◆",
      tags: [],
      tasks: [],
      totalDurationMinutes: 0,
      progress: 0,
      isRecurring: false,
      status: "active",
      color: ["violet", "sky", "emerald", "amber", "rose", "indigo"][
        flows.length % 6
      ] as Flow["color"],
      createdAt: now,
      updatedAt: now,
    };
    upsertFlow(flow);
    setNewFlowTitle("");
    setCreatingFlow(false);
    setSelectedFlowId(flow.id);
  };

  return (
    <main className="flow-hub">
      <header className="flow-hub__header">
        <span className="flow-hub__wordmark">{t("app_name")}</span>
        <Link to="/settings" className="flow-hub__settings" aria-label={t("settings")}>
          <Settings />
        </Link>
      </header>

      {tab === "new" ? (
        <section className="new-flow-stage object-home" aria-label={t("new_flow_tab")}>
          <div className="object-home__cube">
            <Cube
              variant="create-flow"
              mode="start"
              size={190}
              hint={t("spin_to_create")}
              chargeLabel={t("fidget_charge")}
              readyLabel={t("flow_opening")}
              fallbackLabel={t("create_without_spinning")}
              onStart={createFlow}
            />
          </div>
          <button type="button" className="object-home__flows" onClick={() => setTab("mine")}>
            {t("my_flows_tab")}
          </button>
        </section>
      ) : (
        <section className="my-flows-stage">
          <header className="my-flows-stage__heading">
            <button type="button" onClick={() => setTab("new")}>
              {t("back_to_cube")}
            </button>
            <h1>{t("my_flows_tab")}</h1>
          </header>
          {!hydrated ? (
            <div className="flow-list-skeleton" />
          ) : (
            <>
              <div className="flow-collection flow-collection-world" aria-label={t("my_flows_tab")}>
                {[...active, ...completed].map((flow, index) => (
                  <FlowObject
                    key={flow.id}
                    flow={flow}
                    index={index}
                    selected={selectedFlowId === flow.id}
                    onSelect={() => {
                      setCreatingFlow(false);
                      setSelectedFlowId((current) => (current === flow.id ? null : flow.id));
                    }}
                  />
                ))}
                <button
                  type="button"
                  className={`flow-object flow-object--empty ${creatingFlow ? "is-selected" : ""}`}
                  onClick={() => {
                    setSelectedFlowId(null);
                    setCreatingFlow(true);
                  }}
                  aria-label={t("new_flow")}
                  style={{ left: "46%", top: "68%" }}
                >
                  <span data-accent="indigo" className="flow-object__cube">
                    <Cube
                      mode="idle"
                      size={104}
                      framePadding={18}
                      energy={0}
                      centerContent={<Plus />}
                    />
                  </span>
                  <span>{t("new_flow")}</span>
                </button>
              </div>

              {creatingFlow && (
                <form
                  className="flow-object-reveal flow-object-reveal--create"
                  onSubmit={(event) => {
                    event.preventDefault();
                    createNamedFlow();
                  }}
                >
                  <label htmlFor="new-flow-name">{t("flow_purpose_prompt")}</label>
                  <input
                    id="new-flow-name"
                    autoFocus
                    value={newFlowTitle}
                    onChange={(event) => setNewFlowTitle(event.target.value)}
                    placeholder={t("flow_name_example")}
                  />
                  <button
                    type="submit"
                    disabled={!newFlowTitle.trim()}
                    aria-label={t("create_flow")}
                  >
                    <ArrowRight />
                  </button>
                </form>
              )}

              {selectedFlowId && (
                <FlowReveal
                  key={selectedFlowId}
                  flow={flows.find((flow) => flow.id === selectedFlowId) ?? null}
                />
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}

function FlowObject({
  flow,
  index,
  selected,
  onSelect,
}: {
  flow: Flow;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const accent = colorForFlow(flow);
  const spots = [
    { left: 12, top: 12 },
    { left: 58, top: 24 },
    { left: 25, top: 54 },
    { left: 68, top: 62 },
    { left: 40, top: 38 },
  ];
  const spot = spots[index % spots.length];
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const movedRef = useRef(false);
  return (
    <button
      type="button"
      className={`flow-object ${selected ? "is-selected" : ""} ${flow.status === "completed" ? "is-completed" : ""}`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
        movedRef.current = false;
      }}
      onPointerMove={(event) => {
        const start = dragRef.current;
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.hypot(dx, dy) > 6) movedRef.current = true;
        setOffset({ x: start.ox + dx, y: start.oy + dy });
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragRef.current = null;
        if (!movedRef.current) onSelect();
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      onClick={(event) => {
        if (event.detail === 0) onSelect();
      }}
      aria-pressed={selected || undefined}
      aria-label={flow.title}
      style={
        {
          left: `${spot.left}%`,
          top: `${spot.top}%`,
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          "--float-delay": `${index * -1.1}s`,
        } as CSSProperties
      }
    >
      <span data-accent={accent} className="flow-object__cube">
        <Cube mode="idle" size={104} framePadding={18} />
      </span>
      <span>{flow.title}</span>
    </button>
  );
}

function FlowReveal({ flow }: { flow: Flow | null }) {
  const t = useT();
  const renameFlow = useAppStore((state) => state.renameFlow);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(flow?.title ?? "");
  if (!flow) return null;
  const done = flow.tasks.filter((task) => task.status === "completed").length;
  return (
    <div className="flow-object-reveal" data-accent={colorForFlow(flow)}>
      <p>{flow.status === "completed" ? t("completed_piece") : t("flow_cube_label")}</p>
      {renaming ? (
        <form
          className="flow-rename"
          onSubmit={(event) => {
            event.preventDefault();
            const nextName = name.trim();
            if (!nextName) return;
            renameFlow(flow.id, nextName);
            setRenaming(false);
          }}
        >
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} />
          <button type="submit" aria-label={t("save_changes")}>
            <Check />
          </button>
        </form>
      ) : (
        <button
          className="flow-reveal-name"
          onClick={() => {
            setName(flow.title);
            setRenaming(true);
          }}
        >
          <h2>{flow.title}</h2>
          <Pencil />
        </button>
      )}
      <span>
        {done} {t("of")} {flow.tasks.length} {t("tasks_complete")}
      </span>
      <Link
        to="/flows/$flowId"
        params={{ flowId: flow.id }}
        aria-label={`${t("open")} ${flow.title}`}
      >
        {flow.status === "completed" ? t("open") : t("continue")} <ArrowRight />
      </Link>
    </div>
  );
}
