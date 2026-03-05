/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import {
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileText,
  Lightbulb,
  LineChart,
  Link as LinkIcon,
  MessageSquare,
  Mic,
  Send,
  Sparkles,
  Youtube,
} from "lucide-react";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <Send className="size-4" />
            </div>
            Telegram Content OS
          </div>
          <nav className="text-muted-foreground hidden items-center gap-6 text-sm font-medium md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How it Works
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden md:inline-flex">
              Log in
            </Button>
            <Button>Get Started</Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-5xl space-y-8 px-4 py-24 text-center md:py-32">
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            <Sparkles className="text-primary mr-2 size-3.5" />
            V2.0 is now live
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-6xl lg:text-7xl">
            Never run out of content for your <span className="text-primary">Telegram channel</span>
            .
          </h1>
          <p className="text-muted-foreground mx-auto max-w-3xl text-xl text-balance">
            Turn YouTube videos, articles, podcasts, or your own ideas into polished Telegram posts
            in your unique voice. Repurpose one post into five. Fill your content calendar
            automatically.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Button size="lg" className="h-12 w-full px-8 text-base sm:w-auto">
              Start for Free
              <ChevronRight className="ml-2 size-4" />
            </Button>
            <p className="text-muted-foreground text-sm sm:hidden">
              10 AI generations included. No credit card required.
            </p>
          </div>
          <p className="text-muted-foreground hidden pt-2 text-sm sm:block">
            10 AI generations included. No credit card required.
          </p>

          {/* Hero Image/Mockup Placeholder */}
          <div className="bg-muted/30 relative mt-16 overflow-hidden rounded-2xl border p-2 shadow-2xl md:p-4">
            <div className="from-background pointer-events-none absolute inset-0 top-auto bottom-0 z-10 h-32 bg-gradient-to-t to-transparent" />
            <div className="bg-background flex aspect-[16/9] flex-col overflow-hidden rounded-xl border shadow-sm md:aspect-[21/9] md:flex-row">
              {/* Sidebar Mockup */}
              <div className="bg-muted/10 hidden w-64 flex-col gap-4 border-r p-4 md:flex">
                <div className="bg-muted h-8 w-32 rounded-md" />
                <div className="mt-4 space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-muted/50 h-8 w-full rounded-md" />
                  ))}
                </div>
              </div>
              {/* Main Content Mockup */}
              <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-muted text-muted-foreground flex h-10 flex-1 items-center rounded-md px-4 text-sm">
                    <LinkIcon className="mr-2 size-4" /> Paste YouTube link, article URL, or idea...
                  </div>
                  <Button size="icon">
                    <Sparkles className="size-4" />
                  </Button>
                </div>
                <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8">
                  <Bot className="size-12 opacity-20" />
                  <p>AI is ready to draft your next post.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="bg-muted/30 border-y py-24">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-16 space-y-4 text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                The creator&apos;s bottleneck
              </h2>
              <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
                You consume hours of great content every week, but turning it into publishable posts
                takes time you don&apos;t have.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <Card className="bg-background">
                <CardHeader>
                  <div className="bg-destructive/10 text-destructive mb-4 flex size-10 items-center justify-center rounded-lg">
                    <FileText className="size-5" />
                  </div>
                  <CardTitle>Writing takes time</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Crafting a thoughtful Telegram post takes 30–60 minutes. For creators publishing
                  5+ times a week, that&apos;s hours lost just to drafting.
                </CardContent>
              </Card>
              <Card className="bg-background">
                <CardHeader>
                  <div className="bg-destructive/10 text-destructive mb-4 flex size-10 items-center justify-center rounded-lg">
                    <Copy className="size-5" />
                  </div>
                  <CardTitle>Repetition kills momentum</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Without fresh angles or varied formats, you fall into patterns. You sound the same
                  every day, and audience engagement drops.
                </CardContent>
              </Card>
              <Card className="bg-background">
                <CardHeader>
                  <div className="bg-destructive/10 text-destructive mb-4 flex size-10 items-center justify-center rounded-lg">
                    <Calendar className="size-5" />
                  </div>
                  <CardTitle>Scheduling is chaotic</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Most creators decide what to post in the moment. A proper content calendar with
                  scheduled posts and gap-filling is rare.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-16 space-y-4 text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Everything you need to grow
              </h2>
              <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
                A complete operating system designed specifically for the text-first workflow of
                Telegram creators.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <Card>
                <CardHeader>
                  <div className="mb-4 flex gap-2">
                    <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                      <Youtube className="size-4" />
                    </div>
                    <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                      <LinkIcon className="size-4" />
                    </div>
                    <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                      <Mic className="size-4" />
                    </div>
                  </div>
                  <CardTitle>Create from anywhere</CardTitle>
                  <CardDescription>Turn consumption into creation.</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Paste a YouTube link, article URL, or podcast. The AI extracts key insights and
                  drafts a native Telegram post in your unique voice. What took 45 minutes now takes
                  60 seconds.
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card>
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-4 flex size-8 items-center justify-center rounded-md">
                    <Copy className="size-4" />
                  </div>
                  <CardTitle>Content Repurposer</CardTitle>
                  <CardDescription>One post becomes five.</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Select any strong post and generate multiple variations: a shorter version, a
                  thread-style series, a poll, a quote card, or a completely different angle.
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card>
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-4 flex size-8 items-center justify-center rounded-md">
                    <MessageSquare className="size-4" />
                  </div>
                  <CardTitle>Your Voice, Not a Template</CardTitle>
                  <CardDescription>AI that sounds like you.</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  The platform builds a tone profile from your existing posts. Every AI-generated
                  draft matches your style, vocabulary, and formatting preferences.
                </CardContent>
              </Card>

              {/* Feature 4 */}
              <Card>
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-4 flex size-8 items-center justify-center rounded-md">
                    <Calendar className="size-4" />
                  </div>
                  <CardTitle>AI-Filled Calendar</CardTitle>
                  <CardDescription>Never see an empty slot.</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Set your posting cadence. The calendar detects gaps and suggests drafts from your
                  ideas vault, repurposed content, or external sources to fill them automatically.
                </CardContent>
              </Card>

              {/* Feature 5 */}
              <Card>
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-4 flex size-8 items-center justify-center rounded-md">
                    <Lightbulb className="size-4" />
                  </div>
                  <CardTitle>Drafts & Ideas Vault</CardTitle>
                  <CardDescription>Capture inspiration instantly.</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  A quick-capture system for half-formed ideas. Jot down text notes or voice memos.
                  AI periodically revisits old ideas and offers to develop them into full drafts.
                </CardContent>
              </Card>

              {/* Feature 6 */}
              <Card>
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-4 flex size-8 items-center justify-center rounded-md">
                    <LineChart className="size-4" />
                  </div>
                  <CardTitle>Publish & Analyze</CardTitle>
                  <CardDescription>Direct Telegram integration.</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Publish directly to your connected Telegram channel via the Bot API. Track
                  subscriber growth, post-level metrics, and discover your best posting times.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="bg-muted/30 border-y py-24">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="mb-16 space-y-4 text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">How it works</h2>
              <p className="text-muted-foreground text-lg">
                From idea to published post in minutes.
              </p>
            </div>

            <div className="before:via-border relative space-y-12 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:to-transparent md:before:mx-auto md:before:translate-x-0">
              {/* Step 1 */}
              <div className="group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
                <div className="bg-background text-primary z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-semibold shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  1
                </div>
                <div className="bg-background w-[calc(100%-4rem)] rounded-xl border p-6 shadow-sm md:w-[calc(50%-2.5rem)]">
                  <h3 className="mb-2 text-lg font-semibold">Connect & Learn</h3>
                  <p className="text-muted-foreground text-sm">
                    Add our bot to your Telegram channel. It instantly ingests your past posts to
                    build a custom tone profile so the AI sounds exactly like you.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
                <div className="bg-background text-primary z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-semibold shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  2
                </div>
                <div className="bg-background w-[calc(100%-4rem)] rounded-xl border p-6 shadow-sm md:w-[calc(50%-2.5rem)]">
                  <h3 className="mb-2 text-lg font-semibold">Input Source</h3>
                  <p className="text-muted-foreground text-sm">
                    Paste a YouTube link, an article URL, a podcast, or just type a rough idea into
                    the quick-capture vault.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse">
                <div className="bg-background text-primary z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-semibold shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  3
                </div>
                <div className="bg-background w-[calc(100%-4rem)] rounded-xl border p-6 shadow-sm md:w-[calc(50%-2.5rem)]">
                  <h3 className="mb-2 text-lg font-semibold">Review & Schedule</h3>
                  <p className="text-muted-foreground text-sm">
                    The AI generates a native Telegram draft. Edit it, generate variations, and drop
                    it into your content calendar to publish automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-16 space-y-4 text-center">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
                Start for free, upgrade when you need more capacity.
              </p>
            </div>

            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
              {/* Free Plan */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl">Free</CardTitle>
                  <CardDescription>Perfect for trying out the workflow.</CardDescription>
                  <div className="mt-4 flex items-baseline text-4xl font-bold">
                    $0
                    <span className="text-muted-foreground ml-1 text-xl font-medium">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="text-muted-foreground space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> 10 AI generations / month
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> 1 connected channel
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> Basic tone profile
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> Direct publishing
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Get Started
                  </Button>
                </CardFooter>
              </Card>

              {/* Plus Plan */}
              <Card className="border-primary relative flex flex-col shadow-md">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl">Plus</CardTitle>
                  <CardDescription>For active solo creators.</CardDescription>
                  <div className="mt-4 flex items-baseline text-4xl font-bold">
                    $19
                    <span className="text-muted-foreground ml-1 text-xl font-medium">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="text-muted-foreground space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> 100 AI generations / month
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> 3 connected channels
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> Advanced tone profile
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> Content calendar & gap fill
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> Content repurposer
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Subscribe to Plus</Button>
                </CardFooter>
              </Card>

              {/* Pro Plan */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl">Pro</CardTitle>
                  <CardDescription>For power users and agencies.</CardDescription>
                  <div className="mt-4 flex items-baseline text-4xl font-bold">
                    $49
                    <span className="text-muted-foreground ml-1 text-xl font-medium">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="text-muted-foreground space-y-3 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> Unlimited AI generations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> Unlimited channels
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> Priority support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> Custom AI fine-tuning
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="text-primary size-4" /> Advanced analytics
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    Subscribe to Pro
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary text-primary-foreground border-t py-24">
          <div className="container mx-auto max-w-3xl space-y-8 px-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Ready to scale your channel?
            </h2>
            <p className="text-xl opacity-90">
              Join hundreds of creators who save 5+ hours a week and never run out of content.
            </p>
            <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
              Start your free trial
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t py-12">
        <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 md:flex-row">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Send className="text-primary size-5" />
            Telegram Content OS
          </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Telegram Content OS. All rights reserved.
          </p>
          <div className="text-muted-foreground flex gap-4 text-sm">
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
