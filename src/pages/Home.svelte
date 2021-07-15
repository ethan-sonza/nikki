<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Section, YouTubePreview, FullVid } from '../components';

  let visible = false;
  let videos = [
    {
      id: 'cQIaYLXR2BA',
    }, {
      id: 'Rh5tEDUxric',
    }, {
      id: '47c5PGlduA8',
    },
  ]

  onMount(async () => {
    visible = true
  });
</script>

  <!-- <Parallax sections={2.2}> -->
  <!-- <ParallaxLayer offset={0} rate={.5}> -->
  <Section colour='#212121' height='95'>
    {#if visible}
    <div class="me text m"
      in:fade="{{duration: 1000}}"
    >
      <div class="name">NIKKI CADIZ</div>
      <div class="job">VIDEO EDITOR</div>
    </div>
  {/if}
  </Section>


  <Section colour='#212121' height='100'>
    <FullVid></FullVid>
  </Section>

  <Section colour='#212121' height='90'>
    <div class="bio text">
      I am NIKKI CADIZ, a freelance video editor based in the Philippines.
      I create videos ranging from testimonials, advertisements, web classes, and social media content.
      I am available for both short-term and long-term projects.
    </div>
  </Section>

  <Section colour='#212121' height='48'>
    <div class="headers">
      <div class="m">PROMOTIONAL</div>
      <div class="m">EDUCATIONAL</div>
      <div class="m">ENTERTAINMENT</div>
    </div>
    <div class="videos">
      {#each videos as { id, category }}
        <YouTubePreview videoId={id} category={category} border />
      {/each}
    </div>
  </Section>

  <Section colour='#212121' height='75'>
    <div class="contact text m">
      <div class="work o">LET'S WORK TOGETHER</div>
      <div class="email">nikkitries@gmail.com</div>
    </div>
  </Section>
<style>
  .me {
    font-weight: 700;
    font-size: 7.5em;
  }
  .me .name {
    color: #212121;
    background-color: #EFEFEF;
    padding: 0em 0.3em;
  }
  .me .job {
    margin-left: 0.2em;
    font-weight: 600;
  }

  .bio {
    font-size: 3em;
    text-align: center;
    padding: 0 2em;
  }

  .videos, .headers {
    width: 100%;
    display: flex;
    justify-content: space-evenly;
  }
  .headers div {
    width: 33.33%;
    text-align: center;
    color: #EFEFEF;
    font-size: 4em;
    border: 2px solid #EFEFEF;
  }

  .contact {
    flex-flow: column wrap;
    font-size: 4em;
  }

  .contact .work {
    font-style: italic;
    font-size: 1.2em;
    margin-bottom: 0.3em;
  }
</style>