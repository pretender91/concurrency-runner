import invariant from './utils/invariant.js';

const EFFECTS = {
  CANCEL: 0,
  DELAY: 1,
  ABORT: 2
};

function CancelHappened(reason) {
  this.reason = reason;
}

function isCancelHappened(target) {
  return target instanceof CancelHappened;
}

function cancelEffectHandler(effect) {
  return Promise.reject(new CancelHappened(effect.args[0]));
}

async function delayEffectHandler(effect) {
  const delayPromise = new Promise(resolve => {
    setTimeout(resolve, effect.args[0]);
  });

  return delayPromise;
}

function abortEffectHandler(effect) {
  return Promise.reject(effect.args[0]);
}

const EFFECTS_HANDLERS = {
  [EFFECTS.CANCEL]: cancelEffectHandler,
  [EFFECTS.DELAY]: delayEffectHandler,
  [EFFECTS.ABORT]: abortEffectHandler
};

function Effect(name, ...args) {
  invariant(
    Reflect.has(EFFECTS_HANDLERS, name),
    'Not supported effect'
  );
  this.name = name;
  this.args = args;
}

Effect.prototype.toString = function() {
  return this.name;
};

function isEffect(effect) {
  return effect instanceof Effect;
}

function makeEffect(effect, ...args) {
  return new Effect(effect, ...args);
}

function processEffect(effect) {
  invariant(isEffect(effect), `${effect} is not an effect`);
  invariant(
    Reflect.has(EFFECTS_HANDLERS, effect),
    `Can not process effect ${effect}`
  );

  return EFFECTS_HANDLERS[effect](effect);
}

function cancel(reason) {
  return makeEffect(EFFECTS.CANCEL, reason);
}

function delay(ms = 0) {
  return makeEffect(EFFECTS.DELAY, ms);
}

function abort(reason) {
  return makeEffect(EFFECTS.ABORT, reason);
}

export {
  abort,
  delay,
  cancel,
  makeEffect,
  processEffect,
  isEffect,
  isCancelHappened
};
