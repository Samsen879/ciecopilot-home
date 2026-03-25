import http from 'node:http';
import request from 'supertest';

export const LOOPBACK_HOST = '127.0.0.1';

function closeServer(server) {
  if (!server || !server.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function listenOnLoopback(server, { host = LOOPBACK_HOST, port = 0 } = {}) {
  if (!server || typeof server.listen !== 'function' || typeof server.address !== 'function') {
    throw new TypeError('listenOnLoopback requires a Node.js HTTP server instance.');
  }

  if (server.listening) {
    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP server address for the learning test harness.');
    }

    return Promise.resolve(address);
  }

  return new Promise((resolve, reject) => {
    const handleError = (error) => {
      server.off('listening', handleListening);
      reject(error);
    };

    const handleListening = () => {
      server.off('error', handleError);
      const address = server.address();

      if (!address || typeof address === 'string') {
        reject(new Error('Expected a TCP server address for the learning test harness.'));
        return;
      }

      resolve(address);
    };

    server.once('error', handleError);
    server.once('listening', handleListening);
    server.listen(port, host);
  });
}

export async function createLoopbackHttpTestClient(appOrServer, options = {}) {
  const server = typeof appOrServer === 'function'
    ? http.createServer(appOrServer)
    : appOrServer;

  const address = await listenOnLoopback(server, options);
  const origin = `http://${LOOPBACK_HOST}:${address.port}`;

  return {
    origin,
    request: request(origin),
    server,
    close: () => closeServer(server),
  };
}
