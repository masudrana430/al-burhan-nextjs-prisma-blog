'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import AiLottieAnimation from '@/components/ai-lottie-animation';
import { signIn, signOut, useSession } from 'next-auth/react';
import {
  Search,
  Sparkles,
  BookOpen,
  MessageSquare,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Code2,
  Database,
  FileCode,
  Tag,
  Clock,
  Eye,
  Trash2,
  Edit3,
  Send,
  X,
  Check,
  Bookmark,
  Share2,
  SlidersHorizontal,
  ArrowUpDown,
  Bot,
  User,
  Terminal,
  Copy,
  Layers,
  ShieldCheck,
  Compass,
  FileText,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  Lock,
  LogOut,
  LogIn,
  LayoutDashboard,
  Image as ImageIcon,
  Youtube,
  Type,
  ArrowUp,
  ArrowDown,
  Play,
  KeyRound,
  Mail,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Sun,
  Moon,

} from 'lucide-react';

// --- TYPES ---
interface ReferenceItem {
  label: string;
  citation: string;
}

export type ContentBlockType = 'text' | 'image' | 'youtube' | 'quote';

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  value: string;      // Markdown/text for 'text'/'quote', image URL/dataURI for 'image', YouTube URL for 'youtube'
  caption?: string;   // Caption or title for image/youtube/quote attribution
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  claimAddressed: string;
  excerpt: string;
  content: string;
  blocks?: ContentBlock[];
  category: string;
  topicId?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  author: string;
  authorRole: string;
  readTimeMinutes: number;
  views: number;
  publishedAt: string;
  featured: boolean;
  bookmarked?: boolean;
  references: ReferenceItem[];
  keyTakeaways: string[];
}


function difficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = { Beginner: 'প্রাথমিক', Intermediate: 'মধ্যবর্তী', Advanced: 'উন্নত' };
  return labels[difficulty] || difficulty;
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'Cosmology & Physics': 'মহাবিশ্ববিদ্যা ও পদার্থবিজ্ঞান',
    'Biology & Embryology': 'জীববিজ্ঞান ও ভ্রূণতত্ত্ব',
    'Historical & Ethics': 'ইতিহাস ও নৈতিকতা',
    'Philosophy & Logic': 'দর্শন ও যুক্তিবিদ্যা',
    'Linguistics & Tafsir': 'ভাষাতত্ত্ব ও তাফসির',
  };
  return labels[category] || category;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  matchedPostIds?: string[];
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'READER';
  provider: 'credentials';
  avatarUrl?: string;
}

// --- YOUTUBE & INLINE MEDIA HELPERS ---
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
  const match = trimmed.match(regExp);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

// Parse a content string (with optional [[IMAGE:url|caption]] and [[YOUTUBE:url|caption]] markers) into structured ContentBlocks
function parseContentToBlocks(content: string, existingBlocks?: ContentBlock[]): ContentBlock[] {
  if (existingBlocks && existingBlocks.length > 0) return existingBlocks;
  const paragraphs = content.split('\n\n');
  const blocks: ContentBlock[] = [];
  paragraphs.forEach((para, idx) => {
    const trimmed = para.trim();
    if (!trimmed) return;

    const imgMatch = trimmed.match(/^\[\[IMAGE:([^|\]]+)(?:\|([^\]]*))?\]\]$/i);
    if (imgMatch) {
      blocks.push({
        id: `blk-img-${idx}-${Date.now()}`,
        type: 'image',
        value: imgMatch[1].trim(),
        caption: (imgMatch[2] || '').trim()
      });
      return;
    }

    const ytMatch = trimmed.match(/^\[\[YOUTUBE:([^|\]]+)(?:\|([^\]]*))?\]\]$/i);
    if (ytMatch) {
      blocks.push({
        id: `blk-yt-${idx}-${Date.now()}`,
        type: 'youtube',
        value: ytMatch[1].trim(),
        caption: (ytMatch[2] || '').trim()
      });
      return;
    }

    if (trimmed.startsWith('> ')) {
      blocks.push({
        id: `blk-qt-${idx}-${Date.now()}`,
        type: 'quote',
        value: trimmed.replace(/^>\s*/, ''),
        caption: 'Primary Citation / Scholarly Quote'
      });
      return;
    }

    blocks.push({
      id: `blk-txt-${idx}-${Date.now()}`,
      type: 'text',
      value: trimmed
    });
  });
  return blocks;
}

// Serialize structured ContentBlocks back into unified string for search indexing & markdown compatibility
function serializeBlocksToContent(blocks: ContentBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === 'image') {
        return `[[IMAGE:${b.value}|${b.caption || ''}]]`;
      }
      if (b.type === 'youtube') {
        return `[[YOUTUBE:${b.value}|${b.caption || ''}]]`;
      }
      if (b.type === 'quote') {
        return `> ${b.value}${b.caption ? ` — ${b.caption}` : ''}`;
      }
      return b.value;
    })
    .join('\n\n');
}

// Generate rich SVG diagram data URIs so articles have crisp, instant visual diagrams between text
const COSMOLOGY_DIAGRAM_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 340" width="800" height="340">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#022c22"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="cone" x1="0" y1="0.5" x2="1" y2="0.5">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#10b981" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <rect width="800" height="340" rx="18" fill="url(#bg)"/>
  <path d="M 110 170 Q 320 45 690 30 L 690 310 Q 320 295 110 170 Z" fill="url(#cone)" stroke="#34d399" stroke-width="2"/>
  <ellipse cx="690" cy="170" rx="22" ry="140" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="6 4"/>
  <ellipse cx="420" cy="170" rx="16" ry="98" fill="none" stroke="#34d399" stroke-width="1.5" stroke-dasharray="4 4"/>
  <circle cx="110" cy="170" r="10" fill="#fbbf24"/>
  <circle cx="110" cy="170" r="22" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="3 3"/>
  <text x="55" y="135" fill="#fde68a" font-family="sans-serif" font-size="13" font-weight="bold">t = 0 Boundary</text>
  <text x="48" y="153" fill="#cbd5e1" font-family="sans-serif" font-size="11">(BGV Past-Incomplete)</text>
  <text x="345" y="42" fill="#6ee7b7" font-family="sans-serif" font-size="14" font-weight="bold">Spacetime Expansion (H_avg &gt; 0)</text>
  <text x="330" y="175" fill="#e2e8f0" font-family="sans-serif" font-size="12">Quantum Vacuum Fluctuations Require Spacetime</text>
  <text x="560" y="325" fill="#94a3b8" font-family="sans-serif" font-size="12">Time Arrow (Entropy dS/dt &gt;= 0) →</text>
</svg>`);

const ZAWJ_DIAGRAM_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 320" width="800" height="320">
  <rect width="800" height="320" rx="18" fill="#0f172a"/>
  <rect x="24" y="24" width="235" height="272" rx="14" fill="#064e3b" fill-opacity="0.4" stroke="#10b981" stroke-width="1.5"/>
  <text x="44" y="58" fill="#6ee7b7" font-family="sans-serif" font-size="14" font-weight="bold">1. Botanical &amp; Biological</text>
  <text x="44" y="85" fill="#cbd5e1" font-family="sans-serif" font-size="12">• Pollination &amp; Gametes</text>
  <text x="44" y="110" fill="#cbd5e1" font-family="sans-serif" font-size="12">• DNA 5'→3' / 3'→5' Strands</text>
  <text x="44" y="135" fill="#cbd5e1" font-family="sans-serif" font-size="12">• A–T &amp; G–C Base Pairing</text>
  <text x="44" y="160" fill="#cbd5e1" font-family="sans-serif" font-size="12">• Haploid (n) / Diploid (2n)</text>

  <rect x="282" y="24" width="235" height="272" rx="14" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
  <text x="302" y="58" fill="#7dd3fc" font-family="sans-serif" font-size="14" font-weight="bold">2. Human &amp; Physiological</text>
  <text x="302" y="85" fill="#cbd5e1" font-family="sans-serif" font-size="12">• Male &amp; Female Counterparts</text>
  <text x="302" y="110" fill="#cbd5e1" font-family="sans-serif" font-size="12">• Sympathetic / Parasympathetic</text>
  <text x="302" y="135" fill="#cbd5e1" font-family="sans-serif" font-size="12">• Agonist / Antagonist Pairs</text>
  <text x="302" y="160" fill="#cbd5e1" font-family="sans-serif" font-size="12">• Oxidation / Reduction</text>

  <rect x="540" y="24" width="236" height="272" rx="14" fill="#31102f" fill-opacity="0.45" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="560" y="58" fill="#fcd34d" font-family="sans-serif" font-size="14" font-weight="bold">3. Subatomic Physics (36:36)</text>
  <text x="560" y="85" fill="#cbd5e1" font-family="sans-serif" font-size="12">• Matter &amp; Antimatter (e- / e+)</text>
  <text x="560" y="110" fill="#cbd5e1" font-family="sans-serif" font-size="12">• Spin-Up (+1/2) &amp; Spin-Down</text>
  <text x="560" y="135" fill="#cbd5e1" font-family="sans-serif" font-size="12">• Wave-Particle Duality</text>
  <text x="560" y="160" fill="#cbd5e1" font-family="sans-serif" font-size="12">• Electric Charge (+q / -q)</text>
</svg>`);

