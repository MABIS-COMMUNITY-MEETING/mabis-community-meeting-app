/*
 * Catppuccin — the four official flavours, canonical hexes.
 *
 * Same contract as lib/gmk_palettes.js: the values here are authoritative and
 * are never adjusted. themes.js derives supporting surfaces from them by
 * moving lightness only, so the palette stays recognisably Catppuccin.
 *
 * Structure per flavour:
 *   base/mantle/crust   page surfaces, darkest last
 *   surface0/1/2        raised surfaces, lightest last
 *   text/subtext0       body ink and its quiet variant
 *   accents             the fourteen named accent colours
 *   swatches            the six the UI uses for stripes, previews and roles,
 *                       chosen for distinct hues rather than for looks
 *
 * Palette: https://github.com/catppuccin/catppuccin — MIT.
 */

const flavour = (name, dark, base, mantle, crust, surface0, surface1, surface2, text, subtext0, accents) => ({
  name,
  dark,
  base,
  mantle,
  crust,
  surface0,
  surface1,
  surface2,
  text,
  subtext0,
  accents,
  /* Six well-separated hues: purple, blue, teal, green, orange, pink. The
     balance checker wants three distinct hues across primary/secondary/accent
     and four across the role badges, and a set drawn from one corner of the
     wheel cannot supply them. */
  swatches: [accents.mauve, accents.blue, accents.teal, accents.green, accents.peach, accents.pink],
});

export const catppuccin_flavours = {
  latte: flavour(
    "Catppuccin Latte", false,
    "#eff1f5", "#e6e9ef", "#dce0e8",
    "#ccd0da", "#bcc0cc", "#acb0be",
    "#4c4f69", "#6c6f85",
    {
      rosewater: "#dc8a78", flamingo: "#dd7878", pink: "#ea76cb", mauve: "#8839ef",
      red: "#d20f39", maroon: "#e64553", peach: "#fe640b", yellow: "#df8e1d",
      green: "#40a02b", teal: "#179299", sky: "#04a5e5", sapphire: "#209fb5",
      blue: "#1e66f5", lavender: "#7287fd",
    },
  ),

  frappe: flavour(
    "Catppuccin Frappé", true,
    "#303446", "#292c3c", "#232634",
    "#414559", "#51576d", "#626880",
    "#c6d0f5", "#a5adce",
    {
      rosewater: "#f2d5cf", flamingo: "#eebebe", pink: "#f4b8e4", mauve: "#ca9ee6",
      red: "#e78284", maroon: "#ea999c", peach: "#ef9f76", yellow: "#e5c890",
      green: "#a6d189", teal: "#81c8be", sky: "#99d1db", sapphire: "#85c1dc",
      blue: "#8caaee", lavender: "#babbf1",
    },
  ),

  macchiato: flavour(
    "Catppuccin Macchiato", true,
    "#24273a", "#1e2030", "#181926",
    "#363a4f", "#494d64", "#5b6078",
    "#cad3f5", "#a5adcb",
    {
      rosewater: "#f4dbd6", flamingo: "#f0c6c6", pink: "#f5bde6", mauve: "#c6a0f6",
      red: "#ed8796", maroon: "#ee99a0", peach: "#f5a97f", yellow: "#eed49f",
      green: "#a6da95", teal: "#8bd5ca", sky: "#91d7e3", sapphire: "#7dc4e4",
      blue: "#8aadf4", lavender: "#b7bdf8",
    },
  ),

  mocha: flavour(
    "Catppuccin Mocha", true,
    "#1e1e2e", "#181825", "#11111b",
    "#313244", "#45475a", "#585b70",
    "#cdd6f4", "#a6adc8",
    {
      rosewater: "#f5e0dc", flamingo: "#f2cdcd", pink: "#f5c2e7", mauve: "#cba6f7",
      red: "#f38ba8", maroon: "#eba0ac", peach: "#fab387", yellow: "#f9e2af",
      green: "#a6e3a1", teal: "#94e2d5", sky: "#89dceb", sapphire: "#74c7ec",
      blue: "#89b4fa", lavender: "#b4befe",
    },
  ),
};
