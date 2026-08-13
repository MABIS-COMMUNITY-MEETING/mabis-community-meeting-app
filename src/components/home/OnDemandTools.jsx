import { lazy, Suspense, useState } from "react";
import { Heart, Loader2, Sparkles } from "lucide-react";

const MabisAIAssistant = lazy(() => import("@/components/MabisAIAssistant"));
const FeedbackWidget = lazy(() => import("@/components/FeedbackWidget"));

function Launcher({ side, label, icon: Icon, loading, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mobile-fab fixed bottom-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full border-2 border-white text-white shadow-xl ${side === "left" ? "mobile-fab-left left-5" : "mobile-fab-right right-6"}`}
      style={{ background: "hsl(var(--primary))" }}
      title={label}
      aria-label={label}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-6 w-6" />}
    </button>
  );
}

export default function OnDemandTools() {
  const [assistantRequested, setAssistantRequested] = useState(false);
  const [feedbackRequested, setFeedbackRequested] = useState(false);

  return (
    <>
      {assistantRequested ? (
        <Suspense fallback={<Launcher side="right" label="Loading MABIS Assistant" icon={Sparkles} loading />}>
          <MabisAIAssistant defaultOpen />
        </Suspense>
      ) : (
        <Launcher side="right" label="MABIS Omni AI Assistant" icon={Sparkles} onClick={() => setAssistantRequested(true)} />
      )}

      {feedbackRequested ? (
        <Suspense fallback={<Launcher side="left" label="Loading feedback panel" icon={Heart} loading />}>
          <FeedbackWidget defaultOpen />
        </Suspense>
      ) : (
        <Launcher side="left" label="Feedback & Bug Reports" icon={Heart} onClick={() => setFeedbackRequested(true)} />
      )}
    </>
  );
}
