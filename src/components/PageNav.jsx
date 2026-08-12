import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

/** Shared archive-page header: Back (with Home fallback) + centre label + Home. */
export default function PageNav({ label }) {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/home");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bone/90 backdrop-blur-sm">
      <div className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4">
        <button type="button" onClick={goBack} data-cursor="BACK"
          className="group flex items-center gap-3 py-2 -my-2">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="tech-label text-muted-foreground">／ BACK</span>
        </button>
        {label && <span className="hidden sm:block tech-label text-primary">{label}</span>}
        <Link to="/home" data-cursor="HOME" className="tech-label text-muted-foreground ul-grow py-2 -my-2">HOME</Link>
      </div>
      <div className="h-px w-full bg-foreground/12" />
    </header>
  );
}