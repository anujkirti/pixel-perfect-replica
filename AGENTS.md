<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->
<!-- AGENT-MEMORY:BEGIN -->
- Use TanStack file routes with a shared shell and browser-only evaluation context; this preserves typed navigation and the offline no-backend requirement.
- Keep deterministic demo data in typed data modules and threshold/NMS/evaluation math in shared pure libraries; this makes cross-page behavior testable.
- Register generated app-shell caching only through the guarded offline module; previews must never install the app service worker.
- Warm the current public document through the activated worker after registration; the first online visit precedes worker control and would otherwise lack an offline HTML entry.
- Validate complete imported result bundles before replacing local state; partial or malformed evaluation data must not corrupt charts.
- Bundle one-time AI Gateway explanations as public demo data; never expose gateway credentials or introduce live AI dependencies into the offline research demo. Recompute threshold outcomes using shared math, not generated prose.
- Keep live detector engines dynamically imported from browser event handlers; TensorFlow and ONNX must never evaluate in SSR.
- Use the live settings/feedback context for camera workflows and a shared pure confirmation pipeline for all engines and synthetic tests; this keeps local feedback isolated from historical demo results and safety rules testable.
- Reset temporal histories when safety settings change; prior-frame confirmations must not survive a new threshold or window.
- Run ONNX in a module worker with transferred float buffers and explicit tensor disposal; keep browser WebGL/WASM fallback for environments without worker support.
<!-- AGENT-MEMORY:END -->
