"use client";

import React, { useState, useRef, useEffect } from "react";
import { PromoCard } from "@/lib/types";
import { resolveImageUrl } from "@/lib/image-url";
import { ExternalLink, Sparkles, X, ChevronRight, ChevronLeft, HelpCircle, Flame, Gift } from "lucide-react";

interface PromoScrollerProps {
  cards: PromoCard[];
  onOpenBoardClick?: () => void;
  lang?: "th" | "en" | "cn";
}

export const DUMMY_PROMO_CARDS: PromoCard[] = [
  {
    id: "card-tutorial-3steps",
    title: "วิธีสั่งอาหารร่วมตี้ใน 3 ขั้นตอน",
    subtitle: "เลือกตี้ที่เปิดอยู่ ➔ สั่งเมนู + แนบสลิป ➔ รอรับที่จุดส่ง สะดวก ประหยัดค่าส่ง",
    badge: "คู่มือการใช้",
    imageUrl: "/veatec-logo.png",
    actionType: "modal",
    modalTitle: "📖 3 สเต็ปง่ายๆ สั่งอาหารกับ vEATec",
    modalContent: `### สั่งอาหารร่วมตี้ง่ายๆ ใน 3 สเต็ป:\n\n1. **เลือกตี้ที่เปิดรับออเดอร์**: ดูร้านที่อยากทาน และตึกปลายทาง เช่น ตึก M4\n2. **พิมพ์ชื่อเมนูและโอนเงิน**: โอนเงินเข้า PromptPay ร้านค้าโดยตรง พร้อมแนบสลิป (ระบบมี AI ช่วยตรวจสลิปทันที)\n3. **รอรับอาหารที่โต๊ะส่วนกลาง**: เมื่ออาหารมาส่ง หัวหน้าตี้จะถ่ายรูปจุดวางอาหารและแจ้งเตือนเข้า LINE กลุ่มทันที! 🎉`,
    isActive: true,
    order: 0,
    createdAt: new Date().toISOString(),
  } as any,
  {
    id: "card-host-power",
    title: "อยากกินร้านไหน? เปิดตี้เองได้เลย!",
    subtitle: "ใครๆ ก็เป็นหัวหน้าตี้ได้ ระบบมีปุ่มก็อปสรุปออเดอร์ส่งร้านให้เสร็จสรรพ",
    badge: "เปิดตี้เลย",
    imageUrl: "/veatec-logo.png",
    actionType: "open_board",
    isActive: true,
    order: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: "card-line-community",
    title: "เข้ากลุ่ม LINE vEATec VISTEC",
    subtitle: "ไม่พลาดทุกตี้เปิดใหม่ และแจ้งเตือนเมื่อข้าวมาส่งถึงโต๊ะอาหาร",
    badge: "LINE กลุ่ม",
    imageUrl: "/veatec-logo.png",
    actionType: "link",
    actionUrl: "https://line.me/ti/g2/Cde4a9c739118f0c8414bbd2ecdf6ab01",
    isActive: true,
    order: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "card-bmc-poster",
    title: "vEATec: Smart Food Crowdsourcing",
    subtitle: "Business Model Canvas ฉบับเต็มสำหรับ VISTEC Campus Community",
    badge: "About Us",
    imageUrl: "/veatec_bmc_canvas.png",
    actionType: "modal",
    modalTitle: "💡 Business Model Canvas (vEATec)",
    modalImageUrl: "/veatec_bmc_canvas.png",
    modalContent: `vEATec คือแพลตฟอร์ม Crowdsourced Food Ordering ภายใน VISTEC Campus ที่ออกแบบมาเพื่อลดค่าส่งอาหารและสร้างความสะดวกสบายให้กับบุคลากรและนักศึกษา`,
    isActive: true,
    order: 3,
    createdAt: new Date().toISOString(),
  } as any,
];

