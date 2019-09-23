# concurrency-runner

Concurrency primitives for js based on idies from [`ember-concurrency`](https://github.com/machty/ember-concurrency). It's not a production ready and created for test purpose.

## Installation

`concurrency-runner` is a not minified javascript es module lib. You can install it via:

    npm install concurrenct-runner

## Example of usage

```javascript
import { TaskScheduler, deley } from 'concurrency-runner';

const taskScheduler = new TaskScheduler(
  TaskScheduler.strategies.RESTARTABLE
);

function createTask(searh) {
  return function*() {
    yield deley(1000);
    const response = yield fetch(`/items?search=${search}`);
    yield response.json();
  };
}

const taskRunner0 = taskScheduler.execute(
  createTask('lol')
); // taskRunner 0 started

taskRunner0.on('resolve', results => {
  results.forEach(result => {
    document.body.append();
  });
});

setTimeout(() => {
  const taskRunner1 = taskScheduler.execute(
    createTask('kek')
  ); //taskRunner1 will be started, taskRunner0 will be concelled in favor of task 1
}, 500);

taskRunner0.on('resolve', results => {
  results.forEach(result => {
    document.body.append();
  });
});
```

There are several strategies:

- `TaskScheduler.strategies.DEFAULT` - all tasks is running as they executed.
- `TaskScheduler.strategies.RESTARTABLE` - ensures that only one instance of a task is running by canceling any currently-running tasks and starting a new task instance immediately
- `TaskScheduler.strategies.ENQUEUE` - ensures that only one instance of a task is running by maintaining a queue of pending tasks and running them sequentially.
- `TaskScheduler.strategies.DROP` - drops tasks that are exectuted while another is already running.
- `TaskScheduler.strategies.KEEP_LATEST` - will drop all but the most recent intermediate .execute(), which is enqueued to run later.
