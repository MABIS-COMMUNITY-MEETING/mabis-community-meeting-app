import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { playWheelTick, playWheelStart, playWheelWin } from "@/lib/wheel_sound";

const WHEEL_COLORS = [
  "#8B5CF6", "#EC4899", "#3B82F6", "#10B981",
  "#F59E0B", "#EF4444", "#06B6D4", "#6366F1",
  "#14B8A6", "#F97316", "#A855F7", "#84CC16"
];

export default function SpinWheel({ members, onResult }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState(null);
  const canvasRef = useRef(null);

  const segmentAngle = members.length > 0 ? 360 / members.length : 360;

  useEffect(() => {
    drawWheel();
  }, [members, rotation]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || members.length === 0) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;

    ctx.clearRect(0, 0, size, size);

    // Draw shadow
    ctx.beginPath();
    ctx.arc(center, center + 4, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fill();

    members.forEach((member, i) => {
      const startAngle = (i * segmentAngle - 90 + rotation) * (Math.PI / 180);
      const endAngle = ((i + 1) * segmentAngle - 90 + rotation) * (Math.PI / 180);

      // Segment
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();

      // Border
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      const textAngle = startAngle + (endAngle - startAngle) / 2;
      const textRadius = radius * 0.65;
      const textX = center + Math.cos(textAngle) * textRadius;
      const textY = center + Math.sin(textAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.fillStyle = "white";
      ctx.font = `bold ${Math.max(10, Math.min(14, 200 / members.length))}px UnifontEX`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      const name = member.name.length > 10 ? member.name.slice(0, 9) + "…" : member.name;
      ctx.fillText(name, 0, 0);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 24, 0, Math.PI * 2);
    ctx.fillStyle = "#1e1b4b";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(center, center, 20, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(center, center, 0, center, center, 20);
    grad.addColorStop(0, "#8B5CF6");
    grad.addColorStop(1, "#6D28D9");
    ctx.fillStyle = grad;
    ctx.fill();
  };

  const spin = () => {
    if (spinning || members.length === 0) return;
    setSpinning(true);
    setWinner(null);
    playWheelStart();

    const extraSpins = 5 + Math.random() * 5;
    const targetAngle = Math.random() * 360;
    const totalRotation = extraSpins * 360 + targetAngle;

    let startTime = null;
    const duration = 4000;
    const startRotation = rotation;

    const easeOut = (t) => 1 - Math.pow(1 - t, 4);

    // one wooden knock each time a segment edge crosses the pointer
    let lastSegment = Math.floor(startRotation / segmentAngle);

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);

      const currentRotation = startRotation + totalRotation * easedProgress;
      setRotation(currentRotation % 360);

      const segment = Math.floor(currentRotation / segmentAngle);
      if (segment !== lastSegment) {
        lastSegment = segment;
        playWheelTick(progress);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        const finalAngle = (360 - (currentRotation % 360) + 90) % 360;
        const winnerIndex = Math.floor(finalAngle / segmentAngle) % members.length;
        const selectedMember = members[winnerIndex];
        setWinner(selectedMember);
        setSpinning(false);
        playWheelWin();

        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.5 },
          colors: ["#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B"],
        });

        if (onResult) onResult(selectedMember);
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        {/* Pointer */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
          <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-foreground drop-shadow-lg" />
        </div>
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="rounded-full shadow-2xl shadow-primary/20 cursor-pointer"
          onClick={spin}
        />
        {/* Glow */}
        <div className="absolute inset-0 rounded-full bg-primary/5 blur-3xl -z-10 scale-125" />
      </div>

      <motion.button
        onClick={spin}
        disabled={spinning || members.length === 0}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-8 py-3 rounded-2xl font-display font-bold text-white bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed text-lg tracking-wide"
      >
        {spinning ? "🎰 Spinning..." : "🎯 SPIN THE WHEEL"}
      </motion.button>

      {winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="text-center p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
        >
          <p className="text-sm text-muted-foreground font-medium">🎉 Selected</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{winner.name}</p>
        </motion.div>
      )}
    </div>
  );
}