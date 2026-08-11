import React from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

export default function PageNotFound({}) {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  const { data: authData, isFetched } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        return { user, isAuthenticated: true };
      } catch (error) {
        return { user: null, isAuthenticated: false };
      }
    },
  });

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bone text-foreground flex items-center justify-center px-6 py-16">
      <div className="grid-bg absolute inset-0 opacity-50" />
      <div className="relative z-10 w-full max-w-xl text-center">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
          className="tech-label text-primary mb-6"
        >／ ERROR 404</motion.div>
        <h1 className="font-display font-thin tracking-ultra leading-none text-8xl sm:text-[12rem]">
          404
        </h1>
        <div className="mx-auto my-8 h-px w-24 bg-foreground/30" />
        <h2 className="font-display font-light tracking-tight text-2xl mb-3">Page Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          The coordinate <span className="text-foreground">{pageName}</span> does not exist within this application.
        </p>

        {isFetched && authData.isAuthenticated && authData.user?.role === "admin" && (
          <div className="mt-8 border border-foreground/20 bg-card p-4 text-left max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
              <div className="space-y-1">
                <p className="tech-label text-foreground">／ ADMIN NOTE</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This page may not be implemented yet — request it in the chat.
                </p>
              </div>
            </div>
          </div>
        )}

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