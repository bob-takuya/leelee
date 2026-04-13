/// <reference lib="webworker" />
import { runGA, type GAInput, type GAUpdate } from '../core/ga';

declare const self: DedicatedWorkerGlobalScope;

let stop = false;

self.onmessage = async (e: MessageEvent<GAInput | { cmd: 'stop' }>) => {
  const data = e.data as any;
  if (data && data.cmd === 'stop') {
    stop = true;
    return;
  }
  stop = false;
  const input = data as GAInput;
  const emit = (u: GAUpdate) => self.postMessage(u);
  await runGA(input, emit, () => stop);
};
