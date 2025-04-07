export async function initMocks() {
  if (process.env.NODE_ENV === "development") {
    if (typeof window !== 'undefined') {
      const { worker } = await import('@/mocks/browser');
      await worker.start({
        onUnhandledRequest: 'bypass',
      });
      console.log('[MSW] worker started');
    } else {
      const { server } = await import('@/mocks/server');
      server.listen({ onUnhandledRequest: 'bypass' });
      console.log('[MSW] server-side mocks active');
    }
  }
}
