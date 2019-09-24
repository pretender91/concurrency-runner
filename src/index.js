import TaskScheduler from './internal/task-sheduler.js';

const STRATEGIES = TaskScheduler.strategies;

export { STRATEGIES };
export {
  delay,
  abort,
  cancel
} from './internal/effects.js';
export {
  default as TaskScheduler
} from './internal/task-sheduler.js';
export { default as Task } from './internal/task-runner.js';
