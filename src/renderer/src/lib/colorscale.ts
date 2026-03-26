// Representative primary colors for each supported colorscale.
// These are sampled from the high-intensity end of each Plotly built-in scale.
const COLORSCALE_PRIMARY: Record<string, string[]> = {
  blues:   ['#4393c3', '#2171b5', '#08519c', '#6baed6'],
  viridis: ['#5ec962', '#3b528b', '#21918c', '#fde725'],
  plasma:  ['#f0f921', '#cc4778', '#7201a8', '#f89540'],
  inferno: ['#fcffa4', '#f98e09', '#bc3754', '#57106e'],
  magma:   ['#fcfdbf', '#fc8961', '#b73779', '#51127c'],
}

const FALLBACK = ['#5b8def', '#ef5b5b', '#5bef8f', '#efcf5b']

/**
 * Return the 4 characteristic colors for the given colorscale name.
 * Index 0 = Stokes I / main trace, 1 = Q, 2 = U, 3 = V / accent
 */
export function getColorscaleColors(scale: string): string[] {
  return COLORSCALE_PRIMARY[scale.toLowerCase()] ?? FALLBACK
}
