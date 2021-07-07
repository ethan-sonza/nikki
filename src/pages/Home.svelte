<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Section, YouTubePreview } from '../components';
  import { lazyLoad, typewriter } from '../helpers';

  let visible, show_body, show_button = false;
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
    setTimeout(function(){
      show_body = true
    }, 5000);
	});
</script>

<Section colour='#212121'>
  {#if visible}
    <img id='landing-person' in:fade="{{ duration: 2000 }}" use:lazyLoad={'/images/landing1.jpg'} alt='landing-person' />

    <div class="about">
      <p class="m" in:typewriter="{{speed: 100}}" on:outroend="{() => alert('outro ended')}">
        I'm NIKKI, I like big DIKKI, a video editor lorem...
      </p>

      {#if show_body}
        <div in:typewriter="{{speed: 35}}">
          Lorem, ipsum dolor sit amet consectetur adipisicing elit. Provident est, ea pariatur similique
          dolor unde molestias vitae sequi modi totam accusantium ratione aliquam?
          Pariatur vel alias iste sequi dignissimos qui.
        </div>
      {/if}
    </div>
  {/if}

  
</Section>

<div class="videos">
  {#each videos as { id, category }}
    <YouTubePreview videoId={id} category={category} />
  {/each}
</div>


<style>
  /* First Section - About */
  img#landing-person {
    margin-left: 10%;
  }
  .about {
    position: absolute;
    top: 20%;
    left: 45%;
    color: #EFEFEF;
    font-size: 2em;
    width: 50%;
  }

  .m {
    font-family: Montserrat, sans-serif;
    font-weight: 600;
    font-size: 1.2em;
  }

  .videos {
    max-width: 100%;
    display: flex;
    justify-content: space-evenly;
  }
</style>