// --- INITIAL SAMPLE POSTS (WITH INTERLEAVED TEXT, IMAGES & YOUTUBE PREVIEWS) ---
const INITIAL_POSTS: BlogPost[] = [
  {
    id: 'post-1',
    title: 'The Kalam Cosmological Argument & Modern Quantum Cosmology: Answering the Infinite Regress Critique',
    slug: 'kalam-cosmological-argument-quantum-cosmology',
    claimAddressed: 'Critique: "The universe does not need a creator because quantum fluctuations or an eternal multiverse can explain its origin without a first cause."',
    excerpt: 'An analytical refutation of eternal-universe models using the Borde-Guth-Vilenkin (BGV) theorem, Second Law of Thermodynamics, and philosophical impossibility of an actual infinite regress of past events.',
    blocks: [
      {
        id: 'p1-b1',
        type: 'text',
        value: `### 1. The Core Critique Examined
Secular and anti-theistic critics frequently argue that modern quantum mechanics invalidates the classical cosmological argument. Specifically, they claim that virtual particles pop into existence from "nothing" in a quantum vacuum, or that an eternal multiverse eliminates the need for a transcendent First Cause.

### 2. Philosophical Foundation: The Impossibility of an Infinite Past
Before examining physical cosmology, mathematical logic establishes that an **actual infinite** cannot exist in the real physical world as a series of successive past events:
- **Premise 1:** Everything that begins to exist has a cause.
- **Premise 2:** The universe began to exist.
- **Conclusion:** Therefore, the universe has a transcendent cause.`
      },
      {
        id: 'p1-b2',
        type: 'image',
        value: COSMOLOGY_DIAGRAM_SVG,
        caption: 'Figure 1: Spacetime past-boundary condition under the Borde-Guth-Vilenkin (BGV) Theorem (H_avg > 0) showing why quantum vacuum fluctuations still require a finite beginning.'
      },
      {
        id: 'p1-b3',
        type: 'text',
        value: `### 3. The Borde-Guth-Vilenkin (BGV) Theorem (2003)
In 2003, cosmologists Arvind Borde, Alan Guth, and Alexander Vilenkin proved a theorem that relies on a single kinematical condition: any universe (or multiverse) which has, on average, been expanding throughout its history **cannot be infinite in the past** and must have a past spacetime boundary.`
      },
      {
        id: 'p1-b4',
        type: 'quote',
        value: 'Any cosmology with an average expansion rate greater than zero (H_avg > 0) is past-incomplete and requires a cosmic beginning.',
        caption: 'Borde, Guth & Vilenkin — Physical Review Letters (2003)'
      },
      {
        id: 'p1-b5',
        type: 'youtube',
        value: 'https://www.youtube.com/watch?v=cYq-LkSrKsQ',
        caption: 'Video Lecture Preview: Cosmological Fine-Tuning, Spacetime Causality & Answering Quantum Vacuum Objections'
      },
      {
        id: 'p1-b6',
        type: 'text',
        value: `### 4. Why "Quantum Vacuum" Is Not Philosophical Nothingness
When critics state that the universe emerged from "nothing" via quantum fluctuations, they equivocate on the word *nothing*:
1. **Physical Quantum Vacuum:** A rich sea of fluctuating energy fields governed by mathematical laws of quantum field theory and relativistic spacetime equations.
2. **True Philosophical Nothingness (Ex Nihilo):** The complete absence of space, time, matter, energy, and mathematical laws.

Laws of physics do not create anything by themselves; equations describe how matter and energy behave once they exist. A transcendent, non-physical, timeless, and powerful Agent is required to bring spacetime and physical laws into existence.`
      }
    ],
    content: `### 1. The Core Critique Examined
Secular and anti-theistic critics frequently argue that modern quantum mechanics invalidates the classical cosmological argument. Specifically, they claim that virtual particles pop into existence from "nothing" in a quantum vacuum, or that an eternal multiverse eliminates the need for a transcendent First Cause.

### 2. Philosophical Foundation: The Impossibility of an Infinite Past
Before examining physical cosmology, mathematical logic establishes that an **actual infinite** cannot exist in the real physical world as a series of successive past events:
- **Premise 1:** Everything that begins to exist has a cause.
- **Premise 2:** The universe began to exist.
- **Conclusion:** Therefore, the universe has a transcendent cause.

[[IMAGE:${COSMOLOGY_DIAGRAM_SVG}|Figure 1: Spacetime past-boundary condition under the Borde-Guth-Vilenkin (BGV) Theorem (H_avg > 0)]]

### 3. The Borde-Guth-Vilenkin (BGV) Theorem (2003)
In 2003, cosmologists Arvind Borde, Alan Guth, and Alexander Vilenkin proved a theorem that relies on a single kinematical condition: any universe (or multiverse) which has, on average, been expanding throughout its history **cannot be infinite in the past** and must have a past spacetime boundary.

> Any cosmology with an average expansion rate greater than zero (H_avg > 0) is past-incomplete and requires a cosmic beginning.

[[YOUTUBE:https://www.youtube.com/watch?v=cYq-LkSrKsQ|Video Lecture Preview: Cosmological Fine-Tuning & Causality]]

### 4. Why "Quantum Vacuum" Is Not Philosophical Nothingness
When critics state that the universe emerged from "nothing" via quantum fluctuations, they equivocate on the word *nothing*:
1. **Physical Quantum Vacuum:** A rich sea of fluctuating energy fields governed by mathematical laws of quantum field theory and relativistic spacetime equations.
2. **True Philosophical Nothingness (Ex Nihilo):** The complete absence of space, time, matter, energy, and mathematical laws.

Laws of physics do not create anything by themselves; equations describe how matter and energy behave once they exist. A transcendent, non-physical, timeless, and powerful Agent is required to bring spacetime and physical laws into existence.`,
    category: 'Cosmology & Physics',
    difficulty: 'Advanced',
    tags: ['Kalam Argument', 'BGV Theorem', 'Thermodynamics', 'Quantum Vacuum', 'Cosmology', 'Atheism Refutation'],
    author: 'Masud Rana',
    authorRole: 'B.Sc. in Engineering Physics & Researcher',
    readTimeMinutes: 9,
    views: 1840,
    publishedAt: '2026-11-12',
    featured: true,
    bookmarked: true,
    references: [
      { label: 'Qur\'an 52:35–36', citation: 'Were they created by nothing, or were they themselves the creators? Or did they create the heavens and the earth?' },
      { label: 'Physical Review Letters (2003)', citation: 'Borde, A., Guth, A. H., & Vilenkin, A. — Inflationary spacetimes are not past-complete.' }
    ],
    keyTakeaways: [
      'A quantum vacuum is a physical system governed by laws and energy fields, not absolute nothingness.',
      'The BGV theorem proves that any expanding universe or multiverse must have a finite past boundary.',
      'Entropy and the Second Law of Thermodynamics rule out an infinitely old static universe.'
    ]
  },
  {
    id: 'post-2',
    title: 'Biological & Physical Complementarity ("Zawj") in Surah Yasin 36:36: Addressing Parthenogenesis & Subatomic Pairing',
    slug: 'complementarity-zawj-surah-yasin-36-36',
    claimAddressed: 'Critique: "The Qur\'an claims everything is created in pairs (male and female), which is scientifically false because asexual bacteria, fungi, and parthenogenetic species exist."',
    excerpt: 'A linguistic and scientific breakdown of the Arabic term "Azwaj" (pairs/counterparts) in Surah Yasin 36:36 across botany, microbiology, RNA strand complementarity, and matter-antimatter symmetry.',
    blocks: [
      {
        id: 'p2-b1',
        type: 'text',
        value: `### 1. The Misconception About "Male and Female Only"
Critics on anti-Islamic portals often claim that the Qur'an makes a biological error by stating that every living thing is strictly "male and female," pointing to asexual reproduction in bacteria (binary fission) or parthenogenesis in whiptail lizards.

### 2. Linguistic Precision of the Arabic Word *Zawj* (زَوْج)
In Classical Arabic lexicons (*Lisan al-Arab*, *Mufradat al-Raghib*), the word **Zawj** (plural: *Azwaj*) does not exclusively mean "male and female sexual partners." It fundamentally denotes **a counterpart, complement, paired component, or classification within a dual system**.`
      },
      {
        id: 'p2-b2',
        type: 'quote',
        value: 'Exalted is He who created all pairs (Azwaj) — from what the earth grows, and from themselves, and from that which they do not know.',
        caption: 'Surah Yasin (36:36)'
      },
      {
        id: 'p2-b3',
        type: 'image',
        value: ZAWJ_DIAGRAM_SVG,
        caption: 'Figure 2: The Three Domains of Complementarity (Azwaj) in Surah Yasin 36:36 — Botanical, Human/Physiological, and Subatomic Physics.'
      },
      {
        id: 'p2-b4',
        type: 'text',
        value: `### 3. Molecular & Microbiological Complementarity
Even in asexual organisms such as bacteria or parthenogenetic species:
- **DNA & RNA Base Pairing:** All genetic replication depends strictly on complementary purine-pyrimidine pairs (Adenine–Thymine / Uracil, Guanine–Cytosine) and antiparallel 5' → 3' and 3' → 5' strands.
- **Donor vs. Recipient Conjugation:** Bacteria exchange genetic material via horizontal gene transfer using F+ (plasmid donor) and F- (recipient) complementary states.
- **Haploid/Diploid Alternation:** Fungi and algae alternate between haploid (n) and diploid (2n) phases and mating types (+ and - strains).

### 4. Fundamental Physics & Matter-Antimatter Symmetry
In modern particle physics (Dirac's equation and the Standard Model), every fundamental fermion has a corresponding **antiparticle** with opposite quantum numbers (electron e- and positron e+, quark and antiquark), alongside spin-up/spin-down states and positive/negative electric charge. This directly fulfills the third category: *"and from that which they do not know."*`
      }
    ],
    content: `### 1. The Misconception About "Male and Female Only"
Critics on anti-Islamic portals often claim that the Qur'an makes a biological error by stating that every living thing is strictly "male and female," pointing to asexual reproduction in bacteria (binary fission) or parthenogenesis in whiptail lizards.

### 2. Linguistic Precision of the Arabic Word *Zawj* (زَوْج)
In Classical Arabic lexicons (*Lisan al-Arab*, *Mufradat al-Raghib*), the word **Zawj** (plural: *Azwaj*) does not exclusively mean "male and female sexual partners." It fundamentally denotes **a counterpart, complement, paired component, or classification within a dual system**.

> Exalted is He who created all pairs (Azwaj) — from what the earth grows, and from themselves, and from that which they do not know.

[[IMAGE:${ZAWJ_DIAGRAM_SVG}|Figure 2: The Three Domains of Complementarity (Azwaj) in Surah Yasin 36:36]]

### 3. Molecular & Microbiological Complementarity
Even in asexual organisms such as bacteria or parthenogenetic species:
- **DNA & RNA Base Pairing:** All genetic replication depends strictly on complementary purine-pyrimidine pairs (Adenine–Thymine / Uracil, Guanine–Cytosine) and antiparallel 5' → 3' and 3' → 5' strands.
- **Donor vs. Recipient Conjugation:** Bacteria exchange genetic material via horizontal gene transfer using F+ (plasmid donor) and F- (recipient) complementary states.
- **Haploid/Diploid Alternation:** Fungi and algae alternate between haploid (n) and diploid (2n) phases and mating types (+ and - strains).

### 4. Fundamental Physics & Matter-Antimatter Symmetry
In modern particle physics (Dirac's equation and the Standard Model), every fundamental fermion has a corresponding **antiparticle** with opposite quantum numbers (electron e- and positron e+, quark and antiquark), alongside spin-up/spin-down states and positive/negative electric charge. This directly fulfills the third category: *"and from that which they do not know."*`,
    category: 'Biology & Embryology',
    difficulty: 'Intermediate',
    tags: ['Surah Yasin', 'Zawj', 'Biology', 'Parthenogenesis', 'Particle Physics', 'Scientific Critique'],
    author: 'Masud Rana',
    authorRole: 'B.Sc. in Engineering Physics & Researcher',
    readTimeMinutes: 8,
    views: 1520,
    publishedAt: '2026-11-10',
    featured: true,
    bookmarked: false,
    references: [
      { label: 'Qur\'an 36:36', citation: 'Glory be to Him Who created all the pairs of that which the earth grows, and of themselves, and of that which they know not.' },
      { label: 'Qur\'an 51:49', citation: 'And of everything We have created pairs, that you may remember.' }
    ],
    keyTakeaways: [
      'The Arabic term "Zawj" signifies complementary counterparts, not solely sexual male/female anatomy.',
      'Surah Yasin 36:36 explicitly includes "that which they do not know," encompassing molecular and subatomic dualities.',
      'Even asexual organisms rely on DNA double-helix complementarity and donor/recipient genetic mechanisms.'
    ]
  },
  {
    id: 'post-3',
    title: 'Solar Orbit (Surah Al-Anbiya 21:33) & Celestial Mechanics: Refuting the "Geocentric Error" Allegation',
    slug: 'solar-orbit-celestial-mechanics-refutation',
    claimAddressed: 'Critique: "The Qur\'an promotes ancient 7th-century geocentrism by describing the sun and moon swimming in an orbit, and saying the sun sets in a muddy spring."',
    excerpt: 'Examining the Arabic verb "Yasbahun" (motion with internal rotation) in relation to the Sun\'s galactic orbit around the Milky Way barycenter, alongside rhetorical analysis of Dhul-Qarnayn\'s perspective in 18:86.',
    content: `### 1. The Two-Fold Allegation
Anti-Islamic polemicists frequently raise two astronomical objections:
1. That describing the sun as "floating/swimming in an orbit" (*Falak*) reflects Ptolemaic geocentrism.
2. That Surah Al-Kahf (18:86) claims the sun physically sets inside a muddy spring on Earth.

### 2. Galactic Motion of the Sun (*Kullun fi Falakin Yasbahun*)
In **Surah Al-Anbiya (21:33)** and **Surah Yasin (36:40)**, the Qur'an states:
> "And it is He who created the night and the day and the sun and the moon; all [heavenly bodies] in an orbit (*Falak*) are swimming (*Yasbahun*)."

- **Galactic Orbit:** Far from being stationary, the Sun orbits the center of the Milky Way galaxy at approximately **220–230 km/s**, taking ~225–250 million years (a cosmic year) to complete one revolution, while oscillating vertically through the galactic plane.
- **Internal Axial Rotation:** The verb *Sabaha* (*Yasbahun*) in Arabic describes a body moving through a medium via its own dynamic internal motion (unlike passive drifting), matching the Sun's 25-day equatorial axial rotation and the Moon's synchronous rotation.
- Crucially, the verse **never states** that the Sun orbits the Earth; it states that each celestial body moves in its own distinct *Falak* (orbital trajectory).

### 3. Rhetorical Perspective in Surah Al-Kahf (18:86)
Regarding Dhul-Qarnayn reaching the westernmost coast, the text reads:
> *"Until, when he reached the setting of the sun, **he found it (wajadaha)** setting in a dark/warm body of water..."*

1. **Phenomenological / Optical Language:** The verse explicitly uses **"wajadaha"** ("he found it / it appeared to him"), describing the visual horizon from the observer's coastal vantage point—just as modern meteorologists use "sunrise" and "sunset" without implying geocentrism.
2. **Classical Exegetical Consensus:** Classical scholars like **Ibn Kathir** (d. 1373 CE) and **Al-Tabari** explicitly wrote centuries ago that the sun is vastly larger than the Earth and does not physically enter water; rather, Dhul-Qarnayn reached the end of dry land where the ocean met the western horizon.`,
    category: 'Cosmology & Physics',
    difficulty: 'Beginner',
    tags: ['Solar Orbit', 'Astronomy', 'Surah Al-Kahf', 'Surah Al-Anbiya', 'Linguistics', 'Celestial Mechanics'],
    author: 'Masud Rana',
    authorRole: 'B.Sc. in Engineering Physics & Researcher',
    readTimeMinutes: 7,
    views: 1390,
    publishedAt: '2026-11-06',
    featured: false,
    bookmarked: false,
    references: [
      { label: 'Qur\'an 21:33', citation: 'And He it is Who created the night and the day, and the sun and the moon. They all float, each in an orbit.' },
      { label: 'Tafsir Ibn Kathir (18:86)', citation: 'He saw the sun setting in his visual perception into the ocean, as anyone who stands on a coast sees it.' }
    ],
    keyTakeaways: [
      'The Sun travels at ~220 km/s in a galactic orbit around the Milky Way center while rotating on its axis.',
      'The Qur\'an never states the Sun orbits the Earth; it assigns each body its own orbital path (Falak).',
      'Surah 18:86 explicitly frames the sunset from Dhul-Qarnayn\'s visual perspective ("wajadaha"), as noted by classical scholars.'
    ]
  },
  {
    id: 'post-4',
    title: 'Mountain Roots & Isostasy (Surah An-Naba 78:6–7): Evaluating Geological Critiques of "Awtad" (Pegs)',
    slug: 'mountain-roots-isostasy-surah-an-naba',
    claimAddressed: 'Critique: "Mountains do not act like tent pegs and do not prevent earthquakes; tectonic collisions actually cause earthquakes."',
    excerpt: 'Analyzing cortical thickness, Airy-Heiskanen isostasy, deep lithospheric roots beneath mountain ranges, and how gravitational load stabilizes crustal plates.',
    content: `### 1. The Geological Objection
Critics frequently argue that the Qur'anic metaphor of mountains as **Awtad** (pegs/stakes, 78:7) and **Rawasi** (stabilizers, 16:15) is geologically inaccurate because mountain belts are zones of active seismic faulting.

### 2. Deep Crustal Roots & Airy Isostasy
A tent peg (*Watad*) has two primary characteristics: a minor visible portion above the surface and a much deeper root embedded beneath the ground to anchor the structure.
In modern geophysics (discovered via gravimetric anomalies in the 19th and 20th centuries by George Airy and Frank Press):
- Continental crust averages **30–35 km** in thickness.
- Beneath major mountain ranges like the Himalayas or Andes, crustal "roots" extend down **60 to 80 km** into the denser asthenosphere/mantle.
- **Frank Press (Former President of the U.S. National Academy of Sciences)** co-authored the widely used textbook *Earth*, explicitly illustrating mountains as wedge-like roots deeply embedded in the mantle to maintain **isostatic equilibrium**.

### 3. Lithospheric Stabilization (*An Tamida Bikum*)
The Arabic verb **Mada / Tamida** in Surah An-Naba and Surah An-Nahl refers to **continuous swaying, tilting, or unstable oscillation** (like a ship tossing on fluid waves), not localized fault-line tremors (*Zalzalah*).
According to **Airy-Heiskanen Isostasy**, the buoyant deep roots of mountain belts counterbalance the mass above, preventing the thin lithospheric plates from wildly oscillating over the plastic asthenosphere.`,
    category: 'Cosmology & Physics',
    difficulty: 'Intermediate',
    tags: ['Geology', 'Isostasy', 'Mountain Roots', 'Surah An-Naba', 'Geophysics'],
    author: 'Masud Rana',
    authorRole: 'B.Sc. in Engineering Physics & Researcher',
    readTimeMinutes: 6,
    views: 1120,
    publishedAt: '2026-11-02',
    featured: false,
    bookmarked: true,
    references: [
      { label: 'Qur\'an 78:6–7', citation: 'Have We not made the earth a resting expanse, and the mountains as stakes (Awtad)?' },
      { label: 'Press & Siever — Earth', citation: 'Crustal roots beneath mountain ranges extend multiple times their elevation into the mantle to support isostatic balance.' }
    ],
    keyTakeaways: [
      'Mountains possess deep crustal roots extending 60–80 km into the mantle, matching the geometry of a stake (Watad).',
      'The Arabic term "Tamida" denotes rotational swaying or crustal disequilibrium, distinct from seismic tremors ("Zalzalah").',
      'Isostatic equilibrium anchors continental crust over the denser asthenosphere.'
    ]
  },
  {
    id: 'post-5',
    title: 'Embryological Terminology & Surah At-Tariq 86:5–7: Deconstructing the "Backbone and Ribs" Critique',
    slug: 'embryology-surah-at-tariq-sulb-and-taraib',
    claimAddressed: 'Critique: "Surah At-Tariq 86:6–7 copies Hippocratic errors by claiming semen originates between the backbone (Sulb) and the ribs (Tara\'ib)."',
    excerpt: 'Linguistic, grammatical, and anatomical analysis of "Yakhruju min bayni al-sulbi wa al-tara\'ib" — examining pronoun referent resolution, neurovascular innervation, and embryonic gonadal ridge descent.',
    content: `### 1. Understanding the Critic's Claim
Critics allege that **Surah At-Tariq (86:5–7)** makes an anatomical error by stating that seminal fluid is produced in the chest between the spine and ribs, rather than the testes and accessory glands.

### 2. Grammatical & Referent Analysis of Verses 5–7
Let us read the verses sequentially in Arabic syntax:
1. *Fal-yanzuril-insanu mimma khuliq* — "So let man observe from what he was created." (86:5)
2. *Khuliqa min ma'in dafiq* — "He was created from an emitted/gushing fluid." (86:6)
3. *Yakhruju min bayni al-sulbi wa al-tara'ib* — "Which (or Who) emerges from between the *Sulb* and the *Tara'ib*." (86:7)

#### Interpretation A: The Subject of *Yakhruju* is *Al-Insan* (The Developing Human)
In classical Arabic grammar (supported by scholars such as Abu Muslim al-Isfahani and Ibn Ashur), the verb **Yakhruju** ("emerges") can refer back to **Al-Insan** (the human baby) mentioned in verse 5, who develops and emerges from the maternal abdominal/pelvic cavity bounded dorsally by the mother's vertebral column (*Sulb*) and ventrally/superiorly by the lower thoracic cage and pelvic girdle.

#### Interpretation B: Dual Parental Contribution (*Sulb* of the Male, *Tara'ib* of the Female)
Classical commentators including **Ibn Abbas**, **Ikrimah**, and **Qatadah** explained *min bayni* ("from between") as denoting the **combined reproductive contribution** of the father (*Sulb*, symbolizing male loins/generative lineage, as used in Qur'an 4:23 *"your sons from your Aslab"*) and the mother (*Tara'ib*).

#### Interpretation C: Embryonic Gonadal Ridge Origin & Neurovascular Supply
Even when applied directly to reproductive anatomy:
- During weeks 5–6 of human embryogenesis, both testes and ovaries originate in the **urogenital ridge** along the posterior dorsal body wall (adjacent to the developing thoracic/lumbar spine, T10–L2) before descending into the scrotum/pelvis.
- Consequently, the **testicular and ovarian arteries** still branch directly off the abdominal aorta just below the renal arteries (L2 level), and the **sympathetic nerve plexus** controlling emission (T10–L2 spinal segments) originates strictly between the vertebral column and lower rib level.`,
    category: 'Biology & Embryology',
    difficulty: 'Advanced',
    tags: ['Surah At-Tariq', 'Embryology', 'Arabic Grammar', 'Anatomy', 'Sulb and Taraib'],
    author: 'Masud Rana',
    authorRole: 'B.Sc. in Engineering Physics & Researcher',
    readTimeMinutes: 9,
    views: 1650,
    publishedAt: '2026-10-28',
    featured: true,
    bookmarked: false,
    references: [
      { label: 'Qur\'an 86:5–7', citation: 'So let man observe from what he was created. He was created from a gushing fluid, emerging from between the sulb and tara\'ib.' },
      { label: 'Langman\'s Medical Embryology', citation: 'Primordial gonads develop in the intermediate mesoderm along the dorsal body wall (T10–L2) and retain their neurovascular supply from that region.' }
    ],
    keyTakeaways: [
      'Grammatically, "Yakhruju" can refer to the human fetus emerging from the maternal torso or the union of paternal (Sulb) and maternal (Tara\'ib) contributions.',
      'In Qur\'anic idiom (e.g., 4:23), "Sulb" explicitly functions as a metonym for paternal lineage.',
      'Embryologically and neurologically, gonadal blood supply and ejaculatory reflex nerves originate at the T10–L2 thoracolumbar level.'
    ]
  },
  {
    id: 'post-6',
    title: 'Historical Context & Ethical Framework of Early Islamic Warfare & Abolition of Slavery',
    slug: 'historical-context-ethics-warfare-abolition-slavery',
    claimAddressed: 'Critique: "Islam spread by the sword and institutionalized medieval slavery rather than abolishing it overnight."',
    excerpt: 'Examining strict Qur\'anic rules of defensive engagement (2:190), non-combatant immunity, and the unprecedented 7th-century structural dismantling of slavery through mandatory manumission expiations and Zakat funds.',
    content: `### 1. Addressing the "Spread by the Sword" Myth
A persistent Orientalist and anti-Islamic trope claims that Islam mandated forced conversions. However, both primary scripture and non-Muslim historians refute this claim:
- **Explicit Prohibition of Forced Conversion:** **Surah Al-Baqarah (2:256)** categorically decrees: *"There shall be no compulsion in [acceptance of] the religion."*
- **Conditional Engagement:** **Surah Al-Baqarah (2:190)** restricts military force strictly to active combatants: *"Fight in the way of Allah those who fight you, but do not transgress. Indeed, Allah does not like transgressors."*
- **Historical Demographics:** Historian De Lacy O'Leary wrote in *Islam at the Cross Roads*: *"History makes it clear, however, that the legend of fanatical Muslims sweeping through the world and forcing Islam at the point of the sword upon conquered races is one of the most fantastically absurd myths that historians have ever repeated."* (For instance, Indonesia—the world's largest Muslim-majority nation—and Malaysia embraced Islam peacefully through maritime trade.)

### 2. Why Slavery Was Dismantled via Structural Gradualism
In the 7th-century ancient world (Roman, Byzantine, Sassanid, and pre-Islamic Arabian economies), chattel slavery was deeply entrenched through debt bondage, poverty, kidnapping, and warfare. An abrupt overnight decree without economic infrastructure would have left hundreds of thousands of landless dependents destitute or dead. Instead, Islam implemented a **two-pronged abolition strategy**:

#### A. Drying Up the Sources of Enslavement
Islam immediately outlawed enslaving free people for debt, poverty, or kidnapping (*"There are three whose opponent I will be on the Day of Resurrection... one who sells a free person and consumes the price"* — Sahih al-Bukhari).

#### B. Creating Continuous State & Religious Pipelines for Emancipation (*Fakk Raqabah*)
1. **Elevated as the Highest Moral Act (Surah Al-Balad 90:12–13):** Defining the "steep path of virtue" first and foremost as **freeing a captive/slave (*Fakk Raqabah*)**.
2. **State Treasury Allocation (Surah At-Tawbah 9:60):** Making the emancipation of captives (*Fi al-Riqab*) one of the eight mandatory categories of state **Zakat** tax revenue.
3. **Mandatory Legal Expiation (*Kaffarah*):** Requiring the freeing of a person as the primary expiation for broken oaths (5:89), accidental manslaughters (4:92), and *Zihar* (58:3).
4. **Contractual Right to Freedom (*Mukatabah*, 24:33):** Commanding believers to grant emancipation contracts with financial assistance to anyone seeking freedom.`,
    category: 'Historical & Ethics',
    difficulty: 'Intermediate',
    tags: ['Ethics', 'History', 'Surah Al-Baqarah', 'Surah Al-Balad', 'Human Rights', 'Contextual Analysis'],
    author: 'Masud Rana',
    authorRole: 'B.Sc. in Engineering Physics & Researcher',
    readTimeMinutes: 10,
    views: 2100,
    publishedAt: '2026-10-20',
    featured: false,
    bookmarked: false,
    references: [
      { label: 'Qur\'an 2:256 & 2:190', citation: 'There shall be no compulsion in the religion... Fight in the way of Allah those who fight you, but do not transgress.' },
      { label: 'Qur\'an 90:12–13 & 9:60', citation: 'And what can make you know what is the steep path? It is the freeing of a slave (Fakk Raqabah).' }
    ],
    keyTakeaways: [
      'Surah 2:256 and 2:190 prohibit forced conversion and restrict combat strictly to active aggressors.',
      'Islam dried up debt and kidnapping slavery while institutionalizing mandatory state Zakat funds (9:60) for emancipation.',
      'Surah Al-Balad 90:13 establishes freeing captives (Fakk Raqabah) as the premier moral ascension.'
    ]
  },
  {
    id: 'post-7',
    title: 'Fine-Tuning of Physical Constants & The Red Queen Hypothesis: Teleology in Physics & Evolutionary Biology',
    slug: 'fine-tuning-physical-constants-red-queen-teleology',
    claimAddressed: 'Critique: "Blind natural selection and unguided physical constants account for all complexity in life and the cosmos without intelligent design."',
    excerpt: 'Quantifying the precision of the Cosmological Constant (1 in 10^120), strong nuclear force resonance in Fred Hoyle\'s triple-alpha carbon synthesis, and evolutionary maintenance thresholds.',
    content: `### 1. The Razor's Edge of Physical Constants
Modern theoretical physics demonstrates that life-permitting universes occupy an infinitesimally tiny region of parameter space:
- **Cosmological Constant:** Tuned to approximately 1 part in 10^120. A slightly larger value would cause space to expand so rapidly that no galaxies or stars could ever coalesce.
- **Initial Low-Entropy State (Roger Penrose):** Mathematical physicist Roger Penrose calculated the phase-space volume required for the universe's initial low-entropy state at the Big Bang as **1 part in 10^(10^123)**.
- **Triple-Alpha Process & Carbon-12 Hoyle State:** Sir Fred Hoyle (initially an ardent atheist) discovered that carbon-12 synthesis inside stars requires a precise nuclear resonance at **7.65 MeV**. Moving that resonance by just 4% destroys nearly all carbon or oxygen production in the universe.

> "A common sense interpretation of the facts suggests that a superintellect has monkeyed with physics, as well as with chemistry and biology." — Sir Fred Hoyle

### 2. Biological Information & The Red Queen Hypothesis
In evolutionary biology, the **Red Queen Hypothesis** (Leigh Van Valen, 1973) explains why organisms must constantly adapt and maintain sexual recombination just to survive against co-evolving parasites and environmental entropy.
- Rather than proving "blind purposelessness," the Red Queen dynamic highlights how tightly constrained biological systems are against genetic degradation (Muller's Ratchet).
- Crucially, natural selection only **filters existing functional phenotypes**; it cannot explain the origin of the foundational digital genetic code (DNA transcription/translation machinery) or the fine-tuned chemical laws required for self-replicating molecules to exist in the first place.`,
    category: 'Philosophy & Logic',
    difficulty: 'Advanced',
    tags: ['Fine-Tuning', 'Red Queen Hypothesis', 'Fred Hoyle', 'Roger Penrose', 'Teleology', 'Physics'],
    author: 'Masud Rana',
    authorRole: 'B.Sc. in Engineering Physics & Researcher',
    readTimeMinutes: 8,
    views: 1475,
    publishedAt: '2026-10-14',
    featured: false,
    bookmarked: false,
    references: [
      { label: 'Qur\'an 67:3–4', citation: 'You do not see in the creation of the Most Merciful any inconsistency. So return your vision: do you see any flaw?' },
      { label: 'Penrose — The Emperor\'s New Mind', citation: 'Phase-space precision of the initial low-entropy state of the universe is 1 in 10^(10^123).' }
    ],
    keyTakeaways: [
      'The cosmological constant and Hoyle carbon-12 resonance are fine-tuned to extreme mathematical tolerances.',
      'Natural selection acts as a filter on existing replicators but presupposes the existence of coded genetic information and fine-tuned chemistry.',
      'Even secular physicists like Fred Hoyle acknowledged the overwhelming teleological signature in nuclear resonances.'
    ]
  },
  {
    id: 'post-8',
    title: 'Historiography of 7th-Century Arabia: Critically Evaluating Age-Report Narrations & Anachronistic Polemics',
    slug: 'historiography-7th-century-age-narrations-critique',
    claimAddressed: 'Critique: "Modern critics attack prophetic marriage ethics without examining pre-modern demographics, chronological discrepancies in Hisham ibn Urwah\'s Iraqi reports, or universal historical norms."',
    excerpt: 'A rigorous historiographical and Hadith-criticism (Ilm al-Rijal & Asma al-Rijal) analysis comparing chronological markers (Asma bint Abi Bakr\'s age, Battle of Badr participation, and Surah Al-Qamar revelation dates).',
    content: `### 1. Methodological Standards in Historical Inquiry
When evaluating any historical event from Late Antiquity, historians apply two foundational principles:
1. **Primary Source Chronological Cross-Verification:** Testing isolated single-chain (*Khabar al-Wahid*) numerical reports against established historical timelines.
2. **Contextual Historiography:** Understanding how puberty, adulthood, and betrothal functioned in 7th-century agrarian and desert societies where life expectancy averaged 30–35 years.

### 2. Source-Critical Analysis (*Isnad* & *Matn*) of the Age Narration
Modern Islamic historiographers and Hadith researchers have scrutinized the primary narration regarding Aisha's (RA) age at marriage:
- **Single-Strand Transmission via Hisham ibn 'Urwah:** Virtually all chains mentioning the specific numbers trace back through **Hisham ibn 'Urwah** after he relocated from Medina to **Iraq (Kufa)** in his old age (after 131 AH / age 71+), where early biographical critics such as **Ya'qub ibn Shaybah** and **Malik ibn Anas** noted memory fluctuations in his late Iraqi transmissions, whereas no Medinan disciple of Hisham recorded this narration.
- **Chronological Comparison with Sister Asma bint Abi Bakr:** Historians **Ibn Kathir** (*Al-Bidayah wa'l-Nihayah*) and **Ibn Hajar al-Asqalani** (*Al-Isabah*) record that Asma was **10 years older** than Aisha, died in **73 AH at age 100**, and was therefore born ~27 years before the Hijrah (making Aisha born ~17 years before Hijrah, and roughly **17–19 years old** at consummation in 1–2 AH).
- **Timeline of Surah Al-Qamar (54:46) & Early Conversion Lists:** Ibn Hisham's *Sirah* lists Aisha among the very first converts in the first three years of the Meccan mission (c. 610–613 CE), long before the Hijrah in 622 CE.

### 3. Ethical Principles in Islamic Matrimonial Law
Regardless of the chronological calculation, Islamic jurisprudence (*Fiqh*) universally establishes two mandatory conditions for any valid marriage:
1. **Physical & Emotional Maturity (*Bulugh* & *Rushd*)** alongside strict **No-Harm (*La Darar wa la Dirar*)** legal protection.
2. **Free Mutual Consent** of the bride, with Aisha (RA) going on to become the foremost female jurist, scholar, and educator in Islamic history—narrating over 2,200 Hadiths and instructing senior companions for four decades.`,
    category: 'Historical & Ethics',
    difficulty: 'Advanced',
    tags: ['Historiography', 'Hadith Studies', 'Chronology', 'Ilm al-Rijal', 'Historical Ethics'],
    author: 'Masud Rana',
    authorRole: 'B.Sc. in Engineering Physics & Researcher',
    readTimeMinutes: 11,
    views: 2450,
    publishedAt: '2026-10-05',
    featured: false,
    bookmarked: true,
    references: [
      { label: 'Ibn Kathir — Al-Bidayah wa\'l-Nihayah', citation: 'Asma bint Abi Bakr was ten years older than her sister Aisha and passed away in 73 AH at the age of one hundred.' },
      { label: 'Ibn Hajar — Tahdhib al-Tahdhib', citation: 'Notes on Hisham ibn \'Urwah\'s late transmissions after moving to Iraq.' }
    ],
    keyTakeaways: [
      'Cross-referencing Asma bint Abi Bakr\'s biographical dates (Ibn Kathir, Ibn Hajar) and early Meccan conversion lists places Aisha\'s age in her late teens by 1–2 AH.',
      'The numerical report relies almost exclusively on Hisham ibn \'Urwah\'s late Iraqi period.',
      'Islamic law mandates both maturity (Bulugh/Rushd) and the strict principle of "No Harm" (La Darar).'
    ]
  }
];

