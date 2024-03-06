import { Pool, spawn, type ModuleThread } from "threads";

import { type RendererWorker } from "./RenderWorker";

type WorkerPool = Pool<ModuleThread<RendererWorker>> & {
  taskQueue: readonly unknown[];
};

let workerPool: WorkerPool | undefined;

function get(): WorkerPool {
  if (workerPool == null) {
    workerPool = Pool(
      async () => await spawn<RendererWorker>(new Worker(new URL('./RenderWorker.ts', import.meta.url),  { type: "module" })),
      {
        size: Math.ceil(navigator.hardwareConcurrency / 2),
      },
    ) as unknown as WorkerPool;
  }
  console.log("workerPool: ", workerPool);
  return workerPool;
}

export function queue(...args: Parameters<WorkerPool["queue"]>): ReturnType<WorkerPool["queue"]> {
  console.log("queue");
  const work = get().queue(...args);
  console.log("work: ", work);
  return get().queue(...args);
}

export function canQueue(maxQueuedJobs: number): boolean {
  return workerPool == null || workerPool.taskQueue.length < maxQueuedJobs;
}

export async function destroy(): Promise<void> {
  if (workerPool == null) {
    return;
  }
  await workerPool.completed();
  await workerPool.terminate();
  workerPool = undefined;
}
