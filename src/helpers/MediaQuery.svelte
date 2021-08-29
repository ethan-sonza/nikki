<!-- https://svelte.dev/repl/cbe4c4f262d44b31b39688eb9561c4c4?version=3.35.0 -->
<script context="module">
  import {readable, derived } from 'svelte/store'

  export const breakpoint = readable("l",(set)=>{
    const breakpoints = [
      { value: "xs", mediaquery: window.matchMedia("(max-width:  479px)") },
      { value: "s", mediaquery: window.matchMedia("(min-width:  480px) and (max-width:  719px)") },
      { value: "m", mediaquery: window.matchMedia("(min-width:  720px) and (max-width:  959px)") },
      { value: "l", mediaquery: window.matchMedia("(min-width:  960px) and (max-width: 1439px)") },
      { value: "xl", mediaquery: window.matchMedia("(min-width: 1440px) and (max-width: 1919px)") },
      { value: "xxl", mediaquery: window.matchMedia("(min-width: 1920px)") },
    ];

    for (let key in breakpoints) {
      let breakpoint = breakpoints[key];

      //set the current breakpoint
      if (breakpoint.mediaquery.matches === true) {
        // EventBus.$emit("breakpoint", breakpoint.value);
        set(breakpoint.value)
      }
      breakpoint.mediaquery.addEventListener('change',(event) => {
        if (event.matches === true) {
            // EventBus.$emit("breakpoint", breakpoint.value);
            set(breakpoint.value)
        }
      });
    }
  });

  export const platform = derived(breakpoint, $breakpoint => {
    if ($breakpoint == "xs" || $breakpoint == "s") {
      return 'mobile';
    } else {
      return 'desktop';
    }
  });

  export const orientation = readable("landscape",(set)=>{
    const orientations = [
      { value: "portrait", mediaquery: window.matchMedia("(orientation: portrait)") },
      { value: "landscape", mediaquery: window.matchMedia("(orientation: landscape)") },
    ];

    for (let key in orientations) {
      let orientation = orientations[key];

      //set the current orientation
      if (orientation.mediaquery.matches === true) {
        set(orientation.value)
      }

      orientation.mediaquery.addEventListener('change',(event) => {
        if (event.matches === true) {
          set(orientation.value)
        }
      });
    }
  });
</script>
