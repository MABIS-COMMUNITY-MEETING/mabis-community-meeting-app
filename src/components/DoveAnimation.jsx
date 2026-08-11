import React from "react";

// Dove animation disabled per user request
export default function DoveAnimation({ onComplete }) {
  React.useEffect(() => { onComplete?.(); }, []);
  return null;
}