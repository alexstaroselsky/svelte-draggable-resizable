export function isFunction(func) {
  return typeof func === 'function' || Object.prototype.toString.call(func) === '[object Function]';
}

export function getComputedSize($el) {
  const style = window.getComputedStyle($el);

  return [
    parseFloat(style.getPropertyValue('width'), 10),
    parseFloat(style.getPropertyValue('height'), 10),
  ];
}

export function matchesSelectorToParentElements(el, selector, baseNode) {
  let node = el;

  const matchesSelectorFunc = [
    'matches',
    'webkitMatchesSelector',
    'mozMatchesSelector',
    'msMatchesSelector',
    'oMatchesSelector',
  ].find(func => isFunction(node[func]));

  if (!isFunction(node[matchesSelectorFunc])) return false;

  do {
    if (node[matchesSelectorFunc](selector)) return true;
    if (node === baseNode) return false;
    node = node.parentNode;
  } while (node);

  return false;
}

export function restrictToBounds(value, min, max) {
  if (min !== null && value < min) {
    return min;
  }

  if (max !== null && max < value) {
    return max;
  }

  return value;
}

export function snapToGrid(grid, pendingX, pendingY, scale = 1) {
  const [scaleX, scaleY] = typeof scale === 'number' ? [scale, scale] : scale;
  const x = Math.round(pendingX / scaleX / grid[0]) * grid[0];
  const y = Math.round(pendingY / scaleY / grid[1]) * grid[1];
  return [x, y];
}

export function computeWidth(parentWidth, left, right) {
  return parentWidth - left - right;
}

export function computeHeight(parentHeight, top, bottom) {
  return parentHeight - top - bottom;
}
