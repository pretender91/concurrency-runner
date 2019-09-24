# concurrency-runner

Concurrency primitives for js based on idies from [`ember-concurrency`](https://github.com/machty/ember-concurrency). It's not a production ready and created for test purpose.

## Installation

`concurrency-runner` is a not minified javascript es module lib. You can install it via:

    npm install concurrenct-runner

## Example of usage

```javascript
import {
  TaskScheduler,
  STRATEGIES,
  Task,
  deley
} from 'concurrency-runner';

const taskScheduler = new TaskScheduler(
  STRATEGIES.RESTARTABLE
);

/**
 * Task is generator
 */

const task = new Task(function*() {
  yield delay(1000);
  return 'resolved';
});

task.on('resolve', resolvedValue => {
  console.log(`resolved with: ${resolvedValue}`);
});
task.on('reject', rejectReason => {
  console.log(`rejected with: ${rejectReason}`);
});
task.on('cancel', cancelReason => {
  console.log(`cancelled with: ${cancelReason}`);
});

taskScheduler.execute(task);

taskSceduler.cancellAll();
```

There are several strategies:

- `STRATEGIES.DEFAULT` - all tasks is running as they executed.
- `STRATEGIES.RESTARTABLE` - ensures that only one instance of a task is running by canceling any currently-running tasks and starting a new task instance immediately
- `STRATEGIES.ENQUEUE` - ensures that only one instance of a task is running by maintaining a queue of pending tasks and running them sequentially.
- `STRATEGIES.DROP` - drops tasks that are exectuted while another is already running.
- `STRATEGIES.KEEP_LATEST` - will drop all but the most recent intermediate .execute(), which is enqueued to run later.