export default function PromoScroller({
  cards,
  onOpenBoardClick,
  lang = "th",
}: PromoScrollerProps) {
  const [activeModalCard, setActiveModalCard] = useState<PromoCard | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Mouse drag-to-scroll states
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const [dragMoved, setDragMoved] = useState(false);

  // Filter cards by active status and start/stop dates
  const now = new Date().toISOString();
  const validCards = (cards && cards.length > 0 ? cards : DUMMY_PROMO_CARDS).filter((card) => {
    if (!card.isActive) return false;
    if (card.startDate && card.startDate > now) return false;
    if (card.endDate && card.endDate < now) return false;
    return true;
  }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [validCards.length]);

  const scrollByAmount = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  // Mouse wheel horizontal scroll handler
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      if (
        (e.deltaY > 0 && canScrollRight) ||
        (e.deltaY < 0 && canScrollLeft)
      ) {
        scrollRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftPos(scrollRef.current.scrollLeft);
    setDragMoved(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 5) {
      setDragMoved(true);
    }
    scrollRef.current.scrollLeft = scrollLeftPos - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  if (validCards.length === 0) return null;

  const handleCardClick = (card: PromoCard) => {
    if (dragMoved) return; // Prevent clicking if user was dragging
    if (card.actionType === "open_board") {
      if (onOpenBoardClick) {
        onOpenBoardClick();
      }
    } else if (card.actionType === "link" && card.actionUrl) {
      window.open(card.actionUrl, "_blank", "noopener,noreferrer");
    } else {
      // modal
      setActiveModalCard(card);
    }
  };

  const sectionTitle =
    lang === "en"
      ? "Discovery & Campus Life"
      : lang === "cn"
      ? "探索与指南"
      : "ทริค & ไฮไลท์สำหรับชาวแคมปัส";

  const sectionSubtitle =
    lang === "en"
      ? "Useful guides, community links, and tips for vEATec"
      : lang === "cn"
      ? "实用点餐指南、社群链接与操作技巧"
      : "คู่มือการใช้งาน ลิงก์กลุ่ม LINE และฟีเจอร์เด็ดสำหรับคุณ";

  return (
    <div className="w-full mt-10 pt-8 border-t border-slate-200/80 mb-6">
      {/* Header with Navigation Arrows */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
            <h3 className="text-sm font-black text-slate-800 tracking-tight">
              {sectionTitle}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {sectionSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 hidden sm:inline-block">
            {validCards.length} {lang === "en" ? "Items" : "รายการ"}
          </span>

          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={() => scrollByAmount(-280)}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={() => scrollByAmount(280)}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Snap Scroller with Mouse Drag & Wheel */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`flex gap-3.5 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent -mx-4 px-4 sm:mx-0 sm:px-0 select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {validCards.map((card) => {
          const displayImg = resolveImageUrl(card.imageUrl);
          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className="group relative flex-none w-[270px] sm:w-[300px] snap-start bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col active:scale-[0.98]"
            >
              {/* Card Image Container (Aspect 16:9) */}
              <div className="relative w-full aspect-[16/9] bg-gradient-to-tr from-purple-950 via-slate-900 to-indigo-950 overflow-hidden flex items-center justify-center">
                {displayImg ? (
                  <img
                    src={displayImg}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <Sparkles className="h-8 w-8 text-purple-400 mb-1 opacity-80" />
                    <span className="text-xs font-bold text-white tracking-wide">
                      vEATec Highlights
                    </span>
                  </div>
                )}

                {/* Dark gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Badge */}
                {card.badge && (
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600/90 text-white shadow-xs backdrop-blur-xs border border-white/20">
                      {card.badge}
                    </span>
                  </div>
                )}

                {/* Action Icon Indicator */}
                <div className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-white/90 group-hover:bg-purple-600 transition-colors">
                  {card.actionType === "link" ? (
                    <ExternalLink className="h-3 w-3" />
                  ) : card.actionType === "open_board" ? (
                    <Flame className="h-3 w-3 text-amber-300" />
                  ) : (
                    <HelpCircle className="h-3 w-3" />
                  )}
                </div>

                {/* Overlay Title on Image bottom */}
                <div className="absolute bottom-2 left-3 right-3 z-10">
                  <h4 className="text-xs font-black text-white line-clamp-1 group-hover:text-purple-200 transition-colors drop-shadow-xs">
                    {card.title}
                  </h4>
                </div>
              </div>

              {/* Subtitle / Description */}
              <div className="p-3 flex-1 flex flex-col justify-between bg-white">
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {card.subtitle || card.title}
                </p>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-purple-700">
                  <span>
                    {card.actionType === "link"
                      ? "เปิดลิงก์ ➔"
                      : card.actionType === "open_board"
                      ? "เปิดตี้ทันที 🔥"
                      : "ดูรายละเอียด ➔"}
                  </span>
                  <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Popup when a card is clicked */}
      {activeModalCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                <h3 className="font-black text-slate-800 text-sm">
                  {(activeModalCard as any).modalTitle || activeModalCard.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalCard(null)}
                className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {((activeModalCard as any).modalImageUrl || activeModalCard.imageUrl) && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                  <img
                    src={resolveImageUrl((activeModalCard as any).modalImageUrl || activeModalCard.imageUrl) || ""}
                    alt={activeModalCard.title}
                    className="w-full h-auto max-h-[340px] object-contain mx-auto"
                  />
                </div>
              )}

              {activeModalCard.modalContent && (
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {activeModalCard.modalContent}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setActiveModalCard(null)}
                className="rounded-xl bg-purple-900 hover:bg-purple-800 text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                เข้าใจแล้ว / ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
