import React from "react";

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

// 🔖 Update this version after each change
export const APP_VERSION = "v2.0.0";

export default function PageFooter() {
  return (
    <>
      <div className="mt-4 rounded-2xl overflow-hidden shadow-xl" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--ring)))" }}>
        <div className="p-4">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-inner">
            <img src={MABIS_LOGO} alt="MABIS" className="w-16 h-16 object-contain drop-shadow-sm" />
            <div className="h-px w-16 bg-gray-200" />
            <h2 className="font-display font-black text-xl tracking-tight text-center" style={{ color: "hsl(var(--primary))" }}>
              Secondary Community Meeting App
            </h2>
          </div>
        </div>
      </div>
      <div className="mt-3 mb-5 flex justify-center">
        <div className="inline-flex items-center px-4 py-1.5 rounded-2xl text-white text-sm font-display font-bold tracking-wide shadow-md bg-[#951E3A]">
          Version: {APP_VERSION}
        </div>
      </div>
    </>
  );
}