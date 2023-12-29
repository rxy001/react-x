import type { FiberRoot, Fiber } from "./ReactInternalTypes"
import type { Lane, Lanes } from "./ReactFiberLane"
import {
  NoLanes,
  SyncLane,
  markRootUpdated,
  getNextLanes,
  includesSomeLane,
  getHighestPriorityLane,
} from "./ReactFiberLane"
import { Incomplete, NoFlags } from "./ReactFiberFlags"
import { scheduleSyncCallback } from "./ReactFiberSyncTaskQueue"
import { createWorkInProgress } from "./ReactFiber"
import { finishQueueingConcurrentUpdates } from "./ReactFiberConcurrentUpdates"
import { beginWork } from "./ReactFiberBeginWork"
import { completeWork } from "./ReactFiberCompleteWork"

type ExecutionContext = number

export const NoContext = /*             */ 0b000
const RenderContext = /*                */ 0b010
const CommitContext = /*                */ 0b100

// Describes where we are in the React execution stack
let executionContext: ExecutionContext = NoContext
// The root we're working on
let workInProgressRoot: FiberRoot | null = null
// The fiber we're working on
let workInProgress: Fiber | null = null
// The lanes we're rendering
let workInProgressRootRenderLanes: Lanes = NoLanes

// Most things in the work loop should deal with workInProgressRootRenderLanes.
// Most things in begin/complete phases should deal with subtreeRenderLanes.
// eslint-disable-next-line import/no-mutable-exports
export let subtreeRenderLanes: Lanes = NoLanes

export function requestEventTime() {
  return performance.now()
}

export function requestUpdateLane(_fiber: Fiber): Lane {
  // Special cases
  return SyncLane
}

export function scheduleUpdateOnFiber(
  root: FiberRoot,
  fiber: Fiber,
  lane: Lane,
  eventTime: number,
) {
  // Mark that the root has a pending update.
  markRootUpdated(root, lane, eventTime)

  ensureRootIsScheduled(root)
}

// Use this function to schedule a task for a root. There's only one task per
// root; if a task was already scheduled, we'll check to make sure the priority
// of the existing task is the same as the priority of the next level that the
// root has work on. This function is called on every update, and right before
// exiting a task.
function ensureRootIsScheduled(root: FiberRoot) {
  // Determine the next lanes to work on, and their priority.
  const nextLanes = getNextLanes(root, NoLanes)

  if (nextLanes === NoLanes) {
    return
  }

  // We use the highest priority lane to represent the priority of the callback.
  const newCallbackPriority = getHighestPriorityLane(nextLanes)

  // Schedule a new callback.
  if (newCallbackPriority === SyncLane) {
    // Special case: Sync React callbacks are scheduled on a special
    // internal queue
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root))
  }
}

// This is the entry point for synchronous tasks that don't go
// through Scheduler
function performSyncWorkOnRoot(root: FiberRoot) {
  if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
    throw new Error("Should not already be working.")
  }

  const lanes = getNextLanes(root, NoLanes)
  if (!includesSomeLane(lanes, SyncLane)) {
    // There's no remaining sync work left.
    ensureRootIsScheduled(root)
    return null
  }

  renderRootSync(root, lanes)

  // We now have a consistent tree. Because this is a sync render, we
  // will commit it even if something suspended.
  const finishedWork: Fiber = root.current.alternate as any
  root.finishedWork = finishedWork
  root.finishedLanes = lanes

  commitRoot(root)

  // Before exiting, make sure there's a callback scheduled for the next
  // pending level.
  ensureRootIsScheduled(root)

  return null
}

function renderRootSync(root: FiberRoot, lanes: Lanes) {
  const prevExecutionContext = executionContext
  executionContext |= RenderContext

  // If the root or lanes have changed, throw out the existing stack
  // and prepare a fresh one. Otherwise we'll continue where we left off.
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes)
  }

  do {
    try {
      workLoopSync()
      break
    } catch (thrownValue) {
      /* empty */
    }
  } while (true)

  executionContext = prevExecutionContext

  if (workInProgress !== null) {
    // This is a sync render, so we should have finished the whole tree.
    throw new Error(
      "Cannot commit an incomplete root. This error is likely caused by a " +
        "bug in React. Please file an issue.",
    )
  }

  // Set this to null to indicate there's no in-progress render.
  workInProgressRoot = null
  workInProgressRootRenderLanes = NoLanes
}

function prepareFreshStack(root: FiberRoot, lanes: Lanes): Fiber {
  root.finishedWork = null
  root.finishedLanes = NoLanes

  workInProgressRoot = root
  const rootWorkInProgress = createWorkInProgress(root.current, null)
  workInProgress = rootWorkInProgress
  workInProgressRootRenderLanes = subtreeRenderLanes = lanes

  finishQueueingConcurrentUpdates()

  return rootWorkInProgress
}

// The work loop is an extremely hot path. Tell Closure not to inline it.
function workLoopSync() {
  // Already timed out, so perform work without checking if we need to yield.
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(unitOfWork: Fiber): void {
  // The current, flushed, state of this fiber is the alternate. Ideally
  // nothing should rely on this, but relying on it here means that we don't
  // need an additional field on the work in progress.
  const current = unitOfWork.alternate

  const next = beginWork(current, unitOfWork, subtreeRenderLanes)

  unitOfWork.memoizedProps = unitOfWork.pendingProps
  if (next === null) {
    // If this doesn't spawn new work, complete the current work.
    completeUnitOfWork(unitOfWork)
  } else {
    workInProgress = next
  }
}

function completeUnitOfWork(unitOfWork: Fiber): void {
  // Attempt to complete the current unit of work, then move to the next
  // sibling. If there are no more siblings, return to the parent fiber.
  let completedWork = unitOfWork
  do {
    // The current, flushed, state of this fiber is the alternate. Ideally
    // nothing should rely on this, but relying on it here means that we don't
    // need an additional field on the work in progress.
    const current = completedWork.alternate
    const returnFiber = completedWork.return

    // Check if the work completed or if something threw.
    if ((completedWork.flags & Incomplete) === NoFlags) {
      const next = completeWork(current, completedWork, subtreeRenderLanes)

      if (next !== null) {
        // Completing this fiber spawned new work. Work on that next.
        workInProgress = next
        return
      }
    }
    const siblingFiber = completedWork.sibling
    if (siblingFiber !== null) {
      // If there is more work to do in this returnFiber, do that next.
      workInProgress = siblingFiber
      return
    }
    // Otherwise, return to the parent
    completedWork = returnFiber as Fiber
    // Update the next thing we're working on in case something throws.
    workInProgress = completedWork
  } while (completedWork !== null)
}
