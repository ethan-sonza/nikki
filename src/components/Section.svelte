<script>
  export let colour;
  export let height = 90;

  let bgStyle = `background-color: ${colour}`

  if(colour.charAt(0) === '#') {
    bgStyle = `--bg-colour: ${colour}`
  } else if(colour.charAt(0) === '-') {
    bgStyle = `background-color: var(${colour})`
  }
</script>

<div class="section" style="{bgStyle}; height: {height}vh">
  <slot></slot>
</div>

<style>
  .section {
    position: relative;
    width: 100%;
    background-color: var(--bg-colour);
  }
</style>