import TaskRunner from './task-runner.js';

function DefaultTaskScheduler() {
  this.runners = [];
}

DefaultTaskScheduler.prototype.execute = function(
  generator
) {
  const taskRunner = new TaskRunner(generator);

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

function RestartableTaskScheduler() {
  this.activeTaskRunner = undefined;
}

RestartableTaskScheduler.prototype.execute = function(
  generator
) {
  if (this.activeTaskRunner) {
    this.activeTaskRunner.cancel('Cancelled by scheduler');
  }

  const taskRunner = new TaskRunner(generator);

  this.activeTaskRunner = taskRunner;

  taskRunner.execute();

  return taskRunner;
};

function EnqueueTaskScheduler() {
  this.activeTaskRunner = undefined;
  this.queuedTaskRunners = [];
}

EnqueueTaskScheduler.prototype.execute = function(
  generator
) {
  if (this.activeTaskRunner) {
    const taskRunner = new TaskRunner(generator);
    this.queuedTaskRunners.push(taskRunner);
    return taskRunner;
  }

  const runTaskRunner = taskRunner => {
    if (!taskRunner) {
      return undefined;
    }

    const runQueuedTaskRunner = () => {
      this.activeTaskRunner = undefined;
      const nextTaskRunner = this.queuedTaskRunners.shift();
      runTaskRunner(nextTaskRunner);
    };

    taskRunner.on('resolve', runQueuedTaskRunner);
    taskRunner.on('cancel', runQueuedTaskRunner);
    taskRunner.on('reject', runQueuedTaskRunner);

    this.activeTaskRunner = taskRunner;

    taskRunner.execute();

    return taskRunner;
  };

  return runTaskRunner(new TaskRunner(generator));
};

function DropTaskScheduler() {
  this.activeTaskRunner = undefined;
}

DropTaskScheduler.prototype.execute = function(generator) {
  if (this.activeTaskRunner) {
    const taskRunner = new TaskRunner(generator);
    taskRunner.cancel(
      'Cancelled by scheduler cause dropping strategy'
    );
    return taskRunner;
  }

  const taskRunner = new TaskRunner(generator);

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

function KeepLatestTaskScheduler() {
  this.activeTaskRunner = undefined;
  this.queuedTaskRunner = undefined;
}

KeepLatestTaskScheduler.prototype.execute = function(
  generator
) {
  if (this.activeTaskRunner) {
    if (this.queuedTaskRunner) {
      this.queuedTaskRunner.cancel(
        'Cancelled by scheduler'
      );
    }
    const taskRunner = new TaskRunner(generator);
    this.queuedTaskRunner = taskRunner;
    return taskRunner;
  }

  const runTaskRunner = taskRunner => {
    if (!taskRunner) {
      return undefined;
    }

    const runQueuedTaskRunner = () => {
      this.activeTaskRunner = undefined;
      const nextTaskRunner = this.queuedTaskRunner;
      this.queuedTaskRunner = undefined;
      runTaskRunner(nextTaskRunner);
    };

    taskRunner.on('resolve', runQueuedTaskRunner);
    taskRunner.on('cancel', runQueuedTaskRunner);
    taskRunner.on('reject', runQueuedTaskRunner);

    this.activeTaskRunner = taskRunner;

    taskRunner.execute();

    return taskRunner;
  };

  return runTaskRunner(new TaskRunner(generator));
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
