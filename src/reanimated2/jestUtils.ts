// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
const MockDate = require('mockdate');

let config = {
  fps: 60,
};

const isAnimatedStyle = (style) => {
  return !!style.animatedStyle;
};

const getAnimatedStyleFromObject = (style) => {
  return style.animatedStyle.current.value;
};

const getCurrentStyle = (received) => {
  const styleObject = received.props.style;
  let currentStyle = {};
  if (Array.isArray(styleObject)) {
    received.props.style.forEach((style) => {
      if (isAnimatedStyle(style)) {
        currentStyle = Object.assign(
          {},
          currentStyle,
          getAnimatedStyleFromObject(style)
        );
      } else {
        currentStyle = Object.assign({}, currentStyle, style);
      }
    });
  } else {
    if (isAnimatedStyle(styleObject)) {
      currentStyle = getAnimatedStyleFromObject(styleObject);
    } else {
      currentStyle = {
        ...styleObject,
        ...received.props.animatedStyle.value,
      };
    }
  }
  return currentStyle;
};

const checkEqual = (currentStyle, expectStyle) => {
  if (Array.isArray(expectStyle)) {
    if (expectStyle.length !== currentStyle.length) return false;
    for (let i = 0; i < currentStyle.length; i++) {
      if (!checkEqual(currentStyle[i], expectStyle[i])) {
        return false;
      }
    }
  } else if (typeof currentStyle === 'object') {
    for (const property in expectStyle) {
      if (!checkEqual(currentStyle[property], expectStyle[property])) {
        return false;
      }
    }
  } else {
    return currentStyle === expectStyle;
  }
  return true;
};

const findStyleDiff = (current, expect, requireAllMatch) => {
  const diffs = [];
  let isEqual = true;
  for (const property in expect) {
    if (!checkEqual(current[property], expect[property])) {
      isEqual = false;
      diffs.push({
        property: property,
        current: current[property],
        expect: expect[property],
      });
    }
  }

  if (
    requireAllMatch &&
    Object.keys(current).length !== Object.keys(expect).length
  ) {
    isEqual = false;
    for (const property in current) {
      if (expect[property] === undefined) {
        diffs.push({
          property: property,
          current: current[property],
          expect: expect[property],
        });
      }
    }
  }

  return { isEqual, diffs };
};

const compareStyle = (received, expectedStyle, config) => {
  if (!received.props.style) {
    return { message: () => message, pass: false };
  }
  const { exact } = config;
  const currentStyle = getCurrentStyle(received);
  const { isEqual, diffs } = findStyleDiff(currentStyle, expectedStyle, exact);

  if (isEqual) {
    return { message: () => 'ok', pass: true };
  }

  const currentStyleStr = JSON.stringify(currentStyle);
  const expectedStyleStr = JSON.stringify(expectedStyle);
  const differences = diffs
    .map(
      (diff) =>
        `- '${diff.property}' should be ${diff.expect}, but is ${diff.current}`
    )
    .join('\n');

  return {
    message: () =>
      `Expected: ${expectedStyleStr}\nReceived: ${currentStyleStr}\n\nDifferences:\n${differences}`,
    pass: false,
  };
};

let frameTime = 1000 / config.fps;
let requestAnimationFrameCopy;

const requestAnimationFrame = (callback) => {
  setTimeout(callback, frameTime);
};

const beforeTest = () => {
  requestAnimationFrameCopy = global.requestAnimationFrame;
  global.requestAnimationFrame = requestAnimationFrame;
  MockDate.set(0);
  jest.useFakeTimers();
};

const afterTest = () => {
  MockDate.reset();
  jest.useRealTimers();
  global.requestAnimationFrame = requestAnimationFrameCopy;
};

const tickTravel = (frameIndex) => {
  MockDate.set(
    new Date(Date.now() + frameTime + frameTimeFraction * (frameIndex + 1))
  );
  jest.advanceTimersByTime(frameTime);
};

export const withReanimatedTimer = (animatonTest) => {
  beforeTest();
  animatonTest();
  afterTest();
};

export const advanceAnimationByTime = (time = frameTime) => {
  for (let i = 0; i <= Math.ceil(time / frameTime); i++) {
    tickTravel(i);
  }
};

export const advanceAnimationByFrame = (count) => {
  for (let i = 0; i <= count; i++) {
    tickTravel(i);
  }
};

export const setUpTests = (userConfig = {}) => {
  const expect = require('expect');
  frameTime = 1000 / config.fps;
  frameTimeFraction = frameTime - Math.trunc(frameTime);

  config = {
    ...config,
    ...userConfig,
  };

  expect.extend({
    toHaveAnimatedStyle(received, expectedStyle, config = {}) {
      return compareStyle(received, expectedStyle, config);
    },
  });

  jest.mock('./js-reanimated', () => require('./js-reanimated/index.web'));
  jest.mock('../ReanimatedModule', () => require('../ReanimatedModuleCompat'));
  jest.mock('./NativeReanimated', () => {
    let module;
    try {
      module = require('./NativeReanimated.js');
    } catch {
      module = require('./NativeReanimated.ts');
    }
    return module.default;
  });
};

export const getAnimatedStyle = (received) => {
  return getCurrentStyle(received);
};
