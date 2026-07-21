import { createFileRoute } from "@tanstack/react-router";
import { CreateOrEdit } from "./flows.new";

export const Route = createFileRoute("/flows/$flowId/edit")({
  head: () => ({
    meta: [{ title: "Edit flow — Shufflow" }],
  }),
  component: () => <CreateOrEdit mode="edit" />,
});
