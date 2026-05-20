import { FormEvent, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Check, Circle, Trash2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { AppShell, PublicShell } from "../components/AppShell";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  Button,
  ButtonRow,
  EmptyState,
  Field,
  FormPanel,
  IconButton,
  PageStack,
  Panel,
  PanelHeader,
  Readout,
  Stack,
  StatusText,
  TextInput,
} from "../components/ui";

type DemoItem = {
  _id: string;
  completed: boolean;
  title: string;
};

const demoItems: DemoItem[] = [
  { _id: "demo-1", title: "Wire up Convex auth", completed: true },
  { _id: "demo-2", title: "Replace the example table", completed: false },
];

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<ExampleItemsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/demo" element={<PublicDemoApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export function PublicDemoApp() {
  return (
    <PublicShell title="Demo">
      <Routes>
        <Route path="/demo" element={<PublicDemoPage />} />
        <Route path="*" element={<Navigate to="/demo" replace />} />
      </Routes>
    </PublicShell>
  );
}

export function SetupRequiredApp() {
  return (
    <PublicShell title="Setup">
      <Routes>
        <Route path="/" element={<SetupRequiredPage />} />
        <Route path="/settings" element={<SetupRequiredPage />} />
        <Route path="/demo" element={<PublicDemoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PublicShell>
  );
}

function ExampleItemsPage() {
  const items = useQuery(api.exampleItems.list);
  const createItem = useMutation(api.exampleItems.create);
  const toggleItem = useMutation(api.exampleItems.toggle);
  const removeItem = useMutation(api.exampleItems.remove);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await createItem({ title });
      setTitle("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create item.");
    }
  }

  return (
    <PageStack>
      <Panel>
        <PanelHeader>
          <div>
            <p className="mb-1 text-xs font-black uppercase leading-none tracking-normal text-[var(--gs-accent)]">
              Example Data Flow
            </p>
            <Readout>Items</Readout>
          </div>
          <StatusText variant="meta">{items ? `${items.length} shown` : "Loading..."}</StatusText>
        </PanelHeader>
        <StatusText>
          This screen is intentionally plain: it demonstrates a user-scoped query and create,
          toggle, and remove mutations.
        </StatusText>
      </Panel>

      <FormPanel onSubmit={handleCreate}>
        <Field label="New item">
          <TextInput
            autoComplete="off"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a starter task"
            value={title}
          />
        </Field>
        {error ? <StatusText variant="error">{error}</StatusText> : null}
        <ButtonRow>
          <Button type="submit" variant="primary">
            Create item
          </Button>
        </ButtonRow>
      </FormPanel>

      <ItemList
        items={items}
        onRemove={(itemId) => void removeItem({ itemId })}
        onToggle={(itemId) => void toggleItem({ itemId })}
      />
    </PageStack>
  );
}

function SettingsPage() {
  const viewer = useQuery(api.users.viewer);

  return (
    <PageStack>
      <Panel>
        <PanelHeader>
          <div>
            <p className="mb-1 text-xs font-black uppercase leading-none tracking-normal text-[var(--gs-accent)]">
              Account
            </p>
            <Readout>Settings</Readout>
          </div>
          <ThemeToggle />
        </PanelHeader>
        <Stack>
          <StatusText variant="account">{viewer?.email ?? "Signed in"}</StatusText>
          <StatusText>
            Add application settings here once the starter grows into a product.
          </StatusText>
        </Stack>
      </Panel>
    </PageStack>
  );
}

function SetupRequiredPage() {
  return (
    <PageStack>
      <Panel>
        <PanelHeader>
          <div>
            <p className="mb-1 text-xs font-black uppercase leading-none tracking-normal text-[var(--gs-accent)]">
              Convex Setup
            </p>
            <Readout>Connect your backend</Readout>
          </div>
          <ThemeToggle />
        </PanelHeader>
        <Stack>
          <StatusText>
            Add <code className="font-bold text-[var(--gs-heading)]">VITE_CONVEX_URL</code> to
            your local environment to enable Convex Auth and data.
          </StatusText>
          <StatusText>
            The public demo remains available without Convex so smoke and accessibility checks can
            run before backend setup.
          </StatusText>
        </Stack>
      </Panel>
    </PageStack>
  );
}

function PublicDemoPage() {
  const [items, setItems] = useState(demoItems);
  const [title, setTitle] = useState("");
  const remaining = useMemo(() => items.filter((item) => !item.completed).length, [items]);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setItems((current) => [
      { _id: `demo-${Date.now()}`, title: trimmed, completed: false },
      ...current,
    ]);
    setTitle("");
  }

  return (
    <PageStack>
      <Panel>
        <PanelHeader>
          <div>
            <p className="mb-1 text-xs font-black uppercase leading-none tracking-normal text-[var(--gs-accent)]">
              Public Demo
            </p>
            <Readout>Example items</Readout>
          </div>
          <StatusText variant="meta">{remaining} open</StatusText>
        </PanelHeader>
        <StatusText>
          This local demo mirrors the authenticated item workflow without calling Convex.
        </StatusText>
      </Panel>

      <FormPanel onSubmit={handleCreate}>
        <Field label="Demo item">
          <TextInput
            autoComplete="off"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a local demo item"
            value={title}
          />
        </Field>
        <ButtonRow>
          <Button type="submit" variant="primary">
            Add demo item
          </Button>
        </ButtonRow>
      </FormPanel>

      <ItemList
        items={items}
        onRemove={(itemId) => setItems((current) => current.filter((item) => item._id !== itemId))}
        onToggle={(itemId) =>
          setItems((current) =>
            current.map((item) =>
              item._id === itemId ? { ...item, completed: !item.completed } : item,
            ),
          )
        }
      />
    </PageStack>
  );
}

function ItemList<TItem extends { _id: string; completed: boolean; title: string }>({
  items,
  onRemove,
  onToggle,
}: {
  items: TItem[] | undefined;
  onRemove: (itemId: TItem["_id"]) => void;
  onToggle: (itemId: TItem["_id"]) => void;
}) {
  if (items === undefined) {
    return <EmptyState>Loading items...</EmptyState>;
  }

  if (items.length === 0) {
    return <EmptyState>No items yet. Create one to verify the data flow.</EmptyState>;
  }

  return (
    <Stack>
      {items.map((item) => (
        <Panel as="article" variant="card" key={item._id}>
          <div className="flex items-center justify-between gap-[var(--gs-gap-md)] max-[520px]:items-start">
            <button
              className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--gs-radius-md)] text-left outline-none focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--gs-focus)]"
              onClick={() => onToggle(item._id)}
              type="button"
            >
              <span
                className="grid size-6 flex-none place-items-center rounded-[var(--gs-radius-sm)] border border-[var(--gs-border)] bg-[var(--gs-surface-muted)] text-[var(--gs-success)]"
                aria-hidden="true"
              >
                {item.completed ? <Check size={16} /> : <Circle size={14} />}
              </span>
              <span
                className={
                  item.completed
                    ? "min-w-0 text-sm font-bold text-[var(--gs-text-muted)] line-through"
                    : "min-w-0 text-sm font-bold text-[var(--gs-heading)]"
                }
              >
                {item.title}
              </span>
            </button>
            <IconButton
              label={`Remove ${item.title}`}
              onClick={() => onRemove(item._id)}
              type="button"
              variant="danger"
            >
              <Trash2 size={17} aria-hidden="true" />
            </IconButton>
          </div>
        </Panel>
      ))}
    </Stack>
  );
}
