<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import {
    getComputedSize,
    matchesSelectorToParentElements,
    restrictToBounds,
    snapToGrid,
    computeWidth,
    computeHeight,
  } from './utils';

  export let className = 'sdr';
  export let active = false;
  export let parent = true;
  export let draggable = true;
  export let resizable = true;
  export let lockAspectRatio = false;
  export let disableUserSelect = true;
  export let preventDeactivation = false;
  // export let enableNativeDrag = false;
  export let w = 200;
  export let h = 200;
  export let minWidth = 0;
  export let minHeight = 0;
  export let maxWidth = null;
  export let maxHeight = null;
  export let x = 0;
  export let y = 0;
  export let z = 'auto';
  export let handles = ['tl', 'tm', 'tr', 'mr', 'br', 'bm', 'bl', 'ml'];
  export let dragHandle = null;
  export let dragCancel = null;
  export let axis = 'both';
  export let grid = [1, 1];
  export let scale = 1;
  export let onDragStart = () => true;
  export let onDrag = () => true;
  export let onResizeStart = () => true;
  export let onResize = () => true;

  const dispatch = createEventDispatcher();

  let left = x;
  let top = y;
  let right = null;
  let bottom = null;
  // TODO - originally null
  let width = w !== 'auto' ? w : null;
  // TODO - originally null
  let height = h !== 'auto' ? h : null;
  let widthTouched = false;
  let heightTouched = false;
  let aspectFactor = null;
  let parentWidth = null;
  let parentHeight = null;
  let handle = null;
  let enabled = active;
  let resizing = false;
  let dragging = false;
  let dragEnable = false;
  let resizeEnable = false;
  let zIndex = z;
  let mouseClickPosition = { mouseX: 0, mouseY: 0, x: 0, y: 0, w: 0, h: 0 };
  let bounds = {
    minLeft: null,
    maxLeft: null,
    minRight: null,
    maxRight: null,
    minTop: null,
    maxTop: null,
    minBottom: null,
    maxBottom: null,
  };

  // elements
  let container;

  $: actualHandles = resizable ? handles : [];
  $: computedHeight = h === 'auto' ? (!heightTouched ? 'auto' : null) : `${height}px`;
  $: computedWidth = w === 'auto' ? (!widthTouched ? 'auto' : null) : `${width}px`;
  $: resizingOnX = Boolean(handle) && (handle.includes('l') || handle.includes('r'));
  $: resizingOnY = Boolean(handle) && (handle.includes('t') || handle.includes('b'));
  $: isCornerHandle = Boolean(handle) && ['tl', 'tr', 'br', 'bl'].includes(handle);
  $: style = [
    `transform: translate(${left}px, ${top}px)`,
    `height: ${computedHeight}`,
    `width: ${computedWidth}`,
    `z-index: ${zIndex}`,
  ].join(';');

  // TODO - use https://svelte.dev/docs#Block-level_element_bindings instead?
  function getParentSize() {
    if (parent) {
      const style = window.getComputedStyle(container.parentNode);

      return [
        parseInt(style.getPropertyValue('width'), 10),
        parseInt(style.getPropertyValue('height'), 10),
      ];
    }

    return [null, null];
  }

  function resetBoundsAndMouseState() {
    mouseClickPosition = { mouseX: 0, mouseY: 0, x: 0, y: 0, w: 0, h: 0 };

    bounds = {
      minLeft: null,
      maxLeft: null,
      minRight: null,
      maxRight: null,
      minTop: null,
      maxTop: null,
      minBottom: null,
      maxBottom: null,
    };
  }

  function checkParentSize() {
    if (parent) {
      const [newParentWidth, newParentHeight] = getParentSize();

      parentWidth = newParentWidth;
      parentHeight = newParentHeight;
      right = parentWidth - width - left;
      bottom = parentHeight - height - top;
    }
  }

  function calcDragLimits() {
    return {
      minLeft: left % grid[0],
      maxLeft: Math.floor((parentWidth - width - left) / grid[0]) * grid[0] + left,
      minRight: right % grid[0],
      maxRight: Math.floor((parentWidth - width - right) / grid[0]) * grid[0] + right,
      minTop: top % grid[1],
      maxTop: Math.floor((parentHeight - height - top) / grid[1]) * grid[1] + top,
      minBottom: bottom % grid[1],
      maxBottom: Math.floor((parentHeight - height - bottom) / grid[1]) * grid[1] + bottom,
    };
  }

  function calcResizeLimits() {
    // todo - remove
    // let minw = minW;
    // let minh = minH;
    // let maxWidth = maxW;
    // let maxh = maxH;

    // TODO - remove
    // const aspectFactor = this.aspectFactor;
    const [gridX, gridY] = grid;
    // const width = this.width;
    // const height = this.height;
    // const left = this.left;
    // const top = this.top;
    // const right = this.right;
    // const bottom = this.bottom;

    if (lockAspectRatio) {
      if (minWidth / minHeight > aspectFactor) {
        minHeight = minWidth / aspectFactor;
      } else {
        minWidth = aspectFactor * minHeight;
      }

      if (maxWidth && maxHeight) {
        maxWidth = Math.min(maxWidth, aspectFactor * maxHeight);
        maxHeight = Math.min(maxHeight, maxWidth / aspectFactor);
      } else if (maxWidth) {
        maxHeight = maxWidth / aspectFactor;
      } else if (maxHeight) {
        maxWidth = aspectFactor * maxHeight;
      }
    }

    maxWidth = maxWidth - (maxWidth % gridX);
    maxHeight = maxHeight - (maxHeight % gridY);

    const limits = {
      minLeft: null,
      maxLeft: null,
      minTop: null,
      maxTop: null,
      minRight: null,
      maxRight: null,
      minBottom: null,
      maxBottom: null,
    };

    if (parent) {
      limits.minLeft = left % gridX;
      limits.maxLeft = left + Math.floor((width - minWidth) / gridX) * gridX;
      limits.minTop = top % gridY;
      limits.maxTop = top + Math.floor((height - minHeight) / gridY) * gridY;
      limits.minRight = right % gridX;
      limits.maxRight = right + Math.floor((width - minWidth) / gridX) * gridX;
      limits.minBottom = bottom % gridY;
      limits.maxBottom = bottom + Math.floor((height - minHeight) / gridY) * gridY;

      if (maxWidth) {
        limits.minLeft = Math.max(limits.minLeft, parentWidth - right - maxWidth);
        limits.minRight = Math.max(limits.minRight, parentWidth - left - maxWidth);
      }

      if (maxHeight) {
        limits.minTop = Math.max(limits.minTop, parentHeight - bottom - maxHeight);
        limits.minBottom = Math.max(limits.minBottom, parentHeight - top - maxHeight);
      }

      if (lockAspectRatio) {
        limits.minLeft = Math.max(limits.minLeft, left - top * aspectFactor);
        limits.minTop = Math.max(limits.minTop, top - left / aspectFactor);
        limits.minRight = Math.max(limits.minRight, right - bottom * aspectFactor);
        limits.minBottom = Math.max(limits.minBottom, bottom - right / aspectFactor);
      }
    } else {
      limits.minLeft = null;
      limits.maxLeft = left + Math.floor((width - minWidth) / gridX) * gridX;
      limits.minTop = null;
      limits.maxTop = top + Math.floor((height - minHeight) / gridY) * gridY;
      limits.minRight = null;
      limits.maxRight = right + Math.floor((width - minWidth) / gridX) * gridX;
      limits.minBottom = null;
      limits.maxBottom = bottom + Math.floor((height - minHeight) / gridY) * gridY;

      if (maxWidth) {
        limits.minLeft = -(right + maxWidth);
        limits.minRight = -(left + maxWidth);
      }

      if (maxHeight) {
        limits.minTop = -(bottom + maxHeight);
        limits.minBottom = -(top + maxHeight);
      }

      if (lockAspectRatio && maxWidth && maxHeight) {
        limits.minLeft = Math.min(limits.minLeft, -(right + maxWidth));
        limits.minTop = Math.min(limits.minTop, -(maxHeight + bottom));
        limits.minRight = Math.min(limits.minRight, -left - maxWidth);
        limits.minBottom = Math.min(limits.minBottom, -top - maxHeight);
      }
    }

    return limits;
  }

  function handleResize(e) {
    let l = left;
    let t = top;
    let r = right;
    let b = bottom;

    const tmpDeltaX = mouseClickPosition.mouseX - (e.touches ? e.touches[0].pageX : e.pageX);
    const tmpDeltaY = mouseClickPosition.mouseY - (e.touches ? e.touches[0].pageY : e.pageY);

    if (!widthTouched && tmpDeltaX) {
      widthTouched = true;
    }

    if (!heightTouched && tmpDeltaY) {
      heightTouched = true;
    }

    const [deltaX, deltaY] = snapToGrid(grid, tmpDeltaX, tmpDeltaY, scale);

    if (handle.includes('b')) {
      b = restrictToBounds(mouseClickPosition.bottom + deltaY, bounds.minBottom, bounds.maxBottom);

      if (lockAspectRatio && resizingOnY) {
        r = right - (bottom - b) * aspectFactor;
      }
    } else if (handle.includes('t')) {
      t = restrictToBounds(mouseClickPosition.top - deltaY, bounds.minTop, bounds.maxTop);

      if (lockAspectRatio && resizingOnY) {
        l = left - (top - t) * aspectFactor;
      }
    }

    if (handle.includes('r')) {
      r = restrictToBounds(mouseClickPosition.right + deltaX, bounds.minRight, bounds.maxRight);

      if (lockAspectRatio && resizingOnX) {
        b = bottom - (right - r) / aspectFactor;
      }
    } else if (handle.includes('l')) {
      l = restrictToBounds(mouseClickPosition.left - deltaX, bounds.minLeft, bounds.maxLeft);

      if (lockAspectRatio && resizingOnX) {
        t = top - (left - l) / aspectFactor;
      }
    }

    const newWidth = computeWidth(parentWidth, left, right);
    const newHeight = computeHeight(parentHeight, top, bottom);

    if (onResize(handle, left, top, width, height) === false) {
      return;
    }

    left = l;
    top = t;
    right = r;
    bottom = b;
    width = newWidth;
    height = newHeight;

    dispatch('resizing', { left, top, width, height });
    resizing = true;
  }

  function deselect(e) {
    const target = e.target || e.srcElement;
    const regex = new RegExp(className + '-([trmbl]{2})', '');

    // TODO - actually need regex to test this?
    if (!container.contains(target) && !regex.test(target.className)) {
      if (enabled && !preventDeactivation) {
        enabled = false;

        dispatch('deactivated');
        // TODO - casing of event?
        dispatch('update:active', false);
      }

      document.documentElement.removeEventListener('mousemove', handleResize);
      document.documentElement.removeEventListener('touchmove', handleResize);

      // TODO - originally was outside this conditional block
      resetBoundsAndMouseState();
    }

    // TODO - clashing, move up
    // resetBoundsAndMouseState();
  }

  function elementMouseDown(e) {
    if (e instanceof MouseEvent && e.button !== 0) {
      return;
    }

    const target = e.target || e.srcElement;

    if (container.contains(target)) {
      if (onDragStart(e) === false) {
        return;
      }
      if (
        (dragHandle && !matchesSelectorToParentElements(target, dragHandle, container)) ||
        (dragCancel && matchesSelectorToParentElements(target, dragCancel, container))
      ) {
        dragging = false;
        return;
      }
      if (!enabled) {
        enabled = true;
        dispatch('activated');
        dispatch('update:active', true);
      }
      if (draggable) {
        dragEnable = true;
      }
      mouseClickPosition.mouseX = e.touches ? e.touches[0].pageX : e.pageX;
      mouseClickPosition.mouseY = e.touches ? e.touches[0].pageY : e.pageY;
      mouseClickPosition.left = left;
      mouseClickPosition.right = right;
      mouseClickPosition.top = top;
      mouseClickPosition.bottom = bottom;
      if (parent) {
        bounds = calcDragLimits();
      }
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', handleUp);
    }
  }

  function elementTouchDown(e) {
    if (e instanceof MouseEvent && e.button !== 0) {
      return;
    }

    const target = e.target || e.srcElement;

    if (container.contains(target)) {
      if (onDragStart(e) === false) {
        return;
      }
      if (
        (dragHandle && !matchesSelectorToParentElements(target, dragHandle, container)) ||
        (dragCancel && matchesSelectorToParentElements(target, dragCancel, container))
      ) {
        dragging = false;
        return;
      }
      if (!enabled) {
        enabled = true;
        dispatch('activated');
        dispatch('update:active', true);
      }
      if (draggable) {
        dragEnable = true;
      }
      mouseClickPosition.mouseX = e.touches ? e.touches[0].pageX : e.pageX;
      mouseClickPosition.mouseY = e.touches ? e.touches[0].pageY : e.pageY;
      mouseClickPosition.left = left;
      mouseClickPosition.right = right;
      mouseClickPosition.top = top;
      mouseClickPosition.bottom = bottom;
      if (parent) {
        bounds = calcDragLimits();
      }
      window.addEventListener('touchmove', move);
      window.addEventListener('touchend', handleUp);
    }
  }

  function move(e) {
    if (resizing) {
      handleResize(e);
    } else if (dragEnable) {
      handleDrag(e);
    }
  }

  function handleUp(e) {
    handle = null;

    resetBoundsAndMouseState();

    dragEnable = false;
    resizeEnable = false;

    if (resizing) {
      resizing = false;
      dispatch('resizestop', { left, top, width, height });
    }

    if (dragging) {
      dragging = false;
      dispatch('dragstop', { left, top });
    }

    window.removeEventListener('mousemove', move);
    window.removeEventListener('touchmove', move);
    window.removeEventListener('mousemove', handleResize);
    window.removeEventListener('touchmove', handleResize);

    // todo - is this needed?
    window.removeEventListener('touchend', handleUp);
    window.removeEventListener('mouseup', handleUp);
  }

  function handleDrag(e) {
    // TODO - remove
    // const axis = axis;
    // const grid = grid;
    // const bounds = bounds;
    // const mouseClickPosition = mouseClickPosition;

    const tmpDeltaX =
      axis && axis !== 'y'
        ? mouseClickPosition.mouseX - (e.touches ? e.touches[0].pageX : e.pageX)
        : 0;
    const tmpDeltaY =
      axis && axis !== 'x'
        ? mouseClickPosition.mouseY - (e.touches ? e.touches[0].pageY : e.pageY)
        : 0;

    const [deltaX, deltaY] = snapToGrid(grid, tmpDeltaX, tmpDeltaY, scale);

    left = restrictToBounds(mouseClickPosition.left - deltaX, bounds.minLeft, bounds.maxLeft);
    top = restrictToBounds(mouseClickPosition.top - deltaY, bounds.minTop, bounds.maxTop);

    if (onDrag(left, top) === false) {
      return;
    }

    right = restrictToBounds(mouseClickPosition.right + deltaX, bounds.minRight, bounds.maxRight);
    bottom = restrictToBounds(
      mouseClickPosition.bottom + deltaY,
      bounds.minBottom,
      bounds.maxBottom,
    );

    // TODO - remove
    // left = left;
    // top = top;
    // right = right;
    // bottom = bottom;

    dispatch('dragging', { left, top });
    dragging = true;
  }

  function handleTouchDown(hdl, e) {
    // todo - check for touches? of TouchEvent
    // if (e instanceof TouchEvent) {
    //   return;
    // }

    if (onResizeStart(hdl, e) === false) {
      return;
    }

    // Here we avoid a dangerous recursion by faking
    // corner handles as middle handles
    if (lockAspectRatio && !hdl.includes('m')) {
      handle = 'm' + hdl.substring(1);
    } else {
      handle = hdl;
    }

    resizeEnable = true;

    mouseClickPosition.mouseX = e.touches ? e.touches[0].pageX : e.pageX;
    mouseClickPosition.mouseY = e.touches ? e.touches[0].pageY : e.pageY;
    mouseClickPosition.left = left;
    mouseClickPosition.right = right;
    mouseClickPosition.top = top;
    mouseClickPosition.bottom = bottom;

    bounds = calcResizeLimits();

    window.addEventListener('touchmove', handleResize);
    window.addEventListener('touchend', handleUp);
  }

  function handleDown(hdl, e) {
    if (e instanceof MouseEvent && e.button !== 0) {
      return;
    }

    if (onResizeStart(hdl, e) === false) {
      return;
    }

    // Here we avoid a dangerous recursion by faking
    // corner handles as middle handles
    if (lockAspectRatio && !hdl.includes('m')) {
      handle = 'm' + hdl.substring(1);
    } else {
      handle = hdl;
    }

    resizeEnable = true;

    mouseClickPosition.mouseX = e.touches ? e.touches[0].pageX : e.pageX;
    mouseClickPosition.mouseY = e.touches ? e.touches[0].pageY : e.pageY;
    mouseClickPosition.left = left;
    mouseClickPosition.right = right;
    mouseClickPosition.top = top;
    mouseClickPosition.bottom = bottom;

    bounds = calcResizeLimits();

    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', handleUp);
  }

  onMount(() => {
    [parentWidth, parentHeight] = getParentSize();

    const [cw, ch] = getComputedSize(container);

    aspectFactor = (w !== 'auto' ? w : cw) / (h !== 'auto' ? h : ch);

    width = w !== 'auto' ? w : cw;
    height = h !== 'auto' ? h : computedHeight;

    right = parentWidth - width - left;
    bottom = parentHeight - height - top;

    if (active) {
      dispatch('activated');
    }

    window.addEventListener('mousedown', deselect);
    window.addEventListener('touchend touchcancel', deselect);

    return () => {
      // TODO - make sure all events are removed on destroy
      window.removeEventListener('mousedown', deselect);
      window.removeEventListener('touchstart', deselect);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', handleUp);
      // TODO - is this needed?
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchend touchcancel', deselect);
    };
  });
