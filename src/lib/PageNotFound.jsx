import React from "react";
import { useLocation } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function PageNotFound({}) {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bone text-foreground flex items-center justify-center px-6 py-16">
      <div className="grid-bg absolute inset-0 opacity-50" />
      <div className="relative z-10 w-full max-w-xl text-center">
        <div className="route-transition-content tech-label text-primary mb-6"> ERROR 404</div>
        <h1 className="font-display font-thin tracking-ultra leading-none text-8xl sm:text-[12rem]">
          404
        </h1>
        <div className="mx-auto my-8 h-px w-24 bg-foreground/30" />
        <h2 className="font-display font-light tracking-tight text-2xl mb-3">Page Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          The coordinate <span className="text-foreground">{pageName}</span> does not exist within this application.
        </p>

        <button
          onClick={() => window.location.href = "/"}
          data-cursor="HOME"
          className="group mt-10 inline-flex items-center gap-3 border border-foreground/30 bg-card px-6 py-3 tech-label hover:bg-foreground hover:text-bone transition-colors"
        >
          RETURN HOME
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </div>
  );
}