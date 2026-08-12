import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, Globe, ArrowBigUp } from "lucide-react";

/* Switch-style software keyboard — appears only when a controller focuses a
   text field (e.g. the Start Meeting unlock code). */
const ROWS_LOWER = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "/"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ":", "'"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "?", "!"],
];
const ROWS_UPPER = [
  ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "\\"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "\""],
  ["Z", "X", "C", "V", "B", "N", "M", "<", ">", "[", "]"],
];

function setValue(el, value) {
  const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export default function OnScreenKeyboard() {
  const [target, setTarget] = useState(null);
  const [shift, setShift] = useState(false);
  const firstKey = useRef(null);
  const skip = useRef(null);

  useEffect(() => {
    const onFocus = (e) => {
      if (!document.body.classList.contains("gamepad-active")) return;
      const el = e.target;
      /* only fields that opt in (the unlock meeting code) */
      if (!el?.dataset?.osk) return;
      if (skip.current === el) { skip.current = null; return; }
      setTarget(el);
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);

  useEffect(() => {
    if (target) requestAnimationFrame(() => firstKey.current?.focus({ preventScroll: true }));
  }, [target]);

  const close = () => {
    const el = target;
    skip.current = el;
    setTarget(null);
    setShift(false);
    requestAnimationFrame(() => el?.focus({ preventScroll: true }));
  };

  const type = (ch) => {
    if (!target) return;
    setValue(target, (target.value || "") + ch);
    if (shift) setShift(false);
  };
  const backspace = () => target && setValue(target, (target.value || "").slice(0, -1));
  const submit = () => {
    const form = target?.form || target?.closest("form");
    const el = target;
    close();
    requestAnimationFrame(() => {
      if (form) form.requestSubmit();
      else el?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
  };

  const rows = shift ? ROWS_UPPER : ROWS_LOWER;
  const keyCls =
    "h-11 min-w-[2.75rem] flex-1 flex items-center justify-center bg-[#f4f4f4] text-[#2c2c2c] text-base rounded-[3px] border border-[#dcdcdc] focus:outline-none focus:ring-2 focus:ring-[#00c3e3]";

  return createPortal(
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          data-native-cursor
          className="fixed left-0 right-0 bottom-0 z-[200] bg-[#e9e9e9] border-t border-[#cfcfcf] p-3 select-none"
        >
          <div className="max-w-3xl mx-auto flex flex-col gap-1.5">
            <div className="mb-1 px-1 text-sm text-[#4a4a4a] font-mono truncate">
              {target.type === "password" ? "•".repeat((target.value || "").length) : target.value || " "}
            </div>
            {rows.map((row, ri) => (
              <div key={ri} className="flex gap-1.5">
                {row.map((k, ki) => (
                  <button
                    key={k}
                    data-osk-key="1"
                    ref={ri === 0 && ki === 0 ? firstKey : null}
                    onClick={() => type(k)}
                    className={keyCls}
                  >
                    {k}
                  </button>
                ))}
                {ri === 0 && (
                  <button data-osk-key="1" onClick={backspace} className={`${keyCls} bg-[#3a3a3a] text-white border-[#3a3a3a] max-w-[6rem]`}>
                    <Delete className="w-5 h-5" />
                  </button>
                )}
                {ri === 1 && (
                  <button data-osk-key="1" onClick={() => type("\n")} className={`${keyCls} max-w-[6rem] text-sm`}>
                    Return
                  </button>
                )}
                {ri === 3 && (
                  <button data-osk-key="1" onClick={submit} className={`${keyCls} bg-[#2c62d6] text-white border-[#2c62d6] max-w-[6rem] text-sm`}>
                    OK
                  </button>
                )}
              </div>
            ))}
            <div className="flex gap-1.5">
              <button data-osk-key="1" onClick={close} className={`${keyCls} max-w-[3rem]`}>
                <Globe className="w-5 h-5" />
              </button>
              <button data-osk-key="1" onClick={() => setShift((s) => !s)} className={`${keyCls} max-w-[4rem] ${shift ? "bg-[#d5d5d5]" : ""}`}>
                <ArrowBigUp className="w-5 h-5" />
              </button>
              <button data-osk-key="1" onClick={() => type(" ")} className={`${keyCls} flex-[6] text-sm`}>
                Space
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}