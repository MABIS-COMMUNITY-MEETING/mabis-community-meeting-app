import { lazy, splitProps, Suspense } from "solid-js";

const DocsEditor = lazy(() => import("~/components/DocsEditor"));

/*
 * The one rich-text surface used by Discussion topic forms, inline topic
 * editing, and live Meeting Notes. Keeping the lazy boundary and fallback here
 * means those three paths cannot drift back into different block/column
 * editors again.
 */
export default function DiscussionDocumentEditor(props) {
  const [local, editorProps] = splitProps(props, ["fallbackHeight"]);
  const fallbackHeight = () => local.fallbackHeight || editorProps.minHeight || "180px";

  return (
    <Suspense
      fallback={
        <div
          class="widget-loading-shell"
          style={{
            "--widget-fallback-height": fallbackHeight(),
            "min-height": fallbackHeight(),
          }}
          aria-label="Document editor loading"
        />
      }
    >
      <DocsEditor {...editorProps} />
    </Suspense>
  );
}
