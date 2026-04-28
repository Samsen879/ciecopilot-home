import config from '../vite.config.js';

describe('vite dev server config', () => {
  test('uses the canonical learning runtime dev port and backend proxy', () => {
    expect(config.server.port).toBe(5173);
    expect(config.server.proxy).toBeDefined();
    expect(config.server.proxy['/api']).toMatchObject({
      target: 'http://127.0.0.1:3001',
      changeOrigin: true,
    });
  });

  test('does not publish browser source maps by default', () => {
    expect(config.build.sourcemap).not.toBe(true);
  });
});
