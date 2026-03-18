function normalizeChunk(chunk, encoding) {
  if (typeof chunk === 'string') return chunk;
  if (chunk === undefined || chunk === null) return '';
  return Buffer.isBuffer(chunk) ? chunk.toString(typeof encoding === 'string' ? encoding : 'utf8') : String(chunk);
}

function interceptWrite(outputRef) {
  return (chunk, encoding, callback) => {
    const actualEncoding = typeof encoding === 'string' ? encoding : undefined;
    const actualCallback =
      typeof encoding === 'function' ? encoding : typeof callback === 'function' ? callback : null;
    outputRef.value += normalizeChunk(chunk, actualEncoding);
    if (actualCallback) actualCallback();
    return true;
  };
}

export async function invokeCliMain(main, argv = [], options = {}) {
  const originalCwd = process.cwd();
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  const originalExitCode = process.exitCode;
  const envEntries = Object.entries(options.env || {});
  const originalEnv = new Map(envEntries.map(([key]) => [key, process.env[key]]));
  const stdout = { value: '' };
  const stderr = { value: '' };

  process.exitCode = 0;
  process.stdout.write = interceptWrite(stdout);
  process.stderr.write = interceptWrite(stderr);

  try {
    if (options.cwd) process.chdir(options.cwd);
    for (const [key, value] of envEntries) {
      if (value === undefined || value === null) {
        delete process.env[key];
      } else {
        process.env[key] = String(value);
      }
    }

    await main(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderr.value += `${message}\n`;
    if (!process.exitCode) process.exitCode = 1;
  } finally {
    process.chdir(originalCwd);
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    for (const [key, value] of originalEnv) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }

  const result = {
    exitCode: process.exitCode || 0,
    stdout: stdout.value,
    stderr: stderr.value,
  };
  process.exitCode = originalExitCode;
  return result;
}
