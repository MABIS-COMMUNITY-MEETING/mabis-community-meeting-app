import React from "react";
import { Plus } from "lucide-react";

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

export const APP_VERSION = "v6.9.9";

export default function PageFooter() {
  return (
    <>
      <div className="mt-10 border-t border-foreground/15 pt-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center border border-foreground/20 bg-card overflow-hidden">
            <Plus className="absolute -top-1 -left-1 h-3 w-3 text-foreground/30" />
            <img src={MABIS_LOGO} alt="MABIS" className="h-11 w-11 object-contain" />
          </div>
          <div className="tech-label text-muted-foreground">／ COLOPHON</div>
          <h2 className="max-w-md font-display font-light tracking-ultra text-2xl sm:text-3xl">
            Secondary Community<br />Meeting App
          </h2>
          <div className="flex items-center gap-3 tech-label text-muted-foreground">
            <span>MABIS</span>
            <Plus className="h-3 w-3 text-primary/60" />
            <span>BANGKOK ／ TH</span>
            <Plus className="h-3 w-3 text-primary/60" />
            <span>2026</span>
          </div>
        </div>
      </div>
      <div className="mt-6 mb-8 flex justify-center">
        <div className="inline-flex items-center border border-foreground/20 px-4 py-1.5 tech-label text-muted-foreground">
          ／ VERSION {APP_VERSION}
        </div>
      </div>
    </>
  );
}