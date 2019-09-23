import {
  isRunningTask,
  isResolvedTask,
  isRejectedTask,
  isCancelledTask,
  isPendingTask,
  PendingTask
} from './task.js';

function Runner(
  task,
  onRunning,
  onResolve,
  onReject,
  onCancel,
  cancellationRef = { requested: false },
  rejectionRef = { requested: false }
) {
  async function loop() {
    let _task = task;

    if (isPendingTask(_task)) {
      _task = _task.execute();
    }

    if (isRunningTask(_task)) {
      onRunning();
    }

    while (isRunningTask(_task)) {
      if (cancellationRef.requested) {
        _task = await _task.cancel(cancellationRef.reason);
        continue;
      }

      if (rejectionRef.requested) {
        _task = await _task.abort(rejectionRef.reason);
        continue;
      }

      _task = await _task.nextTick();
    }

    return _task;
  }

  loop()
    .then(taskResult => {
      if (
        isResolvedTask(taskResult) &&
        typeof onResolve === 'function'
      ) {
        onResolve(taskResult.value);
        return;
      }
      if (
        isCancelledTask(taskResult) &&
        typeof onCancel === 'function'
      ) {
        onCancel(taskResult.value);
        return;
      }

      if (
        isRejectedTask(taskResult) &&
        typeof onReject === 'function'
      ) {
        onReject(taskResult.value);
        return;
      }
    })
    .catch(onReject);
}

function taskRunnerStatus(task) {
  if (isPendingTask(task)) {
    return 'pending';
  }

  if (isRunningTask(task)) {
    return 'running';
  }

  if (isResolvedTask(task)) {
    return 'resolved';
  }

  if (isRejectedTask(task)) {
    return 'rejected';
  }

  if (isCancelledTask(task)) {
    return 'cancelled';
  }
}

function TaskRunner(generator) {
  this.task = new PendingTask(generator);
  this.cancellationRef = { requested: false };
  this.rejectionRef = { requested: false };
  this.status = taskRunnerStatus(this.task);
  this.value = undefined;
  this.subscribers = [];
}

TaskRunner.prototype.execute = function() {
  if (this.cancellationRef.requested) {
    this.emit('cancel', this.cancellationRef.reason);
    return;
  }

  if (this.rejectionRef.requested) {
    this.emit('reject', this.rejectionRef.reason);
    return;
  }

  Runner(
    this.task,
    () => {
      this.status = 'running';
      this.emit('running');
    },
    value => {
      this.value = value;
      this.status = 'resolved';
      this.emit('resolve', value);
    },
    error => {
      this.value = error;
      this.status = 'rejected';
      this.emit('reject', error);
    },
    cancelCause => {
      this.value = cancelCause;
      this.status = 'cancelled';
      this.emit('cancel', cancelCause);
    },
    this.cancellationRef,
    this.rejectionRef
  );
};

TaskRunner.prototype.on = function(event, handler) {
  if (typeof handler !== 'function') {
    return;
  }
  this.subscribers.push({ event, handler });
};

TaskRunner.prototype.off = function(event, handler) {
  this.subscribers = this.subscribers.filter(
    subscriber =>
      subscriber.event === event &&
      subscriber.handler === handler
  );
};

TaskRunner.prototype.emit = function(
  emittedEvent,
  emittedValue
) {
  this.subscribers.forEach(({ event, handler }) => {
    if (event === emittedEvent) {
      handler(emittedValue);
    }
  });
};

TaskRunner.prototype.status = function() {
  return this.status;
};

TaskRunner.prototype.cancel = function(reason) {
  this.cancellationRef.requested = true;
  this.cancellationRef.reason = reason;
};

TaskRunner.prototype.throw = function(reason) {
  this.rejectionRef.requested = true;
  this.rejectionRef.reason = reason;
};

export default TaskRunner;
