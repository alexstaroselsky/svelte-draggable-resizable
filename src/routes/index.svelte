<script>
  import DraggableResizable from '$lib/DraggableResizable.svelte';
</script>

<div id="app">
  <div style="height: 500px; width: 500px; border: 1px solid red; position: relative;">
    <DraggableResizable w="400" h="400" parent lockAspectRatio>
      <p>svelte-draggable-resizable</p>
    </DraggableResizable>
  </div>
</div>

<style>
  *,
  ::after,
  ::before {
    box-sizing: border-box;
  }
</style>
