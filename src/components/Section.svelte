<script>
  export let colour;
</script>

<div class="section" style="--bg-colour: {colour}">
  <slot></slot>
</div>

<style>
  .section {
    position: relative;
    width: 100%;
    height: 90vh;
    background-color: var(--bg-colour);
  }
</style>