// --- CODE ARCHITECTURE BLUEPRINTS (Next.js + TS + PostgreSQL + Prisma + NextAuth) ---
const CODE_FILES: Record<string, { title: string; path: string; language: string; description: string; code: string }> = {
  prisma: {
    title: 'Prisma PostgreSQL Schema (Users, Admin Role, Rich Blocks & pgvector)',
    path: 'prisma/schema.prisma',
    language: 'prisma',
    description: 'Production PostgreSQL schema with User/Admin auth (Credentials + Google OAuth), JSON ContentBlocks (Text, Image, YouTube), and pgvector embeddings.',
    code: `// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions", "fullTextSearchPostgres"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

enum Role {
  ADMIN
  READER
}

enum Category {
  COSMOLOGY_PHYSICS
  BIOLOGY_EMBRYOLOGY
  HISTORICAL_ETHICS
  PHILOSOPHY_LOGIC
  LINGUISTICS_TAFSIR
}

enum Difficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  passwordHash  String?   // For Credential Login (bcrypt)
  googleId      String?   @unique // For Google OAuth Login
  image         String?
  role          Role      @default(READER)
  posts         Post[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Post {
  id              String                 @id @default(cuid())
  title           String
  slug            String                 @unique
  claimAddressed  String                 @db.Text
  excerpt         String                 @db.Text
  content         String                 @db.Text
  // Structured blocks for interleaved Text, Image & YouTube video previews
  blocks          Json                   // Array<{ id, type: 'text'|'image'|'youtube'|'quote', value, caption }>
  category        Category
  difficulty      Difficulty             @default(INTERMEDIATE)
  tags            String[]
  authorName      String                 @default("Masud Rana")
  authorRole      String                 @default("B.Sc. in Engineering Physics & Researcher")
  authorId        String?
  author          User?                  @relation(fields: [authorId], references: [id])
  readTimeMinutes Int                    @default(7)
  views           Int                    @default(0)
  featured        Boolean                @default(false)
  published       Boolean                @default(true)
  keyTakeaways    String[]
  references      Json                   // Array of { label: string, citation: string }
  embedding       Unsupported("vector(768)")?
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt

  @@index([category, published])
  @@index([slug])
}

model AiChatSession {
  id        String   @id @default(cuid())
  query     String   @db.Text
  response  String   @db.Text
  citedIds  String[]
  createdAt DateTime @default(now())
}`
  },
  nextAuthApi: {
    title: 'NextAuth.js (Vercel Secret-Based Administrator Login)',
    path: 'lib/auth.ts',
    language: 'typescript',
    description: 'Verifies the administrator email and password on the server using private Vercel environment variables. No demo credentials or client-controlled role.',
    code: `// lib/auth.ts
import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

function passwordMatches(candidate: string, configured: string) {
  const left = createHash('sha256').update(candidate).digest();
  const right = createHash('sha256').update(configured).digest();
  return timingSafeEqual(left, right);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === 'production',
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  providers: [
    CredentialsProvider({
      name: 'Administrator',
      credentials: {
        email: { label: 'প্রশাসকের ইমেইল', type: 'email' },
        password: { label: 'পাসওয়ার্ড', type: 'password' },
      },
      async authorize(credentials) {
        const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const adminপাসওয়ার্ড = process.env.ADMIN_PASSWORD;
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!adminEmail || !adminপাসওয়ার্ড || !email || !password) return null;
        if (email !== adminEmail || !passwordMatches(password, adminপাসওয়ার্ড)) return null;

        return { id: \`admin:\${adminEmail}\`, email: adminEmail, name: 'Administrator', role: 'ADMIN' };
      },
    }),
  ],
};
`
  },
  searchApi: {
    title: 'Next.js Smart Hybrid Search + Admin CRUD API Route',
    path: 'app/api/posts/route.ts',
    language: 'typescript',
    description: 'Next.js 15 App Router endpoint for searching, filtering, paginating, and Admin creating/updating/deleting posts with rich media blocks.',
    code: `// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, Category, Difficulty } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';
    const category = searchParams.get('category') as Category | null;
    const difficulty = searchParams.get('difficulty') as Difficulty | null;
    const tag = searchParams.get('tag') || '';
    const sortBy = searchParams.get('sortBy') || 'newest';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(20, Math.max(1, Number(searchParams.get('pageSize') || 4)));

    const where: Prisma.PostWhereInput = {
      published: true,
      ...(category ? { category } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { claimAddressed: { contains: q, mode: 'insensitive' } },
              { excerpt: { contains: q, mode: 'insensitive' } },
              { content: { contains: q, mode: 'insensitive' } },
              { tags: { hasSome: q.split(/\\s+/) } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.PostOrderByWithRelationInput =
      sortBy === 'popular'
        ? { views: 'desc' }
        : sortBy === 'readTime'
        ? { readTimeMinutes: 'asc' }
        : { createdAt: 'desc' };

    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('[GET /api/posts]', error);
    return NextResponse.json({ error: 'Failed to query blog posts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const post = await prisma.post.create({
      data: {
        title: body.title,
        slug: body.slug,
        claimAddressed: body.claimAddressed,
        excerpt: body.excerpt,
        content: body.content,
        blocks: body.blocks || [],
        category: body.category,
        difficulty: body.difficulty,
        tags: body.tags,
        keyTakeaways: body.keyTakeaways,
        references: body.references,
        readTimeMinutes: body.readTimeMinutes || 6,
      },
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 400 });
  }
}`
  },
  aiRagApi: {
    title: 'AI Auto-Search & Apologetics RAG Chatbot API',
    path: 'app/api/ai-assistant/route.ts',
    language: 'typescript',
    description: 'Retrieves relevant apologetics articles from PostgreSQL using vector similarity + keyword ranking and synthesizes a cited response.',
    code: `// app/api/ai-assistant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const embeddingRes = await embeddingModel.embedContent(message);
    const vectorSql = \`[\${embeddingRes.embedding.values.join(',')}]\`;

    const matchedPosts = await prisma.$queryRaw<
      Array<{ id: string; title: string; slug: string; claimAddressed: string; excerpt: string; content: string }>
    >\`
      SELECT id, title, slug, "claimAddressed", excerpt, content
      FROM "Post"
      WHERE published = true
      ORDER BY embedding <=> \${vectorSql}::vector
      LIMIT 3
    \`;

    const contextBlock = matchedPosts
      .map(
        (p, i) =>
          \`[Article \${i + 1}: \${p.title}]\\nClaim Addressed: \${p.claimAddressed}\\nContent: \${p.content}\`
      )
      .join('\\n\\n---\\n\\n');

    const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await chatModel.generateContent([
      \`You are Al-Burhan AI, a scholarly research assistant for Islamic apologetics, physics, and historical verification.
Answer the user's question clearly, citing the database articles below:\\n\\n\${contextBlock}\`,
      message,
    ]);

    const replyText = result.response.text();

    await prisma.aiChatSession.create({
      data: {
        query: message,
        response: replyText,
        citedIds: matchedPosts.map((p) => p.id),
      },
    });

    return NextResponse.json({
      reply: replyText,
      matchedPosts,
    });
  } catch (error) {
    console.error('[POST /api/ai-assistant]', error);
    return NextResponse.json({ error: 'AI search failed' }, { status: 500 });
  }
}`
  }
};

