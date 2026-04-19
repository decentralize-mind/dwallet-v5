# 📐 Live Wallet Feed - Visual Layout Guide

## Desktop Layout (>1024px)

```
┌────────────────────────────────────────────────────────────────────┐
│                         LANDING PAGE HERO                          │
│                                                                    │
│  ┌────────────────────────────┐  ┌──────────────────────────────┐ │
│  │                            │  │  ● Live Wallet Creation      │ │
│  │  🔐 Non-Custodial & Secure │  │  12,847 wallets created      │ │
│  │                            │  │  ─────────────────────────   │ │
│  │  The Future of DeFi        │  │                              │ │
│  │  Starts Here               │  │  ┌──────────┬──────────┐     │ │
│  │                            │  │  │ ◈ Alice  │ ◈ Bob    │     │ │
│  │  A non-custodial Web3...   │  │  │ 0x742d.. │ 0x53d2.. │     │ │
│  │                            │  │  │ 23s ago  │ 45s ago  │     │ │
│  │  [Create Wallet →]         │  │  ├──────────┼──────────┤     │ │
│  │  [Import Wallet]           │  │  │ ◈ Charlie│ ◈ Diana  │     │ │
│  │                            │  │  │ 0x9522.. │ 0x1234.. │     │ │
│  │  ✓ Free  ✓ Open Source     │  │  │ 1m ago   │ 2m ago   │     │ │
│  │  ✓ Audited                 │  │  ├──────────┼──────────┤     │ │
│  │                            │  │  │ ◈ Eve    │ ◈ Frank  │     │ │
│  │                            │  │  │ 0xabcd.. │ 0x9876.. │     │ │
│  │                            │  │  │ 3m ago   │ 5m ago   │     │ │
│  │                            │  │  └──────────┴──────────┘     │ │
│  │                            │  │                              │ │
│  │                            │  │  ↑ Growing +42 today         │ │
│  └────────────────────────────┘  └──────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Tablet Layout (768px - 1024px)

```
┌────────────────────────────────────────────────┐
│              LANDING PAGE HERO                 │
│                                                │
│     ┌──────────────────────────────┐           │
│     │  🔐 Non-Custodial & Secure   │           │
│     │                              │           │
│     │  The Future of DeFi          │           │
│     │  Starts Here                 │           │
│     │                              │           │
│     │  A non-custodial Web3...     │           │
│     │                              │           │
│     │  [Create Wallet →]           │           │
│     │  [Import Wallet]             │           │
│     │                              │           │
│     │  ✓ Free  ✓ Open Source       │           │
│     └──────────────────────────────┘           │
│                                                │
│     ┌──────────────────────────────┐           │
│     │  ● Live Wallet Creation      │           │
│     │  12,847 wallets created      │           │
│     │  ─────────────────────────   │           │
│     │                              │           │
│     │  ┌──────────┬──────────┐     │           │
│     │  │ ◈ Alice  │ ◈ Bob    │     │           │
│     │  │ 0x742d.. │ 0x53d2.. │     │           │
│     │  └──────────┴──────────┘     │           │
│     │  ┌──────────┬──────────┐     │           │
│     │  │ ◈ Charlie│ ◈ Diana  │     │           │
│     │  └──────────┴──────────┘     │           │
│     │  ┌──────────┬──────────┐     │           │
│     │  │ ◈ Eve    │ ◈ Frank  │     │           │
│     │  └──────────┴──────────┘     │           │
│     │                              │           │
│     │  ↑ Growing +42 today         │           │
│     └──────────────────────────────┘           │
│                                                │
└────────────────────────────────────────────────┘
```

## Mobile Layout (<768px)

```
┌──────────────────────────┐
│    LANDING PAGE HERO     │
│                          │
│  🔐 Non-Custodial        │
│                          │
│  The Future of DeFi      │
│  Starts Here             │
│                          │
│  [Create Wallet →]       │
│  [Import Wallet]         │
│                          │
│  ✓ Free  ✓ Open Source   │
│                          │
├──────────────────────────┤
│  ● Live Wallet Creation  │
│  12,847 wallets created  │
│  ──────────────────────  │
│                          │
│  ┌────────────────────┐  │
│  │ ◈ Alice            │  │
│  │ 0x742d...5eE2B     │  │
│  │              23s   │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ ◈ Bob              │  │
│  │ 0x53d2...7c5e1D    │  │
│  │              45s   │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ ◈ Charlie          │  │
│  │ 0x9522...4BAfe5    │  │
│  │              1m    │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ ◈ Diana            │  │
│  │ 0x1234...5678      │  │
│  │              2m    │  │
│  └────────────────────┘  │
│                          │
│  ↑ Growing +42 today     │
└──────────────────────────┘
```

## Wallet Card Anatomy

```
┌─────────────────────────┐
│  ┌─────┐                │
│  │  ◈  │  NEW (badge)   │  ← Icon with optional badge
│  └─────┘                │
│                         │
│  Alice                  │  ← Wallet name (bold)
│  0x742d...5eE2B         │  ← Truncated address
│                         │
│                  23s ago│  ← Time (right-aligned)
└─────────────────────────┘
```

## Color Palette

### Background Colors
```
Feed Container:    rgba(99, 102, 241, 0.08) gradient
Card Background:   rgba(255, 255, 255, 0.03)
New Wallet Card:   rgba(99, 102, 241, 0.15)
Hover State:       rgba(99, 102, 241, 0.1)
Growth Footer:     rgba(16, 185, 129, 0.1)
```

### Border Colors
```
Feed Border:       rgba(99, 102, 241, 0.2)
Card Border:       rgba(255, 255, 255, 0.08)
New Wallet Border: rgba(99, 102, 241, 0.4)
Hover Border:      rgba(99, 102, 241, 0.3)
Growth Border:     rgba(16, 185, 129, 0.2)
```

### Text Colors
```
Title:             #ffffff (white)
Counter Number:    gradient (#6366f1 → #a78bfa)
Counter Label:     #9ca3af (gray)
Wallet Name:       #ffffff (white)
Wallet Address:    #9ca3af (gray)
Time:              #6b7280 (dark gray)
Live Indicator:    #10b981 (green)
Growth Text:       #10b981 (green)
NEW Badge:         #10b981 (green bg, white text)
```

## Grid Specifications

### Desktop (2 columns)
```
┌─────────────┬─────────────┐
│   Card 1    │   Card 2    │  ← Row 1
│  width: 45% │  width: 45% │
│  gap: 12px  │  gap: 12px  │
├─────────────┼─────────────┤
│   Card 3    │   Card 4    │  ← Row 2
├─────────────┼─────────────┤
│   Card 5    │   Card 6    │  ← Row 3
└─────────────┴─────────────┘
```

### Tablet (2 columns, wider)
```
┌──────────────────┬──────────────────┐
│     Card 1       │     Card 2       │
│    width: 48%    │    width: 48%    │
│    gap: 12px     │    gap: 12px     │
└──────────────────┴──────────────────┘
```

### Mobile (1 column)
```
┌────────────────────────────┐
│          Card 1            │
│         width: 100%        │
│          gap: 10px         │
├────────────────────────────┤
│          Card 2            │
├────────────────────────────┤
│          Card 3            │
└────────────────────────────┘
```

## Animation Timing

### Slide In (new wallet appears)
```
Time:  0ms        250ms       500ms
       ──────────┼───────────┼──────────
State: off-screen → sliding → in place
       opacity: 0 → 0.5     → 1
       translateX: 20px → 10px → 0
```

### Pulse (live indicator)
```
Time:  0ms        1000ms      2000ms
       ──────────┼───────────┼──────────
State: visible   → fading    → visible
       opacity: 1 → 0.4      → 1
```

### Bounce (NEW badge)
```
Time:  0ms        500ms       1000ms
       ──────────┼───────────┼──────────
State: normal    → bigger    → normal
       scale: 1  → 1.1       → 1
```

### Hover (card interaction)
```
Time:  0ms        150ms       300ms
       ──────────┼───────────┼──────────
State: default   → lifting   → lifted
       transform: translateY(0) → -2px
       box-shadow: none → glow effect
```

## Spacing System

### Container Padding
```
Desktop: 24px
Tablet:  20px
Mobile:  16px
```

### Card Spacing
```
Internal padding: 12px
Gap between cards: 12px (desktop/tablet), 10px (mobile)
Margin bottom: 16px (before footer)
```

### Font Sizes
```
Feed Title:     16px (bold)
Counter Number: 24px (800 weight)
Counter Label:  11px (medium)
Wallet Name:    13px (semibold)
Wallet Address: 11px (monospace)
Time:           10px (medium)
Growth Text:    13px (semibold)
```

## Icon Specifications

### Wallet Icon (◈)
```
Size: 40px × 40px
Background: gradient (#6366f1 → #a78bfa)
Border radius: 50% (circle)
Icon size: 18px
Icon color: white
```

### Live Indicator (●)
```
Size: 12px
Color: #10b981 (green)
Animation: pulse (2s infinite)
```

### NEW Badge
```
Position: absolute (top: -4px, right: -4px)
Background: #10b981 (green)
Text color: white
Font size: 9px (bold)
Padding: 2px 6px
Border radius: 8px (pill shape)
Animation: bounce (1s infinite)
```

## Shadow Effects

### Container Shadow
```css
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
```

### Card Hover Shadow
```css
box-shadow: 0 8px 20px rgba(99, 102, 241, 0.2);
```

### New Wallet Glow
```css
box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
```

## Z-Index Stack

```
Layer 1: Background gradient
Layer 2: Feed container
Layer 3: Wallet cards
Layer 4: NEW badge (absolute)
Layer 5: Hover effects (transform)
```

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android 90+)

### Required Features
- CSS Grid
- CSS Animations
- Backdrop Filter
- CSS Transforms
- Flexbox
- Gradient Text

## Performance Budget

### Load Time
- Initial render: < 100ms
- Animation start: < 16ms (1 frame)
- Update interval: 8000ms

### Memory
- State size: < 2MB (12 wallets)
- DOM nodes: ~50 elements
- Event listeners: 1 (interval)

### Bundle Size
- CSS: +4KB (minified)
- JSX: +2KB (minified)
- Total: +6KB

---

**Design System**: Toklo Wallet v5  
**Last Updated**: 2026-04-19  
**Status**: Production Ready
