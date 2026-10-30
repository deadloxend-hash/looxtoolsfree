import { CORE_URL, FFMessageType } from './const.js';
import { ERROR_NOT_LOADED, ERROR_IMPORT_FAILURE, ERROR_UNKNOWN_MESSAGE_TYPE } from './errors.js';

let ffmpeg = null;

async function load(config = {}) {
  let coreURL = config.coreURL || CORE_URL;
  try {
    importScripts(coreURL);
  } catch {
    if (!coreURL || coreURL === CORE_URL) coreURL = CORE_URL.replace('/umd/', '/esm/');
    self.createFFmpegCore = (await import(coreURL)).default;
    if (!self.createFFmpegCore) throw ERROR_IMPORT_FAILURE;
  }
  const wasmURL = config.wasmURL || coreURL.replace(/\.js$/g, '.wasm');
  const workerURL = config.workerURL || coreURL.replace(/\.js$/g, '.worker.js');
  ffmpeg = await self.createFFmpegCore({
    mainScriptUrlOrBlob: coreURL + '#' + btoa(JSON.stringify({ wasmURL, workerURL }))
  });
  ffmpeg.setLogger(data => self.postMessage({ type: FFMessageType.LOG, data }));
  ffmpeg.setProgress(data => self.postMessage({ type: FFMessageType.PROGRESS, data }));
}

self.onmessage = async ({ data: { id, type, data } }) => {
  let result;
  const transfer = [];
  try {
    if (type !== FFMessageType.LOAD && !ffmpeg) throw ERROR_NOT_LOADED;
    switch (type) {
      case FFMessageType.LOAD:
        result = await load(data || {});
        break;
      case FFMessageType.EXEC:
        ffmpeg.setTimeout(data.timeout ?? -1);
        ffmpeg.exec(...data.args);
        result = ffmpeg.ret;
        ffmpeg.reset();
        break;
      case FFMessageType.WRITE_FILE:
        ffmpeg.FS.writeFile(data.path, data.data);
        result = true;
        break;
      case FFMessageType.READ_FILE:
        result = ffmpeg.FS.readFile(data.path, { encoding: data.encoding });
        if (result instanceof Uint8Array) transfer.push(result.buffer);
        break;
      case FFMessageType.DELETE_FILE:
        ffmpeg.FS.unlink(data.path);
        result = true;
        break;
      default:
        throw ERROR_UNKNOWN_MESSAGE_TYPE;
    }
    self.postMessage({ id, type, data: result }, transfer);
  } catch (error) {
    self.postMessage({ id, type: FFMessageType.ERROR, data: String(error) });
  }
};