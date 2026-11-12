// Chooses the app to start. 1.0 is the default; VITE_APP_VERSION=2 starts the
// Supply Chain Pulse 2.0 prototype (src/v2). Each version is its own chunk, so
// neither loads the other's design system.
if (import.meta.env.VITE_APP_VERSION === '2') {
  void import('./v2/main').then((m) => m.mount());
} else {
  void import('./main.v1');
}

export {};
