<script>
  import { modal } from '../stores';

  import { bind } from 'svelte-simple-modal'
  import YouTube from 'svelte-youtube';

  import { lazyLoad } from '../helpers';

  export let videoId, category, border;

  const options = {
    width: '1280',
    height: '756',
    playerVars: {
        autoplay: 1
    }
  };

  const show = () => {
    modal.set(bind(YouTube, { videoId: videoId, options: options }));
  };
</script>

<div class="preview { border ? ' border' : ''}"
  on:click="{() => show()}"
>
  <img alt='youtube-preview'
    use:lazyLoad={'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg'}
  />

  <div class="play"></div>
  { #if category }
    <div class="category">{category}</div>
  {/if}
</div>

<style>
  .preview {
    position: relative;
    width: 33.33%;
    min-height: 300px;
    cursor: pointer;
  }

  .preview.border {
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
    top: 0;
    margin-top: .5em;
    margin-left: .5em;
    padding: .3em;
    color: #EFEFEF;
    background-color: #212121;
    border-radius: 5px;
  }
</style>