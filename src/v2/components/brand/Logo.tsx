/**
 * The ONE Thunder logo (public/logo.png), as the header and the loading screen
 * show it beside "Supply Chain Pulse 2.0" (as in Sales Pulse 2.0). Sized by height; the width follows.
 */
export function Logo({ height = 24 }: { height?: number }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="ONE Thunder"
      height={height}
      style={{ height, width: 'auto', display: 'block', flexShrink: 0 }}
      draggable={false}
    />
  );
}
