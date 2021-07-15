<script>
  export let colour;
  export let height = 90;
</script>

<div class="section" style="--bg-colour: {colour}; height: {height}vh">
  <slot></slot>
</div>

<style>
  .section {
    position: relative;
    width: 100%;
    background-color: var(--bg-colour);
  }
</style>