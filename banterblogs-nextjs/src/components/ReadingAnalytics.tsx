'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, BarChart3, Clock, Eye, MousePointer, Scroll, Target, Zap } from "lucide-react";

interface ReadingAnalytics {
  readingTime: number;
  scrollDepth: number;
  clickCount: number;
  hoverCount: number;
  readingSpeed: number;
  engagementScore: number;
  focusTime: number;
  distractions: number;
}

interface ReadingTrackerProps {
  episode: {
    id: number;
    title: string;
    slug: string;
    content: string;
    readingTime: number;
  };
  className?: string;
}

export function ReadingTracker({ episode, className = "" }: ReadingTrackerProps) {
  const [analytics, setAnalytics] = useState<ReadingAnalytics>({
    readingTime: 0,
    scrollDepth: 0,
    clickCount: 0,
    hoverCount: 0,
    readingSpeed: 0,
    engagementScore: 0,
    focusTime: 0,
    distractions: 0,
  });
  const [isVisible, setIsVisible] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const focusStartRef = useRef<number>(Date.now());

  const calculateEngagementScore = useCallback(
    (data: ReadingAnalytics): number => {
      const expectedSeconds = Math.max(episode.readingTime * 60, 1);
      const timeRatio = Math.min(data.readingTime / expectedSeconds, 2);
      const progressScore = Math.round(data.scrollDepth * 0.3);
      const interactionScore = Math.min(data.clickCount + data.hoverCount, 25);
      const focusRatio = Math.min(data.focusTime / (data.readingTime * 1000 || 1), 1);

      let score = 0;
      score += Math.round(timeRatio * 25);
      score += progressScore;
      score += interactionScore;
      score += Math.round(focusRatio * 20);
      score -= data.distractions * 3;

      return Math.max(0, Math.min(100, score));
    },
    [episode.readingTime]
  );

  useEffect(() => {
    const updateReadingMetrics = () => {
      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const wordCount = episode.content.split(/\s+/).length;
      const readingSpeed = elapsedSeconds > 0 ? Math.round((wordCount / elapsedSeconds) * 60) : 0;

      setAnalytics((prev) => {
        const updated = {
          ...prev,
          readingTime: elapsedSeconds,
          readingSpeed,
        };

        return {
          ...updated,
          engagementScore: calculateEngagementScore(updated),
        };
      });
    };

    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const depth = docHeight > 0 ? Math.min((window.scrollY / docHeight) * 100, 100) : 0;
      setAnalytics((prev) => ({ ...prev, scrollDepth: depth }));
    };

    const handleClick = () => {
      setAnalytics((prev) => ({ ...prev, clickCount: prev.clickCount + 1 }));
    };

    const handleMouseMove = () => {
      setAnalytics((prev) => ({ ...prev, hoverCount: prev.hoverCount + 1 }));
    };

    const handleFocus = () => {
      focusStartRef.current = Date.now();
    };

    const handleBlur = () => {
      const additionalFocus = Date.now() - focusStartRef.current;
      setAnalytics((prev) => ({
        ...prev,
        focusTime: prev.focusTime + additionalFocus,
        distractions: prev.distractions + 1,
      }));
    };

    const timer = window.setInterval(updateReadingMetrics, 1000);
    const visibilityTimer = window.setTimeout(() => setIsVisible(true), 30_000);

    updateReadingMetrics();
    handleScroll();

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("click", handleClick);
    document.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    });

    return () => {
      clearInterval(timer);
      clearTimeout(visibilityTimer);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [episode.content, calculateEngagementScore]);

  const insights = useMemo(() => {
    const messages: string[] = [];

    if (analytics.readingSpeed > 200) messages.push("Reading faster than average");
    if (analytics.scrollDepth > 75) messages.push("Strong depth of engagement");
    if (analytics.distractions > 3) messages.push("Frequent context switches detected");
    if (analytics.engagementScore > 70) messages.push("Great engagement overall");

    return messages;
  }, [analytics]);

  const getEngagementLevel = (score: number): string => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Developing";
  };

  const getEngagementColor = (score: number): string => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-accent";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className={`fixed top-6 right-6 z-40 w-80 rounded-xl border border-border/50 bg-background/95 p-5 shadow-2xl backdrop-blur ${className}`}
          >
            <header className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Reading Analytics</h3>
              </div>
              <span className={`text-xs font-medium ${getEngagementColor(analytics.engagementScore)}`}>
                {getEngagementLevel(analytics.engagementScore)}
              </span>
            </header>

            <div className="space-y-3">
              <AnalyticsRow
                icon={<Target className="h-4 w-4 text-primary" />}
                label="Engagement"
                value={`${analytics.engagementScore}%`}
              />
              <AnalyticsRow
                icon={<Clock className="h-4 w-4 text-accent" />}
                label="Reading time"
                value={`${Math.floor(analytics.readingTime / 60)}m ${analytics.readingTime % 60}s`}
              />
              <AnalyticsRow
                icon={<Scroll className="h-4 w-4 text-green-400" />}
                label="Progress"
                value={`${Math.round(analytics.scrollDepth)}%`}
              />
              <AnalyticsRow
                icon={<Zap className="h-4 w-4 text-primary" />}
                label="Speed"
                value={`${analytics.readingSpeed} wpm`}
              />
              <AnalyticsRow
                icon={<MousePointer className="h-4 w-4 text-orange-400" />}
                label="Interactions"
                value={`${analytics.clickCount + analytics.hoverCount}`}
              />
              <AnalyticsRow
                icon={<Eye className="h-4 w-4 text-cyan-400" />}
                label="Focused"
                value={`${Math.round(analytics.focusTime / 1000)}s`}
              />
            </div>

            {insights.length > 0 && (
              <div className="mt-4 border-t border-border/50 pt-3">
                <h4 className="mb-2 text-xs font-semibold text-foreground">Session notes</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {insights.map((message) => (
                    <li key={message}>- {message}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-primary via-accent to-primary"
        style={{ scaleX: analytics.scrollDepth / 100, transformOrigin: "left" }}
      />
    </>
  );
}

interface AnalyticsRowProps {
  icon: ReactNode;
  label: string;
  value: string;
}

function AnalyticsRow({ icon, label, value }: AnalyticsRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

interface EngagementHeatmapProps {
  className?: string;
}

export function EngagementHeatmap({ className = "" }: EngagementHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<number[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const sections = 20;
    const seed = Array.from({ length: sections }, () => Math.random() * 100);
    setHeatmapData(seed);

    const timer = window.setTimeout(() => setIsVisible(true), 10_000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className={`fixed right-6 top-1/2 z-30 -translate-y-1/2 rounded-xl border border-border/50 bg-background/90 p-3 shadow-2xl backdrop-blur ${className}`}
        >
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">Engagement</h4>
          </div>
          <div className="space-y-1">
            {heatmapData.map((intensity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="h-8 w-2 rounded-sm"
                style={{ backgroundColor: `hsl(var(--primary) / ${Math.max(intensity, 10) / 100})` }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
