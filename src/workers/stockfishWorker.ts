/// <reference lib="webworker" />
import { UciEngineSession } from '../services/uciCore';

declare const self: DedicatedWorkerGlobalScope;

const uciSession = new UciEngineSession((line: string) => {
  self.postMessage(line);
});

self.onmessage = (event: MessageEvent) => {
  const data = event.data;
  if (typeof data === 'string') {
    uciSession.handleCommand(data);
  } else if (data && typeof data === 'object' && typeof data.cmd === 'string') {
    uciSession.handleCommand(data.cmd);
  }
};
