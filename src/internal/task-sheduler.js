function DefaultTaskScheduler() {
  this.runners = [];
}

DefaultTaskScheduler.prototype.execute = function(
  taskRunner
) {
  const removeRunner = runnerToRemove => {
    this.runners = this.runners.filter(
      runner => runner !== runnerToRemove
    );
  };

  taskRunner.on('resolve', removeRunner);
  taskRunner.on('cancel', removeRunner);
  taskRunner.on('reject', removeRunner);

  this.runners.push(taskRunner);

  taskRunner.execute();

  return taskRunner;
};

DefaultTaskScheduler.prototype.cancelAll = function(
  reason
) {
  this.runners.forEach(runner => runner.cancel(reason));
  this.runners = [];
};

function RestartableTaskScheduler() {
  this.activeTaskRunner = undefined;
}

RestartableTaskScheduler.prototype.execute = function(
  taskRunner
) {
  if (this.activeTaskRunner) {
    this.activeTaskRunner.cancel('Cancelled by scheduler');
  }

  this.activeTaskRunner = taskRunner;

  taskRunner.execute();

  return taskRunner;
};

RestartableTaskScheduler.prototype.cancelAll = function(
  reason
) {
  if (this.activeTaskRunner) {
    this.activeTaskRunner.cancel(reason);
  }
};

function EnqueueTaskScheduler() {
  this.activeTaskRunner = undefined;
  this.queuedTaskRunners = [];
}

EnqueueTaskScheduler.prototype.execute = function(
  taskRunner
) {
  if (this.activeTaskRunner) {
    this.queuedTaskRunners.push(taskRunner);
    return taskRunner;
  }

  const runTaskRunner = taskRunnerToRun => {
    if (!taskRunnerToRun) {
      return undefined;
    }

    const runQueuedTaskRunner = () => {
      this.activeTaskRunner = undefined;
      const nextTaskRunner = this.queuedTaskRunners.shift();
      runTaskRunner(nextTaskRunner);
    };

    taskRunnerToRun.on('resolve', runQueuedTaskRunner);
    taskRunnerToRun.on('cancel', runQueuedTaskRunner);
    taskRunnerToRun.on('reject', runQueuedTaskRunner);

    this.activeTaskRunner = taskRunnerToRun;

    taskRunnerToRun.execute();

    return taskRunnerToRun;
  };

  return runTaskRunner(taskRunner);
};

EnqueueTaskScheduler.prototype.cancelAll = function(
  reason
) {
  if (this.activeTaskRunner) {
    this.activeTaskRunner.cancel(reason);
  }

  this.queuedTaskRunners.forEach(taskRunner =>
    taskRunner.cancel(reason)
  );

  this.queuedTaskRunners = [];
};

function DropTaskScheduler() {
  this.activeTaskRunner = undefined;
}

DropTaskScheduler.prototype.execute = function(taskRunner) {
  if (this.activeTaskRunner) {
    taskRunner.cancel(
      'Cancelled by scheduler cause dropping strategy'
    );
    return taskRunner;
  }

  const freeActiveTaskRunner = () => {
    this.activeTaskRunner = undefined;
  };

  taskRunner.on('resolve', freeActiveTaskRunner);
  taskRunner.on('reject', freeActiveTaskRunner);
  taskRunner.on('cancel', freeActiveTaskRunner);

  this.activeTaskRunner = taskRunner;

  taskRunner.execute();

  return taskRunner;
};

DropTaskScheduler.prototype.cancelAll = function(reason) {
  if (this.activeTaskRunner) {
    this.activeTaskRunner.cancel(reason);
  }
};

function KeepLatestTaskScheduler() {
  this.activeTaskRunner = undefined;
  this.queuedTaskRunner = undefined;
}

KeepLatestTaskScheduler.prototype.execute = function(
  taskRunner
) {
  if (this.activeTaskRunner) {
    if (this.queuedTaskRunner) {
      this.queuedTaskRunner.cancel(
        'Cancelled by scheduler'
      );
    }
    this.queuedTaskRunner = taskRunner;
    return taskRunner;
  }

  const runTaskRunner = taskRunnerToRun => {
    if (!taskRunnerToRun) {
      return undefined;
    }

    const runQueuedTaskRunner = () => {
      this.activeTaskRunner = undefined;
      const nextTaskRunner = this.queuedTaskRunner;
      this.queuedTaskRunner = undefined;
      runTaskRunner(nextTaskRunner);
    };

    taskRunnerToRun.on('resolve', runQueuedTaskRunner);
    taskRunnerToRun.on('cancel', runQueuedTaskRunner);
    taskRunnerToRun.on('reject', runQueuedTaskRunner);

    this.activeTaskRunner = taskRunnerToRun;

    taskRunnerToRun.execute();

    return taskRunnerToRun;
  };

  return runTaskRunner(taskRunner);
};

KeepLatestTaskScheduler.prototype.cancelAll = function(
  reason
) {
  if (this.activeTaskRunner) {
    this.activeTaskRunner.cancel(reason);
  }

  this.queuedTaskRunner.forEach(taskRunner =>
    taskRunner.cancel()
  );
  this.queuedTaskRunner = [];
};

function TaskScheduler(
  strategy = TaskScheduler.strategies.DEFAULT
) {
  switch (strategy) {
    case TaskScheduler.strategies.DEFAULT:
      return new DefaultTaskScheduler();
    case TaskScheduler.strategies.RESTARTABLE:
      return new RestartableTaskScheduler();
    case TaskScheduler.strategies.ENQUEUE:
      return new EnqueueTaskScheduler();
    case TaskScheduler.strategies.DROP:
      return new DropTaskScheduler();
    case TaskScheduler.strategies.KEEP_LATEST:
      return new KeepLatestTaskScheduler();
    default:
      return new DefaultTaskScheduler();
  }
}

TaskScheduler.strategies = {
  DEFAULT: 0,
  RESTARTABLE: 1,
  ENQUEUE: 2,
  DROP: 3,
  KEEP_LATEST: 4
};

export default TaskScheduler;
