<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Section, YouTubePreview } from '../components';
  import { lazyLoad } from '../helpers';

  let visible = false;
  let videos = [
    {
      id: 'cQIaYLXR2BA',
      category: 'Promotional',
    }, {
      id: 'Rh5tEDUxric',
      category: 'Educational',
    }, {
      id: '47c5PGlduA8',
      category: 'Entertainment',
    },
  ]

  onMount(async () => {
    visible = true
	});
</script>

<Section colour='#212121'>
  {#if visible}
      <img id='landing-person' in:fade="{{ duration: 2000 }}" use:lazyLoad={'/images/landing1.jpg'} alt='landing-person' />
  {/if}
</Section>

<div class="videos">
  {#each videos as { id, category }}
    <YouTubePreview videoId={id} category={category} />
  {/each}
</div>


<style>
  img#landing-person {
    margin-left: 10%;
  }

  .videos {
    max-width: 100%;
    display: flex;
    justify-content: space-evenly;
  }
</style>