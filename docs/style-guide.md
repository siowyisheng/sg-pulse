brand:
  name: "Yah Lah"
  tagline: "How's Singapore feeling today?"
  positioning: "A web app showing how verified Singapore residents are feeling day to day."
  design_principles:
    - "Vibrant Intentionality: High-contrast, energetic visual accents over structured, trustworthy bases."
    - "Clarity & Frictionless: High visual hierarchy, scannable cards, bold status indicators, and clear flows."
    - "Local & Welcoming: Inclusive, approachable UI that balances modern tech minimalism with local warmth."

colors:
  primary:
    brand_purple:
      hex: "#5B50D6"
      rgb: "rgb(91, 80, 214)"
      hsl: "hsl(245, 63%, 58%)"
      usage: "Primary brand identifier, top navigation headers, primary active states, verification badges, key feature highlights."
  secondary:
    coral_orange:
      hex: "#F06543"
      rgb: "rgb(240, 101, 67)"
      hsl: "hsl(12, 86%, 60%)"
      usage: "Primary CTA buttons (e.g., 'Lock In Spot'), urgency badges, high-energy highlights, promotional banners."
    electric_teal:
      hex: "#00B894"
      rgb: "rgb(0, 184, 148)"
      hsl: "hsl(168, 100%, 36%)"
      usage: "Success indicators, confirmed bookings, host verification tags, ratio balance indicators ('4/4 Male & Female Slots Filled')."
  neutrals:
    dark_slate:
      hex: "#12131A"
      usage: "Primary typography (light mode), dark mode surface backgrounds, primary container cards."
    charcoal:
      hex: "#1E1F2B"
      usage: "Secondary cards, modal surfaces, elevated UI components."
    cool_grey:
      hex: "#8F92A1"
      usage: "Secondary typography, disabled states, tab bar inactive items, placeholder text."
    soft_surface:
      hex: "#F5F6FA"
      usage: "Light mode app background, subtle card borders, muted input fields."
    pure_white:
      hex: "#FFFFFF"
      usage: "Card backgrounds (light mode), high-contrast text on dark/primary backgrounds."
  functional_feedback:
    success: "#00B894"
    warning_yellow: "#FFB800"
    error_red: "#E74C3C"
    info_blue: "#3498DB"

typography:
  font_family:
    primary: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    accent_display: "Plus Jakarta Sans, sans-serif"
  type_scale:
    h1_hero:
      size: "32px"
      line_height: "40px"
      weight: 800
      tracking: "-0.02em"
    h2_section:
      size: "24px"
      line_height: "32px"
      weight: 700
      tracking: "-0.01em"
    h3_card_title:
      size: "18px"
      line_height: "24px"
      weight: 600
      tracking: "0em"
    body_regular:
      size: "15px"
      line_height: "22px"
      weight: 400
      tracking: "0em"
    body_bold:
      size: "15px"
      line_height: "22px"
      weight: 600
      tracking: "0em"
    caption_metadata:
      size: "13px"
      line_height: "18px"
      weight: 500
      tracking: "0.01em"
    badge_label:
      size: "11px"
      line_height: "14px"
      weight: 700
      tracking: "0.05em"
      transform: "UPPERCASE"

spacing_and_layout:
  base_unit: "8px"
  density: "Compact to Medium (mobile-optimized touch targets)"
  scale:
    xs: "4px"
    sm: "8px"
    md: "16px"
    lg: "24px"
    xl: "32px"
    xxl: "48px"
  border_radius:
    buttons: "12px"
    cards: "16px"
    pills_badges: "999px"
    modals: "24px"
  shadows:
    card_light: "0px 4px 20px rgba(91, 80, 214, 0.08)"
    modal_elevation: "0px 12px 32px rgba(18, 19, 26, 0.24)"

ui_components:
  buttons:
    primary_action:
      background: "#F06543"
      text: "#FFFFFF"
      hover_active: "#D85333"
      radius: "12px"
      padding: "14px 24px"
      font_weight: 700
    secondary_action:
      background: "#5B50D6"
      text: "#FFFFFF"
      hover_active: "#4A40B5"
      radius: "12px"
      padding: "14px 24px"
      font_weight: 600
    ghost_action:
      background: "transparent"
      border: "1.5px solid #8F92A1"
      text: "#12131A"
      radius: "12px"
  badges_tags:
    ratio_balanced:
      background: "rgba(0, 184, 148, 0.12)"
      text: "#00B894"
      border: "1px solid #00B894"
    host_verified:
      background: "rgba(91, 80, 214, 0.12)"
      text: "#5B50D6"
      icon: "ShieldCheck"
    urgency_spot_left:
      background: "rgba(240, 101, 67, 0.12)"
      text: "#F06543"

imagery_and_icons:
  icon_style: "Lucide / Heroicons (2px stroke width, rounded join corners, clean vector)"
