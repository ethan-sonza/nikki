<script>
  import { modal } from '../stores';
  import {  onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { bind } from 'svelte-simple-modal'
  import YouTube from 'svelte-youtube';

  export let videoId, category, border
  export let tileStyles = '';
  export let tileWidth = '33.33%';
  export let tileStyle = `width: ${tileWidth};` + tileStyles

  const options = {
    width: '1280',
    height: '756',
    playerVars: {
        autoplay: 1
    }
  };

  const showModal = () => {
    modal.set(bind(YouTube, { videoId: videoId, options: options }));
  };

  let show = false;
  onMount(() => {
    show = true
  });
</script>

{#if show }
<div class="preview { border ? ' border' : ''}"
  style="{tileStyle}"
  on:click="{() => showModal()}"
  transition:fade
>
    <img alt='youtube-preview'
      src={'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg'}
    />

    <div class="play"></div>
    { #if category }
      <div class="category">{category}</div>
    {/if}
  </div>
{/if}

<style>
  .preview {
    position: relative;
    min-height: 300px;
    cursor: pointer;
  }
  .preview img {
    position: absolute;
    object-fit: cover;
    width: 100%;
    height: 100%;
  }
  .border {
    border: 2px solid #EFEFEF;
  }

  .play {
    position: absolute;
    top: 50%;
    left: 50%;
    background: transparent url('/images/play-button.png') center center no-repeat;
    height: 48px;
    width: 48px;
    margin-left: -24px;
    margin-top: -24px;
  }

  .category {
    position: absolute;
    bottom: 0;
    right: 0;
    margin: .5em;
    padding: .3em;
    color: #EFEFEF;
    background-color: #212121;
    border-radius: 5px;
  }
</style>