</script>

<svelte:window on:resize={checkParentSize} />

<div
  class="sdr"
  {style}
  bind:this={container}
  on:mousedown={elementMouseDown}
  on:touchstart={elementTouchDown}
>
  {#each actualHandles as handle}
    <div
      class="handle handle-{handle}"
      class:handle--active={enabled}
      on:mousedown|preventDefault|stopPropagation={e => handleDown(handle, e)}
      on:touchstart|preventDefault|stopPropagation={e => handleTouchDown(handle, e)}
    >
      <slot name="handle" />
    </div>
  {/each}
  <slot />
</div>

<style>
  .sdr {
    touch-action: none;
    position: absolute;
    box-sizing: border-box;
    border: 1px dashed black;
  }

  .handle {
    box-sizing: border-box;
    position: absolute;
    width: 10px;
    height: 10px;
    background: #eee;
    border: 1px solid #333;
    display: none;
  }

  .handle-tl {
    top: -10px;
    left: -10px;
    cursor: nw-resize;
  }

  .handle-tm {
    top: -10px;
    left: 50%;
    margin-left: -5px;
    cursor: n-resize;
  }

  .handle-tr {
    top: -10px;
    right: -10px;
    cursor: ne-resize;
  }

  .handle-ml {
    top: 50%;
    margin-top: -5px;
    left: -10px;
    cursor: w-resize;
  }

  .handle-mr {
    top: 50%;
    margin-top: -5px;
    right: -10px;
    cursor: e-resize;
  }

  .handle-bl {
    bottom: -10px;
    left: -10px;
    cursor: sw-resize;
  }

  .handle-bm {
    bottom: -10px;
    left: 50%;
    margin-left: -5px;
    cursor: s-resize;
  }

  .handle-br {
    bottom: -10px;
    right: -10px;
    cursor: se-resize;
  }

  @media only screen and (max-width: 768px) {
    [class*='handle-']:before {
      content: '';
      left: -10px;
      right: -10px;
      bottom: -10px;
      top: -10px;
      position: absolute;
    }
  }

  .handle--active {
    display: block;
  }
</style>
