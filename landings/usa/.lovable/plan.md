

# Appex Landing Page — Implementation Plan

## Overview
A premium, dark-themed landing page for Appex.me — an AI automation skills platform. Mobile-first, fully responsive, built with React + Tailwind CSS only (no UI libraries). Inspired by the competitor Jobescape but with a darker, more premium aesthetic.

## Font Setup
- Import **Playfair Display** (serif, italic) from Google Fonts for display headings
- Use `system-ui, Inter` for body text

## Components to Build

### 1. Navigation (Fixed)
- Dark fixed navbar with logo ("App" white + "ex" green), center nav links, login + green CTA button
- Mobile: hamburger icon opens a slide-out sidebar with all links

### 2. Hero Section
- Two-column layout: left text (badge pill, headline with italic green accent, subline, CTA, trust row) + right floating quiz card with CSS float animation
- Single column on mobile, quiz card hidden

### 3. Role Ticker
- Infinite CSS marquee strip with AI role titles separated by green diamonds
- Pauses on hover

### 4. Stats Section
- Cream background, 3-column grid showing "100+", "$0", "15 min" with descriptions

### 5. Intro Video Section
- Dark section with centered video placeholder, play button overlay, autoplay-on-scroll (muted)
- Trustpilot-style review row beneath

### 6. What You'll Build (Tabbed Projects)
- 4-tab switcher (Booking Bot, Inventory Agent, Feedback Agent, Analytics Bot)
- Each tab shows a two-column card with project details, income badge, bullet points, and screenshot placeholder

### 7. How Appex Works
- Sticky left title column + 3 scrolling step cards on the right
- Each card has large faded step number, tag pill, description, and visual placeholder

### 8. Who It's For
- Cream background, 5 persona cards (3+2 grid) with photo placeholders, quotes, outcome pills

### 9. Certificate Section
- Two columns: left certificate mockup card, right description with curriculum list and CTA

### 10. Text Reviews
- White background, 3 review cards with avatars, stars, and testimonial text

### 11. Footer
- Standard dark footer with links and branding

## Key Interactions
- Smooth scroll anchors for nav links
- Tab switching for projects section
- Marquee animation with hover pause
- Floating animation on hero quiz card
- Video autoplay on scroll via Intersection Observer
- Mobile hamburger sidebar toggle

## File Structure
- `src/pages/Index.tsx` — main landing page composing all sections
- `src/components/landing/` — individual section components (Navbar, Hero, RoleTicker, Stats, VideoSection, Projects, HowItWorks, WhoItsFor, Certificate, Reviews, Footer)