// --- HELPER: SMART SEMANTIC SCORING ---
function scorePostAgainstQuery(post: BlogPost, rawQuery: string): { score: number; matchedTerms: string[] } {
  const q = rawQuery.toLowerCase().trim();
  if (!q) return { score: 1, matchedTerms: [] };

  const synonymMap: Record<string, string[]> = {
    atheism: ['kalam', 'creator', 'first cause', 'quantum', 'fine-tuning', 'multiverse', 'bgv', 'penrose', 'hoyle'],
    universe: ['cosmology', 'kalam', 'bgv', 'big bang', 'thermodynamics', 'quantum', 'orbit', 'falak'],
    science: ['physics', 'biology', 'embryology', 'geology', 'astronomy', 'quantum', 'isostasy', 'zawj'],
    pairs: ['zawj', 'yasin', '36:36', 'asexual', 'parthenogenesis', 'bacteria', 'antimatter', 'complementarity'],
    sun: ['orbit', 'falak', 'yasbahun', 'muddy spring', 'dhul-qarnayn', '18:86', '21:33', 'geocentric'],
    mountain: ['awtad', 'pegs', 'isostasy', 'crust', 'earthquake', 'tamida', '78:7'],
    semen: ['embryology', 'tariq', '86:7', 'sulb', 'taraib', 'backbone', 'ribs', 'gonad'],
    war: ['sword', 'jihad', 'compulsion', '2:256', '2:190', 'history', 'ethics'],
    slavery: ['abolition', 'fakk raqabah', 'zakat', '90:13', 'captives', 'emancipation'],
    aisha: ['age', 'hisham', 'asma', 'chronology', 'historiography', 'hadith', 'marriage'],
    evolution: ['red queen', 'darwin', 'natural selection', 'dna', 'fine-tuning']
  };

  const tokens = q
    .replace(/[^\w\s:'-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const expandedTokens = new Set<string>(tokens);
  tokens.forEach((tok) => {
    Object.entries(synonymMap).forEach(([key, syns]) => {
      if (tok.includes(key) || key.includes(tok) || syns.some((s) => s.includes(tok))) {
        expandedTokens.add(key);
        syns.forEach((s) => expandedTokens.add(s));
      }
    });
  });

  const titleLower = post.title.toLowerCase();
  const claimLower = post.claimAddressed.toLowerCase();
  const excerptLower = post.excerpt.toLowerCase();
  const contentLower = post.content.toLowerCase();
  const tagsLower = post.tags.map((t) => t.toLowerCase());
  const refsLower = post.references.map((r) => `${r.label} ${r.citation}`.toLowerCase()).join(' ');

  let score = 0;
  const matchedTerms: string[] = [];

  if (titleLower.includes(q)) score += 35;
  if (claimLower.includes(q)) score += 30;
  if (excerptLower.includes(q)) score += 20;
  if (contentLower.includes(q)) score += 15;

  expandedTokens.forEach((term) => {
    const isDirectUserToken = tokens.includes(term);
    const weight = isDirectUserToken ? 1.0 : 0.45;

    let hit = false;
    if (titleLower.includes(term)) {
      score += 14 * weight;
      hit = true;
    }
    if (claimLower.includes(term)) {
      score += 12 * weight;
      hit = true;
    }
    if (tagsLower.some((t) => t.includes(term))) {
      score += 15 * weight;
      hit = true;
    }
    if (refsLower.includes(term)) {
      score += 10 * weight;
      hit = true;
    }
    if (excerptLower.includes(term)) {
      score += 8 * weight;
      hit = true;
    }
    if (contentLower.includes(term)) {
      score += 5 * weight;
      hit = true;
    }
    if (hit && isDirectUserToken && !matchedTerms.includes(term)) {
      matchedTerms.push(term);
    }
  });

  return { score: Math.round(score), matchedTerms };
}

// --- SMART RICH CONTENT RENDERER (INTERLEAVED TEXT, IMAGES & YOUTUBE EMBEDS) ---
function RichPostContentRenderer({ post }: { post: BlogPost }) {
  const blocks = useMemo(
    () => parseContentToBlocks(post.content, post.blocks),
    [post.content, post.blocks]
  );

  return (
    <div className="space-y-6 text-slate-200 leading-relaxed text-base">
      {blocks.map((block) => {
        if (block.type === 'image') {
          return (
            <figure
              key={block.id}
              className="my-6 rounded-2xl overflow-hidden bg-slate-950/90 border border-slate-800 shadow-xl"
            >
              <div className="p-2 sm:p-4 flex items-center justify-center bg-slate-950">
                <img
                  src={block.value}
                  alt={block.caption || 'Article diagram'}
                  className="max-w-full h-auto rounded-xl object-contain max-h-[420px]"
                />
              </div>
              {block.caption && (
                <figcaption className="px-4 py-3 bg-slate-900/90 border-t border-slate-800/80 text-xs text-slate-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{block.caption}</span>
                </figcaption>
              )}
            </figure>
          );
        }

        if (block.type === 'youtube') {
          const ytId = extractYouTubeId(block.value);
          return (
            <div
              key={block.id}
              className="my-6 rounded-2xl overflow-hidden bg-slate-950 border border-red-500/30 shadow-xl"
            >
              <div className="px-4 py-2.5 bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
                  <Youtube className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{block.caption || 'Embedded YouTube Lecture & Evidence Preview'}</span>
                </div>
                <a
                  href={ytId ? `https://www.youtube.com/watch?v=${ytId}` : block.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-slate-800/90 px-2.5 py-1 rounded-lg"
                >
                  <span>ইউটিউবে দেখুন</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {ytId ? (
                <div className="relative w-full pt-[56.25%] bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title={block.caption || 'YouTube Video Preview'}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  Invalid YouTube URL ({block.value}). Paste a valid `youtube.com/watch?v=...` or `youtu.be/...` link.
                </div>
              )}
            </div>
          );
        }

        if (block.type === 'quote') {
          return (
            <blockquote
              key={block.id}
              className="p-5 rounded-2xl bg-slate-950/90 border-l-4 border-amber-400 text-amber-100/95 italic text-sm sm:text-base shadow-md"
            >
              <p>"{block.value}"</p>
              {block.caption && (
                <footer className="mt-2 text-xs font-semibold not-italic text-amber-300">
                  — {block.caption}
                </footer>
              )}
            </blockquote>
          );
        }

        // Render formatted smart text block (supports ### headings, #### subheadings, > quotes, bolding, lists)
        return (
          <div key={block.id} className="space-y-3">
            {block.value.split('\n\n').map((sub, i) => {
              const trimmed = sub.trim();
              if (trimmed.startsWith('### ')) {
                return (
                  <h3
                    key={i}
                    className="text-lg sm:text-xl font-bold text-emerald-300 pt-3 pb-1 border-b border-slate-800"
                  >
                    {trimmed.replace('### ', '')}
                  </h3>
                );
              }
              if (trimmed.startsWith('#### ')) {
                return (
                  <h4 key={i} className="text-base sm:text-lg font-semibold text-amber-300 pt-2">
                    {trimmed.replace('#### ', '')}
                  </h4>
                );
              }
              if (trimmed.startsWith('> ')) {
                return (
                  <blockquote
                    key={i}
                    className="p-4 rounded-xl bg-slate-950/80 border-l-4 border-amber-400 text-amber-100/90 italic text-sm sm:text-base"
                  >
                    {trimmed.replace('> ', '')}
                  </blockquote>
                );
              }
              return (
                <p key={i} className="whitespace-pre-line text-slate-300 leading-7">
                  {trimmed}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function App() {
  // Remember the reader's light/dark preference on this device.
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark' | 'system'>('light');

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem('al_burhan_theme');
      if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'sepia' || savedTheme === 'system') {
        setTheme(savedTheme);
      }
    } catch {
      // Use the calm light theme when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('al_burhan_theme', theme);
    } catch {
      // Theme still works for the current session if storage is blocked.
    }
  }, [theme]);
  // State: Posts (persisted safely in localStorage)
  const [posts, setPosts] = useState<BlogPost[]>(() => {
    try {
      const saved = localStorage.getItem('al_burhan_posts_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return INITIAL_POSTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('al_burhan_posts_v2', JSON.stringify(posts));
    } catch {
      // Ignore storage error
    }
  }, [posts]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/posts?page=1&pageSize=20', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('post-load-failed')))
      .then(data => {
        if (!mounted || !Array.isArray(data.posts) || data.posts.length === 0) return;
        const categoryLabels: Record<string, string> = {
          COSMOLOGY_PHYSICS: 'মহাবিশ্ববিদ্যা ও পদার্থবিজ্ঞান',
          BIOLOGY_EMBRYOLOGY: 'জীববিজ্ঞান ও ভ্রূণতত্ত্ব',
          HISTORICAL_ETHICS: 'ইতিহাস ও নৈতিকতা',
          PHILOSOPHY_LOGIC: 'দর্শন ও যুক্তিবিদ্যা',
          LINGUISTICS_TAFSIR: 'ভাষাতত্ত্ব ও তাফসির',
        };
        const difficultyLabels: Record<string, string> = { BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced' };
        const loaded: BlogPost[] = data.posts.map((item: any) => ({
          id: item.id, title: item.title, slug: item.slug,
          claimAddressed: item.claimAddressed || '', excerpt: item.excerpt || '', content: item.content || '',
          blocks: Array.isArray(item.blocks) ? item.blocks : undefined,
          category: item.topic?.name || categoryLabels[item.category] || 'অন্যান্য', topicId: item.topicId || undefined,
          difficulty: difficultyLabels[item.difficulty] || 'Intermediate',
          tags: Array.isArray(item.tags) ? item.tags : [], author: item.authorName || 'আল-বুরহান',
          authorRole: item.authorRole || 'সম্পাদক', readTimeMinutes: item.readTimeMinutes || 5,
          views: item.views || 0, publishedAt: item.createdAt ? new Date(item.createdAt).toISOString().slice(0,10) : '',
          featured: Boolean(item.featured), bookmarked: false,
          references: Array.isArray(item.references) ? item.references : [],
          keyTakeaways: Array.isArray(item.keyTakeaways) ? item.keyTakeaways : [],
        }));
        setPosts(loaded);
      })
      .catch(() => { /* Keep the offline reading cache when the database is unavailable. */ });
    return () => { mounted = false; };
  }, []);

  // Authentication comes only from the signed, HTTP-only NextAuth session.
  const { data: session, status: authStatus, update: updateSession } = useSession();
  const sessionUser = session?.user as
    | (NonNullable<typeof session>['user'] & { id?: string; role?: 'ADMIN' | 'READER' })
    | undefined;
  const currentUser: AuthUser | null = sessionUser
    ? {
        id: sessionUser.id || sessionUser.email || 'admin',
        name: sessionUser.name || 'Administrator',
        email: sessionUser.email || '',
        role: sessionUser.role === 'ADMIN' ? 'ADMIN' : 'READER',
        provider: 'credentials'
      }
    : null;

  // Admin credentials are submitted to the server; no browser-stored login state.
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authপাসওয়ার্ড, setAuthপাসওয়ার্ড] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showপাসওয়ার্ড, setShowপাসওয়ার্ড] = useState(false);

  // Responsive navigation and database-backed topic directory
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMobileMenuOpen]);

  const [directoryTopics, setDirectoryTopics] = useState<Array<{ id: string; name: string; description?: string | null }>>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/topics', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('topics-unavailable')))
      .then(data => {
        if (active && Array.isArray(data.topics)) {
          setDirectoryTopics(data.topics.map((topic: { id: string; name: string; description?: string | null }) => ({
            id: topic.id, name: topic.name, description: topic.description || ''
          })));
        }
      })
      .catch(() => { /* Use article categories when the topic service is unavailable. */ });
    return () => { active = false; };
  }, []);

  // Navigation & Active View
  const [activeTab, setActiveTab] = useState<'explore' | 'admin' | 'editor' | 'saved' | 'stack'>('explore');

  // Allow the About page's persistent navigation to open the matching home view.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('view');
    if (requestedView === 'explore' || requestedView === 'admin' || requestedView === 'saved') {
      setActiveTab(requestedView);
    }
    if (params.get('openAI') === '1') setIsChatOpen(true);
    if (params.has('view') || params.has('openAI')) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [adminSearchFilter, setAdminSearchFilter] = useState('');

  // Smart Search, Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSemanticMode, setAiSemanticMode] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'popular' | 'readTime'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [showAutoSearchDropdown, setShowAutoSearchDropdown] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const triggerToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3400);
  };

  // AI Chatbot Drawer State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [aiLauncherPosition, setAiLauncherPosition] = useState<{ x: number; y: number } | null>(null);
  const [aiScrollShift, setAiScrollShift] = useState(0);

  const aiLauncherDragRef = useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    x: 0,
    y: 0,
    moved: false,
  });

  // Restore a previously dragged launcher position and keep it inside the viewport.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('al-burhan-ai-launcher-position');
      if (!saved) return;
      const parsed = JSON.parse(saved) as { x?: number; y?: number };
      if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return;
      const size = window.innerWidth <= 640 ? 144 : 160;
      setAiLauncherPosition({
        x: Math.max(8, Math.min(parsed.x, window.innerWidth - size - 8)),
        y: Math.max(8, Math.min(parsed.y, window.innerHeight - size - 8)),
      });
    } catch {
      window.localStorage.removeItem('al-burhan-ai-launcher-position');
    }
  }, []);

  // The floating assistant gently travels upward as the reader scrolls down.
  useEffect(() => {
    let frame = 0;
    const updateScrollPosition = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const fallbackTop = window.innerHeight - (window.innerWidth <= 640 ? 104 : 116);
        const currentTop = aiLauncherPosition?.y ?? fallbackTop;
        const availableTravel = Math.max(0, currentTop - 8);
        setAiScrollShift(Math.min(52, availableTravel, Math.max(0, window.scrollY * 0.035)));
      });
    };
    window.addEventListener('scroll', updateScrollPosition, { passive: true });
    window.addEventListener('resize', updateScrollPosition);
    updateScrollPosition();
    return () => {
      window.removeEventListener('scroll', updateScrollPosition);
      window.removeEventListener('resize', updateScrollPosition);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [aiLauncherPosition]);

  // Keep the page still while the AI drawer is open and support Escape to close it.
  useEffect(() => {
    if (!isChatOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsChatOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isChatOpen]);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: 'আসসালামু আলাইকুম! আমি **আল-বুরহান এআই সহকারী**। গবেষণা, বিজ্ঞান, দর্শন, ইতিহাস, ভাষাতত্ত্ব অথবা কোনো প্রশ্ন লিখুন। আমি পাঠাগারের প্রাসঙ্গিক প্রবন্ধ খুঁজে উত্তর সাজাতে সাহায্য করব।',
      timestamp: 'এইমাত্র',
      matchedPostIds: ['post-1', 'post-2']
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Smart Block Editor Form State (Interleaved Text, Image & YouTube Video Preview Blocks)
  const [formTitle, setFormTitle] = useState('');
  const [formClaim, setFormClaim] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formBlocks, setFormBlocks] = useState<ContentBlock[]>([
    {
      id: 'init-blk-1',
      type: 'text',
      value: '### 1. Statement of the Critic\'s Claim\nWrite your opening analytical paragraph here...'
    },
    {
      id: 'init-blk-2',
      type: 'image',
      value: COSMOLOGY_DIAGRAM_SVG,
      caption: 'Figure 1: Explanatory scientific diagram between text sections'
    },
    {
      id: 'init-blk-3',
      type: 'youtube',
      value: 'https://www.youtube.com/watch?v=cYq-LkSrKsQ',
      caption: 'Lecture Video Evidence Preview between text sections'
    },
    {
      id: 'init-blk-4',
      type: 'text',
      value: '### 2. Primary Scriptural & Scientific Refutation\nContinue your detailed explanation after the embedded image and YouTube video...'
    }
  ]);
  const [editorPreviewMode, setEditorPreviewMode] = useState(false);
  const [formCategory, setFormCategory] = useState<BlogPost['category']>('Cosmology & Physics');
  const [availableTopics, setAvailableTopics] = useState<Array<{id:string;name:string;description?:string|null}>>([]);
  const [formTopicId, setFormTopicId] = useState('');
  const [showQuickTopic, setShowQuickTopic] = useState(false);
  const [quickTopicName, setQuickTopicName] = useState('');
  const [quickTopicDescription, setQuickTopicDescription] = useState('');
  const [creatingQuickTopic, setCreatingQuickTopic] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/topics')
      .then(response => response.ok ? response.json() : Promise.reject(new Error('বিষয়ের তালিকা আনা যায়নি।')))
      .then(data => { if (active && Array.isArray(data.topics)) setAvailableTopics(data.topics); })
      .catch(error => console.error('[topics]', error));
    return () => { active = false; };
  }, []);

  const handleQuickTopicCreate = async () => {
    if (quickTopicName.trim().length < 2) return;
    setCreatingQuickTopic(true);
    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: quickTopicName.trim(), description: quickTopicDescription.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ক্যাটাগরি তৈরি করা যায়নি।');
      const topic = data.topic;
      setAvailableTopics(current => [...current.filter(item => item.id !== topic.id), topic]);
      setFormTopicId(topic.id);
      setQuickTopicName('');
      setQuickTopicDescription('');
      setShowQuickTopic(false);
      triggerToast('নতুন ক্যাটাগরি তৈরি ও নির্বাচন করা হয়েছে।', 'success');
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'ক্যাটাগরি তৈরি করা যায়নি।', 'info');
    } finally {
      setCreatingQuickTopic(false);
    }
  };
  const [formDifficulty, setFormDifficulty] = useState<BlogPost['difficulty']>('Intermediate');
  const [formTags, setFormTags] = useState('');
  const [formTakeaways, setFormTakeaways] = useState('');
  const [formRefLabel, setFormRefLabel] = useState('');
  const [formRefCitation, setFormRefCitation] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);

  // Code Viewer Tab State
  const [selectedCodeKey, setSelectedCodeKey] = useState<string>('prisma');

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    if (searchQuery.trim() && aiSemanticMode) {
      setSortBy('relevance');
    } else if (!searchQuery.trim() && sortBy === 'relevance') {
      setSortBy('newest');
    }
  }, [searchQuery, selectedCategory, selectedDifficulty, selectedTag, pageSize, aiSemanticMode]);

  // All distinct tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [posts]);

  // Filtered & Scored Posts
  const scoredAndFilteredPosts = useMemo(() => {
    return posts
      .map((post) => {
        const { score, matchedTerms } = aiSemanticMode
          ? scorePostAgainstQuery(post, searchQuery)
          : {
              score:
                !searchQuery.trim() ||
                post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.claimAddressed.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.content.toLowerCase().includes(searchQuery.toLowerCase())
                  ? 10
                  : 0,
              matchedTerms: searchQuery.trim() ? [searchQuery.trim()] : []
            };
        return { post, score, matchedTerms };
      })
      .filter(({ post, score }) => {
        if (searchQuery.trim() && score <= 0) return false;
        if (selectedCategory !== 'ALL' && post.category !== selectedCategory) return false;
        if (selectedDifficulty !== 'ALL' && post.difficulty !== selectedDifficulty) return false;
        if (selectedTag !== 'ALL' && !post.tags.includes(selectedTag)) return false;
        if (activeTab === 'saved' && !post.bookmarked) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'relevance' && searchQuery.trim()) return b.score - a.score;
        if (sortBy === 'popular') return b.post.views - a.post.views;
        if (sortBy === 'readTime') return a.post.readTimeMinutes - b.post.readTimeMinutes;
        return b.post.publishedAt.localeCompare(a.post.publishedAt);
      });
  }, [posts, searchQuery, aiSemanticMode, selectedCategory, selectedDifficulty, selectedTag, sortBy, activeTab]);

  // Instant AI Auto-Search Top Suggestions (for dropdown)
  const autoSearchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return posts
      .map((p) => ({ post: p, ...scorePostAgainstQuery(p, searchQuery) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [posts, searchQuery]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(scoredAndFilteredPosts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return scoredAndFilteredPosts.slice(start, start + pageSize);
  }, [scoredAndFilteredPosts, safePage, pageSize]);

  // Currently opened post for reading
  const activePost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) || null,
    [posts, selectedPostId]
  );

  // --- SERVER-VERIFIED ADMIN AUTHENTICATION ---
  const handleCredentialAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = authEmail.trim().toLowerCase();
    if (!emailClean || !authপাসওয়ার্ড) {
      triggerToast('প্রশাসকের ইমেইল ও পাসওয়ার্ড লিখুন।', 'info');
      return;
    }

    setIsAuthLoading(true);
    try {
      const result = await signIn('admin-credentials', {
        email: emailClean,
        password: authপাসওয়ার্ড,
        redirect: false
      });

      if (!result || result.error) {
        triggerToast('প্রশাসকের ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।', 'info');
        return;
      }

      await updateSession();
      setAuthপাসওয়ার্ড('');
      setIsAuthModalOpen(false);
      setActiveTab('admin');
      setSelectedPostId(null);
      triggerToast('প্রশাসক হিসেবে সফলভাবে লগইন হয়েছে।', 'success');
    } catch {
      triggerToast('লগইন করা যায়নি। আবার চেষ্টা করুন।', 'info');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    setAuthপাসওয়ার্ড('');
    if (activeTab === 'admin' || activeTab === 'editor') {
      setActiveTab('explore');
    }
    triggerToast('সফলভাবে লগআউট হয়েছে।', 'info');
  };

  // --- SMART BLOCK BUILDER HANDLERS (ADD / INSERT / MOVE / UPLOAD IMAGE / YOUTUBE) ---
  const handleAddBlockAfter = (index: number, type: ContentBlockType) => {
    const newBlock: ContentBlock = {
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      value:
        type === 'text'
          ? 'Write your paragraph or ### Section Heading here...'
          : type === 'image'
          ? COSMOLOGY_DIAGRAM_SVG
          : type === 'youtube'
          ? 'https://www.youtube.com/watch?v=cYq-LkSrKsQ'
          : 'Enter a primary scriptural verse or academic quote...',
      caption:
        type === 'image'
          ? 'Diagram / Image Caption'
          : type === 'youtube'
          ? 'YouTube Video Explanation'
          : type === 'quote'
          ? 'Primary Source Citation'
          : ''
    };

    setFormBlocks((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, newBlock);
      return copy;
    });
  };

  const handleUpdateBlock = (id: string, field: 'value' | 'caption', val: string) => {
    setFormBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: val } : b))
    );
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    setFormBlocks((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      return copy;
    });
  };

  const handleRemoveBlock = (id: string) => {
    if (formBlocks.length <= 1) {
      triggerToast('An article must have at least one content block.', 'info');
      return;
    }
    setFormBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleLocalImageUpload = (blockId: string, file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleUpdateBlock(blockId, 'value', reader.result);
        triggerToast('Image uploaded and embedded between text blocks!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Open a post & increment views
  const handleOpenPost = (postId: string) => {
    const selectedPost = posts.find((post) => post.id === postId);
    if (selectedPost && !selectedPost.id.startsWith('post-')) {
      // Use the immutable database ID for navigation; the detail route resolves
      // the ID and redirects to the canonical slug. This avoids stale/mismatched slugs.
      window.location.assign('/articles/' + encodeURIComponent(selectedPost.id));
      return;
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, views: p.views + 1 } : p))
    );
    setSelectedPostId(postId);
    setShowAutoSearchDropdown(false);
  };

  // Toggle Bookmark
  const handleToggleBookmark = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextState = !p.bookmarked;
          triggerToast(nextState ? 'Saved article to your research library' : 'Removed from saved library', 'info');
          return { ...p, bookmarked: nextState };
        }
        return p;
      })
    );
  };

  // Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!postId.startsWith('post-')) {
      try {
        const response = await fetch('/api/posts?id=' + encodeURIComponent(postId), { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) {
          triggerToast(data.error || 'পোস্ট মুছে ফেলা যায়নি।', 'info');
          return;
        }
      } catch {
        triggerToast('সার্ভারের সঙ্গে যোগাযোগ করা যায়নি।', 'info');
        return;
      }
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    if (selectedPostId === postId) setSelectedPostId(null);
    triggerToast('প্রবন্ধটি মুছে ফেলা হয়েছে।', 'info');
  };

  // Start Creating a Blank New Post in Smart Editor
  const handleStartNewPost = () => {
    setEditingPostId(null);
    setFormTitle('');
    setFormClaim('');
    setFormExcerpt('');
    setFormCategory('Cosmology & Physics');
    setFormDifficulty('Intermediate');
    setFormTags('');
    setFormTakeaways('');
    setFormRefLabel('');
    setFormRefCitation('');
    setFormFeatured(false);
    setFormBlocks([
      {
        id: `blk-t1-${Date.now()}`,
        type: 'text',
        value: '### 1. Statement of the Critic\'s Claim\nIntroduce the allegation or misconception being addressed...'
      },
      {
        id: `blk-i1-${Date.now() + 1}`,
        type: 'image',
        value: COSMOLOGY_DIAGRAM_SVG,
        caption: 'Visual Evidence / Diagram Between Text Sections'
      },
      {
        id: `blk-y1-${Date.now() + 2}`,
        type: 'youtube',
        value: 'https://www.youtube.com/watch?v=cYq-LkSrKsQ',
        caption: 'YouTube Video Lecture Preview Between Text Sections'
      },
      {
        id: `blk-t2-${Date.now() + 3}`,
        type: 'text',
        value: '### 2. Detailed Linguistic & Scientific Refutation\nContinue the analysis below the embedded media blocks...'
      }
    ]);
    setSelectedPostId(null);
    setActiveTab('editor');
  };

  // Start Editing an Existing Post
  const handleStartEdit = (post: BlogPost) => {
    setEditingPostId(post.id);
    setFormTitle(post.title);
    setFormClaim(post.claimAddressed);
    setFormExcerpt(post.excerpt);
    setFormBlocks(parseContentToBlocks(post.content, post.blocks));
    setFormCategory(post.category);
    setFormDifficulty(post.difficulty);
    setFormTags(post.tags.join(', '));
    setFormTakeaways(post.keyTakeaways.join('\n'));
    setFormRefLabel(post.references[0]?.label || '');
    setFormRefCitation(post.references[0]?.citation || '');
    setFormFeatured(post.featured);
    setSelectedPostId(null);
    setActiveTab('editor');
  };

  // AI Draft Generator inside Smart Block Editor
  const handleGenerateAiTemplate = () => {
    const topic = formTitle.trim() || 'Refuting the Claim of Scientific Contradiction in Cosmic Expansion (51:47)';
    setFormTitle(topic);
    if (!formClaim.trim()) {
      setFormClaim(`Critique: "Critics claim that ${topic.toLowerCase()} contradicts modern empirical observation."`);
    }
    setFormExcerpt(
      `A systematic, evidence-based examination of "${topic}" combining classical Arabic philology, visual diagrams, video lecture previews, and peer-reviewed scientific literature.`
    );
    setFormBlocks([
      {
        id: `ai-blk-1-${Date.now()}`,
        type: 'text',
        value: `### 1. Statement of the Critic's Objection\nCritics frequently assert that "${topic}" presents a conflict between revelation and empirical science. However, this critique relies on a mistranslation of the classical Arabic text and a surface-level reading of the scientific literature.`
      },
      {
        id: `ai-blk-2-${Date.now() + 1}`,
        type: 'image',
        value: COSMOLOGY_DIAGRAM_SVG,
        caption: `Figure 1: Analytical diagram illustrating the physical & linguistic structure of ${topic}`
      },
      {
        id: `ai-blk-3-${Date.now() + 2}`,
        type: 'text',
        value: `### 2. Linguistic & Contextual Verification\nWhen examining the primary Arabic root in classical lexicons (*Lisan al-Arab*, *Al-Mufradat*), the terminology accommodates both the immediate perceptual horizon of 7th-century listeners and the deeper physical reality discovered in modern science.`
      },
      {
        id: `ai-blk-4-${Date.now() + 3}`,
        type: 'youtube',
        value: 'https://www.youtube.com/watch?v=cYq-LkSrKsQ',
        caption: `Video Lecture Breakdown: Empirical & Theological Analysis of ${topic}`
      },
      {
        id: `ai-blk-5-${Date.now() + 4}`,
        type: 'quote',
        value: 'We will show them Our signs in the horizons and within themselves until it becomes clear to them that it is the truth.',
        caption: 'Surah Fussilat (41:53)'
      },
      {
        id: `ai-blk-6-${Date.now() + 5}`,
        type: 'text',
        value: `### 3. Empirical Conclusion\nOnce the false dichotomy and linguistic equivocation are removed, the objection collapses completely.`
      }
    ]);
    if (!formTags.trim()) {
      setFormTags('Apologetics, Scientific Verification, Arabic Linguistics, Refutation');
    }
    if (!formTakeaways.trim()) {
      setFormTakeaways(
        'Clarifies the exact classical Arabic root meaning against modern mistranslations.\nDemonstrates harmony between scriptural phrasing and empirical findings.\nIncludes visual diagrams and video evidence interleaved between text sections.'
      );
    }
    if (!formRefLabel.trim()) {
      setFormRefLabel('Qur\'an 41:53');
      setFormRefCitation('We will show them Our signs in the horizons and within themselves until it becomes clear to them that it is the truth.');
    }
    triggerToast('AI generated smart interleaved Text + Image + YouTube blocks!', 'success');
  };

  // Save New or Edited Post from Smart Block Editor
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const combinedContent = serializeBlocksToContent(formBlocks);
    if (!formTitle.trim() || !combinedContent.trim()) {
      triggerToast('Please enter a title and at least one content block.', 'info');
      return;
    }

    const parsedTags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const parsedTakeaways = formTakeaways
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);

    const wordCount = combinedContent.trim().split(/\s+/).length;
    const readTimeMinutes = Math.max(3, Math.ceil(wordCount / 160));

    const newPost: BlogPost = {
      id: editingPostId || `post-${Date.now()}`,
      title: formTitle.trim(),
      slug: formTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      claimAddressed:
        formClaim.trim() ||
        'Critique: Addressing contemporary secular and anti-Islamic objections with primary evidence.',
      excerpt:
        formExcerpt.trim() ||
        formBlocks
          .filter((b) => b.type === 'text')
          .map((b) => b.value.replace(/[#>*_]/g, ''))
          .join(' ')
          .slice(0, 180)
          .trim() + '...',
      content: combinedContent,
      blocks: formBlocks,
      category: formTopicId ? (availableTopics.find(topic => topic.id === formTopicId)?.name || formCategory) : formCategory,
      topicId: formTopicId || undefined,
      difficulty: formDifficulty,
      tags: parsedTags.length > 0 ? parsedTags : ['Apologetics', 'Refutation'],
      author: currentUser?.name || 'Masud Rana',
      authorRole: 'B.Sc. in Engineering Physics & Researcher',
      readTimeMinutes,
      views: editingPostId ? posts.find((p) => p.id === editingPostId)?.views || 1 : 1,
      publishedAt: new Date().toISOString().slice(0, 10),
      featured: formFeatured,
      bookmarked: true,
      references:
        formRefLabel.trim() || formRefCitation.trim()
          ? [{ label: formRefLabel.trim() || 'Primary Source', citation: formRefCitation.trim() }]
          : [{ label: 'Qur\'an 41:53', citation: 'We will show them Our signs in the horizons and within themselves...' }],
      keyTakeaways:
        parsedTakeaways.length > 0
          ? parsedTakeaways
          : ['Evidence-based refutation grounded in primary texts and scientific analysis.']
    };

    if (editingPostId) {
      setPosts((prev) => prev.map((p) => (p.id === editingPostId ? newPost : p)));
      triggerToast('Article updated with smart media blocks!', 'success');
    } else {
      try {
        const categoryMap: Record<string, string> = {
          'Cosmology & Physics': 'COSMOLOGY_PHYSICS',
          'Biology & Embryology': 'BIOLOGY_EMBRYOLOGY',
          'Historical & Ethics': 'HISTORICAL_ETHICS',
          'Philosophy & Logic': 'PHILOSOPHY_LOGIC',
          'Linguistics & Tafsir': 'LINGUISTICS_TAFSIR',
        };
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newPost.title, slug: newPost.slug, claimAddressed: newPost.claimAddressed,
            excerpt: newPost.excerpt, content: newPost.content, blocks: newPost.blocks,
            topicId: formTopicId || undefined, category: categoryMap[formCategory] || 'PHILOSOPHY_LOGIC',
            difficulty: formDifficulty.toUpperCase(), tags: newPost.tags,
            keyTakeaways: newPost.keyTakeaways, references: newPost.references,
            readTimeMinutes: newPost.readTimeMinutes, featured: newPost.featured, published: true,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'পোস্ট সংরক্ষণ করা যায়নি।');
        newPost.id = data.post.id;
        newPost.slug = data.post.slug;
        setPosts((prev) => [newPost, ...prev]);
        triggerToast('পোস্ট ও ক্যাটাগরি ডাটাবেজে সংরক্ষণ করা হয়েছে।', 'success');
      } catch (error) {
        triggerToast(error instanceof Error ? error.message : 'পোস্ট সংরক্ষণ করা যায়নি।', 'info');
        return;
      }
    }

    setEditingPostId(null);
    setActiveTab('explore');
    setSelectedPostId(newPost.id);
  };

  // Export JSON backup
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(posts, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `al-burhan-apologetics-posts-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    triggerToast('Exported all blog posts as JSON archive!', 'success');
  };

  // AI Chatbot Response Engine (RAG over stored posts)
  const handleSendChat = (customPrompt?: string) => {
    const queryText = (customPrompt ?? chatInput).trim();
    if (!queryText) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const ranked = posts
      .map((post) => ({ post, ...scorePostAgainstQuery(post, queryText) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const topMatches = ranked.slice(0, 2);
    let reply = '';
    let matchedIds: string[] = [];

    if (topMatches.length > 0) {
      const primary = topMatches[0].post;
      matchedIds = topMatches.map((m) => m.post.id);

      reply = `**আল-বুরহান জ্ঞানভান্ডার** থেকে আপনার প্রশ্নের সঙ্গে সম্পর্কিত তথ্যগুলো নিচে সাজানো হলো:\n\n` +
        `১. **মূল আলোচনা (${primary.title}):**\n` +
        `${primary.excerpt}\n\n` +
        `২. **গুরুত্বপূর্ণ প্রমাণ ও মূল বিষয়:**\n` +
        primary.keyTakeaways.map((k) => `• ${k}`).join('\n') +
        `\n\n৩. **প্রাথমিক তথ্যসূত্র:**\n` +
        `*"${primary.references[0]?.citation || ''}"* — **${primary.references[0]?.label || ''}**`;

      if (topMatches[1]) {
        reply += `\n\n**সম্পর্কিত প্রবন্ধ:** আরও পড়ুন *"${topMatches[1].post.title}"* (${topMatches[1].post.category}) — বিষয়টির সঙ্গে সম্পর্কিত অতিরিক্ত আলোচনা।`;
      }
    } else {
      matchedIds = posts.slice(0, 2).map((p) => p.id);
      reply =
        `আমি পাঠাগারের **${posts.length}টি প্রবন্ধে** অনুসন্ধান করেছি। *${queryText}* বিষয়ে সরাসরি মিল পাওয়া যায়নি। তবে নিচের বিষয়গুলো বিবেচনা করতে পারেন:\n\n` +
        `• **ভাষাতাত্ত্বিক যাচাই:** কোনো অনুবাদ গ্রহণের আগে নির্ভরযোগ্য অভিধান ও মূল ভাষার ব্যবহার যাচাই করুন।\n` +
        `• **প্রাসঙ্গিকতা ও প্রমাণ যাচাই:** পর্যবেক্ষণভিত্তিক বর্ণনা এবং পদার্থবিজ্ঞানের ব্যাখ্যার পার্থক্য বিবেচনা করুন।\n` +
        `• **পরামর্শ:** প্রশাসক ড্যাশবোর্ড থেকে এ বিষয়ে নতুন প্রবন্ধ প্রকাশ করলে তা পাঠাগারে যুক্ত হবে.`
    }

    const botMsg: ChatMessage = {
      id: `bot-${Date.now() + 1}`,
      role: 'assistant',
      text: reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      matchedPostIds: matchedIds
    };

    setChatMessages((prev) => [...prev, userMsg, botMsg]);
    if (!customPrompt) setChatInput('');
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  // Copy code helper
  const handleCopyCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    triggerToast('কোড কপি করা হয়েছে!', 'success');
  };

  // Admin filtered list
  const homeTopics = useMemo(() => {
    if (directoryTopics.length > 0) return directoryTopics.map(topic => ({
      ...topic,
      count: posts.filter(post =>
        post.topicId === topic.id ||
        post.category === topic.name ||
        categoryLabel(post.category) === topic.name
      ).length
    }));
    return Array.from(new Set(posts.map(post => post.category))).map((name, index) => ({
      id: 'fallback-topic-' + index,
      name: categoryLabel(name),
      description: '',
      count: posts.filter(post => post.category === name).length
    }));
  }, [directoryTopics, posts]);

  const spotlightPost = posts.find(post => post.featured) || posts[0] || null;
  const latestHomePosts = [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 3);

  const adminFilteredPosts = useMemo(() => {
    const q = adminSearchFilter.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [posts, adminSearchFilter]);

  return (
    <div className={`app-shell min-h-screen flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200 theme-${theme}`}>
      {/* TOAST BANNER */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-950/95 border border-emerald-500/40 text-emerald-100 shadow-2xl backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* AUTHENTICATION MODAL (CREDENTIAL LOGIN + GOOGLE OAUTH + ADMIN LOGIN) */}
      {isAuthModalOpen && (
        <div className="admin-auth-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="admin-auth-panel relative w-full max-w-md rounded-3xl p-6 sm:p-8">
            <button
              onClick={() => {
                setIsAuthModalOpen(false);
                setAuthপাসওয়ার্ড('');
              }}
              className="admin-auth-close absolute right-4 top-4 rounded-xl p-2"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="admin-auth-mark flex h-12 w-12 items-center justify-center rounded-2xl">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="admin-auth-eyebrow text-[10px] font-bold uppercase tracking-[.2em]">AL-BURHAN • ADMIN PORTAL</p>
                <h3 className="mt-1 text-xl font-bold">নিরাপদ প্রশাসক লগইন</h3>
                <p className="admin-auth-subtitle mt-1 text-xs">Secure administrator access</p>
                <p className="text-xs text-slate-400">
                  আপনার লগইন তথ্য সার্ভারে নিরাপদভাবে যাচাই করা হয়।
                </p>
              </div>
            </div>

            <div className="admin-auth-note mb-5 rounded-xl px-3.5 py-3 text-xs leading-relaxed">
              শুধু authorized administrator account এই portal-এ access পাবে। আপনার credentials নিরাপদে server-side যাচাই করা হয়।
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleCredentialAuth} className="space-y-3.5">
              <div>
                <label className="admin-auth-label mb-1.5 block text-xs font-semibold">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="admin-auth-input w-full rounded-xl py-3 pl-10 pr-3.5 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="admin-auth-label mb-1.5 block text-xs font-semibold">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showপাসওয়ার্ড ? 'text' : 'password'}
                    required
                    value={authপাসওয়ার্ড}
                    onChange={(e) => setAuthপাসওয়ার্ড(e.target.value)}
                    placeholder="আপনার secure password"
                    className="admin-auth-input w-full rounded-xl py-3 pl-10 pr-10 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowপাসওয়ার্ড((p) => !p)}
                    className="admin-auth-eye absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showপাসওয়ার্ড ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthLoading || authStatus === 'loading'}
                className="admin-auth-submit w-full rounded-xl py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAuthLoading ? 'Verifying securely…' : 'Secure login'}
              </button>
            </form>
            <div className="admin-auth-footer mt-5 border-t pt-4 text-center text-xs">
              পাঠক অ্যাকাউন্ট আছে? <a href="/login" className="font-semibold hover:underline">Sign in</a> অথবা <a href="/register" className="font-semibold hover:underline">Create account</a>
            </div>
          </div>
        </div>
      )}

      {/* TOP NAVIGATION HEADER */}
      {/* Original Honors-project staggered mobile navigation, adapted for AL-BURHAN actions */}
      <header className="site-header sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
        <div className="honors-mobile-nav lg:hidden" data-open={isMobileMenuOpen ? 'true' : 'false'}>
          <div className="honors-mobile-nav__bar">
            <button type="button" className="honors-mobile-nav__brand" onClick={() => { setSelectedPostId(null); setActiveTab('explore'); setIsMobileMenuOpen(false); }}>
              <Image src="/al-burhan-logo.svg" alt="AL-BURHAN logo" width={48} height={48} unoptimized className="honors-mobile-nav__brand-icon h-11 w-11 rounded-lg object-cover" />
              <span><strong>AL-BURHAN</strong><small>গবেষণা পাঠাগার · Research Library</small></span>
            </button>
            <button type="button" className="honors-mobile-nav__toggle" onClick={() => setIsMobileMenuOpen(value => !value)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen} aria-controls="al-burhan-mobile-menu">
              <span className="honors-mobile-nav__toggle-label"><span className="honors-mobile-nav__toggle-words"><span>Menu</span><span>Close</span></span></span>
              <span className="honors-mobile-nav__toggle-icon" aria-hidden="true">
                <span className="honors-mobile-nav__hamburger"><i /><i /><i /></span>
              </span>
            </button>
          </div>
          <button type="button" aria-label="Close navigation menu" tabIndex={isMobileMenuOpen ? 0 : -1}
            className="honors-mobile-nav__backdrop" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="honors-mobile-nav__layers" aria-hidden="true"><span /><span /><span /></div>
          <nav id="al-burhan-mobile-menu" className="honors-mobile-nav__panel" aria-label="Mobile navigation"
            aria-hidden={!isMobileMenuOpen} inert={!isMobileMenuOpen}>
            <p className="honors-mobile-nav__eyebrow">Explore AL-BURHAN</p>
            <ul>
              <li style={{'--menu-index':0} as React.CSSProperties}><button type="button" onClick={() => { setSelectedPostId(null); setActiveTab('explore'); setIsMobileMenuOpen(false); }}><span className="honors-mobile-nav__number">01</span><span>Articles &amp; Research</span><Compass size={19}/></button></li>
              <li style={{'--menu-index':1} as React.CSSProperties}><button type="button" onClick={() => { setSelectedPostId(null); setActiveTab('admin'); setIsMobileMenuOpen(false); }}><span className="honors-mobile-nav__number">02</span><span>Admin Dashboard</span><LayoutDashboard size={19}/></button></li>
              <li style={{'--menu-index':2} as React.CSSProperties}><button type="button" onClick={() => { setIsMobileMenuOpen(false); window.location.assign('/admin/editor'); }}><span className="honors-mobile-nav__number">03</span><span>Write New Post</span><Plus size={19}/></button></li>
              <li style={{'--menu-index':3} as React.CSSProperties}><button type="button" onClick={() => { setSelectedPostId(null); setActiveTab('saved'); setIsMobileMenuOpen(false); }}><span className="honors-mobile-nav__number">04</span><span>Saved Articles</span><Bookmark size={19}/></button></li>
              <li style={{'--menu-index':4} as React.CSSProperties}><button type="button" onClick={() => { setIsMobileMenuOpen(false); window.location.assign('/about'); }}><span className="honors-mobile-nav__number">05</span><span>About Me</span><User size={19}/></button></li>
            </ul>
            <div className="honors-mobile-nav__footer">
              <p className="honors-mobile-nav__footer-label">Quick actions <span>· দ্রুত ব্যবহার</span></p>
              <div className="honors-mobile-nav__actions">
                <button type="button" onClick={() => setTheme(current => current === 'light' ? 'sepia' : current === 'sepia' ? 'dark' : current === 'dark' ? 'system' : 'light')}>
                  {theme === 'dark' ? <Sun size={16}/> : theme === 'sepia' ? <BookOpen size={16}/> : theme === 'system' ? <Database size={16}/> : <Moon size={16}/>}<span>Theme</span>
                </button>
                {currentUser ? <button type="button" onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}><LogOut size={16}/><span>Logout</span></button>
                  : <button type="button" onClick={() => { setIsMobileMenuOpen(false); setIsAuthModalOpen(true); }}><LogIn size={16}/><span>Login / Admin</span></button>}
                <button type="button" onClick={() => { setIsMobileMenuOpen(false); setIsChatOpen(value => !value); }}><Sparkles size={16}/><span>AI Assistant</span></button>
              </div>
              <p className="honors-mobile-nav__tagline">যুক্তি, জ্ঞান ও গবেষণার নির্ভরযোগ্য পাঠাগার</p>
            </div>
          </nav>
        </div>
        <div className="site-header-inner max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Desktop brand */}
          <div className="hidden lg:flex items-center gap-3 cursor-pointer group"
            onClick={() => {
              setSelectedPostId(null);
              setActiveTab('explore');
            }}
          >
            <Image src="/al-burhan-logo.svg" alt="AL-BURHAN logo" width={48} height={48} unoptimized className="h-11 w-11 rounded-xl border border-slate-700 bg-white object-cover" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg tracking-tight text-slate-100">
                  AL-BURHAN
                </span>
                <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                  গবেষণা পাঠাগার
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                বাংলা ভাষায় গবেষণা, বিশ্লেষণ, যুক্তি ও জ্ঞানচর্চার সংগ্রহশালা
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav aria-label="Main navigation" className="main-nav hidden lg:flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setSelectedPostId(null);
                setActiveTab('explore');
                setIsMobileMenuOpen(false);
              }}
              className={`mobile-menu-item flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'explore' && !selectedPostId
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span className="mobile-menu-item-label">Articles &amp; Research ({posts.length.toLocaleString('en-US')})</span>
            </button>

            <button
              onClick={() => {
                setSelectedPostId(null);
                setActiveTab('admin');
                setIsMobileMenuOpen(false);
              }}
              className={`mobile-menu-item flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'admin'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="mobile-menu-item-label">Admin Dashboard</span>
            </button>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                window.location.assign('/admin/editor');
              }}
              className={`mobile-menu-item flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'editor'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span className="mobile-menu-item-label">Write New Post</span>
            </button>

            <button
              onClick={() => {
                setSelectedPostId(null);
                setActiveTab('saved');
                setIsMobileMenuOpen(false);
              }}
              className={`mobile-menu-item flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'saved'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span className="mobile-menu-item-label">Saved Articles</span>
              <span className="mobile-menu-count text-xs px-1.5 py-0.2 rounded bg-slate-800 text-emerald-300">
                {posts.filter((p) => p.bookmarked).length}
              </span>
            </button>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                window.location.assign('/about');
              }}
              className={`mobile-menu-item flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'stack'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="mobile-menu-item-label">About Me</span>
            </button>
            <p className="mobile-menu-eyebrow">AL-BURHAN <span>/</span> Explore</p>
            <div className="mobile-menu-footer">
              <p className="mobile-menu-footer-label">Quick actions <span>· দ্রুত ব্যবহার</span></p>
              <div className="mobile-menu-footer-actions">
                <button type="button" className="mobile-menu-footer-action" onClick={() => setTheme((current) => current === 'light' ? 'sepia' : current === 'sepia' ? 'dark' : current === 'dark' ? 'system' : 'light')}>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : theme === 'sepia' ? <BookOpen className="w-4 h-4" /> : theme === 'system' ? <Database className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>Theme</span>
                </button>
                {currentUser ? (
                  <button type="button" className="mobile-menu-footer-action" onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}>
                    <LogOut className="w-4 h-4" /><span>Logout</span>
                  </button>
                ) : (
                  <button type="button" className="mobile-menu-footer-action" onClick={() => { setIsMobileMenuOpen(false); setIsAuthModalOpen(true); }}>
                    <LogIn className="w-4 h-4" /><span>Login / Admin</span>
                  </button>
                )}
                <button type="button" className="mobile-menu-footer-action" onClick={() => { setIsMobileMenuOpen(false); setIsChatOpen((prev) => !prev); }}>
                  <Sparkles className="w-4 h-4" /><span>AI Assistant</span>
                </button>
              </div>
            </div>
          </nav>

          {/* Desktop action controls; mobile actions live inside the staggered menu. */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((current) => current === 'light' ? 'sepia' : current === 'sepia' ? 'dark' : current === 'dark' ? 'system' : 'light')}
              aria-label="পড়ার থিম পরিবর্তন করুন"
              title="লাইট, সেপিয়া, ডার্ক ও সিস্টেম থিম পরিবর্তন করুন"
              className="theme-switch inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs sm:text-sm font-medium transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : theme === 'sepia' ? <BookOpen className="w-4 h-4" /> : theme === 'system' ? <Database className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden sm:inline">{theme === 'light' ? 'সেপিয়া' : theme === 'sepia' ? 'ডার্ক' : theme === 'dark' ? 'সিস্টেম' : 'লাইট'}</span>
            </button>
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-300">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-white leading-none flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        currentUser.role === 'ADMIN'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    via Secure Credentials
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="লগআউট করুন"
                  className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 text-xs sm:text-sm font-semibold transition-all"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>লগইন / প্রশাসক</span>
              </button>
            )}

            <button
              onClick={() => setIsChatOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs sm:text-sm font-medium transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span className="hidden sm:inline">এআই সহকারী</span>
            </button>
          </div>
        </div>

      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="site-main flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* VIEW 1: SINGLE ARTICLE READER (WITH INTERLEAVED TEXT, IMAGES & YOUTUBE VIDEO EMBEDS) */}
        {selectedPostId && activePost ? (
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <button
                onClick={() => setSelectedPostId(null)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-medium transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>পাঠাগারে ফিরুন</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsChatOpen(true);
                    handleSendChat(`Summarize the main arguments in "${activePost.title}"`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-medium transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>এই প্রবন্ধ নিয়ে প্রশ্ন করুন</span>
                </button>
                <button
                  onClick={() => handleToggleBookmark(activePost.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors ${
                    activePost.bookmarked
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{activePost.bookmarked ? 'সংরক্ষিত' : 'সংরক্ষণ'}</span>
                </button>
                {currentUser?.role === 'ADMIN' && (
                  <>
                    <button
                      onClick={() => handleStartEdit(activePost)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs sm:text-sm font-medium"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>সম্পাদনা</span>
                    </button>
                    <button
                      onClick={() => handleDeletePost(activePost.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <article className="reader-card bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 sm:p-10 shadow-2xl">
              {/* Category & Metadata */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {activePost.category}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                  {activePost.difficulty} Level
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
                  <Clock className="w-3.5 h-3.5" /> {activePost.readTimeMinutes} min read
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Eye className="w-3.5 h-3.5" /> {activePost.views.toLocaleString()} views
                </span>
              </div>

              {/* Title */}
              <h1 className="reader-title text-2xl sm:text-3xl font-bold text-white leading-tight mb-5">
                {activePost.title}
              </h1>

              {/* Critic's Claim Callout Box */}
              <div className="reader-claim mb-6 p-4 rounded-xl bg-rose-950/30 border border-rose-500/30">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-300 mb-1">
                  Allegation / Critique Addressed
                </div>
                <p className="text-sm text-rose-100/90 italic">{activePost.claimAddressed}</p>
              </div>

              {/* Executive Key Takeaways */}
              <div className="reader-takeaways mb-8 p-5 rounded-xl bg-emerald-950/25 border border-emerald-500/30">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300 mb-3">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Key Refutation Takeaways</span>
                </div>
                <ul className="space-y-2">
                  {activePost.keyTakeaways.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-200">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* SMART INTERLEAVED CONTENT (TEXT + IMAGES + YOUTUBE PREVIEWS) */}
              <RichPostContentRenderer post={activePost} />

              {/* Primary References & Citations */}
              <div className="mt-8 pt-6 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Primary Scriptural & Academic Citations
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activePost.references.map((ref, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                      <div className="text-xs font-bold text-amber-300 mb-1">{ref.label}</div>
                      <div className="text-xs text-slate-300 leading-relaxed">{ref.citation}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags & Author Footer */}
              <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {activePost.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedTag(tag);
                        setSelectedPostId(null);
                        setActiveTab('explore');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">{activePost.author}</div>
                  <div className="text-xs text-slate-400">
                    {activePost.authorRole} • Published {activePost.publishedAt}
                  </div>
                </div>
              </div>
            </article>
          </div>
        ) : activeTab === 'admin' ? (
          /* VIEW 2: ADMIN DASHBOARD (MANAGE, ADD, EDIT, DELETE POSTS & AUTH STATUS) */
          <div className="space-y-6">
            {currentUser?.role !== 'ADMIN' ? (
              <div className="max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Admin Access Required</h2>
                <p className="text-sm text-slate-400 mt-2">
                  Please sign in with an Administrator account (via Credentials or Google OAuth) to manage, add, edit, or delete apologetics blog posts.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setIsAuthModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg"
                  >
                    Open Admin Login
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Admin Header & KPI Cards */}
                <div className="bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                        <LayoutDashboard className="w-4 h-4" />
                        <span>প্রশাসক নিয়ন্ত্রণকেন্দ্র</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white">
                        প্রবন্ধ ও মিডিয়া পরিচালনা
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                        লগইন করেছেন <strong>{currentUser.name}</strong> ({currentUser.email}) • Full CRUD & Smart Block Privileges Active
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={handleStartNewPost}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-950/60"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Create New Smart Post</span>
                      </button>
                      <button
                        onClick={handleExportJson}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>Backup JSON</span>
                      </button>
                    </div>
                  </div>

                  {/* KPI Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <div className="text-xs text-slate-400">Total Published Posts</div>
                      <div className="text-2xl font-extrabold text-white mt-1">{posts.length}</div>
                      <div className="text-[11px] text-emerald-400 mt-1">Indexed in AI Search</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <div className="text-xs text-slate-400">Total Article পাঠসংখ্যা</div>
                      <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                        {posts.reduce((acc, p) => acc + p.views, 0).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">Across 5 categories</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <div className="text-xs text-slate-400">Featured Refutations</div>
                      <div className="text-2xl font-extrabold text-amber-400 mt-1">
                        {posts.filter((p) => p.featured).length}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">Highlighted on frontpage</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <div className="text-xs text-slate-400">Rich Media Posts</div>
                      <div className="text-2xl font-extrabold text-sky-400 mt-1">
                        {
                          posts.filter(
                            (p) =>
                              (p.blocks && p.blocks.some((b) => b.type === 'image' || b.type === 'youtube')) ||
                              p.content.includes('[[IMAGE:') ||
                              p.content.includes('[[YOUTUBE:')
                          ).length
                        }
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">With inline Image / YouTube</div>
                    </div>
                  </div>
                </div>

                {/* Admin Posts Management Table */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-bold text-white">
                      সংরক্ষিত সব প্রবন্ধ ({adminFilteredPosts.length})
                    </div>
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={adminSearchFilter}
                        onChange={(e) => setAdminSearchFilter(e.target.value)}
                        placeholder="Filter posts by title or tag..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40">
                          <th className="py-3 px-4">প্রবন্ধের শিরোনাম ও বিষয়</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">মিডিয়া</th>
                          <th className="py-3 px-4">Views</th>
                          <th className="py-3 px-4">Published</th>
                          <th className="py-3 px-4 text-right">Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 text-xs sm:text-sm">
                        {adminFilteredPosts.map((post) => {
                          const blks = parseContentToBlocks(post.content, post.blocks);
                          const imgCount = blks.filter((b) => b.type === 'image').length;
                          const ytCount = blks.filter((b) => b.type === 'youtube').length;
                          const txtCount = blks.filter((b) => b.type === 'text' || b.type === 'quote').length;

                          return (
                            <tr key={post.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-4 max-w-md">
                                <div
                                  onClick={() => handleOpenPost(post.id)}
                                  className="font-bold text-white hover:text-emerald-300 cursor-pointer line-clamp-1"
                                >
                                  {post.title}
                                </div>
                                <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                  {post.claimAddressed}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  {categoryLabel(post.category)}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                    {txtCount} Text
                                  </span>
                                  {imgCount > 0 && (
                                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                      <ImageIcon className="w-3 h-3" /> {imgCount}
                                    </span>
                                  )}
                                  {ytCount > 0 && (
                                    <span className="px-2 py-0.5 rounded bg-red-950/70 text-red-300 border border-red-500/30 flex items-center gap-1">
                                      <Youtube className="w-3 h-3" /> {ytCount}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-300 font-mono text-xs">
                                {post.views.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-xs">
                                {post.publishedAt}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenPost(post.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                                    title="View Post"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleStartEdit(post)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeletePost(post.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/30 text-rose-300 text-xs font-medium"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : activeTab === 'editor' ? (
          /* VIEW 3: SMART INTERLEAVED BLOCK EDITOR (TEXT + IMAGE BETWEEN TEXT + YOUTUBE VIDEO PREVIEW BETWEEN TEXT) */
          <div className="max-w-5xl mx-auto">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                    <Layers className="w-4 h-4" />
                    <span>Smart Interleaved Content Builder</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {editingPostId ? 'Edit Refutation Article & মিডিয়া ব্লক' : 'নতুন পোস্ট তৈরি করুন (Text + Images + YouTube Video Previews)'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Insert **Smart Text**, **Images (URL or Local Upload)**, and **YouTube Video Link Previews** in any order between paragraphs.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditorPreviewMode((p) => !p)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                      editorPreviewMode
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-950 text-slate-200 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>{editorPreviewMode ? 'Back to Block Editor' : 'Live Article Preview'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateAiTemplate}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-semibold transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>AI Auto-Structure Draft</span>
                  </button>
                </div>
              </div>

              {editorPreviewMode ? (
                /* LIVE FULL ARTICLE PREVIEW */
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-slate-950 border border-emerald-500/30">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                      Live Reader Preview (Interleaved Text, Images & YouTube Embeds)
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                      {formTitle || 'Untitled Refutation Article'}
                    </h1>
                    {formClaim && (
                      <div className="mb-6 p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-sm text-rose-100 italic">
                        {formClaim}
                      </div>
                    )}
                    <RichPostContentRenderer
                      post={{
                        id: 'preview',
                        title: formTitle || 'Preview',
                        slug: 'preview',
                        claimAddressed: formClaim,
                        excerpt: formExcerpt,
                        content: serializeBlocksToContent(formBlocks),
                        blocks: formBlocks,
                        category: formCategory,
                        difficulty: formDifficulty,
                        tags: [],
                        author: currentUser?.name || 'Masud Rana',
                        authorRole: 'Researcher',
                        readTimeMinutes: 7,
                        views: 1,
                        publishedAt: 'Today',
                        featured: formFeatured,
                        references: [],
                        keyTakeaways: []
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* SMART BLOCK EDITOR FORM */
                <form onSubmit={handleSavePost} className="space-y-6">
                  {/* Metadata Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        প্রবন্ধের শিরোনাম *
                      </label>
                      <input
                        type="text"
                        required
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g., Refuting the Claim of Contradiction in Cosmic Expansion (Surah Adh-Dhariyat 51:47)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">বিষয় / ক্যাটাগরি</label>
                        <button type="button" onClick={() => setShowQuickTopic(value => !value)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10">
                          <Plus className="h-3.5 w-3.5"/> নতুন ক্যাটাগরি
                        </button>
                      </div>
                      <select
                        value={formTopicId ? 'topic:' + formTopicId : formCategory}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.startsWith('topic:')) setFormTopicId(value.slice(6));
                          else { setFormTopicId(''); setFormCategory(value as BlogPost['category']); }
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <optgroup label="আগের ক্যাটাগরি">
                          <option value="Cosmology & Physics">মহাবিশ্ববিদ্যা ও পদার্থবিজ্ঞান</option>
                          <option value="Biology & Embryology">জীববিজ্ঞান ও ভ্রূণতত্ত্ব</option>
                          <option value="Historical & Ethics">ইতিহাস ও নৈতিকতা</option>
                          <option value="Philosophy & Logic">দর্শন ও যুক্তিবিদ্যা</option>
                          <option value="Linguistics & Tafsir">ভাষাতত্ত্ব ও তাফসির</option>
                        </optgroup>
                        {availableTopics.length > 0 && <optgroup label="আপনার তৈরি ক্যাটাগরি">
                          {availableTopics.map(topic => <option key={topic.id} value={'topic:' + topic.id}>{topic.name}</option>)}
                        </optgroup>}
                      </select>
                      {showQuickTopic && <div className="mt-3 space-y-2 rounded-xl border border-emerald-500/30 bg-slate-900 p-3">
                        <input autoFocus value={quickTopicName} onChange={e => setQuickTopicName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleQuickTopicCreate(); } }} maxLength={60} minLength={2} placeholder="নতুন ক্যাটাগরির নাম" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"/>
                        <input value={quickTopicDescription} onChange={e => setQuickTopicDescription(e.target.value)} maxLength={500} placeholder="সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"/>
                        <div className="flex gap-2">
                          <button disabled={creatingQuickTopic || quickTopicName.trim().length < 2} type="button" onClick={() => void handleQuickTopicCreate()} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{creatingQuickTopic ? 'তৈরি হচ্ছে…' : 'ক্যাটাগরি তৈরি করুন'}</button>
                          <button type="button" onClick={() => setShowQuickTopic(false)} className="rounded-lg border border-slate-700 px-3 py-2.5 text-sm text-slate-300">বাতিল</button>
                        </div>
                      </div>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-rose-300 mb-1.5">
                      আলোচ্য প্রশ্ন / আপত্তি
                    </label>
                    <input
                      type="text"
                      value={formClaim}
                      onChange={(e) => setFormClaim(e.target.value)}
                      placeholder='e.g., Critique: "Critics claim that..."'
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* SMART INTERLEAVED CONTENT BLOCKS STREAM */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        <span>
                          স্মার্ট কনটেন্ট ব্লক ({formBlocks.length} blocks — Add Text, Image, or YouTube Between Any Section)
                        </span>
                      </label>
                    </div>

                    <div className="space-y-4">
                      {formBlocks.map((block, idx) => {
                        const ytId = block.type === 'youtube' ? extractYouTubeId(block.value) : null;
                        return (
                          <div
                            key={block.id}
                            className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 space-y-3 shadow-md"
                          >
                            {/* Block Header Toolbar */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                {block.type === 'text' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                                    <Type className="w-3.5 h-3.5" /> Smart Text Block
                                  </span>
                                )}
                                {block.type === 'image' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-semibold">
                                    <ImageIcon className="w-3.5 h-3.5" /> Image Block (Between Text)
                                  </span>
                                )}
                                {block.type === 'youtube' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 text-xs font-semibold">
                                    <Youtube className="w-3.5 h-3.5" /> YouTube Video Preview Block
                                  </span>
                                )}
                                {block.type === 'quote' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                                    <BookOpen className="w-3.5 h-3.5" /> Scriptural / Scholarly Quote
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveBlock(idx, 'up')}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300"
                                  title="Move Block Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === formBlocks.length - 1}
                                  onClick={() => handleMoveBlock(idx, 'down')}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300"
                                  title="Move Block Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBlock(block.id)}
                                  className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 text-rose-300"
                                  title="Delete Block"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Block Body Input */}
                            {block.type === 'text' && (
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                                  <span>Formatting shortcuts:</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateBlock(
                                        block.id,
                                        'value',
                                        block.value + '\n\n### New Section Heading\n'
                                      )
                                    }
                                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800"
                                  >
                                    + H3 Heading
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateBlock(
                                        block.id,
                                        'value',
                                        block.value + '\n- **Key Point:** Explanation here'
                                      )
                                    }
                                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800"
                                  >
                                    + Bullet Point
                                  </button>
                                </div>
                                <textarea
                                  rows={5}
                                  value={block.value}
                                  onChange={(e) => handleUpdateBlock(block.id, 'value', e.target.value)}
                                  placeholder="Write smart text paragraph, markdown headings (###), or bullet points..."
                                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            )}

                            {block.type === 'image' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">
                                      Image URL or Data URI (or Upload Local Image Below)
                                    </label>
                                    <input
                                      type="text"
                                      value={block.value}
                                      onChange={(e) => handleUpdateBlock(block.id, 'value', e.target.value)}
                                      placeholder="https://example.com/diagram.png or data:image/..."
                                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                                    />
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-xs font-semibold cursor-pointer">
                                      <Upload className="w-3.5 h-3.5" />
                                      <span>Upload Image from Device</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleLocalImageUpload(block.id, e.target.files?.[0])}
                                        className="hidden"
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() => handleUpdateBlock(block.id, 'value', COSMOLOGY_DIAGRAM_SVG)}
                                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300"
                                    >
                                      Use Cosmology Diagram
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateBlock(block.id, 'value', ZAWJ_DIAGRAM_SVG)}
                                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300"
                                    >
                                      Use Zawj 36:36 Diagram
                                    </button>
                                  </div>

                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">
                                      Image Caption (Shown Underneath Image)
                                    </label>
                                    <input
                                      type="text"
                                      value={block.caption || ''}
                                      onChange={(e) => handleUpdateBlock(block.id, 'caption', e.target.value)}
                                      placeholder="Figure 1: Explanation of the visual evidence..."
                                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                                    />
                                  </div>
                                </div>

                                {/* Instant Image Preview Box */}
                                <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col items-center justify-center min-h-[160px]">
                                  {block.value ? (
                                    <>
                                      <img
                                        src={block.value}
                                        alt={block.caption || 'Preview'}
                                        className="max-h-44 rounded-lg object-contain"
                                      />
                                      <span className="text-[11px] text-slate-400 mt-2">
                                        {block.caption || 'Live Image Preview'}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-slate-500">No image URL provided</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {block.type === 'youtube' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">
                                      YouTube Video Link (watch?v=, youtu.be/, or shorts/)
                                    </label>
                                    <input
                                      type="text"
                                      value={block.value}
                                      onChange={(e) => handleUpdateBlock(block.id, 'value', e.target.value)}
                                      placeholder="https://www.youtube.com/watch?v=cYq-LkSrKsQ"
                                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-red-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">
                                      Video Preview Caption / Lecture Title
                                    </label>
                                    <input
                                      type="text"
                                      value={block.caption || ''}
                                      onChange={(e) => handleUpdateBlock(block.id, 'caption', e.target.value)}
                                      placeholder="Video Lecture Preview: Detailed Refutation & Breakdown"
                                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-red-500"
                                    />
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Detected Video ID:{' '}
                                    <span className="font-mono text-emerald-400">
                                      {ytId || 'Paste a valid YouTube link'}
                                    </span>
                                  </div>
                                </div>

                                {/* Instant YouTube Embed Preview */}
                                <div className="rounded-xl overflow-hidden bg-black border border-slate-800">
                                  {ytId ? (
                                    <div className="relative w-full pt-[56.25%]">
                                      <iframe
                                        src={`https://www.youtube.com/embed/${ytId}`}
                                        title={block.caption || 'YouTube preview'}
                                        className="absolute inset-0 w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                      />
                                    </div>
                                  ) : (
                                    <div className="p-8 text-center text-xs text-slate-500">
                                      Enter a valid YouTube link to see live player preview
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {block.type === 'quote' && (
                              <div className="space-y-2.5">
                                <textarea
                                  rows={2}
                                  value={block.value}
                                  onChange={(e) => handleUpdateBlock(block.id, 'value', e.target.value)}
                                  placeholder="Enter scriptural verse or scholarly quotation..."
                                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-amber-100 italic focus:outline-none focus:border-amber-500"
                                />
                                <input
                                  type="text"
                                  value={block.caption || ''}
                                  onChange={(e) => handleUpdateBlock(block.id, 'caption', e.target.value)}
                                  placeholder="Citation Source (e.g., Surah Yasin 36:36 / Physical Review Letters)"
                                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-amber-300 focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            )}

                            {/* Insert New Block Below Toolbar (Allows Interleaving Between Any Blocks) */}
                            <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center gap-2">
                              <span className="text-[11px] text-slate-500 font-medium">
                                + Insert Below This Block:
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddBlockAfter(idx, 'text')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-emerald-950/70 border border-slate-800 hover:border-emerald-500/40 text-xs text-emerald-300 transition-colors"
                              >
                                <Type className="w-3 h-3" /> + Smart Text
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddBlockAfter(idx, 'image')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-sky-950/70 border border-slate-800 hover:border-sky-500/40 text-xs text-sky-300 transition-colors"
                              >
                                <ImageIcon className="w-3 h-3" /> + Image Between Text
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddBlockAfter(idx, 'youtube')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-red-950/70 border border-slate-800 hover:border-red-500/40 text-xs text-red-300 transition-colors"
                              >
                                <Youtube className="w-3 h-3" /> + YouTube Video Preview
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddBlockAfter(idx, 'quote')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-950/70 border border-slate-800 hover:border-amber-500/40 text-xs text-amber-300 transition-colors"
                              >
                                <BookOpen className="w-3 h-3" /> + Quote Callout
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Additional Metadata: Difficulty, Tags, Excerpt, Takeaways & Citations */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Difficulty Level
                      </label>
                      <select
                        value={formDifficulty}
                        onChange={(e) => setFormDifficulty(e.target.value as BlogPost['difficulty'])}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Beginner">প্রাথমিক</option>
                        <option value="Intermediate">মধ্যবর্তী</option>
                        <option value="Advanced">উন্নত</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Search Tags (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={formTags}
                        onChange={(e) => setFormTags(e.target.value)}
                        placeholder="Cosmology, Surah Yasin, Quantum Physics, Refutation"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-1.5">
                        Key Takeaways (One per line)
                      </label>
                      <textarea
                        rows={3}
                        value={formTakeaways}
                        onChange={(e) => setFormTakeaways(e.target.value)}
                        placeholder="First key evidence point&#10;Second linguistic proof&#10;Third scientific takeaway"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300 mb-1">
                          Primary Reference Label
                        </label>
                        <input
                          type="text"
                          value={formRefLabel}
                          onChange={(e) => setFormRefLabel(e.target.value)}
                          placeholder="Qur'an 51:47 / Physical Review Letters"
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300 mb-1">
                          Reference Quote / Citation Text
                        </label>
                        <input
                          type="text"
                          value={formRefCitation}
                          onChange={(e) => setFormRefCitation(e.target.value)}
                          placeholder="And the heaven We constructed with strength, and indeed, We are [its] expander."
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formFeatured}
                        onChange={(e) => setFormFeatured(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Mark as Featured Research Post</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPostId(null);
                          setActiveTab('admin');
                        }}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/60"
                      >
                        <Check className="w-4 h-4" />
                        <span>{editingPostId ? 'Save Updated Blocks' : 'Publish Smart Post'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : activeTab === 'stack' ? (
          /* VIEW 4: NEXT.JS + TYPESCRIPT + POSTGRESQL + PRISMA + NEXTAUTH ARCHITECTURE CODE */
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    পূর্ণাঙ্গ প্রযুক্তিগত কাঠামো
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    Next.js 15 + TypeScript + PostgreSQL (`pgvector`) + Prisma + NextAuth (Google & Credentials)
                  </h2>
                  <p className="text-sm text-slate-300 mt-1 max-w-3xl">
                    Includes the updated `schema.prisma` (with `User`, `Role`, and JSON `blocks`), `NextAuth` Credentials + Google OAuth route, and hybrid AI search endpoints.
                  </p>
                </div>
                <button
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>সব প্রবন্ধ ডাউনলোড করুন (.json)</span>
                </button>
              </div>

              {/* File Selector Pills */}
              <div className="flex flex-wrap gap-2 mt-5">
                {Object.entries(CODE_FILES).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCodeKey(key)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                      selectedCodeKey === key
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileCode className="w-4 h-4" />
                    <span>{item.path}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Code Block */}
            {CODE_FILES[selectedCodeKey] && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span>{CODE_FILES[selectedCodeKey].title}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {CODE_FILES[selectedCodeKey].description}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyCode(CODE_FILES[selectedCodeKey].code)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>কোড কপি করুন</span>
                  </button>
                </div>
                <pre className="p-5 text-xs sm:text-sm font-mono text-emerald-100/90 overflow-x-auto leading-relaxed">
                  <code>{CODE_FILES[selectedCodeKey].code}</code>
                </pre>
              </div>
            )}
          </div>
        ) : (
          /* VIEW 5: EXPLORE / SAVED BLOG ARCHIVE WITH AI AUTO-SEARCH, FILTERS & PAGINATION */
          <div className="space-y-6">
            {/* HERO BANNER WITH AI AUTO-SEARCH */}
            <section className="home-search-panel relative rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/25 p-5 sm:p-7 shadow-2xl">
              <div className="max-w-3xl">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  জ্ঞান সংরক্ষণ, অনুসন্ধান ও বিশ্লেষণ{' '}
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                    তথ্যপ্রমাণভিত্তিক বিশ্লেষণ
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-slate-300 mt-2.5 leading-relaxed">
                  প্রবন্ধ, ছবি, চিত্র, ভিডিও ও তথ্যসূত্রসহ গবেষণার লেখা প্রকাশ করুন। এআই-সহায়তায় প্রয়োজনীয় বিষয় ও প্রবন্ধ দ্রুত খুঁজে নিন।
                </p>
              </div>

              {/* SMART AI AUTO-SEARCH BAR */}
              <div className="mt-6 relative">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-emerald-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onFocus={() => setShowAutoSearchDropdown(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowAutoSearchDropdown(true);
                      }}
                      placeholder='প্রবন্ধ, গবেষণার বিষয়, প্রশ্ন বা কোনো ধারণা লিখে খুঁজুন…'
                      className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-slate-950/95 border border-slate-700/80 focus:border-emerald-400 text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none shadow-inner"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setShowAutoSearchDropdown(false);
                        }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* AI Semantic Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => setAiSemanticMode((prev) => !prev)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                      aiSemanticMode
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                    title="Expands queries with apologetics, physics, and Qur'anic concept synonyms"
                  >
                    <Sparkles className={`w-4 h-4 ${aiSemanticMode ? 'text-amber-300' : 'text-slate-500'}`} />
                    <span>স্মার্ট এআই অনুসন্ধান: {aiSemanticMode ? 'ON' : 'OFF'}</span>
                  </button>

                  {/* Ask AI Direct Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsChatOpen(true);
                      if (searchQuery.trim()) {
                        handleSendChat(searchQuery);
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold transition-all shrink-0 shadow-lg shadow-amber-950/40"
                  >
                    <Bot className="w-4 h-4" />
                    <span>এআই সহকারীকে জিজ্ঞাসা করুন</span>
                  </button>
                </div>

                {/* INSTANT AI AUTO-SEARCH DROPDOWN OVERLAY */}
                {showAutoSearchDropdown && searchQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl z-20 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        দ্রুত এআই অনুসন্ধানের ফলাফল ({autoSearchSuggestions.length})
                      </span>
                      <button
                        onClick={() => setShowAutoSearchDropdown(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        Close
                      </button>
                    </div>

                    {autoSearchSuggestions.length > 0 ? (
                      <div className="divide-y divide-slate-800/70 max-h-80 overflow-y-auto">
                        {autoSearchSuggestions.map(({ post, score, matchedTerms }) => (
                          <div
                            key={post.id}
                            onClick={() => handleOpenPost(post.id)}
                            className="p-3.5 hover:bg-slate-800/70 cursor-pointer transition-colors flex items-start justify-between gap-4"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                                  {post.category}
                                </span>
                                <span className="text-sm font-bold text-white">{post.title}</span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                {post.claimAddressed}
                              </p>
                              {matchedTerms.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <span className="text-[11px] text-slate-500">মিলে যাওয়া ধারণা:</span>
                                  {matchedTerms.map((t) => (
                                    <span
                                      key={t}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-mono text-emerald-400 shrink-0 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-500/30">
                              Score {score}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-400">
                        সরাসরি কোনো প্রবন্ধ মেলেনি। <strong>"এআই সহকারী"</strong> — নতুন করে অন্য শব্দ দিয়ে খুঁজে দেখুন।
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Concept Chips */}
                <div className="flex flex-wrap items-center gap-2 mt-3.5 text-xs">
                  <span className="text-slate-400 font-medium">দ্রুত অনুসন্ধান:</span>
                  {[
                    'Kalam & Quantum Vacuum',
                    'Surah Yasin 36:36 Zawj',
                    'Solar Orbit 21:33',
                    'Mountain Roots 78:7',
                    'Backbone & Ribs 86:7',
                    'Abolition of Slavery',
                    'Fine-Tuning & Red Queen'
                  ].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => {
                        setSearchQuery(chip);
                        setShowAutoSearchDropdown(false);
                      }}
                      className="px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-emerald-950 border border-slate-700/80 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-200 transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* LIBRARY DIRECTORY — quick access, inspired by Bangla knowledge portals */}
            <section className="library-directory space-y-4">
              <div className="library-section-heading flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="section-eyebrow">আল-বুরহান গবেষণা পাঠাগার</p>
                  <h2 className="section-title">শুরু করুন এখান থেকে</h2>
                  <p className="section-description">বিষয়, প্রবন্ধ ও গবেষণার উপকরণ এক জায়গায় খুঁজে নিন।</p>
                </div>
                <span className="library-total">{posts.length.toLocaleString('bn-BD')}টি প্রবন্ধ</span>
              </div>
              <div className="library-directory-grid">
                <button type="button" className="directory-card directory-card-primary" onClick={() => { setSelectedCategory('ALL'); setActiveTab('explore'); setCurrentPage(1); }}>
                  <span className="directory-icon"><BookOpen className="h-5 w-5"/></span>
                  <span className="directory-copy"><strong>সব প্রবন্ধ</strong><small>গবেষণা ও বিশ্লেষণের সম্পূর্ণ সংগ্রহ</small></span>
                  <span className="directory-count">{posts.length.toLocaleString('bn-BD')}</span>
                </button>
                {homeTopics.slice(0, 7).map((topic, index) => (
                  <button type="button" key={topic.id} className="directory-card" onClick={() => { setSelectedCategory(topic.name); setActiveTab('explore'); setCurrentPage(1); }}>
                    <span className="directory-icon">{index % 3 === 0 ? <Compass className="h-5 w-5"/> : index % 3 === 1 ? <FileText className="h-5 w-5"/> : <BookOpen className="h-5 w-5"/>}</span>
                    <span className="directory-copy"><strong>{topic.name}</strong><small>{topic.description || 'এই বিষয়ের প্রবন্ধ ও গবেষণা দেখুন'}</small></span>
                    <span className="directory-count">{topic.count.toLocaleString('bn-BD')}</span>
                  </button>
                ))}
                <button type="button" className="directory-card" onClick={() => setIsChatOpen(true)}>
                  <span className="directory-icon directory-icon-ai"><Sparkles className="h-5 w-5"/></span>
                  <span className="directory-copy"><strong>এআই গবেষণা সহকারী</strong><small>প্রশ্ন করুন, সম্পর্কিত প্রবন্ধ খুঁজুন</small></span>
                  <span className="directory-arrow">খুলুন →</span>
                </button>
              </div>
            </section>

            {spotlightPost && (
              <section className="spotlight-section">
                <div className="library-section-heading flex items-end justify-between gap-3">
                  <div>
                    <p className="section-eyebrow">সম্পাদকীয় নির্বাচন</p>
                    <h2 className="section-title">বিশেষভাবে নির্বাচিত</h2>
                  </div>
                  <button type="button" className="section-link" onClick={() => { setSelectedPostId(null); setActiveTab('explore'); setSelectedCategory('ALL'); }}>সব প্রবন্ধ দেখুন <span>→</span></button>
                </div>
                <button type="button" onClick={() => handleOpenPost(spotlightPost.id)} className="spotlight-card text-left">
                  <span className="spotlight-meta"><span>নির্বাচিত প্রবন্ধ</span><span>{spotlightPost.readTimeMinutes.toLocaleString('bn-BD')} মিনিটের পাঠ</span></span>
                  <strong>{spotlightPost.title}</strong>
                  <span className="spotlight-excerpt">{spotlightPost.excerpt}</span>
                  <span className="spotlight-footer"><span>{categoryLabel(spotlightPost.category)}</span><span>প্রবন্ধটি পড়ুন →</span></span>
                </button>
              </section>
            )}

            <section className="latest-mini-section">
              <div className="library-section-heading flex items-end justify-between gap-3">
                <div>
                  <p className="section-eyebrow">পাঠাগারে নতুন সংযোজন</p>
                  <h2 className="section-title">সর্বশেষ প্রবন্ধ</h2>
                </div>
                <span className="library-total">{latestHomePosts.length.toLocaleString('bn-BD')}টি সাম্প্রতিক</span>
              </div>
              <div className="latest-mini-list">
                {latestHomePosts.map(post => (
                  <button type="button" key={post.id} className="latest-mini-item" onClick={() => handleOpenPost(post.id)}>
                    <span className="latest-mini-date">{post.publishedAt}</span>
                    <span className="latest-mini-content"><strong>{post.title}</strong><small>{post.excerpt}</small></span>
                    <span className="latest-mini-arrow">→</span>
                  </button>
                ))}
              </div>
            </section>

            {/* FILTER BAR, SORTING & PAGE SIZE CONTROLS */}
            <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5 text-emerald-400" /> বিষয়:
                </span>
                {['ALL', ...Array.from(new Set(posts.map((post) => post.category)))].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {cat === 'ALL' ? 'সব বিষয়' : categoryLabel(cat)}
                  </button>
                ))}
              </div>

              {/* Secondary Filters: Difficulty, Tag, Sort & Page Size */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">স্তর:</span>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">সব স্তর</option>
                      <option value="Beginner">প্রাথমিক</option>
                      <option value="Intermediate">মধ্যবর্তী</option>
                      <option value="Advanced">উন্নত</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">ট্যাগ:</span>
                    <select
                      value={selectedTag}
                      onChange={(e) => setSelectedTag(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">সব ট্যাগ ({allTags.length})</option>
                      {allTags.map((tag) => (
                        <option key={tag} value={tag}>
                          #{tag}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(searchQuery ||
                    selectedCategory !== 'ALL' ||
                    selectedDifficulty !== 'ALL' ||
                    selectedTag !== 'ALL') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('ALL');
                        setSelectedDifficulty('ALL');
                        setSelectedTag('ALL');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs hover:bg-rose-900/50"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>ফিল্টার মুছুন</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-400">সাজান:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="relevance">প্রাসঙ্গিকতা</option>
                      <option value="newest">নতুন প্রকাশিত</option>
                      <option value="popular">সর্বাধিক পঠিত</option>
                      <option value="readTime">কম সময়ে পড়ুন</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">প্রতি পৃষ্ঠায়:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value={2}>২টি পোস্ট</option>
                      <option value={4}>৪টি পোস্ট</option>
                      <option value={6}>৬টি পোস্ট</option>
                      <option value={8}>৮টি পোস্ট</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* RESULTS SUMMARY BAR */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
              <div>
                দেখানো হচ্ছে{' '}
                <span className="font-semibold text-white">
                  {scoredAndFilteredPosts.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–
                  {Math.min(safePage * pageSize, scoredAndFilteredPosts.length)}
                </span>{' '}
                / <span className="font-semibold text-emerald-300">{scoredAndFilteredPosts.length}</span> matching refutation articles
                {activeTab === 'saved' && ' (Saved Library)'}
              </div>
              <div>
                Page <span className="font-semibold text-white">{safePage}</span> of{' '}
                <span className="font-semibold text-white">{totalPages}</span>
              </div>
            </div>

            {/* BLOG POST CARDS GRID */}
            {paginatedItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {paginatedItems.map(({ post, score, matchedTerms }) => {
                  const blks = parseContentToBlocks(post.content, post.blocks);
                  const hasImage = blks.some((b) => b.type === 'image');
                  const hasYoutube = blks.some((b) => b.type === 'youtube');

                  return (
                    <article
                      key={post.id}
                      onClick={() => handleOpenPost(post.id)}
                      className="post-card group bg-slate-900/85 hover:bg-slate-900 border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-lg hover:shadow-emerald-950/30"
                    >
                      <div>
                        {/* Top Meta Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              {post.category}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-800 text-slate-300">
                              {difficultyLabel(post.difficulty)}
                            </span>
                            {hasImage && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" /> Diagram
                              </span>
                            )}
                            {hasYoutube && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1">
                                <Youtube className="w-3 h-3" /> Video
                              </span>
                            )}
                            {searchQuery.trim() && (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                Score: {score}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={(e) => handleToggleBookmark(post.id, e)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              post.bookmarked
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                            title="Save to library"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Title */}
                        <h2 className="post-card-title text-lg sm:text-xl font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug mb-2.5">
                          {!post.id.startsWith('post-') ? (
                            <a href={'/articles/' + encodeURIComponent(post.id)} onClick={(event) => event.stopPropagation()} className="hover:underline focus-visible:underline">{post.title}</a>
                          ) : post.title}
                        </h2>

                        {/* Critic Claim Box */}
                        <div className="post-claim p-3 rounded-xl bg-rose-950/25 border border-rose-500/25 mb-3">
                          <p className="text-xs text-rose-200/90 line-clamp-2 italic">
                            {post.claimAddressed}
                          </p>
                        </div>

                        {/* Excerpt */}
                        <p className="post-excerpt text-sm text-slate-300 line-clamp-3 leading-relaxed mb-4">
                          {post.excerpt}
                        </p>

                        {/* Matched AI Concept Terms */}
                        {matchedTerms.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-3">
                            <span className="text-[11px] text-emerald-400 font-medium">AI Matched:</span>
                            {matchedTerms.map((term) => (
                              <span
                                key={term}
                                className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {post.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTag(tag);
                              }}
                              className="post-tag text-[11px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/40"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {/* Card Footer */}
                        <div className="pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-200 font-medium">{post.author}</span>
                            <span>• {post.publishedAt}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {post.readTimeMinutes}m
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" /> {post.views}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* Empty State */
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center">
                <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">কোনো প্রবন্ধ পাওয়া যায়নি</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                  ফিল্টার পরিবর্তন করুন, স্মার্ট সার্চ ব্যবহার করুন অথবা নতুন পোস্ট লিখুন।
                </p>
                <div className="flex items-center justify-center gap-3 mt-5">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('ALL');
                      setSelectedDifficulty('ALL');
                      setSelectedTag('ALL');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm text-white font-medium"
                  >
                    Reset All Filters
                  </button>
                  <button
                    onClick={handleStartNewPost}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs sm:text-sm text-white font-semibold"
                  >
                    + নতুন পোস্ট তৈরি করুন
                  </button>
                </div>
              </div>
            )}

            {/* NUMBERED PAGINATION BAR */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-3.5">
                <button
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none border border-slate-800 text-xs sm:text-sm font-medium text-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-9 h-9 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                        safePage === pageNum
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none border border-slate-800 text-xs sm:text-sm font-medium text-slate-200"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* DRAGGABLE LOTTIE AI LAUNCHER */}
      {!isChatOpen && (
        <div
          className="alburhan-ai-float-wrap"
          style={{
            ...(aiLauncherPosition
              ? { left: aiLauncherPosition.x, top: aiLauncherPosition.y }
              : { right: 20, bottom: 18 }),
            transform: `translate3d(0, -${aiScrollShift}px, 0)`,
          }}
        >
          <button
            ref={undefined}
            type="button"
            className="alburhan-ai-float-button"
            aria-label="Open Al-Burhan AI assistant. Drag to move."
            title="AI Assistant — drag to move, click to chat"
            onPointerDown={(event) => {
              if (event.pointerType === 'mouse' && event.button !== 0) return;
              const rect = event.currentTarget.getBoundingClientRect();
              aiLauncherDragRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                originX: rect.left,
                originY: rect.top,
                x: rect.left,
                y: rect.top,
                moved: false,
              };
              setAiLauncherPosition({ x: rect.left, y: rect.top });
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = aiLauncherDragRef.current;
              if (drag.pointerId !== event.pointerId) return;
              const deltaX = event.clientX - drag.startX;
              const deltaY = event.clientY - drag.startY;
              if (!drag.moved && Math.hypot(deltaX, deltaY) > 4) drag.moved = true;
              if (!drag.moved) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const next = {
                x: Math.max(8, Math.min(drag.originX + deltaX, window.innerWidth - rect.width - 8)),
                y: Math.max(8, Math.min(drag.originY + deltaY, window.innerHeight - rect.height - 8)),
              };
              drag.x = next.x;
              drag.y = next.y;
              setAiLauncherPosition(next);
            }}
            onPointerUp={(event) => {
              const drag = aiLauncherDragRef.current;
              if (drag.pointerId !== event.pointerId) return;
              drag.pointerId = null;
              if (drag.moved) {
                try {
                  window.localStorage.setItem('al-burhan-ai-launcher-position', JSON.stringify({ x: drag.x, y: drag.y }));
                } catch {
                  // The launcher remains draggable even when storage is unavailable.
                }
              }
            }}
            onPointerCancel={() => {
              aiLauncherDragRef.current.pointerId = null;
              aiLauncherDragRef.current.moved = false;
            }}
            onClick={() => {
              if (aiLauncherDragRef.current.moved) {
                aiLauncherDragRef.current.moved = false;
                return;
              }
              setIsMobileMenuOpen(false);
              setIsChatOpen(true);
            }}
          >
            <AiLottieAnimation className="alburhan-ai-lottie" />
            <span className="alburhan-ai-float-halo" aria-hidden="true" />
          </button>
          <span className="alburhan-ai-float-label" aria-hidden="true">Ask Al-Burhan AI</span>
        </div>
      )}

      {/* AL-BURHAN AI CHAT DRAWER */}
      {isChatOpen && (
        <div
          className="alburhan-ai-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsChatOpen(false);
          }}
        >
          <section className="alburhan-ai-drawer" role="dialog" aria-modal="true" aria-label="Al-Burhan AI research assistant">
            <header className="alburhan-ai-header">
              <div className="alburhan-ai-brand">
                <div className="alburhan-ai-brand-icon"><Bot size={21} /></div>
                <div className="alburhan-ai-brand-copy">
                  <h3>আল-বুরহান গবেষণা সহকারী <span className="alburhan-ai-online-dot" /></h3>
                  <p>Research assistant <span>·</span> {posts.length} library articles</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsChatOpen(false)} className="alburhan-ai-close" aria-label="Close AI assistant">
                <X size={19} />
              </button>
            </header>

            <div className="alburhan-ai-suggestions" aria-label="Suggested questions">
              <span className="alburhan-ai-suggestions-label">Try asking</span>
              {[
                'Quantum vacuum & Kalam',
                'Surah Yasin 36:36 pairs',
                'Backbone & ribs 86:7',
                'Solar orbit & 18:86',
                'Slavery abolition'
              ].map((prompt) => (
                <button key={prompt} type="button" onClick={() => handleSendChat(prompt)}>{prompt}</button>
              ))}
            </div>

            <div className="alburhan-ai-messages" aria-live="polite">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`alburhan-ai-message ${msg.role === 'user' ? 'is-user' : 'is-assistant'}`}>
                  <div className="alburhan-ai-message-meta">
                    {msg.role === 'assistant' ? <Sparkles size={13} /> : <User size={13} />}
                    <span>{msg.role === 'assistant' ? 'AL-BURHAN AI' : 'YOU'} <i>·</i> {msg.timestamp}</span>
                  </div>
                  <div className={`alburhan-ai-bubble ${msg.role === 'user' ? 'alburhan-ai-bubble-user' : 'alburhan-ai-bubble-assistant'}`}>
                    <div className="alburhan-ai-message-text">{msg.text}</div>
                    {msg.matchedPostIds && msg.matchedPostIds.length > 0 && (
                      <div className="alburhan-ai-article-list">
                        <div className="alburhan-ai-article-heading">Matched library articles</div>
                        {msg.matchedPostIds.map((pid) => {
                          const found = posts.find((post) => post.id === pid);
                          if (!found) return null;
                          return (
                            <button
                              key={pid}
                              type="button"
                              onClick={() => {
                                handleOpenPost(found.id);
                                setIsChatOpen(false);
                              }}
                              className="alburhan-ai-article-link"
                            >
                              <span>{found.title}</span>
                              <ExternalLink size={14} />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSendChat();
              }}
              className="alburhan-ai-composer"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Ask about a verse, research topic, or scientific question..."
                aria-label="Ask Al-Burhan AI"
              />
              <button type="submit" aria-label="Send message" disabled={!chatInput.trim()}>
                <Send size={17} />
              </button>
              <p>Answers are matched against the AL-BURHAN research library.</p>
            </form>
          </section>
        </div>
      )}

      {/* FOOTER */}
      <footer className="site-footer border-t border-slate-900 bg-slate-950 py-5 px-4 sm:px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-bold text-slate-300">আল-বুরহান গবেষণা পাঠাগার</span> — বাংলা ভাষায় জ্ঞানচর্চা, বিশ্লেষণ ও গবেষণা
          </div>
          <div className="flex items-center gap-4">
            <span>প্রতিষ্ঠাতা ও সম্পাদক: Masud Rana</span>
            <span>•</span>
            <span>প্রবন্ধ, ছবি, ভিডিও ও গবেষণা উপকরণ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}