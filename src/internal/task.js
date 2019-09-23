import { isPromise } from './promises.js';
import {
  isEffect,
  processEffect,
  isCancelHappened
} from './effects.js';

function* defaultGenerator() {
  yield;
}

function ResolvedTask(value) {
  this.value = value;
}

function RejectedTask(iterator, reason) {
  iterator.throw(reason);
  this.value = reason;
}

function CancelledTask(iterator, reason) {
  iterator.return(reason);
  this.value = reason;
}

function RunningTask(iterator, prevIterationValue) {
  this.iterator = iterator;
  this.prevIterationValue = prevIterationValue;
}

RunningTask.prototype.nextTick = async function() {
  const { value, done } = this.iterator.next(
    this.prevIterationValue
  );

  if (done) {
    return new ResolvedTask(value);
  }

  if (isPromise(value)) {
    try {
      const resolvedValue = await value;
      return new RunningTask(this.iterator, resolvedValue);
    } catch (e) {
      return new RejectedTask(this.iterator, e);
    }
  }

  if (isEffect(value)) {
    try {
      const resolvedValue = await processEffect(value);
      return new RunningTask(this.iterator, resolvedValue);
    } catch (e) {
      return isCancelHappened(e)
        ? new CancelledTask(this.iterator, e)
        : new RejectedTask(this.iterator, e);
    }
  }

  return new RunningTask(this.iterator, value);
};

RunningTask.prototype.cancel = async function(reason) {
  return new CancelledTask(this.iterator, reason);
};

RunningTask.prototype.abort = async function(reason) {
  return new AbortedTask(this.iterator, reason);
};

function PendingTask(generator = defaultGenerator) {
  this.generator = generator;
}

PendingTask.prototype.execute = function() {
  return new RunningTask(this.generator());
};

function isPendingTask(task) {
  return task instanceof PendingTask;
}

function isRunningTask(task) {
  return task instanceof RunningTask;
}

function isCancelledTask(task) {
  return task instanceof CancelledTask;
}

function isRejectedTask(task) {
  return task instanceof RejectedTask;
}

function isResolvedTask(task) {
  return task instanceof ResolvedTask;
}

export {
  PendingTask,
  RunningTask,
  CancelledTask,
  RejectedTask,
  ResolvedTask,
  isPendingTask,
  isRunningTask,
  isRejectedTask,
  isResolvedTask,
  isCancelledTask
};
