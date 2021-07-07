<script>
  import { modal } from '../stores';

  import { bind } from 'svelte-simple-modal'
  import YouTube from 'svelte-youtube';

  import { lazyLoad } from '../helpers';

  export let videoId;

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

<div class="preview">
  <img
    use:lazyLoad={'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg'}
    alt='youtube-preview'
    on:click="{() => show()}"
  />
</div>

<style>
  .preview {
    max-width: 33vw;
  }
</style>