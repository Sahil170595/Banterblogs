import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { renderMarkdownToHtml } from '@/lib/episodes';

import type { Metadata } from 'next';

export const runtime = 'nodejs';

export const metadata: Metadata = {
    title: 'Chimeraforge Whitepaper: High-Performance LLM Agent Orchestration',
    description: 'Rust vs. Python for production AI orchestration — hybrid architecture and Dual Ollama pattern achieving 58% latency reduction.',
};

export default async function CompendiumPage() {
    const filePath = path.join(process.cwd(), 'PublishReady', 'research_compendium.md');

    if (!fs.existsSync(filePath)) {
        notFound();
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const html = await renderMarkdownToHtml(raw);

    return (
        <div className="container py-16">
            <div className="mb-8">
                <Link href="/reports" className="text-sm text-muted-foreground hover:text-primary transition-colors mb-4 inline-block">
                    &larr; Research Archive
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
                <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-img:rounded-xl">
                    <div dangerouslySetInnerHTML={{ __html: html }} />
                </article>

                <aside className="hidden lg:block">
                    <div className="sticky top-24 space-y-6">
                        <div className="rounded-xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
                            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">About this Paper</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                This whitepaper synthesizes the foundational Phase 1 research (TR108-TR116) — the Rust vs. Python comparison that shaped the platform architecture.
                            </p>
                            <div className="text-xs text-muted-foreground/60">
                                Published: November 2025 &middot; Sahil Kadadekar
                            </div>
                        </div>

                        <div className="rounded-xl border border-border/50 bg-muted/20 p-6">
                            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Source Data</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Access all 37 technical reports, 593K+ measurements, and phase whitepapers.
                            </p>
                            <Link href="/reports" className="text-sm text-primary hover:underline flex items-center gap-1">
                                View Technical Archives <span>&rarr;</span>
                            </Link>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
