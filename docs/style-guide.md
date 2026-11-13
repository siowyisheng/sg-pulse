# The reference for how Yah Lah looks. The theme tokens in src/theme/tokens.ts carry these values into
# the app, and the build fails on any colour or font written out elsewhere. Change both together: a
# test fails when a colour here is not a token, or a token is not here. See it rendered at /style-guide.

brand:
  name: "Yah Lah"
  tagline: "How's Singapore feeling today?"
  positioning: "A web app showing how verified Singapore residents are feeling day to day."
  logo: "The mark is the header mark, the favicon and the app icon. Its wordmark still reads 'SG PULSE'; the owner will change it."
  design_principles:
    - "Vibrant Intentionality: High-contrast, energetic visual accents over structured, trustworthy bases."
    - "Clarity & Frictionless: High visual hierarchy, scannable cards, bold status indicators, and clear flows."
    - "Local & Welcoming: Inclusive, approachable UI that balances modern tech minimalism with local warmth."

colors:
  primary:
    pulse_navy:
      hex: "#1D3B66"
      hover_active: "#152C4D"
      dark_mode_text: "#7BA7EA"
      tint: "#E4E7ED"
      dark_mode_tint: "#2D354A"
      usage: "Headers, active states, links, the secondary button, Byline chips. From the logo. As a fill it is the same in both modes; as text on a dark surface it becomes the lighter tint."
      contrast: "11.2:1 on white"
  secondary:
    merlion_red:
      hex: "#D81E2A"
      hover_active: "#B5121F"
      usage: "The Yah Lah button and key highlights. From the logo. Because red is the brand and call-to-action colour, it never marks an error."
      contrast: "White on red and red on white 5.1:1"
  polarity:
    rule: "Polarity is never shown by colour alone: it always carries the smiley or unhappy icon and a 'Good' or 'Bad' label."
    good_feeling_sunrise_teal:
      fill: "#00B894"
      text: "#00806A"
      dark_mode_text: "#00B894"
      tint: "#EBF9F6"
      dark_mode_tint: "#19373C"
      highlight: "#9EE4D6"
      dark_mode_highlight: "#0B5248"
      highlight_usage: "A stronger wash for a highlighter stroke or a glow behind ink, on the front page looks. Ink on it, never teal text."
      usage: "Good Polarity. The fill is only 2.5:1 on white, so it is a fill or a border, never text or an icon on white."
      contrast: "Text 4.9:1 on white"
    bad_feeling_dusk_violet:
      hex: "#6B4E96"
      dark_mode_text: "#B39DDB"
      tint: "#EDEAF2"
      dark_mode_tint: "#363347"
      highlight: "#D3CAE0"
      dark_mode_highlight: "#43335E"
      highlight_usage: "As the Good highlight."
      usage: "Bad Polarity."
      contrast: "6.7:1 on white"
  neutrals:
    dark_slate:
      hex: "#12131A"
      usage: "Primary typography (light mode), dark mode page background."
    charcoal:
      hex: "#1E1F2B"
      usage: "Dark mode cards and modal surfaces."
    slate_grey:
      hex: "#5D6070"
      dark_mode: "#A9ACBA"
      usage: "Secondary typography."
    cool_grey:
      hex: "#8F92A1"
      usage: "Borders, disabled states, placeholder icons. Only 3.1:1 on white, so never body text."
    soft_surface:
      hex: "#F5F6FA"
      usage: "Light mode app background."
    neutral_tint:
      hex: "#F2F2F4"
      dark_mode: "#30313E"
      usage: "Neutral chips, the pressed ghost button."
    pure_white:
      hex: "#FFFFFF"
      usage: "Card backgrounds (light mode), text on navy and red, primary typography (dark mode)."
  functional_feedback:
    success: "#00B894"
    warning_yellow: "#FFB800"
    warning_tint: "#FFF6E0"
    warning_tint_dark_mode: "#423724"
    error_red: "#E74C3C"
    info_blue: "#3498DB"
    error_rule: "An error is an icon and a message in normal text with an error_red outline, never a solid red button."
  contrast_rule: "Text on its background is at least 4.5:1; large text (24px, or 18.66px bold) and icons at least 3:1, in light and dark mode. Checked automatically for every pair the components use."

typography:
  font_family:
    primary: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    accent_display: "Plus Jakarta Sans, sans-serif"
    loading: "Both are served from the app's own domain with a size-matched fallback, so text does not shift when they load."
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
      also: "The text of a Feeling of the Day."
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
  touch_target_minimum: "44px"
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
    card_light: "0px 4px 20px rgba(29, 59, 102, 0.08)"
    modal_elevation: "0px 12px 32px rgba(18, 19, 26, 0.24)"

ui_components:
  buttons:
    yah_lah:
      use: "The Upvote, labelled 'Yah Lah', and the main call to action of a screen."
      background: "#D81E2A"
      text: "#FFFFFF"
      hover_active: "#B5121F"
      radius: "12px"
      padding: "14px 24px"
      font_weight: 700
    secondary_action:
      background: "#1D3B66"
      text: "#FFFFFF"
      hover_active: "#152C4D"
      radius: "12px"
      padding: "14px 24px"
      font_weight: 600
    ghost_action:
      background: "transparent"
      border: "1.5px solid #8F92A1"
      text: "#12131A"
      radius: "12px"
  badges_tags:
    good_feeling:
      background: "#EBF9F6"
      text: "#00806A"
      border: "1px solid #00806A"
      icon: "Smile"
      label: "Good"
    bad_feeling:
      background: "#EDEAF2"
      text: "#6B4E96"
      border: "1px solid #6B4E96"
      icon: "Frown"
      label: "Bad"
    byline:
      background: "#E4E7ED"
      text: "#1D3B66"
      example: "TA · M · 30s"
    from_the_team:
      background: "#E4E7ED"
      text: "#1D3B66"
      icon: "Users"
      use: "On a Seed Feeling, in place of a Byline."
    queued_for_tomorrow:
      background: "#F2F2F4"
      text: "#12131A"
      icon: "Clock"
    still_feeling_it:
      background: "#F2F2F4"
      text: "#12131A"
      icon: "Repeat"
      use: "On a Carry-over."
    under_review:
      background: "#FFF6E0"
      text: "#12131A"
      icon: "Hourglass"
  card:
    background: "#FFFFFF"
    radius: "16px"
    padding: "16px"
    shadow: "card_light"
  modal:
    background: "#FFFFFF"
    radius: "24px"
    padding: "24px"
    shadow: "modal_elevation"

imagery_and_icons:
  icon_style: "Lucide (2px stroke width, rounded join corners, clean vector)"
